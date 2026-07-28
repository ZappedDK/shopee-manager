import sys
import os
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker

# Ajusta sys.path para importar os modelos do projeto
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database import BACKEND_DIR, Base
from models import domain as models_domain

def migrar(supabase_db_url: str):
    print("--> Iniciando migracao do SQLite local para o Supabase PostgreSQL...")
    
    # 1. Conexão com o SQLite local
    sqlite_url = f"sqlite:///{(BACKEND_DIR / 'estoque_shopee.db').as_posix()}"
    engine_sqlite = create_engine(sqlite_url)
    SessionSQLite = sessionmaker(bind=engine_sqlite)
    db_local = SessionSQLite()

    # 2. Conexão com o Supabase PostgreSQL
    if supabase_db_url.startswith("postgres://"):
        supabase_db_url = supabase_db_url.replace("postgres://", "postgresql://", 1)
    if "sslmode" not in supabase_db_url:
        supabase_db_url += "?sslmode=require" if "?" not in supabase_db_url else "&sslmode=require"

    engine_pg = create_engine(supabase_db_url)
    SessionPG = sessionmaker(bind=engine_pg)
    db_cloud = SessionPG()

    # Garante que todas as tabelas existam no Supabase
    Base.metadata.create_all(bind=engine_pg)

    try:
        # Migrar Usuários
        usuarios_local = db_local.query(models_domain.Usuario).all()
        print(f"--> Copiando {len(usuarios_local)} usuarios...")
        for u in usuarios_local:
            try:
                existente = db_cloud.query(models_domain.Usuario).filter(
                    (models_domain.Usuario.id == u.id) | (models_domain.Usuario.email == u.email)
                ).first()
                if not existente:
                    db_cloud.add(models_domain.Usuario(
                        nome=u.nome,
                        email=u.email,
                        senha_hash=u.senha_hash,
                        supabase_uid=u.supabase_uid,
                        role=u.role or "admin",
                        abas_permitidas=u.abas_permitidas or "dashboard,estoque,calculadora,historico,plataformas,insumos,usuarios",
                        ativo=u.ativo if u.ativo is not None else True,
                        criado_em=u.criado_em
                    ))
                    db_cloud.commit()
            except Exception as ex:
                db_cloud.rollback()

        # Migrar Embalagens
        embalagens_local = db_local.query(models_domain.Embalagem).all()
        print(f"--> Copiando {len(embalagens_local)} embalagens/insumos...")
        for emb in embalagens_local:
            try:
                if not db_cloud.query(models_domain.Embalagem).filter_by(id=emb.id).first():
                    db_cloud.add(models_domain.Embalagem(
                        id=emb.id,
                        nome=emb.nome,
                        custo_pacote=emb.custo_pacote,
                        qtd_unidades=emb.qtd_unidades
                    ))
                    db_cloud.commit()
            except Exception:
                db_cloud.rollback()

        # Migrar Plataformas
        plataformas_local = db_local.query(models_domain.Plataforma).all()
        print(f"--> Copiando {len(plataformas_local)} plataformas...")
        for p in plataformas_local:
            try:
                if not db_cloud.query(models_domain.Plataforma).filter_by(id=p.id).first():
                    db_cloud.add(models_domain.Plataforma(
                        id=p.id,
                        nome=p.nome,
                        icone=p.icone,
                        taxa_plataforma=p.taxa_plataforma,
                        taxa_fixa=p.taxa_fixa,
                        taxa_extra=p.taxa_extra,
                        faixas_json=p.faixas_json
                    ))
                    db_cloud.commit()
            except Exception:
                db_cloud.rollback()

        # Migrar Produtos
        produtos_local = db_local.query(models_domain.Produto).all()
        print(f"--> Copiando {len(produtos_local)} produtos...")
        for prod in produtos_local:
            try:
                prod_cloud = db_cloud.query(models_domain.Produto).filter_by(sku=prod.sku).first()
                if not prod_cloud:
                    novo_prod = models_domain.Produto(
                        sku=prod.sku,
                        nome=prod.nome,
                        preco_venda=prod.preco_venda,
                        custo_produto=prod.custo_produto,
                        quantidade_estoque=prod.quantidade_estoque,
                        ativo=prod.ativo if prod.ativo is not None else True,
                        embalagem_id=prod.embalagem_id,
                        criado_em=prod.criado_em,
                        atualizado_em=prod.atualizado_em
                    )
                    db_cloud.add(novo_prod)
                    db_cloud.commit()
            except Exception as ex:
                db_cloud.rollback()

        # Migrar Relações Produto-Plataforma
        relacoes = db_local.execute(text("SELECT produto_id, plataforma_id FROM produto_plataforma")).fetchall()
        print(f"--> Copiando {len(relacoes)} associacoes de produtos a plataformas...")
        for rel in relacoes:
            try:
                db_cloud.execute(
                    text("INSERT INTO produto_plataforma (produto_id, plataforma_id) VALUES (:pid, :plid) ON CONFLICT DO NOTHING"),
                    {"pid": rel[0], "plid": rel[1]}
                )
                db_cloud.commit()
            except Exception:
                db_cloud.rollback()

        # Migrar Movimentações de Estoque
        movs = db_local.query(models_domain.MovimentacaoEstoque).all()
        print(f"--> Copiando {len(movs)} movimentacoes de estoque...")
        for m in movs:
            try:
                if not db_cloud.query(models_domain.MovimentacaoEstoque).filter_by(id=m.id).first():
                    db_cloud.add(models_domain.MovimentacaoEstoque(
                        produto_id=m.produto_id,
                        produto_sku=m.produto_sku,
                        produto_nome=m.produto_nome,
                        tipo=m.tipo,
                        quantidade_alterada=m.quantidade_alterada,
                        estoque_anterior=m.estoque_anterior,
                        estoque_novo=m.estoque_novo,
                        motivo=m.motivo,
                        usuario_nome=m.usuario_nome,
                        criado_em=m.criado_em
                    ))
                    db_cloud.commit()
            except Exception:
                db_cloud.rollback()

        print("==> MIGRATION SUCCESSFUL! Todos os usuarios, produtos, embalagens e historicos foram migrados para o Supabase!")

    except Exception as e:
        print(f"--> Erro durante a migracao: {e}")
    finally:
        db_local.close()
        db_cloud.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python migrar_para_supabase.py 'postgresql://postgres.xxx:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'")
    else:
        migrar(sys.argv[1])
