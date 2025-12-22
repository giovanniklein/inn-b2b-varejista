# PINN B2B Varejista

Aplicação completa (backend FastAPI + frontend React/Vite/Chakra) para portal B2B de **varejistas**, multi-tenant por `varejista_id`, integrada ao mesmo MongoDB utilizado pelo app de atacadista.

## Arquitetura

- **Backend**: `backend/`
  - Python 3.11+
  - FastAPI
  - Motor (MongoDB)
  - Pydantic / pydantic-settings
  - JWT (access + refresh) com `tipo_usuario="varejista"` e `varejista_id` no payload
  - Bcrypt para hash de senha
  - Multi-tenant por `varejista_id` (extraído sempre do token)
- **Frontend**: `frontend/`
  - React + Vite
  - Chakra UI
  - Axios com interceptors (Bearer + refresh automático)
  - Zustand (auth store, UI store)
  - React Router v6 (rotas públicas e protegidas)

Backends de atacadista e varejista são **totalmente independentes**, mas compartilham o mesmo MongoDB e .env raiz do portal.

---

## Backend

### 1. Requisitos

- Python 3.11+
- Pip

### 2. Instalação de dependências

```bash
cd backend
pip install -r requirements.txt
```

### 3. Variáveis de ambiente / MongoDB

O backend do varejista reutiliza o mesmo `.env` do portal (por exemplo `C:\p_projetos\pinn\portal b2b.env`), carregando as mesmas variáveis de conexão MongoDB usadas pelo atacadista.

Certifique-se de que o arquivo `.env` contém as configurações de Mongo e JWT esperadas (as mesmas utilizadas no app atacadista).

### 4. Executar backend (porta 8001)

Dentro de `backend/`:

```bash
uvicorn app.main:app --reload --port 8001
```

Swagger disponível em:

- http://localhost:8001/docs

Principais módulos disponibilizados:

- `POST /auth/register` – auto-registro de varejista, com busca automática de CNPJ em `https://publica.cnpj.ws/cnpj/{cnpj}` e criação de endereço principal + extras.
- `POST /auth/login` – autenticação do usuário do varejista.
- `GET /auth/me` – dados do usuário logado + varejista.
- `POST /auth/refresh` – refresh de tokens.
- `CRUD /enderecos` – gerenciamento de endereços do varejista.
- `GET /produtos` e `GET /produtos/{id}` – consulta de produtos de todos os atacadistas (somente leitura).
- `Módulo /carrinho` – carrinho multi-atacadista, com validação de pedido mínimo por atacadista.
- `Módulo /pedidos` – geração de múltiplos pedidos na finalização do carrinho + consulta de pedidos do varejista.

Seeds automáticas na inicialização criam um varejista modelo com usuário e endereços, sem duplicar dados se já existirem.

---

## Frontend

### 1. Requisitos

- Node.js 18+
- npm

### 2. Instalação de dependências

```bash
cd frontend
npm install
```

### 3. Variáveis de ambiente do frontend

Opcionalmente, crie um arquivo `frontend/.env` para apontar a URL da API do varejista (por padrão já usa `http://localhost:8001`):

```bash
VITE_API_BASE_URL=http://localhost:8001
```

### 4. Executar frontend (porta 5174)

Dentro de `frontend/`:

```bash
npm run dev
```

A aplicação ficará disponível em:

- http://localhost:5174

### 5. Fluxo principal

Rotas públicas:

- `/login` – login do usuário do varejista
- `/register` – auto-registro de varejista

Rotas protegidas (requer JWT válido):

- `/enderecos` – CRUD de endereços + definir principal
- `/produtos` – listagem de produtos de todos os atacadistas, com botão "Adicionar ao carrinho"
- `/carrinho` – carrinho multi-atacadista, seleção de endereço por atacadista, validação de pedido mínimo e finalização gerando múltiplos pedidos
- `/pedidos` – listagem de pedidos do varejista
- `/pedidos/:id` – detalhes do pedido

### 6. Autenticação no frontend

- Armazena `access_token` e `refresh_token` em `localStorage` com prefixo `pinn_varejista_...`.
- Axios interceptors:
  - Anexar `Authorization: Bearer <access_token>` em todas as requisições.
  - Em caso de `401`, tentar `POST /auth/refresh` com o refresh token.
  - Se o refresh falhar, limpar sessão e redirecionar para `/login`.
- Zustand `authStore` mantém:
  - `accessToken`, `refreshToken`, `user`, `varejistaNomeFantasia`, `isAuthenticated`.

---

## CORS e portas

- Backend do atacadista: **8000**
- Frontend do atacadista: **5173**
- Backend do varejista (este projeto): **8001**
- Frontend do varejista (este projeto): **5174**

O backend do varejista configura CORS para permitir, entre outras origens:

- `http://localhost:5174`

sem impactar o app do atacadista.

---

## Resumo das coleções e multi-tenant

- `varejistas` – dados do varejista, endereços, CNPJ, etc.
- `users` / `varejista_users` (conforme padrão do atacadista) – usuários vinculados a `varejista_id`.
- `carrinhos` – carrinho por `varejista_id`, contendo itens de múltiplos atacadistas.
- `pedidos` – pedidos com `varejista_id` + `atacadista_id`, reaproveitando a coleção já utilizada pelo atacadista.
- `produtos` – mesma coleção do atacadista (somente leitura no varejista).

O `varejista_id` **nunca** é enviado pelo frontend; é sempre extraído do JWT no backend (dependência `get_current_user` e repositórios/queries aplicando o filtro automaticamente).

---

## Desenvolvimento conjunto com o atacadista

Para desenvolver e testar ambos os apps em paralelo:

1. Suba o backend do atacadista (porta 8000) normalmente.
2. Suba o backend do varejista (porta 8001) conforme descrito acima.
3. Rode o frontend do atacadista (porta 5173) a partir de `pinn-b2b-atacadista/frontend`.
4. Rode o frontend do varejista (porta 5174) a partir de `pinn-b2b-varejista/frontend`.

Os dois apps compartilharão o mesmo MongoDB e coleções comuns (`produtos`, `pedidos`), mantendo isolamento de dados por `atacadista_id` (no atacadista) e `varejista_id` (no varejista).
