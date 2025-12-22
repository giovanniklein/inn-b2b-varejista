from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.schemas.produto import ProdutoListResponse, ProdutoResponse
from app.services.produto_service import ProdutoLeituraService


router = APIRouter()


DbDep = Annotated[AsyncIOMotorDatabase, Depends(get_database)]


@router.get("/", response_model=ProdutoListResponse)
async def listar_produtos(
    db: DbDep,
    page: int = Query(default=1, ge=1, description="Número da página"),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
        description="Quantidade de itens por página",
    ),
    q: str | None = Query(
        default=None,
        description="Busca parcial por descrição do produto (case-insensitive)",
    ),
) -> ProdutoListResponse:
    """Lista produtos de todos os atacadistas (modo leitura).

    O varejista não tem filtro por atacadista neste endpoint; ele vê a
    vitrine unificada. Os filtros mais complexos (busca por texto,
    atacadista específico, faixa de preço) podem ser adicionados depois.
    """

    service = ProdutoLeituraService(db)
    return await service.listar_produtos(page=page, page_size=page_size, query=q)


@router.get("/{produto_id}", response_model=ProdutoResponse)
async def obter_produto(produto_id: str, db: DbDep) -> ProdutoResponse:
    """Obtém os detalhes de um único produto."""

    service = ProdutoLeituraService(db)
    produto = await service.obter_produto(produto_id)
    if not produto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado",
        )
    return produto
