from __future__ import annotations

import logging

from motor.motor_asyncio import AsyncIOMotorDatabase


logger = logging.getLogger(__name__)


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    """Cria indices essenciais para estabilidade/performance.

    - carrinhos.varejista_id unico: evita mais de um carrinho por varejista
    - atacadistas.ativo: acelera filtros de ativos
    - produtos.atacadista_id+_id: leitura de catalogo e carrinho
    """

    await db["carrinhos"].create_index(
        [("varejista_id", 1)],
        unique=True,
        name="uniq_carrinhos_varejista_id",
    )
    await db["atacadistas"].create_index(
        [("ativo", 1)],
        name="idx_atacadistas_ativo",
    )
    await db["produtos"].create_index(
        [("atacadista_id", 1), ("_id", -1)],
        name="idx_produtos_atacadista_id__id_desc",
    )
    logger.info("[startup] Indices essenciais garantidos.")
