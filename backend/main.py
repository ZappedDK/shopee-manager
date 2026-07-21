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
from services.financeiro import calcular_metricas_plataforma

# Cria as tabelas no banco de dados fisicamente
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Shopee & TikTok Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Na V2, mudaremos para a URL real do front-end
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "Sistema de Controle de Estoque Operante!"}

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