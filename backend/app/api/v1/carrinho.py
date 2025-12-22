from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.schemas.carrinho import (
    CarrinhoItemRequest,
    CarrinhoItemUpdateRequest,
    CarrinhoResponse,
    FinalizarCarrinhoRequest,
    FinalizarCarrinhoResponse,
)
from app.services.carrinho_service import CarrinhoService
from app.utils.dependencies import get_current_varejista_id


router = APIRouter()


DbDep = Annotated[AsyncIOMotorDatabase, Depends(get_database)]
VarejistaIdDep = Annotated[str, Depends(get_current_varejista_id)]


@router.get("/", response_model=CarrinhoResponse)
async def obter_carrinho(
    db: DbDep,
    varejista_id: VarejistaIdDep,
) -> CarrinhoResponse:
    service = CarrinhoService(db)
    return await service.obter_carrinho(varejista_id)


@router.post("/itens", response_model=CarrinhoResponse, status_code=status.HTTP_201_CREATED)
async def adicionar_ou_atualizar_item(
    payload: CarrinhoItemRequest,
    db: DbDep,
    varejista_id: VarejistaIdDep,
) -> CarrinhoResponse:
    service = CarrinhoService(db)
    return await service.adicionar_ou_atualizar_item(varejista_id, payload)


@router.put("/itens/{produto_id}", response_model=CarrinhoResponse)
async def atualizar_item(
    produto_id: str,
    payload: CarrinhoItemUpdateRequest,
    db: DbDep,
    varejista_id: VarejistaIdDep,
) -> CarrinhoResponse:
    service = CarrinhoService(db)
    return await service.atualizar_item(varejista_id, produto_id, payload)


@router.delete("/itens/{produto_id}", response_model=CarrinhoResponse)
async def remover_item(
    produto_id: str,
    db: DbDep,
    varejista_id: VarejistaIdDep,
) -> CarrinhoResponse:
    service = CarrinhoService(db)
    return await service.remover_item(varejista_id, produto_id)


@router.delete("/limpar")
async def limpar_carrinho(
    db: DbDep,
    varejista_id: VarejistaIdDep,
) -> None:
    service = CarrinhoService(db)
    await service.limpar_carrinho(varejista_id)


@router.post("/finalizar", response_model=FinalizarCarrinhoResponse)
async def finalizar_carrinho(
    payload: FinalizarCarrinhoRequest,
    db: DbDep,
    varejista_id: VarejistaIdDep,
) -> FinalizarCarrinhoResponse:
    service = CarrinhoService(db)
    return await service.finalizar_carrinho(varejista_id, payload)
