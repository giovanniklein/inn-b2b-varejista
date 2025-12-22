from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, carrinho, enderecos, pedidos, produtos
from app.core.config import get_settings
from app.core.database import close_client, get_client
from app.seed.initial_data import seed_initial_data


logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: D401
    """Lifespan handler para gerenciar recursos na inicialização/encerramento.

    - Garante criação do client MongoDB (lazy) via get_client()
    - Executa seeds iniciais do varejista (idempotente)
    - Fecha o client MongoDB ao encerrar
    """

    # Força criação do client (lazy) apenas para falhar cedo em caso de erro
    await get_client()

    logger.info("[startup] Executando seeds iniciais do varejista...")
    try:
        await seed_initial_data()
        logger.info("[startup] Seeds do varejista executados com sucesso.")
    except Exception:  # noqa: BLE001
        logger.exception("[startup] Falha ao executar seeds iniciais do varejista.")

    yield

    await close_client()


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(enderecos.router, prefix="/enderecos", tags=["enderecos"])
app.include_router(produtos.router, prefix="/produtos", tags=["produtos"])
app.include_router(carrinho.router, prefix="/carrinho", tags=["carrinho"])
app.include_router(pedidos.router, prefix="/pedidos", tags=["pedidos"])


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Health-check simples para monitoramento."""

    return {"status": "ok"}
