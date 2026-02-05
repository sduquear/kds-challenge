# KDS - Kitchen Display System

Sistema de gestión de órdenes en tiempo real para cocinas de restaurantes. Permite visualizar, gestionar y operar pedidos de plataformas de delivery (Glovo) de manera eficiente.

## Índice

- [Demostración](#demostración)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Decisiones Técnicas](#decisiones-técnicas)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [API y WebSocket](#api-y-websocket)
- [Tests](#tests)
- [Deploy](#deploy)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Problemas frecuentes](#problemas-frecuentes)
- [Mejoras futuras](#posibles-mejoras-futuras)

## Demostración

El sistema implementa un flujo Kanban con control total del usuario:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌───────────┐
│  Pendiente  │ -> │ En preparación│ -> │ Listo           │ -> │ Historial │
│   (Click)   │    │    (Click)    │    │ (Click + Rider) │    │           │
└─────────────┘    └──────────────┘    └─────────────────┘    └───────────┘
```

**Simulación realista de riders:**
- Los riders llegan de forma independiente (no automática al estar lista la orden)
- 70% de riders llegan antes de que el pedido esté listo (esperan)
- 30% de riders llegan después
- La entrega solo es posible cuando: orden READY + rider presente + click del usuario

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Sass Modules |
| Backend | NestJS 11, TypeScript, Mongoose |
| Base de datos | MongoDB |
| Comunicación | REST API + WebSockets (Socket.io) |
| Monorepo | pnpm Workspaces |

## Arquitectura

### Principio de Diseño

> **El Backend es la fuente de verdad.** El Frontend es una proyección reactiva del estado del servidor.

### Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                            │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────┐    │
│  │ Kanban UI   │ <- │ OrdersContext│ <- │ useOrdersSocket (WS)    │    │
│  │             │    │ (Optimistic) │    │                         │    │
│  └──────┬──────┘    └──────────────┘    └─────────────────────────┘    │
│         │                                          ↑                    │
│         │ PATCH /orders/:id                        │ order_created      │
│         ↓                                          │ order_updated      │
├─────────────────────────────────────────────────────────────────────────┤
│                           BACKEND (NestJS)                              │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────┐    │
│  │ Controller  │ -> │ OrdersService│ -> │ OrdersGateway (WS)      │    │
│  │             │    │ + StateMachine│   │                         │    │
│  └─────────────┘    └──────┬───────┘    └─────────────────────────┘    │
│                            │                                            │
│                            ↓                                            │
│                     ┌──────────────┐    ┌─────────────────────────┐    │
│                     │   MongoDB    │    │ RiderSimulator (auto)   │    │
│                     └──────────────┘    └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Máquina de Estados (Backend)

El backend valida estrictamente las transiciones de estado para garantizar integridad de datos:

```
PENDING ──(usuario)──> IN_PROGRESS ──(usuario)──> READY ──(usuario + rider)──> DELIVERED
```

- `PENDING → IN_PROGRESS`: El equipo de cocina acepta la orden
- `IN_PROGRESS → READY`: La orden está lista para entregar
- `READY → DELIVERED`: **Requiere rider presente** - El usuario hace click solo si el rider ya llegó

**Validación de entrega:**
- El backend rechaza la transición `READY → DELIVERED` si `riderArrivedAt` es null
- Esto garantiza que no se marque como entregado hasta que el rider esté físicamente presente

Cualquier otra transición retorna `400 Bad Request`.

### Optimistic UI (Frontend)

Para una experiencia de usuario fluida:

1. El usuario hace click en una orden
2. La UI se actualiza **inmediatamente** (sin esperar al servidor)
3. Se envía la petición al backend
4. Si falla, se hace **rollback** al estado anterior + mensaje de error

## Decisiones Técnicas

### 1. WebSockets para tiempo real

**Decisión:** Usar Socket.io en lugar de polling.

**Justificación:** 
- Las órdenes llegan de forma impredecible (simulador o integración real con Glovo)
- Múltiples usuarios pueden ver el mismo Kanban simultáneamente
- El simulador de rider necesita notificar cambios de estado automáticos

### 2. State Machine en Backend

**Decisión:** Validar transiciones de estado en el servidor, no en el cliente.

**Justificación:**
- Evita estados inconsistentes si hay bugs en el frontend
- Permite que múltiples clientes operen el mismo Kanban sin conflictos
- Facilita auditoría y trazabilidad

### 3. Simulación Realista de Riders

**Decisión:** Los riders llegan de forma independiente al estado de la orden, simulando el escenario real de un restaurante.

**Comportamiento:**
- Cuando se crea una orden, se programa la llegada del rider
- **70% de riders llegan temprano** (5-30 segundos) - antes de que la orden esté lista
- **30% de riders llegan tarde** (40-90 segundos) - después de que la orden esté lista
- La llegada del rider solo marca `riderArrivedAt`, NO entrega automáticamente

**Justificación:**
- Simula el escenario real donde riders pueden llegar antes o después de que el pedido esté listo
- El usuario mantiene control total sobre la entrega
- Demuestra arquitectura con actores independientes
- En producción, `riderArrivedAt` se actualizaría via webhook de la app del rider

### 4. Monorepo con pnpm Workspaces

**Decisión:** Usar un monorepo con paquete compartido `@kds/shared`.

**Justificación:**
- Tipos TypeScript compartidos entre frontend y backend
- Un solo `pnpm install` configura todo el proyecto
- Facilita refactors que afectan ambos lados

### 5. Optimistic UI con Rollback

**Decisión:** Actualizar la UI antes de confirmar con el servidor.

**Justificación:**
- UX más fluida (no hay lag perceptible)
- El rollback garantiza consistencia si algo falla
- Patrón estándar en apps modernas (Slack, Notion, etc.)

## Instalación y Ejecución

### Requisitos

- **Node.js** 18 o superior
- **pnpm** 8 o superior (`npm install -g pnpm`)
- **MongoDB**: con Docker (recomendado en local) o [MongoDB Atlas](https://www.mongodb.com/atlas) (gratis, sin instalar nada)

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd kds
pnpm install
```

### 2. Tener MongoDB disponible

**Prioridad de conexión:** Si defines `MONGODB_URI` en `apps/api/.env`, la API **siempre** usará esa URI (por ejemplo MongoDB Atlas) y no la de Docker, aunque tengas `docker-compose` levantado. Solo si no hay `MONGODB_URI` en el `.env` se usará `mongodb://localhost:27017/kds` (Docker o MongoDB local).

Elige **una** de las dos opciones.

#### Opción A: Con Docker

```bash
docker-compose up -d
```

Esto inicia:
- MongoDB en `localhost:27017`
- Mongo Express (UI) en `localhost:8081`

No necesitas crear `apps/api/.env`; la API usará `mongodb://localhost:27017/kds` por defecto.

#### Opción B: Sin Docker (MongoDB Atlas)

1. Crea una cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas) y un cluster gratuito (M0).
2. En el cluster: **Connect** → **Drivers** → copia el connection string (ej. `mongodb+srv://usuario:password@cluster.xxxxx.mongodb.net/`).
3. En la raíz del repo, crea `apps/api/.env` (puedes copiar de `apps/api/.env.example`) y define:

   ```
   MONGODB_URI=mongodb+srv://tu-usuario:tu-password@tu-cluster.xxxxx.mongodb.net/kds
   ```

4. **Importante:** En Atlas ve a **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`). Si no lo haces, verás `MongooseServerSelectionError: ... IP that isn't whitelisted` al conectar (desde tu máquina o desde la de quien revise el proyecto).

Con esto no necesitas instalar Docker ni MongoDB en local.

### 3. Iniciar el proyecto

```bash
pnpm dev
```

Este comando **intenta levantar MongoDB con Docker** automáticamente. Si Docker no está disponible, se usa `MONGODB_URI` de `apps/api/.env`. Recuerda: si tienes `MONGODB_URI` en el `.env`, la API se conecta siempre a esa URI (Atlas, etc.) y no a Docker.

Se inician en paralelo:
- **API**: http://localhost:4000
- **Cliente**: http://localhost:3000
- **Swagger**: http://localhost:4000/docs

### 4. Activar simulador de órdenes

```bash
curl -X POST http://localhost:4000/simulation/toggle
```

O desde Swagger: `POST /simulation/toggle`

### Variables de entorno

| App | Variable | Obligatoria | Descripción |
|-----|----------|-------------|-------------|
| **API** | `MONGODB_URI` | En producción | URI de MongoDB (local, Atlas, etc.). Si no se define, se usa `mongodb://localhost:27017/kds`. |
| **API** | `PORT` | No | Puerto del servidor (por defecto `4000`). |
| **API** | `MONGODB_MAX_POOL_SIZE` | No | Tamaño del pool de conexiones (por defecto `10`). |
| **API** | `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | No | Timeout de selección de servidor en ms (por defecto `5000`). |
| **API** | `MONGODB_SOCKET_TIMEOUT_MS` | No | Timeout de socket en ms (por defecto `45000`). |
| **Client** | `NEXT_PUBLIC_API_URL` | No | URL base de la API (por defecto `http://localhost:4000`). Usada para REST y WebSocket. |

Archivos de ejemplo: `apps/api/.env.example`, `apps/client/.env.example`. Copia a `.env` y ajusta valores.

### Scripts disponibles

Desde la **raíz del monorepo**:

| Script | Descripción |
|--------|-------------|
| `pnpm dev` | Inicia API y Client en paralelo (intenta levantar MongoDB con Docker si no hay `MONGODB_URI`). |
| `pnpm test:unit` | Ejecuta tests unitarios de API (Jest) y Client (Vitest) en paralelo. |
| `pnpm test:e2e` | Ejecuta tests e2e de API (Jest/Supertest) y Client (Cypress) en paralelo. |

Desde **`apps/api`**:

| Script | Descripción |
|--------|-------------|
| `pnpm start:dev` | API en modo desarrollo con hot-reload. |
| `pnpm build` | Compila la API para producción. |
| `pnpm test:unit` / `pnpm test:unit:cov` | Tests unitarios (Jest). |
| `pnpm test:e2e` / `pnpm test:e2e:cov` | Tests e2e (servicios mockeados, sin MongoDB). |
| `pnpm lint` | ESLint. |

Desde **`apps/client`**:

| Script | Descripción |
|--------|-------------|
| `pnpm dev` | Next.js en desarrollo (puerto 3000). |
| `pnpm build` / `pnpm start` | Build y servidor de producción. |
| `pnpm test:unit` / `pnpm test:unit:watch` / `pnpm test:unit:cov` | Vitest. |
| `pnpm test:e2e` / `pnpm test:e2e:open` | Cypress (headless / UI). |
| `pnpm lint` | Next lint. |

## Deploy

El proyecto está preparado para desplegarse en [Railway](https://railway.app), que soporta WebSockets y permite subir el monorepo con frontend y backend en un mismo flujo.

### Railway (monorepo: API + Client)

1. Conecta el repositorio en Railway.
2. Railway detecta el monorepo; puedes configurar **dos servicios** (o uno por app según tu preferencia):
   - **API:** Root `apps/api`, comando de build `pnpm run build` (o desde raíz `pnpm --filter api run build`), start `pnpm run start:prod` (o el que exponga el binario de Nest).
   - **Client:** Root `apps/client`, build y start estándar de Next.js.
3. **Variables de entorno:**
   - **API:** `MONGODB_URI` obligatoria (ej. MongoDB Atlas). Opcionales: `PORT`, `MONGODB_MAX_POOL_SIZE`, timeouts.
   - **Client:** `NEXT_PUBLIC_API_URL` con la URL pública de la API (sin barra final), ej. `https://tu-api.railway.app`.
4. **CORS:** La API usa `enableCors()`. Si restringes orígenes, añade la URL del frontend (ej. la URL que Railway asigne al cliente).
5. **Health check:** El host puede usar `GET /health` para comprobar que la API y MongoDB responden.

## Estructura del Proyecto

```
kds/
├── apps/
│   ├── api/                         # Backend NestJS
│   │   ├── src/
│   │   │   ├── orders/              # Módulo de órdenes (controller, service, gateway, repository, entities)
│   │   │   ├── simulation/          # Simulador de órdenes y riders
│   │   │   ├── health/              # Health check (Terminus + MongoDB)
│   │   │   ├── common/              # Filtros, validación, tipos
│   │   │   └── config/              # Configuración y validación Joi
│   │   ├── test/                    # Tests e2e (Jest + Supertest)
│   │   ├── postman/                 # Colección Postman para la API
│   │   └── .env.example
│   │
│   └── client/                      # Frontend Next.js
│       ├── components/              # Kanban, Column, CreateOrderModal, Toast, ThemeToggle, SoundToggle
│       ├── contexts/                # Orders, Sound, Theme, Toast
│       ├── hooks/                   # useOrdersSocket
│       ├── services/                # api.service (HTTP tipado)
│       ├── cypress/                 # Tests e2e (fixtures, e2e, support)
│       └── .env.example
│
├── packages/shared/                 # @kds/shared: OrderStatus, Order, Item
├── scripts/                          # try-docker.js (levantar MongoDB antes de pnpm dev)
├── docker-compose.yml               # MongoDB + Mongo Express (opcional)
├── pnpm-workspace.yaml
└── package.json                     # Scripts del monorepo (dev, test:unit, test:e2e)
```

## API y WebSocket

### Endpoints REST

Documentación interactiva: **Swagger** en `http://localhost:4000/docs` cuando la API está levantada.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Health check (API + MongoDB). Útil para orquestadores y despliegue. |
| GET | `/orders` | Listar todas las órdenes (ordenadas por `createdAt` desc). |
| GET | `/orders/:id` | Obtener una orden por ID. |
| POST | `/orders` | Crear orden (body: `CreateOrderDto`). Usado por simulador y por el modal del cliente. |
| PATCH | `/orders/:id` | Actualizar orden (p. ej. cambio de estado). Body: `UpdateOrderDto`. |
| DELETE | `/orders/:id` | Eliminar una orden. |
| GET | `/simulation/status` | Estado del simulador (`{ isRunning: boolean }`). |
| POST | `/simulation/toggle` | Iniciar o detener el simulador de órdenes. |

Para probar la API sin el cliente: hay una colección **Postman** en `apps/api/postman/kds-api.postman_collection.json`. Importarla en Postman y usar la variable de entorno `baseUrl` (ej. `http://localhost:4000`).

### WebSocket (Socket.io)

- **Namespace:** `orders` → URL de conexión: `{API_URL}/orders` (ej. `http://localhost:4000/orders`).
- **Eventos emitidos por el servidor:**
  - `order_created`: cuando se crea una nueva orden (simulador o POST).
  - `order_updated`: cuando se actualiza una orden (PATCH, p. ej. cambio de estado o llegada del rider).

El cliente (`useOrdersSocket`) se suscribe a estos eventos para mantener el Kanban en tiempo real sin recargar.

## Tests

Desde la raíz del monorepo:

```bash
# Tests unitarios (API)
pnpm test:unit

# Tests e2e (API)
pnpm test:e2e
```

Desde `apps/api`: `pnpm test:unit`, `pnpm test:e2e`, `pnpm test:unit:cov`, `pnpm test:e2e:cov`.

Desde `apps/client`: `pnpm test:unit` (Vitest), `pnpm test:unit:watch`, `pnpm test:unit:cov`.

### Tests unitarios (API)

Jest en `apps/api/src/**/*.spec.ts`. Cubren servicios, controladores y gateway de órdenes y simulación (lógica, state machine, mocks).

### Tests unitarios (Frontend)

Vitest en `apps/client/**/*.test.{ts,tsx}`. Cubren servicios (`api.service`), helpers (`orders`, `utilities`) y componentes (p. ej. `SoundToggle`) con Testing Library y mocks (fetch, contextos). Ver [Buenas prácticas unitarias (Frontend – Vitest)](#buenas-prácticas-unitarias-frontend--vitest-implementadas) más abajo.

### Tests e2e (API)

Jest + Supertest en `apps/api/test/**/*.e2e-spec.ts`. No requieren MongoDB (servicios mockeados).

| Archivo | Casos |
|---------|--------|
| **app.e2e-spec.ts** | GET `/` → 200, mensaje "KDS API is running" |
| **orders.e2e-spec.ts** | GET `/orders` → 200, lista; POST `/orders` → 201 body válido, 400 validación (campos faltantes, customerName objeto, status inválido), 409 externalId duplicado; GET `/orders/:id` → 200 existe, 404 no existe; PATCH `/orders/:id` → 200 válido, 400 status inválido, 404 no existe; DELETE `/orders/:id` → 200, 404 no existe |
| **simulation.e2e-spec.ts** | GET `/simulation/status` → 200 con `isRunning` true/false; POST `/simulation/toggle` → 201 con `status: 'started'` o `'stopped'` |

### Tests e2e (Frontend – Cypress)

Cypress en `apps/client/cypress/e2e/**/*.cy.ts`. Cubren flujos críticos del cliente (layout, Kanban, modal crear orden, modal métricas, simulación). **No requieren API ni WebSocket real**: todo se mockea con `cy.intercept`.

```bash
# Desde la raíz (con el cliente levantado en otro terminal)
pnpm --filter client run dev
pnpm --filter client run cypress:open   # UI
pnpm --filter client run cypress:run     # headless

# O desde apps/client con el servidor ya corriendo
cd apps/client && pnpm cypress:open
cd apps/client && pnpm cypress:run
```

| Describe | Casos |
|----------|--------|
| **Layout y navegación** | Carga la página y muestra botones principales (Crear orden, Métricas, Iniciar simulación) |
| **Kanban** | Columnas visibles con lista vacía; órdenes visibles cuando la API devuelve datos (fixture) |
| **Modal Crear orden** | Abrir/cerrar, rellenar formulario, enviar (mock POST), orden creada visible en Kanban |
| **Modal Métricas** | Abrir y comprobar secciones (En proceso, Para entregar, Sin rider, Entregados) |
| **Simulación** | Botón Iniciar simulación → mock toggle → texto "Detener simulación" |

### Buenas prácticas E2E (Cypress) implementadas

- **Selectores estables**: Uso de `data-cy` en componentes clave (botones, modales, columnas del Kanban) y comando `cy.dataCy("id")` en los specs. Se evitan selectores por clase CSS o texto que cambie con copy.
- **Esperas deterministas**: Sin `cy.wait(ms)`. Se espera por condiciones visibles (p. ej. `cy.dataCy("kanban-column-pending").should("exist", { timeout })`) o por aliases de red (`cy.wait("@createOrder")`).
- **Control de red**: Todos los tests usan `cy.intercept` para GET/POST con respuestas mock (statusCode y body explícitos). Los intercepts usan el patrón `**/orders` para no depender del valor de `NEXT_PUBLIC_API_URL`.
- **Visibilidad antes de interacción**: Antes de cada `.click()` relevante se hace `.should("be.visible")` para reducir tests inestables (flakiness) por elementos aún no pintados.
- **CI**: En `cypress.config.ts`: `screenshotOnRunFailure: true`, `retries: { runMode: 2, openMode: 0 }` (reintentos solo en modo headless), `video: false` para no acumular artefactos pesados.
- **Fixtures**: Datos reutilizables en `cypress/fixtures/orders.json`; al menos un test usa `cy.fixture("orders")` para mockear GET de órdenes y comprobar render.
- **Tests aislados**: Cada test hace `cy.visit("/")` y `beforeEach(mockApi)`; no se depende del orden de ejecución ni de estado previo.

### Buenas prácticas unitarias (Frontend – Vitest) implementadas

- **Configuración**: Vitest con `defineConfig`, entorno `jsdom`, `setupFiles` para `@testing-library/jest-dom`, `globals: true`, coverage con V8 y `unstubGlobals: true` para restaurar globals tras cada test y evitar fugas entre archivos.
- **Organización por método/comportamiento**: En `api.service.test.ts`, un `describe` por método del servicio (`getOrders`, `updateOrderStatus`, `createOrder`, `getOrder`, `updateOrder`, `getSimulationStatus`, `toggleSimulation`). En `orders.test.ts`, agrupación por escenario (`por status`, `READY con y sin rider`, `edge cases`). En `utilities.test.ts`, un `describe` raíz `utilities` que agrupa por función (`formatDuration`, `formatPrice`, `getRandomId`, `getRandomInterval`). En componentes (p. ej. `SoundToggle`), bloques `render` vs `user interaction` para separar pruebas de UI y de interacción.
- **Mocking**: `vi.stubGlobal("fetch", vi.fn())` en `beforeEach` para el cliente HTTP; `vi.mock("@/contexts/...")` para contextos de React; `vi.mocked(fetch).mockResolvedValueOnce(...)` para respuestas por caso. Sin `afterEach` manual de globals gracias a `unstubGlobals: true`.
- **Assertions**: Mensajes de error exactos cuando el comportamiento es conocido (p. ej. `toThrow("Bad Request")` en lugar de regex amplio). Uso de `expect.stringContaining`, `expect.objectContaining` para no acoplar al detalle de la URL o del body.
- **Queries semánticas y accesibilidad**: En componentes se usa `getByRole("button", { name: /.../ })` en lugar de `data-testid` cuando basta el rol y el nombre. Se comprueban atributos de accesibilidad (`aria-pressed`, `title`) para asegurar que el componente sea usable por lectores de pantalla.
- **Datos de prueba**: Factory `createMockOrder(overrides)` en tests de órdenes para construir datos consistentes; constante `mockOrder` reutilizada en tests del API service.
- **Casos límite y errores**: Tests de respuestas `!response.ok`, body sin `message`, y `response.json()` fallido; array vacío y status desconocido en `classifyOrders`; valores inválidos en `formatDuration` y `formatPrice`.

## Problemas frecuentes

| Problema | Causa / Solución |
|----------|-------------------|
| `MongooseServerSelectionError` o "IP not whitelisted" | Con Atlas: en **Network Access** añade `0.0.0.0/0` o tu IP. Comprueba usuario/contraseña y que la base exista en la URI. |
| Puerto 3000 o 4000 en uso | Cambia `PORT` en `apps/api/.env` o ejecuta el cliente en otro puerto (`next dev -p 3001`). |
| El cliente no conecta a la API | Revisa `NEXT_PUBLIC_API_URL` en el cliente (por defecto `http://localhost:4000`). En producción debe ser la URL pública de la API. |
| WebSocket no conecta | Misma base URL que REST. Si la API está detrás de un proxy, asegura que WebSockets estén habilitados (Railway los soporta por defecto). |
| `pnpm dev` no arranca MongoDB | El script intenta `docker compose up -d`. Si no usas Docker, crea `apps/api/.env` con `MONGODB_URI` (ej. Atlas). |

## Posibles Mejoras Futuras

1. **Drag & Drop** - Mover órdenes entre columnas arrastrando
2. **Filtros** - Buscar órdenes por cliente o ID externo
3. **Notificaciones sonoras** - Alertar cuando llega una nueva orden
4. **Métricas** - Tiempo promedio de preparación, órdenes por hora
5. **Autenticación** - Login para diferentes roles (cocina, admin)
6. **Integración real con Glovo** - Webhook para recibir órdenes reales
7. ~~**Tests E2E frontend**~~ – Implementado con Cypress en `apps/client` (ver sección Tests y buenas prácticas E2E)

## Autor

Desarrollado como prueba técnica para Platomico.

---

**Tecnologías:** TypeScript, NestJS, Next.js, MongoDB, Socket.io, pnpm Workspaces
