from pydantic import BaseModel, Field
from datetime import datetime

# --- SCHEMAS DE EMBALAGEM ---
class EmbalagemCreate(BaseModel):
    nome: str = Field(..., title="Tamanho/Modelo da Embalagem")
    custo_pacote: float = Field(..., gt=0)
    qtd_unidades: int = Field(..., gt=0)

class EmbalagemResponse(EmbalagemCreate):
    id: int
    class Config:
        from_attributes = True

# --- SCHEMAS DE CONFIGURAÇÃO (ETIQUETA) ---
class ConfiguracaoCreate(BaseModel):
    chave: str = Field(..., description="Ex: etiqueta_padrao")
    valor_pacote: float = Field(..., gt=0)
    qtd_unidades: int = Field(..., gt=0)

# --- SCHEMAS DE PRODUTO ---
class ProdutoCreate(BaseModel):
    sku: str = Field(..., max_length=50)
    nome: str = Field(..., max_length=255)
    preco_venda: float = Field(..., gt=0)
    custo_produto: float = Field(..., gt=0)
    quantidade_estoque: int = Field(default=0, ge=0)
    embalagem_id: int = Field(..., title="ID da Embalagem Cadastrada")

class ProdutoResponse(ProdutoCreate):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    class Config:
        from_attributes = True