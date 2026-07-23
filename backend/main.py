from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uvicorn
from sqlalchemy.exc import IntegrityError
from typing import List

from core.database import engine, get_db, Base
from models import domain as models_domain
from schemas import domain as schemas_domain
from services.financeiro import calcular_metricas_plataforma, calcular_preco_por_margem

# Cria as tabelas no banco de dados fisicamente
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Skold Stock API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Na V2, mudaremos para a URL real do front-end
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from core.auth import (
    gerar_hash_senha,
    verificar_senha,
    criar_token_acesso,
    gerar_token_recuperacao,
    get_current_user
)
from datetime import datetime, timedelta

@app.get("/")
def read_root():
    return {"status": "online", "message": "Sistema de Controle de Estoque Operante!"}

# --- ROTAS DE AUTENTICAÇÃO ---
@app.post("/auth/registro", response_model=schemas_domain.UsuarioResponse, tags=["Autenticação"])
def registrar_usuario(dados: schemas_domain.UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(models_domain.Usuario).filter_by(email=dados.email.lower()).first():
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado.")
    
    novo_usuario = models_domain.Usuario(
        nome=dados.nome,
        email=dados.email.lower(),
        senha_hash=gerar_hash_senha(dados.senha)
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

@app.post("/auth/login", response_model=schemas_domain.TokenResponse, tags=["Autenticação"])
def login(dados: schemas_domain.LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(models_domain.Usuario).filter_by(email=dados.email.lower()).first()
    if not usuario or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    
    token = criar_token_acesso(dados={"sub": usuario.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": usuario
    }

@app.get("/auth/me", response_model=schemas_domain.UsuarioResponse, tags=["Autenticação"])
def obter_usuario_logado(usuario_atual: models_domain.Usuario = Depends(get_current_user)):
    return usuario_atual

@app.post("/auth/esqueci-senha", tags=["Autenticação"])
def solicitar_recuperacao_senha(dados: schemas_domain.EsqueciSenhaRequest, db: Session = Depends(get_db)):
    usuario = db.query(models_domain.Usuario).filter_by(email=dados.email.lower()).first()
    if not usuario:
        return {"status": "sucesso", "mensagem": "Se o e-mail estiver cadastrado, enviamos as instruções de recuperação."}
    
    token_reset = gerar_token_recuperacao()
    usuario.reset_token = token_reset
    usuario.reset_token_expira = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    
    print(f"--> [RECOVER TOKEN] E-mail: {usuario.email} | Token: {token_reset}")
    
    return {
        "status": "sucesso",
        "mensagem": "Token de recuperação gerado com sucesso.",
        "reset_token": token_reset
    }

@app.post("/auth/redefinir-senha", tags=["Autenticação"])
def redefinir_senha(dados: schemas_domain.RedefinirSenhaRequest, db: Session = Depends(get_db)):
    usuario = db.query(models_domain.Usuario).filter_by(email=dados.email.lower()).first()
    if not usuario or usuario.reset_token != dados.token:
        raise HTTPException(status_code=400, detail="Token de recuperação inválido ou e-mail incorreto.")
    
    if usuario.reset_token_expira and usuario.reset_token_expira < datetime.utcnow():
        raise HTTPException(status_code=400, detail="O token de recuperação expirou. Solicite um novo.")
    
    usuario.senha_hash = gerar_hash_senha(dados.nova_senha)
    usuario.reset_token = None
    usuario.reset_token_expira = None
    db.commit()
    
    return {"status": "sucesso", "mensagem": "Senha alterada com sucesso! Faça login com a nova senha."}


# --- ROTAS DE PLATAFORMAS (NOVAS) ---
@app.post("/plataformas/", tags=["Cadastros"])
def cadastrar_plataforma(plat: schemas_domain.PlataformaCreate, db: Session = Depends(get_db)):
    nova = models_domain.Plataforma(**plat.model_dump())
    db.add(nova)
    db.commit()
    return {"status": "sucesso"}

@app.get("/plataformas/", tags=["Cadastros"])
def listar_plataformas(db: Session = Depends(get_db)):
    return db.query(models_domain.Plataforma).all()

@app.put("/plataformas/{id}", tags=["Cadastros"])
def editar_plataforma(id: int, plat: schemas_domain.PlataformaCreate, db: Session = Depends(get_db)):
    plataforma = db.query(models_domain.Plataforma).filter_by(id=id).first()
    if not plataforma:
        raise HTTPException(status_code=404, detail="Plataforma não encontrada.")

    dados = plat.model_dump()
    for campo, valor in dados.items():
        setattr(plataforma, campo, valor)

    db.commit()
    return {"status": "sucesso"}

# --- ROTAS DE INSUMOS E CONFIGURAÇÕES ---
@app.post("/embalagens/", tags=["Cadastros"])
def cadastrar_embalagem(embalagem: schemas_domain.EmbalagemCreate, db: Session = Depends(get_db)):
    nova_embalagem = models_domain.Embalagem(**embalagem.model_dump())
    db.add(nova_embalagem)
    db.commit()
    return {"status": "sucesso"}

@app.get("/embalagens/", tags=["Cadastros"])
def listar_embalagens(db: Session = Depends(get_db)):
    return db.query(models_domain.Embalagem).all()

@app.post("/configuracoes/", tags=["Cadastros"])
def salvar_configuracao_global(config: schemas_domain.ConfiguracaoGlobalCreate, db: Session = Depends(get_db)):
    item = db.query(models_domain.ConfiguracaoGlobal).filter_by(chave=config.chave).first()
    if item:
        item.valor_pacote = config.valor_pacote
        item.qtd_unidades = config.qtd_unidades
    else:
        item = models_domain.ConfiguracaoGlobal(**config.model_dump())
        db.add(item)
    db.commit()
    return {"status": "sucesso"}

@app.get("/configuracoes/", tags=["Cadastros"])
def listar_configuracoes(db: Session = Depends(get_db)):
    return db.query(models_domain.ConfiguracaoGlobal).all()

@app.delete("/embalagens/{id}", tags=["Cadastros"])
def deletar_embalagem(id: int, db: Session = Depends(get_db)):
    embalagem = db.query(models_domain.Embalagem).filter_by(id=id).first()
    if not embalagem: 
        raise HTTPException(status_code=404, detail="Não encontrada")
    if db.query(models_domain.Produto).filter_by(embalagem_id=id).count() > 0:
        raise HTTPException(status_code=400, detail="Há produtos usando esta embalagem.")
    db.delete(embalagem)
    db.commit()
    return {"status": "sucesso"}

# --- ROTAS DE PRODUTOS E ESTOQUE ---
@app.post("/produtos/", tags=["Estoque"])
def cadastrar_produto(produto_data: schemas_domain.ProdutoCreate, db: Session = Depends(get_db)):
    # 1. Valida a embalagem
    if not db.query(models_domain.Embalagem).filter_by(id=produto_data.embalagem_id).first():
        raise HTTPException(status_code=404, detail="Embalagem não encontrada.")
        
    # 2. Busca as plataformas que o usuário marcou no Checkbox
    plataformas_selecionadas = db.query(models_domain.Plataforma).filter(models_domain.Plataforma.id.in_(produto_data.plataformas_ids)).all()

    try:
        # Extrai os dados sem a lista de IDs para o SQLAlchemy não reclamar
        dados_dict = produto_data.model_dump(exclude={"plataformas_ids"})
        novo_produto = models_domain.Produto(**dados_dict)
        
        # Faz a ligação das plataformas marcadas (A mágica do Muitos-para-Muitos)
        novo_produto.plataformas = plataformas_selecionadas
        
        db.add(novo_produto)
        db.commit()
        return {"status": "sucesso"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"O SKU '{produto_data.sku}' já existe.")

@app.delete("/produtos/{sku}", tags=["Estoque"])
def deletar_produto(sku: str, db: Session = Depends(get_db)):
    produto = db.query(models_domain.Produto).filter_by(sku=sku).first()
    if not produto: 
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    db.delete(produto)
    db.commit()
    return {"status": "sucesso"}

class AjusteEstoque(BaseModel):
    novo_estoque: int

@app.patch("/produtos/{sku}/estoque", tags=["Estoque"])
def ajustar_estoque_manual(sku: str, ajuste: AjusteEstoque, db: Session = Depends(get_db)):
    produto = db.query(models_domain.Produto).filter_by(sku=sku).first()
    if not produto:
        raise HTTPException(status_code=404, detail="SKU não encontrado no sistema.")
    
    produto.quantidade_estoque = ajuste.novo_estoque
    db.commit()
    return {"status": "sucesso", "novo_estoque": produto.quantidade_estoque, "produto": produto.nome}

@app.get("/produtos/alertas", tags=["Dashboard"])
def alertas_de_estoque(limite: int = 10, db: Session = Depends(get_db)):
    produtos_criticos = db.query(models_domain.Produto).filter(
        models_domain.Produto.quantidade_estoque <= limite
    ).all()
    return produtos_criticos

@app.get("/produtos/detalhados", tags=["Estoque"])
def listar_produtos_detalhados(db: Session = Depends(get_db)):
    produtos = db.query(models_domain.Produto).all()
    etiqueta = db.query(models_domain.ConfiguracaoGlobal).filter_by(chave="etiqueta_padrao").first()
    
    if not etiqueta:
        raise HTTPException(status_code=400, detail="Etiqueta padrão não configurada.")

    resultados = []
    custo_etiq = etiqueta.valor_pacote / etiqueta.qtd_unidades

    for p in produtos:
        custo_emb = p.embalagem.custo_pacote / p.embalagem.qtd_unidades
        metricas_multiplas = []
        
        # Calcula as métricas para CADA plataforma vinculada ao produto
        for plat in p.plataformas:
            res_plat = calcular_metricas_plataforma(
                preco_venda=p.preco_venda,
                custo_unitario=p.custo_produto,
                custo_embalagem_un=custo_emb,
                custo_etiqueta_un=custo_etiq,
                plataforma=plat
            )
            metricas_multiplas.append(res_plat)
            
        resultados.append({
            "id": p.id,
            "sku": p.sku,
            "nome": p.nome,
            "quantidade_estoque": p.quantidade_estoque,
            "preco_venda": p.preco_venda,
            "custo_produto": p.custo_produto,
            "valor_estoque": p.quantidade_estoque * p.custo_produto,
            "analises_plataformas": metricas_multiplas
        })
        
    return resultados

@app.get("/produtos/{sku}/financeiro", tags=["Inteligência Financeira"])
def relatorio_financeiro_produto(sku: str, db: Session = Depends(get_db)):
    produto = db.query(models_domain.Produto).filter_by(sku=sku).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    
    etiqueta = db.query(models_domain.ConfiguracaoGlobal).filter_by(chave="etiqueta_padrao").first()
    if not etiqueta:
        raise HTTPException(status_code=400, detail="Você precisa cadastrar a 'etiqueta_padrao'.")

    custo_etiq = etiqueta.valor_pacote / etiqueta.qtd_unidades
    custo_emb = produto.embalagem.custo_pacote / produto.embalagem.qtd_unidades

    metricas_multiplas = []
    for plat in produto.plataformas:
        res_plat = calcular_metricas_plataforma(
            preco_venda=produto.preco_venda,
            custo_unitario=produto.custo_produto,
            custo_embalagem_un=custo_emb,
            custo_etiqueta_un=custo_etiq,
            plataforma=plat
        )
        metricas_multiplas.append(res_plat)
    
    return {"produto": produto.nome, "embalagem_utilizada": produto.embalagem.nome, "analises": metricas_multiplas}

@app.get("/simular-preco", tags=["Inteligência Financeira"])
def simular_preco_livre(
    custo_produto: float,
    margem_desejada: float = 20.0,
    embalagem_id: int = None,
    custo_embalagem_custom: float = 0.0,
    db: Session = Depends(get_db)
):
    etiqueta = db.query(models_domain.ConfiguracaoGlobal).filter_by(chave="etiqueta_padrao").first()
    custo_etiq = (etiqueta.valor_pacote / etiqueta.qtd_unidades) if etiqueta else 0.0

    custo_emb = custo_embalagem_custom
    if embalagem_id:
        emb = db.query(models_domain.Embalagem).filter_by(id=embalagem_id).first()
        if emb and emb.qtd_unidades > 0:
            custo_emb = emb.custo_pacote / emb.qtd_unidades

    plataformas = db.query(models_domain.Plataforma).all()
    resultados = []

    for plat in plataformas:
        sim = calcular_preco_por_margem(
            custo_unitario=custo_produto,
            custo_embalagem_un=custo_emb,
            custo_etiqueta_un=custo_etiq,
            plataforma=plat,
            margem_desejada_pct=margem_desejada
        )
        resultados.append(sim)

    return {
        "custo_produto": custo_produto,
        "custo_embalagem": custo_emb,
        "custo_etiqueta": custo_etiq,
        "margem_desejada_pct": margem_desejada,
        "simulacoes": resultados
    }

@app.get("/produtos/{sku}/simular-preco", tags=["Inteligência Financeira"])
def simular_preco_produto_existente(
    sku: str,
    margem_desejada: float = 20.0,
    db: Session = Depends(get_db)
):
    produto = db.query(models_domain.Produto).filter_by(sku=sku).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    etiqueta = db.query(models_domain.ConfiguracaoGlobal).filter_by(chave="etiqueta_padrao").first()
    custo_etiq = (etiqueta.valor_pacote / etiqueta.qtd_unidades) if etiqueta else 0.0
    custo_emb = (produto.embalagem.custo_pacote / produto.embalagem.qtd_unidades) if produto.embalagem else 0.0

    resultados = []
    plataformas_alvo = produto.plataformas if produto.plataformas else db.query(models_domain.Plataforma).all()

    for plat in plataformas_alvo:
        sim = calcular_preco_por_margem(
            custo_unitario=produto.custo_produto,
            custo_embalagem_un=custo_emb,
            custo_etiqueta_un=custo_etiq,
            plataforma=plat,
            margem_desejada_pct=margem_desejada
        )
        resultados.append(sim)

    return {
        "sku": produto.sku,
        "nome": produto.nome,
        "preco_venda_atual": produto.preco_venda,
        "custo_produto": produto.custo_produto,
        "custo_embalagem": custo_emb,
        "custo_etiqueta": custo_etiq,
        "margem_desejada_pct": margem_desejada,
        "simulacoes": resultados
    }


# --- WEBHOOKS E INTEGRAÇÕES ---
class ShopeeWebhookPayload(BaseModel):
    shop_id: int
    code: int
    data: dict

@app.post("/webhooks/shopee", tags=["Integrações"])
async def receber_venda_shopee(payload: dict, db: Session = Depends(get_db)):
    dados = payload.get("data", {})
    order_sn = dados.get("ordersn")
    
    if order_sn == "TESTE-001":
        sku_simulado = dados.get("sku")
        qtd_simulada = dados.get("quantidade", 1)
        
        produto = db.query(models_domain.Produto).filter_by(sku=sku_simulado).first()
        if produto:
            produto.quantidade_estoque -= qtd_simulada
            db.commit()
            return {"status": "sucesso", "estoque_restante": produto.quantidade_estoque}
        else:
            return {"status": "erro", "motivo": f"SKU '{sku_simulado}' não encontrado."}
            
    return {"status": "recebido_sem_acao"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)