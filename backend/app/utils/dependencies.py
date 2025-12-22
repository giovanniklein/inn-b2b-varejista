from __future__ import annotations

from typing import Annotated

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr

from app.core.database import get_database
from app.core.security import decode_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class CurrentUser(BaseModel):
    """Informações do usuário autenticado extraídas do JWT + banco.

    Neste app, o usuário está sempre vinculado a um varejista e o JWT
    contém o campo `varejista_id` e `tipo_usuario="varejista"`.
    """

    id: str
    nome: str
    email: EmailStr
    varejista_id: str
    tipo_usuario: str = "varejista"


async def _get_user_from_db(
    db: AsyncIOMotorDatabase,
    user_id: str,
    varejista_id: str,
) -> CurrentUser:
    usuario_doc = await db["usuarios"].find_one({"_id": ObjectId(user_id)})
    if not usuario_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
        )

    if str(usuario_doc.get("varejista_id")) != varejista_id:
        # Falha de isolamento multi-tenant
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido para este varejista",
        )

    if usuario_doc.get("tipo_usuario") != "varejista":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de usuário inválido para este aplicativo",
        )

    return CurrentUser(
        id=str(usuario_doc["_id"]),
        nome=usuario_doc.get("nome", ""),
        email=usuario_doc.get("email"),
        varejista_id=varejista_id,
        tipo_usuario="varejista",
    )


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> CurrentUser:
    """Dependência que retorna o usuário autenticado a partir do JWT.

    - Valida o token
    - Garante que seja um access token e tipo_usuario="varejista"
    - Carrega o usuário e reforça o vínculo com o varejista
    """

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
    except Exception as exc:  # noqa: BLE001
        raise credentials_exception from exc

    if payload.get("type") != "access":
        raise credentials_exception

    if payload.get("tipo_usuario") != "varejista":
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    varejista_id: str | None = payload.get("varejista_id")

    if not user_id or not varejista_id:
        raise credentials_exception

    return await _get_user_from_db(db, user_id=user_id, varejista_id=varejista_id)


async def get_current_varejista_id(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> str:
    """Atalho para obter apenas o ID do varejista autenticado.

    Importante: o frontend **nunca** envia varejista_id; ele é sempre
    derivado do JWT por esta dependência.
    """

    return current_user.varejista_id
