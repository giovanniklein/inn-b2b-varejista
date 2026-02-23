from __future__ import annotations

from typing import Annotated

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr

from app.core.database import get_database
from app.core.security import decode_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/auth/login')


class CurrentUser(BaseModel):
    """Informacoes do usuario autenticado extraidas do JWT + banco."""

    id: str
    nome: str
    email: EmailStr
    varejista_id: str
    tipo_usuario: str = 'varejista'


async def _get_user_from_db(
    db: AsyncIOMotorDatabase,
    user_id: str,
    varejista_id: str,
) -> CurrentUser:
    try:
        user_obj_id = ObjectId(user_id)
        varejista_obj_id = ObjectId(varejista_id)
    except (InvalidId, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Nao foi possivel validar as credenciais',
        ) from exc

    usuario_doc = await db['usuarios'].find_one({'_id': user_obj_id})
    if not usuario_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Usuario nao encontrado',
        )

    if str(usuario_doc.get('varejista_id')) != varejista_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token invalido para este varejista',
        )

    if usuario_doc.get('tipo_usuario') != 'varejista':
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Tipo de usuario invalido para este aplicativo',
        )

    varejista_doc = await db['varejistas'].find_one({'_id': varejista_obj_id})
    if not varejista_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Varejista nao encontrado',
        )

    # Regra igual ao ADM: documentos sem `ativo` sao considerados ativos.
    if varejista_doc.get('ativo', True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Varejista inativo',
        )

    return CurrentUser(
        id=str(usuario_doc['_id']),
        nome=usuario_doc.get('nome', ''),
        email=usuario_doc.get('email'),
        varejista_id=varejista_id,
        tipo_usuario='varejista',
    )


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> CurrentUser:
    """Dependencia que retorna o usuario autenticado a partir do JWT."""

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Nao foi possivel validar as credenciais',
        headers={'WWW-Authenticate': 'Bearer'},
    )

    try:
        payload = decode_token(token)
    except Exception as exc:  # noqa: BLE001
        raise credentials_exception from exc

    if payload.get('type') != 'access':
        raise credentials_exception

    if payload.get('tipo_usuario') != 'varejista':
        raise credentials_exception

    user_id: str | None = payload.get('sub')
    varejista_id: str | None = payload.get('varejista_id')

    if not user_id or not varejista_id:
        raise credentials_exception

    return await _get_user_from_db(db, user_id=user_id, varejista_id=varejista_id)


async def get_current_varejista_id(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> str:
    """Atalho para obter apenas o ID do varejista autenticado."""

    return current_user.varejista_id
