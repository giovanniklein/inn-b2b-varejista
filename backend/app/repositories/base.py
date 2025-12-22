from __future__ import annotations

from typing import Any, Dict, List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase


class VarejistaMultiTenantRepository:
    """Repositório base com filtro automático por `varejista_id`.

    Nenhuma operação exposta aqui permite acesso a documentos de outro
    varejista, garantindo o isolamento multi-tenant pedido.
    """

    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str) -> None:
        self._db = db
        self._collection: AsyncIOMotorCollection = db[collection_name]

    async def count(
        self,
        varejista_id: str,
        filters: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Conta documentos do varejista, aplicando filtros opcionais.

        Útil para paginação (`total`), sempre respeitando o isolamento
        multi-tenant pelo campo `varejista_id`.
        """

        query: Dict[str, Any] = self._tenant_filter(varejista_id)
        if filters:
            query.update(filters)
        return await self._collection.count_documents(query)

    # Helpers
    def _to_object_id(self, value: str) -> ObjectId:
        return ObjectId(value)

    def _tenant_filter(self, varejista_id: str) -> Dict[str, Any]:
        return {"varejista_id": varejista_id}

    # CRUD utilitários básicos
    async def find_one(
        self,
        varejista_id: str,
        document_id: str,
    ) -> Optional[Dict[str, Any]]:
        query = {"_id": self._to_object_id(document_id)}
        query.update(self._tenant_filter(varejista_id))
        return await self._collection.find_one(query)

    async def find_many(
        self,
        varejista_id: str,
        filters: Optional[Dict[str, Any]] = None,
        *,
        limit: int = 100,
        skip: int = 0,
        sort: Optional[List[tuple[str, int]]] = None,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = self._tenant_filter(varejista_id)
        if filters:
            query.update(filters)

        cursor = self._collection.find(query).skip(skip).limit(limit)
        if sort:
            cursor = cursor.sort(sort)
        return [doc async for doc in cursor]

    async def insert_one(
        self,
        varejista_id: str,
        data: Dict[str, Any],
    ) -> str:
        data["varejista_id"] = varejista_id
        result = await self._collection.insert_one(data)
        return str(result.inserted_id)

    async def update_one(
        self,
        varejista_id: str,
        document_id: str,
        data: Dict[str, Any],
    ) -> bool:
        query = {"_id": self._to_object_id(document_id)}
        query.update(self._tenant_filter(varejista_id))
        result = await self._collection.update_one(query, {"$set": data})
        return result.matched_count > 0

    async def delete_one(
        self,
        varejista_id: str,
        document_id: str,
    ) -> bool:
        query = {"_id": self._to_object_id(document_id)}
        query.update(self._tenant_filter(varejista_id))
        result = await self._collection.delete_one(query)
        return result.deleted_count > 0


class VarejistaRepository:
    """Repositório para o cadastro de varejistas.

    Os documentos desta coleção concentram os dados cadastrais
    (inclusive o array de endereços de entrega).
    """

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._db = db
        self._collection: AsyncIOMotorCollection = db["varejistas"]

    async def find_by_cnpj(self, cnpj: str) -> Optional[Dict[str, Any]]:
        return await self._collection.find_one({"cnpj": cnpj})

    async def insert(self, data: Dict[str, Any]) -> str:
        result = await self._collection.insert_one(data)
        return str(result.inserted_id)

    async def get_by_id(self, varejista_id: str) -> Optional[Dict[str, Any]]:
        return await self._collection.find_one({"_id": ObjectId(varejista_id)})

    async def update_enderecos(
        self,
        varejista_id: str,
        enderecos: List[Dict[str, Any]],
    ) -> None:
        await self._collection.update_one(
            {"_id": ObjectId(varejista_id)},
            {"$set": {"enderecos": enderecos}},
        )


class VarejistaUsuarioRepository:
    """Repositório de usuários do varejista (coleção `usuarios`).

    Reaproveita a mesma coleção usada pelo app do atacadista, mas com
    campos específicos:
    - `tipo_usuario = "varejista"`
    - `varejista_id` em vez de `atacadista_id`
    """

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._db = db
        self._collection: AsyncIOMotorCollection = db["usuarios"]

    async def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return await self._collection.find_one({"email": email, "tipo_usuario": "varejista"})

    async def insert(self, data: Dict[str, Any]) -> str:
        result = await self._collection.insert_one(data)
        return str(result.inserted_id)

    async def find_by_email_any_tipo(self, email: str) -> Optional[Dict[str, Any]]:
        """Busca por e-mail sem filtrar tipo de usuário.

        Útil para garantir unicidade global de e-mail entre atacadista e
        varejista, se desejado. Por ora, usamos apenas para verificar se
        já existe um usuário com o e-mail informado, independentemente do
        tipo.
        """

        return await self._collection.find_one({"email": email})

    async def find_varejista_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return await self._collection.find_one(
            {"email": email, "tipo_usuario": "varejista"}
        )


class CarrinhoRepository(VarejistaMultiTenantRepository):
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        super().__init__(db, "carrinhos")

    async def get_carrinho_by_varejista(self, varejista_id: str) -> Optional[Dict[str, Any]]:
        return await self._collection.find_one({"varejista_id": varejista_id})

    async def upsert_carrinho(self, varejista_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        result = await self._collection.find_one_and_update(
            {"varejista_id": varejista_id},
            {"$set": data},
            upsert=True,
            return_document=True,  # type: ignore[arg-type]
        )
        assert result is not None
        return result

    async def clear_carrinho(self, varejista_id: str) -> None:
        await self._collection.delete_one({"varejista_id": varejista_id})


class VarejistaPedidoRepository(VarejistaMultiTenantRepository):
    """Repositório de pedidos sob a ótica do varejista.

    Compartilha a mesma coleção `pedidos` usada pelo app do atacadista,
    filtrando por `varejista_id`.
    """

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        super().__init__(db, "pedidos")


class ProdutoLeituraRepository:
    """Repositório somente-leitura de produtos.

    Diferente do app do atacadista, aqui o varejista enxerga produtos de
    **todos** os atacadistas, então não aplicamos filtro por tenant.
    """

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._db = db
        self._collection: AsyncIOMotorCollection = db["produtos"]

    async def find_many(
        self,
        *,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = filters or {}
        cursor = self._collection.find(query).skip(skip).limit(limit)
        return [doc async for doc in cursor]

    async def find_by_id(self, produto_id: str) -> Optional[Dict[str, Any]]:
        return await self._collection.find_one({"_id": ObjectId(produto_id)})


class AtacadistaLeituraRepository:
    """Repositório de leitura de atacadistas (para pedido mínimo, exibição de nome, etc.)."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._db = db
        self._collection: AsyncIOMotorCollection = db["atacadistas"]

    async def get_by_id(self, atacadista_id: str) -> Optional[Dict[str, Any]]:
        return await self._collection.find_one({"_id": ObjectId(atacadista_id)})

    async def get_by_ids(self, atacadista_ids: list[str]) -> List[Dict[str, Any]]:
        """Busca múltiplos atacadistas de uma vez, útil para evitar N+1.

        Retorna uma lista de documentos completos da coleção `atacadistas`.
        """

        if not atacadista_ids:
            return []

        object_ids = [ObjectId(_id) for _id in atacadista_ids]
        cursor = self._collection.find({"_id": {"$in": object_ids}})
        return [doc async for doc in cursor]
