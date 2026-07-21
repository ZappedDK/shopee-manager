from pydantic import BaseModel, Field
from typing import List

class EmbalagemCreate(BaseModel):
    nome: str
    custo_pacote: float = Field(..., gt=0)
    qtd_unidades: int = Field(..., gt=0)

class ConfiguracaoGlobalCreate(BaseModel):
    chave: str
    valor_pacote: float = Field(..., gt=0)
    qtd_unidades: int = Field(..., gt=0)

class PlataformaCreate(BaseModel):
    nome: str
    icone: str
    taxa_plataforma: float
    taxa_fixa: float
    taxa_extra: float = 0.0

class ProdutoCreate(BaseModel):
    sku: str
    nome: str
    preco_venda: float = Field(..., gt=0)
    custo_produto: float = Field(..., gt=0)
    quantidade_estoque: int = Field(..., ge=0)
    embalagem_id: int
    # O segredo está aqui: permitindo que a API receba a lista de Checkboxes
    plataformas_ids: List[int] = []