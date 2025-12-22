from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ProdutoPreco(BaseModel):
    unidade: str
    preco: float = Field(..., ge=0)


class ProdutoResponse(BaseModel):
    """Produto visível para o varejista.

    É um espelho somente-leitura da modelagem do app do atacadista.
    """

    id: str
    codigo: str = Field(..., description="Código interno do produto")
    descricao: str
    imagem_base64: Optional[str] = Field(
        default=None, description="Imagem em base64 (mock de upload)"
    )
    estoque: int = Field(default=0, ge=0)
    precos: list[ProdutoPreco] = Field(default_factory=list)
    preco_unidade: Optional[float] = Field(default=None, ge=0)
    preco_caixa: Optional[float] = Field(default=None, ge=0)
    preco_palete: Optional[float] = Field(default=None, ge=0)
    atacadista_id: str = Field(
        ..., description="Identificador do atacadista que comercializa o produto"
    )
    atacadista_nome: Optional[str] = Field(
        default=None,
        description="Nome/razão social do atacadista que comercializa o produto",
    )


class ProdutoListResponse(BaseModel):
    items: list[ProdutoResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
