from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, Field

from app.models.common import PedidoStatus


class PedidoEnderecoResponse(BaseModel):
    """Endereco de entrega associado a um pedido."""

    id: str = Field(..., description="ID interno do endereco no cadastro do varejista")
    descricao: str
    logradouro: str
    numero: str
    bairro: str
    cidade: str
    uf: str
    cep: str
    complemento: str | None = None
    eh_principal: bool


class PedidoItemResponse(BaseModel):
    produto_id: str
    descricao_produto: str
    unidade: str
    quantidade: int = Field(..., ge=1)
    valor_unitario: float = Field(..., ge=0)
    valor_total: float = Field(..., ge=0)


class PedidoListItem(BaseModel):
    id: str
    atacadista_id: str
    atacadista_nome: str | None = Field(
        default=None,
        description="Nome/razao social do atacadista para exibicao na lista de pedidos",
    )
    condicao_pagamento: str = Field(default="A VISTA")
    valor_total: float
    status: PedidoStatus
    data_criacao: datetime
    endereco_entrega: PedidoEnderecoResponse


class PedidoListResponse(BaseModel):
    items: List[PedidoListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class PedidoDetailResponse(BaseModel):
    id: str
    atacadista_id: str
    atacadista_nome: str | None = Field(
        default=None,
        description="Nome/razao social do atacadista para exibicao no detalhe do pedido",
    )
    condicao_pagamento: str = Field(default="A VISTA")
    varejista_id: str
    valor_total: float
    status: PedidoStatus
    data_criacao: datetime
    endereco_entrega: PedidoEnderecoResponse
    itens: List[PedidoItemResponse]
