from __future__ import annotations

from math import ceil
from typing import Dict, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import AtacadistaLeituraRepository, ProdutoLeituraRepository
from app.schemas.produto import ProdutoListResponse, ProdutoPreco, ProdutoResponse


class ProdutoLeituraService:
    """Serviço de consulta de produtos para o varejista.

    Diferente do app do atacadista, aqui o varejista enxerga produtos de
    **todos** os atacadistas. Não há filtragem por tenant neste nível.
    """

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.repo = ProdutoLeituraRepository(db)
        self.atacadista_repo = AtacadistaLeituraRepository(db)

    async def listar_produtos(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        query: str | None = None,
    ) -> ProdutoListResponse:
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 20

        skip = (page - 1) * page_size

        filters: Dict[str, object] = {}
        if query:
            # Busca parcial e case-insensitive no campo descricao
            filters["descricao"] = {"$regex": query, "$options": "i"}

        # Para simplicidade inicial, contamos todos os produtos que batem o filtro.
        # Caso o volume cresça, podemos otimizar.
        total_cursor = self.repo._collection.count_documents(filters)  # type: ignore[attr-defined]
        total = await total_cursor

        docs = await self.repo.find_many(filters=filters, limit=page_size, skip=skip)

        # Carrega dados de atacadistas em uma única consulta para preencher o nome
        atacadista_ids = {
            str(doc.get("atacadista_id"))
            for doc in docs
            if doc.get("atacadista_id") is not None
        }

        atacadistas = await self.atacadista_repo.get_by_ids(list(atacadista_ids))
        atacadista_por_id: Dict[str, dict] = {
            str(doc["_id"]): doc for doc in atacadistas
        }

        items = [
            self._to_response(doc, atacadista_por_id=atacadista_por_id)
            for doc in docs
        ]
        total_pages = ceil(total / page_size) if page_size else 1

        return ProdutoListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def obter_produto(self, produto_id: str) -> Optional[ProdutoResponse]:
        doc = await self.repo.find_by_id(produto_id)
        if not doc:
            return None

        atacadista_id = str(doc.get("atacadista_id")) if doc.get("atacadista_id") else None
        atacadista_por_id: Dict[str, dict] = {}
        if atacadista_id:
            atacadista = await self.atacadista_repo.get_by_id(atacadista_id)
            if atacadista:
                atacadista_por_id[atacadista_id] = atacadista

        return self._to_response(doc, atacadista_por_id=atacadista_por_id)

    def _to_response(
        self,
        doc: dict,
        *,
        atacadista_por_id: Dict[str, dict],
    ) -> ProdutoResponse:
        atacadista_id = str(doc.get("atacadista_id")) if doc.get("atacadista_id") else ""
        atacadista_doc = atacadista_por_id.get(atacadista_id)
        atacadista_nome: Optional[str] = None
        if atacadista_doc:
            atacadista_nome = (
                atacadista_doc.get("nome_fantasia")
                or atacadista_doc.get("razao_social")
                or atacadista_doc.get("nome")
            )

        precos_raw = doc.get("precos") or []
        precos: list[ProdutoPreco] = []
        for item in precos_raw:
            unidade = item.get("unidade")
            preco = item.get("preco")
            if unidade and preco is not None:
                precos.append(
                    ProdutoPreco(unidade=str(unidade), preco=float(preco))
                )

        if not precos:
            if doc.get("preco_unidade") is not None:
                precos.append(
                    ProdutoPreco(
                        unidade="unidade",
                        preco=float(doc.get("preco_unidade")),
                    )
                )
            if doc.get("preco_caixa") is not None:
                precos.append(
                    ProdutoPreco(
                        unidade="caixa",
                        preco=float(doc.get("preco_caixa")),
                    )
                )
            if doc.get("preco_palete") is not None:
                precos.append(
                    ProdutoPreco(
                        unidade="palete",
                        preco=float(doc.get("preco_palete")),
                    )
                )

        def _find_preco(unidade: str) -> Optional[float]:
            for item in precos:
                if item.unidade == unidade:
                    return float(item.preco)
            return None

        preco_unidade = _find_preco("unidade") or doc.get("preco_unidade")
        preco_caixa = _find_preco("caixa") or doc.get("preco_caixa")
        preco_palete = _find_preco("palete") or doc.get("preco_palete")

        return ProdutoResponse(
            id=str(doc["_id"]),
            codigo=doc.get("codigo", ""),
            descricao=doc.get("descricao", ""),
            imagem_base64=doc.get("imagem_base64"),
            estoque=doc.get("estoque", 0),
            precos=precos,
            preco_unidade=preco_unidade,
            preco_caixa=preco_caixa,
            preco_palete=preco_palete,
            atacadista_id=atacadista_id,
            atacadista_nome=atacadista_nome,
        )
