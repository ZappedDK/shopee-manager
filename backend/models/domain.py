from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

# Tabela de Associação (Muitos-para-Muitos)
produto_plataforma = Table(
    'produto_plataforma',
    Base.metadata,
    Column('produto_id', Integer, ForeignKey('produtos.id')),
    Column('plataforma_id', Integer, ForeignKey('plataformas.id'))
)

class ConfiguracaoGlobal(Base):
    __tablename__ = "configuracoes_globais"
    id = Column(Integer, primary_key=True, index=True)
    chave = Column(String(50), unique=True, index=True, nullable=False)
    valor_pacote = Column(Float, nullable=False)
    qtd_unidades = Column(Integer, nullable=False)

class Embalagem(Base):
    __tablename__ = "embalagens"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    custo_pacote = Column(Float, nullable=False)
    qtd_unidades = Column(Integer, nullable=False)
    produtos = relationship("Produto", back_populates="embalagem")

class Plataforma(Base):
    __tablename__ = "plataformas"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(50), nullable=False) # Ex: Shopee
    icone = Column(String(10), nullable=False) # Ex: 🟧, ⬛
    taxa_plataforma = Column(Float, nullable=False) # Ex: 0.14
    taxa_fixa = Column(Float, nullable=False) # Ex: 4.00
    taxa_extra = Column(Float, nullable=False, default=0.00) # Ex: 0.06 (Frete Grátis)
    faixas_json = Column(String(2000), nullable=True) # Serializado JSON das faixas de preço/taxa
    produtos = relationship("Produto", secondary=produto_plataforma, back_populates="plataformas")

class Produto(Base):
    __tablename__ = "produtos"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    nome = Column(String(255), nullable=False)
    preco_venda = Column(Float, nullable=False)
    custo_produto = Column(Float, nullable=False)
    quantidade_estoque = Column(Integer, nullable=False, default=0)
    
    embalagem_id = Column(Integer, ForeignKey("embalagens.id"), nullable=True)
    embalagem = relationship("Embalagem", back_populates="produtos")
    
    # A mágica da ligação multicanal acontece aqui
    plataformas = relationship("Plataforma", secondary=produto_plataforma, back_populates="produtos")
    
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    reset_token = Column(String(255), nullable=True)
    reset_token_expira = Column(DateTime, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

class MovimentacaoEstoque(Base):
    __tablename__ = "movimentacoes_estoque"
    id = Column(Integer, primary_key=True, index=True)
    produto_id = Column(Integer, ForeignKey("produtos.id", ondelete="CASCADE"), nullable=False)
    produto_sku = Column(String(50), nullable=False)
    produto_nome = Column(String(255), nullable=False)
    tipo = Column(String(30), nullable=False) # "ENTRADA", "SAIDA", "AJUSTE", "VENDA_WEBHOOK"
    quantidade_alterada = Column(Integer, nullable=False)
    estoque_anterior = Column(Integer, nullable=False)
    estoque_novo = Column(Integer, nullable=False)
    motivo = Column(String(255), nullable=False)
    usuario_nome = Column(String(100), nullable=True, default="Sistema")
    criado_em = Column(DateTime, default=datetime.utcnow)
    
    produto = relationship("Produto", backref="movimentacoes")
