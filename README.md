# PINN B2B Cliente (Varejista)

Este arquivo é o **manual técnico e funcional** do app do varejista.  
Use este README como fonte rápida de contexto para manutenção, deploy e operação.

---

## Visão geral do produto

Portal B2B para **varejistas** comprarem de múltiplos atacadistas.

Objetivos principais:
- Vitrine única de produtos (somente leitura).
- Carrinho multi‑atacadista.
- Geração de múltiplos pedidos na finalização.
- Endereços de entrega gerenciados pelo varejista.
- Autenticação com JWT (access + refresh).

---

## Arquitetura

- **Backend**: `backend/`
  - FastAPI + Motor (MongoDB)
  - Pydantic / pydantic-settings
  - JWT com `tipo_usuario="varejista"` + `varejista_id` no payload
  - Multi‑tenant por `varejista_id` (sempre extraído do token)
- **Frontend**: `frontend/`
  - React + Vite + Chakra UI
  - Axios interceptors com refresh automático
  - Zustand (auth store + UI store)
  - React Router v6

Backends **varejista** e **atacadista** são independentes, mas compartilham o **mesmo MongoDB**.

---

## Pastas importantes

- `backend/app/api/v1/` – rotas REST
- `backend/app/services/` – regras de negócio
- `backend/app/schemas/` – modelos pydantic
- `backend/app/utils/dependencies.py` – extração do usuário/varejista via JWT
- `frontend/src/api/client.ts` – axios, auth e refresh
- `frontend/src/store/authStore.ts` – sessão no front
- `frontend/src/pages/` – páginas principais

---

## Executar localmente (dev)

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```
Swagger: http://localhost:8001/docs

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:5174

---

## Variáveis de ambiente

### Backend (usa .env do portal)
O backend do varejista reutiliza o `.env` **global do portal** com credenciais Mongo/JWT.

Exemplo (na raiz do portal):
```
MONGODB_USERNAME=...
MONGODB_PASSWORD=...
MONGODB_HOST=...
MONGODB_DATABASE=...
JWT_SECRET_KEY=...
```

### Frontend (`frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:8001
```

---

## Deploy (produção)

### Frontend (Vercel)
- Build automático via GitHub
- Variável obrigatória:
  - `VITE_API_BASE_URL=https://<backend-render-url>`

### Backend (Render)
- Serviço Web Python
- `Start Command`: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Dependências em `backend/requirements.txt`

---

## Fluxo funcional

### Público
- `/login` – login do varejista
- `/register` – auto‑registro do varejista (com busca de CNPJ)

### Protegido (JWT)
- `/produtos` – catálogo unificado (somente leitura)
- `/carrinho` – itens + seleção de endereço por atacadista
- `/pedidos` – lista de pedidos do varejista
- `/pedidos/:id` – detalhe do pedido
- `/enderecos` – CRUD de endereços (acessível pelo Perfil)

---

## Autenticação (frontend)

Tokens são salvos com prefixo `pinn_varejista_...`:
- `pinn_varejista_access_token`
- `pinn_varejista_refresh_token`

Regras:
- Cada requisição inclui `Authorization: Bearer <token>`.
- Em `401`, tenta `POST /auth/refresh`.
- Se o refresh falhar, limpa sessão e redireciona para `/login`.

---

## Endpoints principais (backend)

- `POST /auth/register` – auto‑registro, busca CNPJ
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `GET /produtos` (somente leitura)
- `GET /enderecos/`, `POST /enderecos/`
- `GET /carrinho/`, `POST /carrinho/itens`
- `POST /carrinho/finalizar`
- `GET /pedidos/`, `GET /pedidos/{id}`
- `POST /pedidos/{id}/duplicar`

---

## Multi‑tenant e coleções Mongo

Coleções:
- `varejistas`
- `users` / `varejista_users`
- `produtos` (compartilhada com atacadista)
- `carrinhos`
- `pedidos` (compartilhada)

Regras:
- `varejista_id` nunca vem do frontend.
- Sempre extraído do JWT no backend.

---

## Seeds e dados de teste

Na inicialização, o backend cria um varejista modelo e usuário padrão, sem duplicar se já existir.

Credenciais do seed (ver `backend/app/seed/initial_data.py`):
- Email: `pinn_varejista@pinn.com`
- Senha: `pinn001`

---

## Checklist rápido de diagnóstico

### Erro “Not authenticated” no mobile
Causa comum: **redirect 307 perde Authorization**.  
Solução aplicada: garantir rotas **com e sem barra final** no backend e usar `/carrinho/`, `/enderecos/`, `/pedidos/` no frontend.

### Tela em branco / erro `toFixed`
Causa: campos numéricos nulos vindos do backend.  
Solução: `formatCurrency` com fallback para 0.

### Build falha no Vercel (Permission denied vite)
Causa: `node_modules` versionado no Git.  
Solução: remover do repo e ignorar em `.gitignore`.

---

## Padrões de UI (mobile vs desktop)

- Header compacto no mobile, com controles alinhados à direita
- Botões importantes full‑width no mobile quando necessário
- Textos curtos e legíveis
- Menu “Endereços” apenas dentro do Perfil

---

## Convenções e boas práticas

- Não versionar `.env`, `node_modules`, `frontend/dist`, `__pycache__`, `*.pyc`
- Evitar chamadas sem barra final para endpoints autenticados no backend
- Sempre validar dados antes de renderizar no front

---

## Contato rápido (contexto)

Projeto: PINN B2B – Cliente (Varejista)  
Stack: FastAPI + MongoDB + React/Vite/Chakra  
Deploy: Render (backend) + Vercel (frontend)
