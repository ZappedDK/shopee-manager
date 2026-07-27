from pydantic import BaseModel, Field
from typing import List, Optional

class EmbalagemCreate(BaseModel):
    nome: str
    custo_pacote: float = Field(..., gt=0)
    qtd_unidades: int = Field(..., gt=0)

class ConfiguracaoGlobalCreate(BaseModel):
    chave: str
    valor_pacote: float = Field(..., gt=0)
    qtd_unidades: int = Field(..., gt=0)

class FaixaTaxaSchema(BaseModel):
    de_valor: float = 0.0
    ate_valor: Optional[float] = None
    taxa_percentual: float
    taxa_fixa: float

class PlataformaCreate(BaseModel):
    nome: str
    icone: str
    taxa_plataforma: float = 0.0
    taxa_fixa: float = 0.0
    taxa_extra: float = 0.0
    faixas: List[FaixaTaxaSchema] = []

class ProdutoCreate(BaseModel):
    sku: str
    nome: str
    preco_venda: float = Field(..., gt=0)
    custo_produto: float = Field(..., gt=0)
    quantidade_estoque: int = Field(..., ge=0)
    ativo: Optional[bool] = True
    embalagem_id: Optional[int] = None
    plataformas_ids: List[int] = []

class UsuarioCreate(BaseModel):
    nome: str
    email: str
    senha: str

class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: str

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    senha: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse

class EsqueciSenhaRequest(BaseModel):
    email: str

class RedefinirSenhaRequest(BaseModel):
    email: str
    token: str
    nova_senha: str

class ProdutoUpdate(BaseModel):
    nome: str
    preco_venda: float = Field(..., gt=0)
    custo_produto: float = Field(..., gt=0)
    quantidade_estoque: int = Field(..., ge=0)
    ativo: Optional[bool] = True
    embalagem_id: Optional[int] = None
    plataformas_ids: List[int] = []
    motivo_ajuste: str = "Edição de produto/custo/estoque"

class MovimentacaoEstoqueResponse(BaseModel):
    id: int
    produto_id: int
    produto_sku: str
    produto_nome: str
    tipo: str
    quantidade_alterada: int
    estoque_anterior: int
    estoque_novo: int
    motivo: str
    usuario_nome: str

    class Config:
        from_attributes = True
