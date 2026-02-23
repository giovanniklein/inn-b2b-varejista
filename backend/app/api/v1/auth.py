from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.security import decode_token
from app.repositories.base import VarejistaRepository
from app.schemas.auth import (
    AuthLoginRequest,
    AuthRefreshRequest,
    AuthRegisterRequest,
    MeResponse,
    TokenPair,
    UserResponse,
)
from app.services.auth_service import AuthService
from app.utils.dependencies import CurrentUser, get_current_user


router = APIRouter()


DbDep = Annotated[AsyncIOMotorDatabase, Depends(get_database)]


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register_varejista(payload: AuthRegisterRequest, db: DbDep) -> TokenPair:
    """Registra um novo varejista + usuário principal.

    Fluxo:
    - Valida se já existe varejista com o CNPJ informado
    - Consulta API pública de CNPJ
    - Cria o varejista com endereço principal + endereços extras
    - Cria o usuário principal vinculado (tipo_usuario="varejista")
    - Retorna par de tokens (access + refresh)
    """

    service = AuthService(db)
    return await service.register_varejista(payload)


@router.post("/login", response_model=TokenPair)
async def login(payload: AuthLoginRequest, db: DbDep) -> TokenPair:
    """Autentica o usuário do varejista via e-mail e senha."""

    service = AuthService(db)
    return await service.login(payload)


@router.get("/me", response_model=MeResponse)
async def get_me(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: DbDep,
) -> MeResponse:
    """Retorna informações do usuário logado e do varejista vinculado.

    O `varejista_id` é sempre obtido do JWT via `get_current_user`.
    """

    varejista_repo = VarejistaRepository(db)
    varejista = await varejista_repo.get_by_id(current_user.varejista_id)
    if not varejista:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Varejista não encontrado",
        )

    user_response = UserResponse(
        id=current_user.id,
        nome=current_user.nome,
        email=current_user.email,
        varejista_id=current_user.varejista_id,
    )

    return MeResponse(
        user=user_response,
        varejista_razao_social=varejista.get("razao_social"),
        varejista_nome_fantasia=varejista.get("nome_fantasia"),
        varejista_cnpj=varejista.get("cnpj"),
        varejista_id=str(varejista["_id"]),
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh_tokens(payload: AuthRefreshRequest, db: DbDep) -> TokenPair:
    """Gera um novo par de tokens (access + refresh) a partir de um refresh token válido.

    Regras:
    - O token deve ser do tipo `refresh`
    - O payload deve conter `sub` (id do usuário) e `varejista_id`
    - Expiração do token é validada automaticamente pelo decode
    """

    try:
        decoded = decode_token(payload.refresh_token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado",
        ) from exc

    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token informado não é um refresh token",
        )

    if decoded.get("tipo_usuario") != "varejista":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de usuário inválido para este aplicativo",
        )

    user_id: str | None = decoded.get("sub")
    varejista_id: str | None = decoded.get("varejista_id")

    if not user_id or not varejista_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
        )

    varejista_repo = VarejistaRepository(db)
    varejista = await varejista_repo.get_active_by_id(varejista_id)
    if not varejista:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Varejista inativo",
        )

    service = AuthService(db)
    return await service._generate_tokens(  # type: ignore[attr-defined]
        user_id=user_id,
        varejista_id=varejista_id,
    )
