from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware # IMPORTANTE: Adicione esta linha
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uvicorn
from sqlalchemy.exc import IntegrityError

from core.database import engine, get_db
from models import domain as models_domain
from schemas import domain as schemas_domain
from services.financeiro import calcular_metricas_shopee

models_domain.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Estoque Shopee & TikTok")

# CONFIGURAÇÃO DE SEGURANÇA: Permitir que o Front-end comunique com a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # URL do seu React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "Sistema de Controle de Estoque Operante!"}

@app.post("/embalagens/", response_model=schemas_domain.EmbalagemResponse, tags=["Insumos"])
def cadastrar_embalagem(embalagem: schemas_domain.EmbalagemCreate, db: Session = Depends(get_db)):
    nova_emb = models_domain.Embalagem(**embalagem.model_dump())
    db.add(nova_emb)
    db.commit()
    db.refresh(nova_emb)
    return nova_emb

@app.get("/embalagens/", response_model=list[schemas_domain.EmbalagemResponse], tags=["Insumos"])
def listar_embalagens(db: Session = Depends(get_db)):
    """Retorna todas as embalagens cadastradas para popular o Front-end"""
    return db.query(models_domain.Embalagem).all()

@app.post("/configuracoes/", tags=["Sistema"])
def salvar_configuracao_global(config: schemas_domain.ConfiguracaoCreate, db: Session = Depends(get_db)):
    """Use esta rota para salvar o custo da 'etiqueta_padrao'"""
    db_config = db.query(models_domain.ConfiguracaoGlobal).filter_by(chave=config.chave).first()
    if db_config:
        db_config.valor_pacote = config.valor_pacote
        db_config.qtd_unidades = config.qtd_unidades
    else:
        db_config = models_domain.ConfiguracaoGlobal(**config.model_dump())
        db.add(db_config)
    db.commit()
    return {"status": "sucesso", "mensagem": f"Configuração '{config.chave}' salva!"}

@app.post("/produtos/", response_model=schemas_domain.ProdutoResponse, tags=["Produtos"])
def cadastrar_produto(produto: schemas_domain.ProdutoCreate, db: Session = Depends(get_db)):
    # 1. Valida se a embalagem informada realmente existe
    if not db.query(models_domain.Embalagem).filter_by(id=produto.embalagem_id).first():
        raise HTTPException(status_code=404, detail="ID de Embalagem não encontrado.")
    
    try:
        # 2. Tenta criar e salvar o novo produto
        novo_produto = models_domain.Produto(**produto.model_dump())
        db.add(novo_produto)
        db.commit()
        db.refresh(novo_produto)
        return novo_produto
        
    except IntegrityError:
        # 3. Tratamento específico para SKU duplicado
        db.rollback() # Limpa a transação que deu erro
        raise HTTPException(
            status_code=400, 
            detail=f"Erro: O SKU '{produto.sku}' já está cadastrado no sistema."
        )

class AjusteEstoque(BaseModel):
    novo_estoque: int

@app.patch("/produtos/{sku}/estoque", tags=["Produtos"])
def ajustar_estoque_manual(sku: str, ajuste: AjusteEstoque, db: Session = Depends(get_db)):
    """Atualiza o estoque local manualmente, ignorando o marketplace"""
    produto = db.query(models_domain.Produto).filter_by(sku=sku).first()
    if not produto:
        raise HTTPException(status_code=404, detail="SKU não encontrado no sistema.")
    
    produto.quantidade_estoque = ajuste.novo_estoque
    db.commit()
    return {"status": "sucesso", "novo_estoque": produto.quantidade_estoque, "produto": produto.nome}

@app.get("/produtos/{sku}/financeiro", tags=["Inteligência Financeira"])
def relatorio_financeiro_produto(sku: str, db: Session = Depends(get_db)):
    # Busca o produto e sua relação com a embalagem automaticamente
    produto = db.query(models_domain.Produto).filter_by(sku=sku).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    
    # Busca o custo global da etiqueta
    etiqueta = db.query(models_domain.ConfiguracaoGlobal).filter_by(chave="etiqueta_padrao").first()
    if not etiqueta:
        raise HTTPException(status_code=400, detail="Você precisa cadastrar a 'etiqueta_padrao' nas configurações antes de calcular.")

    # Injeta os dados consolidados no motor financeiro
    metricas = calcular_metricas_shopee(
        preco_venda=produto.preco_venda,
        custo_unitario=produto.custo_produto,
        custo_pacote_embalagem=produto.embalagem.custo_pacote, # Vem da tabela Embalagens
        qtd_embalagens_pacote=produto.embalagem.qtd_unidades,
        custo_pacote_etiqueta=etiqueta.valor_pacote,          # Vem da tabela ConfiguracaoGlobal
        qtd_etiquetas_pacote=etiqueta.qtd_unidades
    )
    
    return {"produto": produto.nome, "embalagem_utilizada": produto.embalagem.nome, "analise": metricas}

class ShopeeWebhookPayload(BaseModel):
    """Schema para receber o aviso instantâneo da Shopee"""
    shop_id: int
    code: int
    data: dict # Aqui vem o order_sn (Número do Pedido)

@app.get("/produtos/alertas", tags=["Dashboard"])
def alertas_de_estoque(limite: int = 10, db: Session = Depends(get_db)):
    """
    Retorna os produtos cujo estoque local está igual ou abaixo do limite.
    O padrão de alerta é 10 unidades.
    """
    produtos_criticos = db.query(models_domain.Produto).filter(
        models_domain.Produto.quantidade_estoque <= limite
    ).all()
    
    return produtos_criticos

@app.post("/webhooks/shopee", tags=["Integrações"])
async def receber_venda_shopee(payload: dict, db: Session = Depends(get_db)):
    # 1. Extraímos os dados do webhook
    dados = payload.get("data", {})
    order_sn = dados.get("ordersn")
    
    # MODO DE TESTE (Bypass da API externa)
    if order_sn == "TESTE-001":
        sku_simulado = dados.get("sku")
        qtd_simulada = dados.get("quantidade", 1)
        
        produto = db.query(models_domain.Produto).filter_by(sku=sku_simulado).first()
        if produto:
            produto.quantidade_estoque -= qtd_simulada
            db.commit()
            print(f"✅ Venda simulada processada: {qtd_simulada}x {sku_simulado}. Estoque local atual: {produto.quantidade_estoque}")
            return {"status": "sucesso", "estoque_restante": produto.quantidade_estoque}
        else:
            return {"status": "erro", "motivo": f"SKU '{sku_simulado}' não encontrado no sistema local."}
            
    # (Futuro código real de integração virá aqui)
    return {"status": "recebido_sem_acao"}

@app.get("/produtos/detalhados", tags=["Estoque"])
def listar_produtos_detalhados(db: Session = Depends(get_db)):
    produtos = db.query(models_domain.Produto).all()
    etiqueta = db.query(models_domain.ConfiguracaoGlobal).filter_by(chave="etiqueta_padrao").first()
    
    if not etiqueta:
        raise HTTPException(status_code=400, detail="Etiqueta padrão não configurada.")

    resultados = []
    for p in produtos:
        metricas = calcular_metricas_shopee(
            preco_venda=p.preco_venda,
            custo_unitario=p.custo_produto,
            custo_pacote_embalagem=p.embalagem.custo_pacote,
            qtd_embalagens_pacote=p.embalagem.qtd_unidades,
            custo_pacote_etiqueta=etiqueta.valor_pacote,
            qtd_etiquetas_pacote=etiqueta.qtd_unidades
        )
        
        resultados.append({
            "id": p.id,
            "sku": p.sku,
            "nome": p.nome,
            "quantidade_estoque": p.quantidade_estoque,
            "preco_venda": p.preco_venda,
            "custo_produto": p.custo_produto,
            "valor_estoque": p.quantidade_estoque * p.custo_produto,
            "metricas": metricas
        })
        
    return resultados

@app.get("/configuracoes/", tags=["Configurações"])
def listar_configuracoes(db: Session = Depends(get_db)):
    """Retorna todas as configurações globais (como a etiqueta)"""
    return db.query(models_domain.ConfiguracaoGlobal).all()

@app.delete("/produtos/{sku}", tags=["Produtos"])
def deletar_produto(sku: str, db: Session = Depends(get_db)):
    """Deleta um produto pelo SKU"""
    produto = db.query(models_domain.Produto).filter_by(sku=sku).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    db.delete(produto)
    db.commit()
    return {"status": "sucesso", "mensagem": "Produto excluído"}

@app.delete("/embalagens/{id}", tags=["Embalagens"])
def deletar_embalagem(id: int, db: Session = Depends(get_db)):
    """Deleta uma embalagem, mas impede se estiver em uso"""
    embalagem = db.query(models_domain.Embalagem).filter_by(id=id).first()
    if not embalagem:
        raise HTTPException(status_code=404, detail="Embalagem não encontrada")
    
    # Trava de Segurança: Verifica se tem produto usando esta embalagem
    produtos_vinculados = db.query(models_domain.Produto).filter_by(embalagem_id=id).count()
    if produtos_vinculados > 0:
        raise HTTPException(status_code=400, detail="Não é possível excluir: Há produtos usando esta embalagem.")
        
    db.delete(embalagem)
    db.commit()
    return {"status": "sucesso", "mensagem": "Embalagem excluída"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)