from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.schemas.produto import ProdutoListResponse, ProdutoResponse
from app.services.produto_service import ProdutoLeituraService


router = APIRouter()


DbDep = Annotated[AsyncIOMotorDatabase, Depends(get_database)]


@router.get('/', response_model=ProdutoListResponse)
async def listar_produtos(
    db: DbDep,
    page: int = Query(default=1, ge=1, description='Numero da pagina'),
    page_size: int = Query(default=20, ge=1, le=100, description='Quantidade de itens por pagina'),
    q: str | None = Query(default=None, description='Busca parcial por descricao do produto'),
    atacadista_id: str | None = Query(default=None, description='Filtra produtos de um atacadista especifico'),
) -> ProdutoListResponse:
    """Lista produtos para o varejista, com filtros opcionais."""

    service = ProdutoLeituraService(db)
    return await service.listar_produtos(
        page=page,
        page_size=page_size,
        query=q,
        atacadista_id=atacadista_id,
    )


@router.get('/{produto_id}', response_model=ProdutoResponse)
async def obter_produto(produto_id: str, db: DbDep) -> ProdutoResponse:
    """Obtem os detalhes de um unico produto."""

    service = ProdutoLeituraService(db)
    produto = await service.obter_produto(produto_id)
    if not produto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Produto nao encontrado',
        )
    return produto
