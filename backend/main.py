from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from pydantic import BaseModel
import uvicorn
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import io
import csv
import openpyxl
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database import engine, get_db, Base
from models import domain as models_domain
from schemas import domain as schemas_domain
from services.financeiro import calcular_metricas_plataforma, calcular_preco_por_margem, limpar_cache_financeiro
from services.shopee_api import ShopeeClient, extrair_itens_do_webhook
from services.tiktok_api import TikTokShopClient, extrair_itens_do_webhook_tiktok

def obter_ou_criar_etiqueta_padrao(db: Session):
    etiqueta = db.query(models_domain.ConfiguracaoGlobal).filter_by(chave="etiqueta_padrao").first()
    if not etiqueta:
        etiqueta = models_domain.ConfiguracaoGlobal(
            chave="etiqueta_padrao",
            valor_pacote=4.0,
            qtd_unidades=100
        )
        db.add(etiqueta)
        db.commit()
        db.refresh(etiqueta)
    return etiqueta

# Cria as tabelas no banco de dados fisicamente se não existirem
try:
    print(f"--> [DATABASE STARTUP] Inicializando conexão ({engine.url.drivername})...")
    Base.metadata.create_all(bind=engine)
    print("--> [DATABASE STARTUP] Tabelas validadas com sucesso!")
except Exception as err:
    print(f"❌ [DATABASE ERROR] Erro na inicialização do banco: {err}")

# Auto-migração genérica (compatível com SQLite e PostgreSQL)
try:
    inspector = inspect(engine)
    if inspector.has_table("plataformas"):
        columns_plat = [col["name"] for col in inspector.get_columns("plataformas")]
        if "faixas_json" not in columns_plat:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE plataformas ADD COLUMN faixas_json VARCHAR(2000)"))
            print("✅ Coluna faixas_json adicionada à tabela plataformas!")

    if inspector.has_table("produtos"):
        columns_prod = [col["name"] for col in inspector.get_columns("produtos")]
        if "ativo" not in columns_prod:
            with engine.begin() as conn:
                default_val = "1" if engine.url.drivername.startswith("sqlite") else "TRUE"
                conn.execute(text(f"ALTER TABLE produtos ADD COLUMN ativo BOOLEAN DEFAULT {default_val}"))
            print("✅ Coluna ativo adicionada à tabela produtos!")

    if inspector.has_table("configuracoes_globais"):
        columns_cfg = [col["name"] for col in inspector.get_columns("configuracoes_globais")]
        if "valor_texto" not in columns_cfg:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE configuracoes_globais ADD COLUMN valor_texto VARCHAR(500)"))
            print("✅ Coluna valor_texto adicionada à tabela configuracoes_globais!")

    if inspector.has_table("usuarios"):
        columns_user = [col["name"] for col in inspector.get_columns("usuarios")]
        with engine.begin() as conn:
            if "role" not in columns_user:
                conn.execute(text("ALTER TABLE usuarios ADD COLUMN role VARCHAR(30) DEFAULT 'admin'"))
            if "abas_permitidas" not in columns_user:
                conn.execute(text("ALTER TABLE usuarios ADD COLUMN abas_permitidas VARCHAR(500) DEFAULT 'dashboard,estoque,calculadora,historico,plataformas,insumos,usuarios'"))
            if "ativo" not in columns_user:
                default_val = "1" if engine.url.drivername.startswith("sqlite") else "TRUE"
                conn.execute(text(f"ALTER TABLE usuarios ADD COLUMN ativo BOOLEAN DEFAULT {default_val}"))
            if "supabase_uid" not in columns_user:
                conn.execute(text("ALTER TABLE usuarios ADD COLUMN supabase_uid VARCHAR(255)"))

    # Tratamento específico para SQLite legado caso a coluna embalagem_id estivesse marcada como NOT NULL
    if engine.url.drivername.startswith("sqlite") and inspector.has_table("produtos"):
        columns_prod_details = inspector.get_columns("produtos")
        emb_col = next((c for c in columns_prod_details if c["name"] == 'embalagem_id'), None)
        if emb_col and not emb_col.get("nullable", True):
            with engine.begin() as conn:
                conn.execute(text("PRAGMA foreign_keys=OFF;"))
                conn.execute(text("CREATE TABLE produtos_migration_tmp AS SELECT * FROM produtos;"))
                conn.execute(text("DROP TABLE produtos;"))
            Base.metadata.create_all(bind=engine)
            with engine.begin() as conn:
                conn.execute(text("""
                    INSERT INTO produtos (id, sku, nome, preco_venda, custo_produto, quantidade_estoque, embalagem_id, criado_em, atualizado_em)
                    SELECT id, sku, nome, preco_venda, custo_produto, quantidade_estoque, embalagem_id, criado_em, atualizado_em FROM produtos_migration_tmp;
                """))
                conn.execute(text("DROP TABLE produtos_migration_tmp;"))
                conn.execute(text("PRAGMA foreign_keys=ON;"))
except Exception as e:
    print(f"Aviso ao verificar migração de banco: {e}")


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
    get_current_user,
    exigir_admin,
    exigir_editor_ou_admin,
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
    
    total_usuarios = db.query(models_domain.Usuario).count()
    role_inicial = "admin" if total_usuarios == 0 else "viewer"
    abas_iniciais = "dashboard,estoque,calculadora,historico,plataformas,insumos,usuarios" if total_usuarios == 0 else "dashboard,estoque,calculadora"

    novo_usuario = models_domain.Usuario(
        nome=dados.nome,
        email=dados.email.lower(),
        senha_hash=gerar_hash_senha(dados.senha),
        role=role_inicial,
        abas_permitidas=abas_iniciais,
        ativo=True
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

@app.post("/auth/login", response_model=schemas_domain.TokenResponse, tags=["Autenticação"])
def login(dados: schemas_domain.LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(models_domain.Usuario).filter_by(email=dados.email.lower()).first()
    if not usuario or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(status_code=400, detail="E-mail ou senha incorretos.")
    
    token = criar_token_acesso(dados={"sub": str(usuario.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": usuario
    }

@app.post("/auth/google", response_model=schemas_domain.TokenResponse, tags=["Autenticação"])
def autenticar_google(dados: schemas_domain.GoogleAuthRequest, db: Session = Depends(get_db)):
    usuario = db.query(models_domain.Usuario).filter_by(email=dados.email.lower()).first()
    
    if not usuario:
        total_usuarios = db.query(models_domain.Usuario).count()
        role_inicial = "admin" if total_usuarios == 0 else "viewer"
        abas_iniciais = "dashboard,estoque,calculadora,historico,plataformas,insumos,usuarios" if total_usuarios == 0 else "dashboard,estoque,calculadora"

        usuario = models_domain.Usuario(
            nome=dados.nome,
            email=dados.email.lower(),
            supabase_uid=dados.supabase_uid,
            role=role_inicial,
            abas_permitidas=abas_iniciais,
            ativo=True
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
    else:
        if not usuario.supabase_uid:
            usuario.supabase_uid = dados.supabase_uid
            db.commit()
            db.refresh(usuario)
            
    if not usuario.ativo:
        raise HTTPException(status_code=403, detail="Sua conta está desativada. Entre em contato com o administrador.")
        
    token = criar_token_acesso(dados={"sub": str(usuario.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": usuario
    }

# --- GESTÃO DE USUÁRIOS (ADMIN) ---
@app.get("/usuarios", response_model=List[schemas_domain.UsuarioResponse], tags=["Gestão de Usuários"])
def listar_usuarios(db: Session = Depends(get_db), _admin: models_domain.Usuario = Depends(exigir_admin)):
    return db.query(models_domain.Usuario).order_by(models_domain.Usuario.id.asc()).all()

@app.patch("/usuarios/{usuario_id}", response_model=schemas_domain.UsuarioResponse, tags=["Gestão de Usuários"])
def atualizar_usuario(usuario_id: int, dados: schemas_domain.UsuarioUpdate, db: Session = Depends(get_db), _admin: models_domain.Usuario = Depends(exigir_admin)):
    usuario = db.query(models_domain.Usuario).filter_by(id=usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        
    if dados.nome is not None:
        usuario.nome = dados.nome
    if dados.role is not None:
        usuario.role = dados.role
    if dados.abas_permitidas is not None:
        usuario.abas_permitidas = dados.abas_permitidas
    if dados.ativo is not None:
        usuario.ativo = dados.ativo
        
    db.commit()
    db.refresh(usuario)
    return usuario

@app.delete("/usuarios/{usuario_id}", tags=["Gestão de Usuários"])
def excluir_usuario(usuario_id: int, db: Session = Depends(get_db), _admin: models_domain.Usuario = Depends(exigir_admin)):
    usuario = db.query(models_domain.Usuario).filter_by(id=usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        
    db.delete(usuario)
    db.commit()
    return {"status": "sucesso", "mensagem": "Usuário excluído com sucesso."}

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
def cadastrar_plataforma(plat: schemas_domain.PlataformaCreate, db: Session = Depends(get_db), _admin: models_domain.Usuario = Depends(exigir_admin)):
    dados = plat.model_dump()
    faixas_lista = dados.pop("faixas", [])
    
    if faixas_lista and len(faixas_lista) > 0:
        dados["faixas_json"] = json.dumps(faixas_lista)
        dados["taxa_plataforma"] = faixas_lista[0].get("taxa_percentual", 0.0)
        if dados["taxa_plataforma"] > 1.0: dados["taxa_plataforma"] /= 100.0
        dados["taxa_fixa"] = faixas_lista[0].get("taxa_fixa", 0.0)

    nova = models_domain.Plataforma(**dados)
    db.add(nova)
    db.commit()
    limpar_cache_financeiro()
    return {"status": "sucesso"}

@app.get("/plataformas/", tags=["Cadastros"])
def listar_plataformas(db: Session = Depends(get_db)):
    plataformas = db.query(models_domain.Plataforma).all()
    resultado = []
    for p in plataformas:
        faixas = []
        if p.faixas_json:
            try:
                faixas = json.loads(p.faixas_json)
            except Exception:
                faixas = []
        p_dict = {
            "id": p.id,
            "nome": p.nome,
            "icone": p.icone,
            "taxa_plataforma": p.taxa_plataforma,
            "taxa_fixa": p.taxa_fixa,
            "taxa_extra": p.taxa_extra,
            "faixas_json": p.faixas_json,
            "faixas": faixas
        }
        resultado.append(p_dict)
    return resultado

@app.put("/plataformas/{id}", tags=["Cadastros"])
def editar_plataforma(id: int, plat: schemas_domain.PlataformaCreate, db: Session = Depends(get_db), _admin: models_domain.Usuario = Depends(exigir_admin)):
    plataforma = db.query(models_domain.Plataforma).filter_by(id=id).first()
    if not plataforma:
        raise HTTPException(status_code=404, detail="Plataforma não encontrada.")

    dados = plat.model_dump()
    faixas_lista = dados.pop("faixas", [])
    
    if faixas_lista and len(faixas_lista) > 0:
        dados["faixas_json"] = json.dumps(faixas_lista)
        dados["taxa_plataforma"] = faixas_lista[0].get("taxa_percentual", 0.0)
        if dados["taxa_plataforma"] > 1.0: dados["taxa_plataforma"] /= 100.0
        dados["taxa_fixa"] = faixas_lista[0].get("taxa_fixa", 0.0)
    else:
        dados["faixas_json"] = None

    for campo, valor in dados.items():
        setattr(plataforma, campo, valor)

    db.commit()
    limpar_cache_financeiro()
    return {"status": "sucesso"}

@app.delete("/plataformas/{id}", tags=["Cadastros"])
def deletar_plataforma(id: int, db: Session = Depends(get_db), _admin: models_domain.Usuario = Depends(exigir_admin)):
    plataforma = db.query(models_domain.Plataforma).filter_by(id=id).first()
    if not plataforma:
        raise HTTPException(status_code=404, detail="Plataforma não encontrada.")

    plataforma.produtos = []
    db.delete(plataforma)
    db.commit()
    limpar_cache_financeiro()
    return {"status": "sucesso", "mensagem": "Plataforma excluída com sucesso!"}

# --- ROTAS DE INSUMOS E CONFIGURAÇÕES ---
@app.post("/embalagens/", tags=["Cadastros"])
def cadastrar_embalagem(embalagem: schemas_domain.EmbalagemCreate, db: Session = Depends(get_db), _user: models_domain.Usuario = Depends(exigir_editor_ou_admin)):
    nova_embalagem = models_domain.Embalagem(**embalagem.model_dump())
    db.add(nova_embalagem)
    db.commit()
    limpar_cache_financeiro()
    return {"status": "sucesso"}

@app.get("/embalagens/", tags=["Cadastros"])
def listar_embalagens(db: Session = Depends(get_db)):
    return db.query(models_domain.Embalagem).all()

@app.put("/embalagens/{id}", tags=["Cadastros"])
def editar_embalagem(id: int, dados: schemas_domain.EmbalagemCreate, db: Session = Depends(get_db), _user: models_domain.Usuario = Depends(exigir_editor_ou_admin)):
    emb = db.query(models_domain.Embalagem).filter_by(id=id).first()
    if not emb:
        raise HTTPException(status_code=404, detail="Embalagem não encontrada.")
    emb.nome = dados.nome
    emb.custo_pacote = dados.custo_pacote
    emb.qtd_unidades = dados.qtd_unidades
    db.commit()
    limpar_cache_financeiro()
    return {"status": "sucesso", "embalagem": emb.nome}

@app.post("/configuracoes/", tags=["Cadastros"])
def salvar_configuracao_global(config: schemas_domain.ConfiguracaoGlobalCreate, db: Session = Depends(get_db), _user: models_domain.Usuario = Depends(exigir_editor_ou_admin)):
    item = db.query(models_domain.ConfiguracaoGlobal).filter_by(chave=config.chave).first()
    if item:
        item.valor_pacote = config.valor_pacote
        item.qtd_unidades = config.qtd_unidades
    else:
        item = models_domain.ConfiguracaoGlobal(**config.model_dump())
        db.add(item)
    db.commit()
    limpar_cache_financeiro()
    return {"status": "sucesso"}

@app.get("/configuracoes/", tags=["Cadastros"])
def listar_configuracoes(db: Session = Depends(get_db)):
    return db.query(models_domain.ConfiguracaoGlobal).all()

@app.delete("/embalagens/{id}", tags=["Cadastros"])
def deletar_embalagem(id: int, db: Session = Depends(get_db), _user: models_domain.Usuario = Depends(exigir_editor_ou_admin)):
    embalagem = db.query(models_domain.Embalagem).filter_by(id=id).first()
    if not embalagem: 
        raise HTTPException(status_code=404, detail="Não encontrada")
    # Desvincula produtos sem deletar os produtos (assumem Caixa Propria / Sem Embalagem)
    db.query(models_domain.Produto).filter_by(embalagem_id=id).update({"embalagem_id": None})
    db.delete(embalagem)
    db.commit()
    return {"status": "sucesso"}

# --- HELPER DE AUDITORIA DE ESTOQUE ---
def registrar_movimentacao(
    db: Session,
    produto_id: int,
    produto_sku: str,
    produto_nome: str,
    tipo: str,
    qtd_alterada: int,
    estoque_ant: int,
    estoque_novo: int,
    motivo: str,
    usuario_nome: str = "Administrador"
):
    mov = models_domain.MovimentacaoEstoque(
        produto_id=produto_id,
        produto_sku=produto_sku,
        produto_nome=produto_nome,
        tipo=tipo,
        quantidade_alterada=qtd_alterada,
        estoque_anterior=estoque_ant,
        estoque_novo=estoque_novo,
        motivo=motivo,
        usuario_nome=usuario_nome
    )
    db.add(mov)

# --- ROTAS DE PRODUTOS E ESTOQUE ---
@app.post("/produtos/", tags=["Estoque"])
def cadastrar_produto(produto_data: schemas_domain.ProdutoCreate, db: Session = Depends(get_db), current_user: models_domain.Usuario = Depends(exigir_editor_ou_admin)):
    if produto_data.embalagem_id:
        if not db.query(models_domain.Embalagem).filter_by(id=produto_data.embalagem_id).first():
            raise HTTPException(status_code=404, detail="Embalagem não encontrada.")
    else:
        produto_data.embalagem_id = None
        
    plataformas_selecionadas = db.query(models_domain.Plataforma).filter(models_domain.Plataforma.id.in_(produto_data.plataformas_ids)).all()

    try:
        dados_dict = produto_data.model_dump(exclude={"plataformas_ids"})
        novo_produto = models_domain.Produto(**dados_dict)
        novo_produto.plataformas = plataformas_selecionadas
        
        db.add(novo_produto)
        db.commit()
        db.refresh(novo_produto)

        # Grava o histórico inicial
        if novo_produto.quantidade_estoque > 0:
            registrar_movimentacao(
                db=db,
                produto_id=novo_produto.id,
                produto_sku=novo_produto.sku,
                produto_nome=novo_produto.nome,
                tipo="ENTRADA",
                qtd_alterada=novo_produto.quantidade_estoque,
                estoque_ant=0,
                estoque_novo=novo_produto.quantidade_estoque,
                motivo="Cadastro inicial do produto",
                usuario_nome=current_user.nome
            )
            db.commit()

        return {"status": "sucesso"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"O SKU '{produto_data.sku}' já existe.")

@app.put("/produtos/{sku}", tags=["Estoque"])
def editar_produto(sku: str, dados: schemas_domain.ProdutoUpdate, db: Session = Depends(get_db), current_user: models_domain.Usuario = Depends(exigir_editor_ou_admin)):
    prod_id = int(sku) if sku.isdigit() else -1
    produto = db.query(models_domain.Produto).filter(
        (models_domain.Produto.sku.ilike(sku)) | (models_domain.Produto.id == prod_id)
    ).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    if dados.embalagem_id:
        if not db.query(models_domain.Embalagem).filter_by(id=dados.embalagem_id).first():
            raise HTTPException(status_code=404, detail="Embalagem informada não existe.")
    else:
        dados.embalagem_id = None

    plataformas_selecionadas = db.query(models_domain.Plataforma).filter(models_domain.Plataforma.id.in_(dados.plataformas_ids)).all()

    estoque_ant = produto.quantidade_estoque
    estoque_novo = dados.quantidade_estoque
    custo_ant = produto.custo_produto

    produto.nome = dados.nome
    produto.preco_venda = dados.preco_venda
    produto.custo_produto = dados.custo_produto
    produto.quantidade_estoque = dados.quantidade_estoque
    produto.ativo = dados.ativo if dados.ativo is not None else True
    produto.embalagem_id = dados.embalagem_id
    produto.plataformas = plataformas_selecionadas

    if estoque_ant != estoque_novo:
        diferenca = estoque_novo - estoque_ant
        tipo_mov = "ENTRADA" if diferenca > 0 else "SAIDA"
        motivo_str = dados.motivo_ajuste or "Edição manual de estoque/custo"
        registrar_movimentacao(
            db=db,
            produto_id=produto.id,
            produto_sku=produto.sku,
            produto_nome=produto.nome,
            tipo=tipo_mov,
            qtd_alterada=abs(diferenca),
            estoque_ant=estoque_ant,
            estoque_novo=estoque_novo,
            motivo=motivo_str,
            usuario_nome=current_user.nome
        )
    elif custo_ant != dados.custo_produto:
        registrar_movimentacao(
            db=db,
            produto_id=produto.id,
            produto_sku=produto.sku,
            produto_nome=produto.nome,
            tipo="AJUSTE",
            qtd_alterada=0,
            estoque_ant=estoque_ant,
            estoque_novo=estoque_novo,
            motivo=f"Reajuste de Custo (R$ {custo_ant:.2f} -> R$ {dados.custo_produto:.2f})",
            usuario_nome=current_user.nome
        )

    db.commit()
    return {"status": "sucesso", "produto": produto.nome}

@app.delete("/produtos/{sku}", tags=["Estoque"])
def deletar_produto(sku: str, db: Session = Depends(get_db), _user: models_domain.Usuario = Depends(exigir_editor_ou_admin)):
    produto = db.query(models_domain.Produto).filter_by(sku=sku).first()
    if not produto: 
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    db.delete(produto)
    db.commit()
    return {"status": "sucesso"}

@app.patch("/produtos/{sku}/status", tags=["Estoque"])
def alterar_status_produto(sku: str, db: Session = Depends(get_db), _user: models_domain.Usuario = Depends(exigir_editor_ou_admin)):
    produto = db.query(models_domain.Produto).filter_by(sku=sku).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    produto.ativo = not produto.ativo if produto.ativo is not None else False
    db.commit()
    return {"status": "sucesso", "ativo": produto.ativo, "produto": produto.nome}

class AjusteEstoque(BaseModel):
    novo_estoque: int
    motivo: Optional[str] = "Ajuste manual de estoque"

# --- PROCESSAMENTO E IMPORTAÇÃO EM MASSA DE PRODUTOS ---
def processar_linhas_planilha(linhas: List[dict], modo_duplicados: str, db: Session):
    total = len(linhas)
    criados = 0
    atualizados = 0
    pulados = 0
    erros = []

    embalagem_padrao = db.query(models_domain.Embalagem).first()
    if not embalagem_padrao:
        raise HTTPException(status_code=400, detail="Cadastre ao menos uma Embalagem no sistema antes de importar produtos.")

    todas_embalagens = db.query(models_domain.Embalagem).all()
    todas_plataformas = db.query(models_domain.Plataforma).all()

    for idx, row in enumerate(linhas, start=2):
        sku = str(row.get("sku") or row.get("SKU") or "").strip()
        nome = str(row.get("nome") or row.get("NOME") or row.get("Nome") or "").strip()
        preco_raw = str(row.get("preco_venda") or row.get("preco") or row.get("PRECO_VENDA") or row.get("Preço Venda") or "0").strip()
        custo_raw = str(row.get("custo_produto") or row.get("custo") or row.get("CUSTO_PRODUTO") or row.get("Custo Produto") or "0").strip()
        estoque_raw = str(row.get("quantidade_estoque") or row.get("estoque") or row.get("QUANTIDADE_ESTOQUE") or row.get("Estoque") or "0").strip()
        emb_raw = str(row.get("embalagem") or row.get("EMBALAGEM") or row.get("Embalagem") or "").strip()
        plat_raw = str(row.get("plataformas") or row.get("PLATAFORMAS") or row.get("Plataformas") or "").strip()

        if not sku or not nome:
            erros.append(f"Linha {idx}: SKU e Nome são obrigatórios.")
            continue

        try:
            preco_venda = float(preco_raw.replace('R$', '').replace(' ', '').replace(',', '.'))
            custo_produto = float(custo_raw.replace('R$', '').replace(' ', '').replace(',', '.'))
            quantidade_estoque = int(float(estoque_raw.replace(',', '.')))
        except ValueError:
            erros.append(f"Linha {idx} (SKU: {sku}): Valores numéricos inválidos para Preço, Custo ou Estoque.")
            continue

        if preco_venda <= 0 or custo_produto <= 0:
            erros.append(f"Linha {idx} (SKU: {sku}): Preço de Venda e Custo devem ser maiores que zero.")
            continue

        embalagem_target = embalagem_padrao
        if emb_raw:
            encontrada = next((e for e in todas_embalagens if e.nome.lower() == emb_raw.lower()), None)
            if encontrada:
                embalagem_target = encontrada

        plataformas_target = todas_plataformas
        if plat_raw:
            nomes_plats = [p.strip().lower() for p in plat_raw.split(',') if p.strip()]
            encontradas = [p for p in todas_plataformas if p.nome.lower() in nomes_plats]
            if encontradas:
                plataformas_target = encontradas

        produto_existente = db.query(models_domain.Produto).filter_by(sku=sku).first()

        if produto_existente:
            if modo_duplicados == "pular":
                pulados += 1
                continue
            
            est_ant = produto_existente.quantidade_estoque
            custo_ant = produto_existente.custo_produto

            produto_existente.nome = nome
            produto_existente.preco_venda = preco_venda
            produto_existente.custo_produto = custo_produto
            produto_existente.quantidade_estoque = quantidade_estoque
            produto_existente.embalagem_id = embalagem_target.id
            produto_existente.plataformas = plataformas_target

            if est_ant != quantidade_estoque:
                dif = quantidade_estoque - est_ant
                registrar_movimentacao(
                    db=db,
                    produto_id=produto_existente.id,
                    produto_sku=sku,
                    produto_nome=nome,
                    tipo="ENTRADA" if dif > 0 else "SAIDA",
                    qtd_alterada=abs(dif),
                    estoque_ant=est_ant,
                    estoque_novo=quantidade_estoque,
                    motivo="Importação via Planilha (Atualização)",
                    usuario_nome="Administrador (Planilha)"
                )
            elif custo_ant != custo_produto:
                registrar_movimentacao(
                    db=db,
                    produto_id=produto_existente.id,
                    produto_sku=sku,
                    produto_nome=nome,
                    tipo="AJUSTE",
                    qtd_alterada=0,
                    estoque_ant=est_ant,
                    estoque_novo=quantidade_estoque,
                    motivo=f"Reajuste de Custo via Planilha (R$ {custo_ant:.2f} -> R$ {custo_produto:.2f})",
                    usuario_nome="Administrador (Planilha)"
                )
            atualizados += 1
        else:
            novo_prod = models_domain.Produto(
                sku=sku,
                nome=nome,
                preco_venda=preco_venda,
                custo_produto=custo_produto,
                quantidade_estoque=quantidade_estoque,
                embalagem_id=embalagem_target.id
            )
            novo_prod.plataformas = plataformas_target
            db.add(novo_prod)
            db.commit()
            db.refresh(novo_prod)

            if quantidade_estoque > 0:
                registrar_movimentacao(
                    db=db,
                    produto_id=novo_prod.id,
                    produto_sku=sku,
                    produto_nome=nome,
                    tipo="ENTRADA",
                    qtd_alterada=quantidade_estoque,
                    estoque_ant=0,
                    estoque_novo=quantidade_estoque,
                    motivo="Importação via Planilha (Novo Produto)",
                    usuario_nome="Administrador (Planilha)"
                )
            criados += 1

    db.commit()

    return {
        "sucesso": True,
        "total_processados": total,
        "criados": criados,
        "atualizados": atualizados,
        "pulados": pulados,
        "erros": erros
    }

@app.get("/produtos/modelo-importacao", tags=["Estoque"])
def baixar_modelo_importacao():
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["sku", "nome", "preco_venda", "custo_produto", "quantidade_estoque", "embalagem", "plataformas"])
    writer.writerow(["CAM-PRETA-01", "Camiseta Algodão Premium Preta", "49,90", "22,50", "50", "Caixa P", "Shopee, Mercado Livre"])
    writer.writerow(["BONE-ABA-CURVA", "Boné Strapback Sarja Preto", "39,90", "15,00", "30", "Caixa P", "Shopee"])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=modelo_importacao_produtos.csv"}
    )

@app.post("/produtos/importar", tags=["Estoque"])
async def importar_produtos_planilha(
    file: UploadFile = File(...),
    modo_duplicados: str = Form("atualizar"),
    db: Session = Depends(get_db),
    _user: models_domain.Usuario = Depends(exigir_editor_ou_admin)
):
    filename = file.filename.lower()
    content = await file.read()

    linhas = []

    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        wb = openpyxl.load_workbook(filename=io.BytesIO(content), data_only=True)
        sheet = wb.active
        rows = list(sheet.iter_rows(values_only=True))
        if not rows or len(rows) < 2:
            raise HTTPException(status_code=400, detail="A planilha informada está vazia ou sem dados de produtos.")

        headers = [str(cell).strip().lower() if cell is not None else "" for cell in rows[0]]
        for row in rows[1:]:
            if not any(row):
                continue
            row_dict = {}
            for h, val in zip(headers, row):
                if h:
                    row_dict[h] = val
            linhas.append(row_dict)

    elif filename.endswith(".csv") or filename.endswith(".txt"):
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = content.decode("latin-1")

        lines = [l for l in text.splitlines() if l.strip()]
        if not lines:
            raise HTTPException(status_code=400, detail="O arquivo CSV está vazio.")

        delimiter = ';' if ';' in lines[0] else ','
        reader = csv.DictReader(lines, delimiter=delimiter)
        for row in reader:
            row_normalized = {str(k).strip().lower(): v for k, v in row.items() if k}
            linhas.append(row_normalized)
    else:
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Formatos suportados: .xlsx, .xls, .csv")

    if not linhas:
        raise HTTPException(status_code=400, detail="Nenhum produto válido encontrado no arquivo enviado.")

    return processar_linhas_planilha(linhas, modo_duplicados, db)

@app.patch("/produtos/{sku}/estoque", tags=["Estoque"])
def ajustar_estoque_manual(sku: str, ajuste: AjusteEstoque, db: Session = Depends(get_db), current_user: models_domain.Usuario = Depends(exigir_editor_ou_admin)):
    produto = db.query(models_domain.Produto).filter_by(sku=sku).first()
    if not produto:
        raise HTTPException(status_code=404, detail="SKU não encontrado no sistema.")
    
    estoque_ant = produto.quantidade_estoque
    estoque_novo = ajuste.novo_estoque
    diferenca = estoque_novo - estoque_ant
    produto.quantidade_estoque = estoque_novo

    if diferenca != 0:
        tipo_mov = "ENTRADA" if diferenca > 0 else "SAIDA"
        registrar_movimentacao(
            db=db,
            produto_id=produto.id,
            produto_sku=produto.sku,
            produto_nome=produto.nome,
            tipo=tipo_mov,
            qtd_alterada=abs(diferenca),
            estoque_ant=estoque_ant,
            estoque_novo=estoque_novo,
            motivo=ajuste.motivo or "Ajuste manual de estoque",
            usuario_nome=current_user.nome
        )

    db.commit()
    return {"status": "sucesso", "novo_estoque": produto.quantidade_estoque, "produto": produto.nome}

@app.get("/produtos/movimentacoes", tags=["Estoque"])
def listar_movimentacoes_estoque(
    sku: Optional[str] = None,
    tipo: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models_domain.MovimentacaoEstoque)
    if sku:
        query = query.filter(models_domain.MovimentacaoEstoque.produto_sku == sku)
    if tipo:
        query = query.filter(models_domain.MovimentacaoEstoque.tipo == tipo)

    movs = query.order_by(models_domain.MovimentacaoEstoque.criado_em.desc()).limit(250).all()
    
    resultados = []
    for m in movs:
        resultados.append({
            "id": m.id,
            "produto_id": m.produto_id,
            "produto_sku": m.produto_sku,
            "produto_nome": m.produto_nome,
            "tipo": m.tipo,
            "quantidade_alterada": m.quantidade_alterada,
            "estoque_anterior": m.estoque_anterior,
            "estoque_novo": m.estoque_novo,
            "motivo": m.motivo,
            "usuario_nome": m.usuario_nome or "Sistema",
            "criado_em": m.criado_em.strftime("%d/%m/%Y %H:%M") if m.criado_em else ""
        })
    return resultados


@app.get("/produtos/alertas", tags=["Dashboard"])
def alertas_de_estoque(limite: int = 10, db: Session = Depends(get_db)):
    produtos_criticos = db.query(models_domain.Produto).filter(
        models_domain.Produto.quantidade_estoque <= limite,
        models_domain.Produto.ativo != False
    ).all()
    return produtos_criticos

@app.get("/produtos/detalhados", tags=["Estoque"])
def listar_produtos_detalhados(
    page: int = 1,
    limit: Optional[int] = None,
    busca: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models_domain.Produto)

    if status == "ativos":
        query = query.filter(models_domain.Produto.ativo != False)
    elif status == "inativos":
        query = query.filter(models_domain.Produto.ativo == False)

    if busca:
        termo = f"%{busca.strip()}%"
        query = query.filter(
            (models_domain.Produto.sku.ilike(termo)) |
            (models_domain.Produto.nome.ilike(termo))
        )

    total_registros = query.count()

    if limit and limit > 0:
        page_val = max(1, page)
        offset = (page_val - 1) * limit
        produtos = query.order_by(models_domain.Produto.id.desc()).offset(offset).limit(limit).all()
        total_paginas = (total_registros + limit - 1) // limit
    else:
        produtos = query.order_by(models_domain.Produto.id.desc()).all()
        page_val = 1
        total_paginas = 1

    etiqueta = obter_ou_criar_etiqueta_padrao(db)
    resultados = []
    custo_etiq = etiqueta.valor_pacote / etiqueta.qtd_unidades

    for p in produtos:
        custo_emb = (p.embalagem.custo_pacote / p.embalagem.qtd_unidades) if p.embalagem else 0.0
        metricas_multiplas = []
        
        # Calcula as métricas apenas para a página de produtos retornada
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
            "ativo": p.ativo if p.ativo is not None else True,
            "embalagem_id": p.embalagem_id,
            "embalagem_nome": p.embalagem.nome if p.embalagem else "Caixa Própria",
            "valor_estoque": p.quantidade_estoque * p.custo_produto,
            "analises_plataformas": metricas_multiplas
        })
        
    if limit and limit > 0:
        return {
            "total": total_registros,
            "page": page_val,
            "limit": limit,
            "total_pages": total_paginas,
            "produtos": resultados
        }

    return resultados

@app.get("/produtos/{sku}/financeiro", tags=["Inteligência Financeira"])
def relatorio_financeiro_produto(sku: str, db: Session = Depends(get_db)):
    produto = db.query(models_domain.Produto).filter_by(sku=sku).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    
    etiqueta = obter_ou_criar_etiqueta_padrao(db)

    custo_etiq = etiqueta.valor_pacote / etiqueta.qtd_unidades
    custo_emb = (produto.embalagem.custo_pacote / produto.embalagem.qtd_unidades) if produto.embalagem else 0.0

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
    tipo_calculo: str = "margem",
    margem_desejada: float = 20.0,
    preco_venda: Optional[float] = None,
    embalagem_id: Optional[int] = None,
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
        if tipo_calculo == "preco" and preco_venda is not None and preco_venda > 0:
            res = calcular_metricas_plataforma(
                preco_venda=preco_venda,
                custo_unitario=custo_produto,
                custo_embalagem_un=custo_emb,
                custo_etiqueta_un=custo_etiq,
                plataforma=plat
            )
            res["inviavel"] = res["lucro_liquido"] <= 0
            res["preco_sugerido"] = preco_venda
            res["margem_desejada_pct"] = round(res["margem_final"] * 100, 2)
            resultados.append(res)
        else:
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
        "tipo_calculo": tipo_calculo,
        "margem_desejada_pct": margem_desejada if tipo_calculo == "margem" else None,
        "preco_venda_informado": preco_venda if tipo_calculo == "preco" else None,
        "simulacoes": resultados
    }

@app.get("/produtos/{sku}/simular-preco", tags=["Inteligência Financeira"])
def simular_preco_produto_existente(
    sku: str,
    tipo_calculo: str = "margem",
    margem_desejada: float = 20.0,
    preco_venda: Optional[float] = None,
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

    p_venda = preco_venda if (tipo_calculo == "preco" and preco_venda is not None and preco_venda > 0) else produto.preco_venda

    for plat in plataformas_alvo:
        if tipo_calculo == "preco":
            res = calcular_metricas_plataforma(
                preco_venda=p_venda,
                custo_unitario=produto.custo_produto,
                custo_embalagem_un=custo_emb,
                custo_etiqueta_un=custo_etiq,
                plataforma=plat
            )
            res["inviavel"] = res["lucro_liquido"] <= 0
            res["preco_sugerido"] = p_venda
            res["margem_desejada_pct"] = round(res["margem_final"] * 100, 2)
            resultados.append(res)
        else:
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
        "tipo_calculo": tipo_calculo,
        "margem_desejada_pct": margem_desejada if tipo_calculo == "margem" else None,
        "preco_venda_informado": p_venda if tipo_calculo == "preco" else None,
        "simulacoes": resultados
    }


# --- CONFIGURAÇÃO E INTEGRAÇÃO SHOPEE ---
class ShopeeConfigSchema(BaseModel):
    partner_id: Optional[int] = None
    partner_key: Optional[str] = None
    shop_id: Optional[int] = None
    ambiente: Optional[str] = "PRODUCAO"

class SimularVendaShopeeSchema(BaseModel):
    sku: str
    quantidade: int = 1
    order_sn: Optional[str] = None

@app.get("/shopee/config", tags=["Integração Shopee"])
def obter_configuracao_shopee(db: Session = Depends(get_db)):
    configs = db.query(models_domain.ConfiguracaoGlobal).filter(
        models_domain.ConfiguracaoGlobal.chave.in_(["shopee_partner_id", "shopee_partner_key", "shopee_shop_id", "shopee_ambiente"])
    ).all()
    
    cfg_map = {c.chave: c.valor_texto for c in configs}
    return {
        "partner_id": int(cfg_map.get("shopee_partner_id")) if cfg_map.get("shopee_partner_id") and cfg_map.get("shopee_partner_id").isdigit() else None,
        "partner_key": cfg_map.get("shopee_partner_key") or "",
        "shop_id": int(cfg_map.get("shopee_shop_id")) if cfg_map.get("shopee_shop_id") and cfg_map.get("shopee_shop_id").isdigit() else None,
        "ambiente": cfg_map.get("shopee_ambiente") or "PRODUCAO"
    }

@app.post("/shopee/config", tags=["Integração Shopee"])
def salvar_configuracao_shopee(
    dados: ShopeeConfigSchema,
    db: Session = Depends(get_db),
    _user: models_domain.Usuario = Depends(exigir_editor_ou_admin)
):
    mapeamento = {
        "shopee_partner_id": str(dados.partner_id) if dados.partner_id else "",
        "shopee_partner_key": str(dados.partner_key).strip() if dados.partner_key else "",
        "shopee_shop_id": str(dados.shop_id) if dados.shop_id else "",
        "shopee_ambiente": dados.ambiente or "PRODUCAO"
    }

    for chave, valor in mapeamento.items():
        item = db.query(models_domain.ConfiguracaoGlobal).filter_by(chave=chave).first()
        if item:
            item.valor_texto = valor
        else:
            item = models_domain.ConfiguracaoGlobal(chave=chave, valor_texto=valor, valor_pacote=0.0, qtd_unidades=1)
            db.add(item)

    db.commit()
    return {"status": "sucesso", "mensagem": "Credenciais da Shopee salvas com sucesso!"}

@app.post("/webhooks/shopee", tags=["Integração Shopee"])
async def receber_venda_shopee(payload: dict, db: Session = Depends(get_db)):
    """
    Webhook oficial para receber notificações de vendas da Shopee (API v2).
    Extrai SKUs e quantidades vendidas, abatendo automaticamente no Skold Stock.
    """
    import time
    dados = payload.get("data", payload)
    order_sn = str(dados.get("ordersn") or dados.get("order_sn") or f"SN-{int(time.time())}")

    itens = extrair_itens_do_webhook(payload)
    if not itens:
        return {"status": "ignorado", "motivo": "Nenhum SKU/item identificado no payload do webhook"}

    baixados = []
    nao_encontrados = []

    for item in itens:
        sku = item["sku"]
        qtd = item["quantidade"]

        produto = db.query(models_domain.Produto).filter(
            models_domain.Produto.sku.ilike(sku)
        ).first()

        if produto:
            estoque_ant = produto.quantidade_estoque
            produto.quantidade_estoque -= qtd
            estoque_novo = produto.quantidade_estoque

            registrar_movimentacao(
                db=db,
                produto_id=produto.id,
                produto_sku=produto.sku,
                produto_nome=produto.nome,
                tipo="VENDA_WEBHOOK",
                qtd_alterada=qtd,
                estoque_ant=estoque_ant,
                estoque_novo=estoque_novo,
                motivo=f"Baixa automática Venda Shopee #{order_sn}",
                usuario_nome="Shopee Webhook"
            )
            baixados.append({"sku": produto.sku, "nome": produto.nome, "qtd_baixada": qtd, "novo_estoque": estoque_novo})
        else:
            nao_encontrados.append({"sku": sku, "qtd": qtd})

    db.commit()
    return {
        "status": "sucesso",
        "order_sn": order_sn,
        "itens_baixados": baixados,
        "nao_encontrados": nao_encontrados
    }

@app.post("/shopee/simular-venda", tags=["Integração Shopee"])
def simular_venda_shopee(
    dados: SimularVendaShopeeSchema,
    db: Session = Depends(get_db),
    _user: models_domain.Usuario = Depends(exigir_editor_ou_admin)
):
    """
    Simula o recebimento de uma venda da Shopee para testar a baixa de estoque em tempo real.
    """
    import time
    sku_limpo = dados.sku.strip()
    produto = db.query(models_domain.Produto).filter(
        models_domain.Produto.sku.ilike(sku_limpo)
    ).first()

    if not produto:
        raise HTTPException(status_code=404, detail=f"Produto com SKU '{sku_limpo}' não foi encontrado no sistema.")

    order_sn = dados.order_sn or f"SIMULADO-{int(time.time())}"
    qtd = max(1, dados.quantidade)

    estoque_ant = produto.quantidade_estoque
    produto.quantidade_estoque -= qtd
    estoque_novo = produto.quantidade_estoque

    registrar_movimentacao(
        db=db,
        produto_id=produto.id,
        produto_sku=produto.sku,
        produto_nome=produto.nome,
        tipo="VENDA_WEBHOOK",
        qtd_alterada=qtd,
        estoque_ant=estoque_ant,
        estoque_novo=estoque_novo,
        motivo=f"Venda de Teste Shopee #{order_sn}",
        usuario_nome=_user.nome
    )

    db.commit()
    return {
        "status": "sucesso",
        "mensagem": f"Venda de {qtd} un. do SKU '{produto.sku}' processada com sucesso!",
        "order_sn": order_sn,
        "sku": produto.sku,
        "nome": produto.nome,
        "estoque_anterior": estoque_ant,
        "novo_estoque": estoque_novo
    }

# --- CONFIGURAÇÃO E INTEGRAÇÃO TIKTOK SHOP ---
class TikTokConfigSchema(BaseModel):
    app_key: Optional[str] = None
    app_secret: Optional[str] = None
    shop_cipher: Optional[str] = None
    ambiente: Optional[str] = "PRODUCAO"

class SimularVendaTikTokSchema(BaseModel):
    sku: str
    quantidade: int = 1
    order_id: Optional[str] = None

@app.get("/tiktok/config", tags=["Integração TikTok Shop"])
def obter_configuracao_tiktok(db: Session = Depends(get_db)):
    configs = db.query(models_domain.ConfiguracaoGlobal).filter(
        models_domain.ConfiguracaoGlobal.chave.in_(["tiktok_app_key", "tiktok_app_secret", "tiktok_shop_cipher", "tiktok_ambiente"])
    ).all()
    
    cfg_map = {c.chave: c.valor_texto for c in configs}
    return {
        "app_key": cfg_map.get("tiktok_app_key") or "",
        "app_secret": cfg_map.get("tiktok_app_secret") or "",
        "shop_cipher": cfg_map.get("tiktok_shop_cipher") or "",
        "ambiente": cfg_map.get("tiktok_ambiente") or "PRODUCAO"
    }

@app.post("/tiktok/config", tags=["Integração TikTok Shop"])
def salvar_configuracao_tiktok(
    dados: TikTokConfigSchema,
    db: Session = Depends(get_db),
    _user: models_domain.Usuario = Depends(exigir_editor_ou_admin)
):
    mapeamento = {
        "tiktok_app_key": str(dados.app_key).strip() if dados.app_key else "",
        "tiktok_app_secret": str(dados.app_secret).strip() if dados.app_secret else "",
        "tiktok_shop_cipher": str(dados.shop_cipher).strip() if dados.shop_cipher else "",
        "tiktok_ambiente": dados.ambiente or "PRODUCAO"
    }

    for chave, valor in mapeamento.items():
        item = db.query(models_domain.ConfiguracaoGlobal).filter_by(chave=chave).first()
        if item:
            item.valor_texto = valor
        else:
            item = models_domain.ConfiguracaoGlobal(chave=chave, valor_texto=valor, valor_pacote=0.0, qtd_unidades=1)
            db.add(item)

    db.commit()
    return {"status": "sucesso", "mensagem": "Credenciais do TikTok Shop salvas com sucesso!"}

@app.post("/webhooks/tiktok", tags=["Integração TikTok Shop"])
async def receber_venda_tiktok(payload: dict, db: Session = Depends(get_db)):
    """
    Webhook oficial para receber notificações de vendas do TikTok Shop.
    Extrai SKUs e quantidades vendidas, abatendo automaticamente no Skold Stock.
    """
    import time
    dados = payload.get("data", payload)
    order_id = str(dados.get("order_id") or dados.get("ordersn") or payload.get("order_id") or f"TT-{int(time.time())}")

    itens = extrair_itens_do_webhook_tiktok(payload)
    if not itens:
        return {"status": "ignorado", "motivo": "Nenhum SKU/item identificado no payload do webhook TikTok"}

    baixados = []
    nao_encontrados = []

    for item in itens:
        sku = item["sku"]
        qtd = item["quantidade"]

        produto = db.query(models_domain.Produto).filter(
            models_domain.Produto.sku.ilike(sku)
        ).first()

        if produto:
            estoque_ant = produto.quantidade_estoque
            produto.quantidade_estoque -= qtd
            estoque_novo = produto.quantidade_estoque

            registrar_movimentacao(
                db=db,
                produto_id=produto.id,
                produto_sku=produto.sku,
                produto_nome=produto.nome,
                tipo="VENDA_WEBHOOK",
                qtd_alterada=qtd,
                estoque_ant=estoque_ant,
                estoque_novo=estoque_novo,
                motivo=f"Baixa automática Venda TikTok Shop #{order_id}",
                usuario_nome="TikTok Webhook"
            )
            baixados.append({"sku": produto.sku, "nome": produto.nome, "qtd_baixada": qtd, "novo_estoque": estoque_novo})
        else:
            nao_encontrados.append({"sku": sku, "qtd": qtd})

    db.commit()
    return {
        "status": "sucesso",
        "order_id": order_id,
        "itens_baixados": baixados,
        "nao_encontrados": nao_encontrados
    }

@app.post("/tiktok/simular-venda", tags=["Integração TikTok Shop"])
def simular_venda_tiktok(
    dados: SimularVendaTikTokSchema,
    db: Session = Depends(get_db),
    _user: models_domain.Usuario = Depends(exigir_editor_ou_admin)
):
    """
    Simula o recebimento de uma venda do TikTok Shop para testar a baixa de estoque em tempo real.
    """
    import time
    sku_limpo = dados.sku.strip()
    produto = db.query(models_domain.Produto).filter(
        models_domain.Produto.sku.ilike(sku_limpo)
    ).first()

    if not produto:
        raise HTTPException(status_code=404, detail=f"Produto com SKU '{sku_limpo}' não foi encontrado no sistema.")

    order_id = dados.order_id or f"TT-SIMULADO-{int(time.time())}"
    qtd = max(1, dados.quantidade)

    estoque_ant = produto.quantidade_estoque
    produto.quantidade_estoque -= qtd
    estoque_novo = produto.quantidade_estoque

    registrar_movimentacao(
        db=db,
        produto_id=produto.id,
        produto_sku=produto.sku,
        produto_nome=produto.nome,
        tipo="VENDA_WEBHOOK",
        qtd_alterada=qtd,
        estoque_ant=estoque_ant,
        estoque_novo=estoque_novo,
        motivo=f"Venda de Teste TikTok Shop #{order_id}",
        usuario_nome=_user.nome
    )

    db.commit()
    return {
        "status": "sucesso",
        "mensagem": f"Venda TikTok Shop de {qtd} un. do SKU '{produto.sku}' processada com sucesso!",
        "order_id": order_id,
        "sku": produto.sku,
        "nome": produto.nome,
        "estoque_anterior": estoque_ant,
        "novo_estoque": estoque_novo
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)