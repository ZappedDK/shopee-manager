from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from core.database import Base

class Embalagem(Base):
    __tablename__ = "embalagens"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), unique=True, nullable=False) # Ex: "Caixa P 15x15"
    custo_pacote = Column(Float, nullable=False)
    qtd_unidades = Column(Integer, nullable=False)
    
    # Relacionamento: 1 embalagem serve para N produtos
    produtos = relationship("Produto", back_populates="embalagem")

class ConfiguracaoGlobal(Base):
    """Tabela para armazenar custos fixos e variáveis do sistema (Ex: Etiqueta)"""
    __tablename__ = "configuracoes_globais"
    id = Column(Integer, primary_key=True, index=True)
    chave = Column(String(50), unique=True, index=True, nullable=False)
    valor_pacote = Column(Float, nullable=False)
    qtd_unidades = Column(Integer, nullable=False)

class Produto(Base):
    __tablename__ = "produtos"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    nome = Column(String(255), nullable=False)
    preco_venda = Column(Float, nullable=False)
    custo_produto = Column(Float, nullable=False)
    quantidade_estoque = Column(Integer, default=0, nullable=False)
    
    # Chave Estrangeira (O produto agora só salva o ID da embalagem)
    embalagem_id = Column(Integer, ForeignKey("embalagens.id"), nullable=False)
    embalagem = relationship("Embalagem", back_populates="produtos")
    
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))