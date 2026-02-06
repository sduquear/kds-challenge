# KDS - Kitchen Display System

Sistema de gestión de órdenes en tiempo real para cocinas de restaurantes. Visualiza y gestiona pedidos ficticios de plataformas de delivery (Glovo, Uber Eats, Just Eat, etc...) de forma eficiente.

**En producción (Railway):** [Cliente](https://kds-client.up.railway.app) · [API](https://kds-api.up.railway.app) · [Swagger](https://kds-api.up.railway.app/docs)

## Índice

- [KDS - Kitchen Display System](#kds---kitchen-display-system)
  - [Índice](#índice)
  - [¿Cómo funciona?](#cómo-funciona)
  - [Stack](#stack)
  - [Decisiones técnicas](#decisiones-técnicas)
  - [Instalación](#instalación)
  - [Variables de entorno](#variables-de-entorno)
  - [Scripts (raíz)](#scripts-raíz)
    - [Comportamiento de `pnpm dev` (Docker / MongoDB)](#comportamiento-de-pnpm-dev-docker--mongodb)
    - [Comportamiento de `pnpm prod`](#comportamiento-de-pnpm-prod)
    - [Entorno por comando](#entorno-por-comando)
  - [Estructura](#estructura)
  - [API y WebSocket](#api-y-websocket)
  - [Tests](#tests)
  - [Problemas frecuentes](#problemas-frecuentes)
  - [Mejoras futuras](#mejoras-futuras)

## ¿Cómo funciona?

**Flujo Kanban:** El usuario mueve las órdenes con clicks: **Pendiente** → **En preparación** → **Listo** → **Historial**. La última transición (Listo → Historial) solo es posible cuando el rider ya ha llegado + click del usuario.

**Simulación de riders:** Llegan de forma independiente (70% antes de que el pedido esté listo, 30% después), simulando el escenario real.

**Arquitectura:** El backend es la fuente de verdad; el frontend es una proyección reactiva. Flujo: Frontend (Kanban ← OrdersContext ← useOrdersSocket) ↔ Backend (Controller → OrdersService → MongoDB + OrdersGateway + RiderSimulator). Eventos WebSocket: `order_created`, `order_updated`.

**Estados (backend):** `PENDING` → `IN_PROGRESS` → `READY` → `DELIVERED` (este último solo si `riderArrivedAt` está definido).

**Optimistic UI:** La UI se actualiza al instante; si el servidor falla, se hace rollback.

## Stack

| Capa          | Tecnología                                     |
| ------------- | ---------------------------------------------- |
| Frontend      | Next.js 14, React 18, TypeScript, Sass Modules |
| Backend       | NestJS 11, TypeScript, Mongoose                |
| Base de datos | MongoDB                                        |
| Comunicación  | REST API + WebSockets (Socket.io)              |
| Monorepo      | pnpm Workspaces                                |

## Decisiones técnicas

Principales decisiones implementadas y su justificación:

1. **WebSockets (Socket.io) en lugar de polling**  
   Las órdenes llegan de forma impredecible y varios usuarios pueden ver el mismo Kanban. El servidor notifica cambios al instante (`order_created`, `order_updated`) sin que el cliente tenga que preguntar cada X segundos.

2. **Máquina de estados en el backend**  
   Las transiciones (PENDING → IN_PROGRESS → READY → DELIVERED) se validan en el servidor. Así se evitan estados inconsistentes por bugs en el frontend, varios clientes pueden operar el mismo Kanban sin conflictos y se facilita auditoría y trazabilidad.

3. **Simulación realista de riders**  
   Los riders llegan de forma independiente al estado de la orden (70% temprano, 30% tarde). Simula el escenario real donde el repartidor puede llegar antes o después de que el pedido esté listo. La entrega solo se marca cuando el usuario hace click y el rider ya está presente (`riderArrivedAt`), no de forma automática.

4. **Monorepo con pnpm Workspaces**  
   Un solo repositorio con `apps/api`, `apps/client` y `packages/shared`. Tipos TypeScript compartidos, un solo `pnpm install` y refactors que afectan a ambos lados de forma coherente.

5. **Optimistic UI con rollback**  
   La UI se actualiza en cuanto el usuario actúa; la petición al backend va en paralelo. Si la respuesta falla, se revierte el cambio y se muestra error. Mejora la percepción de velocidad y mantiene consistencia cuando algo falla.

## Instalación

**Requisitos:** Node.js 18+, pnpm 8+. Para MongoDB en desarrollo: [Docker](https://www.docker.com/) **o** [MongoDB Atlas](https://www.mongodb.com/atlas). En producción se usa siempre Atlas (no hace falta Docker).

```bash
git clone https://github.com/sduquear/kds-challenge.git
cd kds-challenge
pnpm install
```

**Configuración antes de `pnpm dev`:**

- **API:** Copia `apps/api/.env.example` a `apps/api/.env.local`.
- **Client:** Opcional. Copia `apps/client/.env.example` a `apps/client/.env.local` si quieres cambiar la URL de la API (por defecto `http://localhost:4000`).

**Arranque (desarrollo):**

```bash
pnpm dev
```

- Antes de arrancar API y Client, el script `try-docker.js` comprueba el entorno: si `MONGODB_URI` apunta a **localhost** y Docker no está instalado o no puede iniciar, verás un error y el proceso terminará (no se levantarán API ni Client). **Solución: instala Docker.**
- API: http://localhost:4000
- Cliente: http://localhost:3000
- Swagger: http://localhost:4000/docs

## Variables de entorno

En la API se usan **las mismas variables** en local y en producción; solo cambian los valores. Archivos: `.env.local` (desarrollo) y `.env.production` (producción).

| App    | Archivo                    | Variables             | Descripción                                        |
| ------ | -------------------------- | --------------------- | -------------------------------------------------- |
| API    | `apps/api/.env.local`      | `PORT`, `MONGODB_URI` | Desarrollo. Copia desde `apps/api/.env.example`    |
| API    | `apps/api/.env.production` | `PORT`, `MONGODB_URI` | Producción (Atlas u otro remoto; no se usa Docker) |
| Client | `apps/client/.env.local`   | `NEXT_PUBLIC_API_URL` | Desarrollo (opcional; por defecto localhost:4000)  |

- **API:** La app carga `.env.local` cuando corres `start:dev` y `.env.production` cuando corres `start` / `start:prod`. Mismas variables en ambos archivos.
- **Client (producción):** En el host (Railway, Vercel, etc.) define `NEXT_PUBLIC_API_URL` antes del build.

## Scripts (raíz)

| Script            | Descripción                                                                     |
| ----------------- | ------------------------------------------------------------------------------- |
| `pnpm install`    | Instala las dependencias de API + Client + Shared                               |
| `pnpm dev`        | Comprueba Docker/MongoDB (`try-docker.js`) y arranca API + Client en desarrollo |
| `pnpm build:prod` | Compila shared, API y Client para producción                                    |
| `pnpm prod`       | Build de producción + API + Client en paralelo (sin Docker)                     |
| `pnpm test:unit`  | Tests unitarios API y Client                                                    |
| `pnpm test:e2e`   | Tests e2e API y Client (Cypress)                                                |

### Comportamiento de `pnpm dev` (Docker / MongoDB)

Al ejecutar `pnpm dev` se ejecuta primero `scripts/try-docker.js`:

- Si tienes **`MONGODB_URI` en `.env.local`** (o `.env`):
  - **URI apunta a localhost** (`localhost`, `127.0.0.1`) → se intenta levantar Docker (MongoDB). Si Docker no está instalado o no arranca, el script muestra un error y termina con **exit 1** (no se inician API ni Client). Opciones: instalar Docker.
  - **URI remota** (p. ej. Atlas) → no se usa Docker; el script termina bien y arrancan API y Client.
- Si **no** tienes `MONGODB_URI` configurado → se intenta levantar Docker. Si falla, mismo error y exit 1.

En consola verás qué archivo se usa (p. ej. `✓ Usando MONGODB_URI de .env.local`) y un mensaje de comprobación del entorno.

### Comportamiento de `pnpm prod`

**No se ejecuta Docker.** Se hace solo el build y el arranque de API y Client. La API usa `apps/api/.env.production` (donde típicamente tendrás la URI de MongoDB Atlas). Ideal para simular producción en local o para entornos donde la BD ya está en la nube.

### Entorno por comando

**API (en `apps/api`):** el comando define el archivo de variables; en terminal se imprime `🚀 Entorno: development|production` y las URLs (localhost en dev, 0.0.0.0 en prod):

- `pnpm start:dev` → desarrollo → carga `.env.local`
- `pnpm start` o `pnpm start:prod` → producción → carga `.env.production`

**Client (en `apps/client`):** Next.js asigna el entorno: `next dev` → desarrollo, `next start` → producción (carga `.env.local`, `.env.development`, `.env.production` según [docs](https://nextjs.org/docs/14/pages/building-your-application/configuring/environment-variables)). El entorno se imprime en la **consola del navegador** al cargar la app.

## Estructura

```
kds/
├── apps/
│   ├── api/          # NestJS: orders, simulation, health, config
│   └── client/       # Next.js: Kanban, contexts, hooks, services
├── packages/shared/  # Tipos compartidos (@kds/shared)
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## API y WebSocket

**REST:** Ver Swagger en `/docs`. Principales: `GET/POST/PATCH/DELETE /orders`, `GET /health`, `GET/POST /simulation/status` y `/simulation/toggle`.

**WebSocket:** Namespace `orders` en `{API_URL}/orders`. Eventos: `order_created`, `order_updated`.

## Tests

- **API:** Jest en `apps/api` (unit en `*.spec.ts`, e2e en `test/*.e2e-spec.ts`). E2e con servicios mockeados, sin MongoDB.
- **Client:** Vitest (unit) y Cypress (e2e) en `apps/client`. E2e con `cy.intercept` (no requieren API real).

## Problemas frecuentes

| Problema                                                 | Solución                                                                                                                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev` termina con error "Docker no está disponible" | Tienes `MONGODB_URI` apuntando a localhost y Docker no está instalado o no arranca. **Solución:** Instala [Docker](https://www.docker.com/) y vuelve a ejecutar. |
| IP not whitelisted (Atlas)                               | En Atlas: Network Access → Add IP → `0.0.0.0/0`                                                                                                                  |
| Puerto 3000/4000 en uso                                  | Cambiar `PORT` en `.env.local` o `next dev -p 3001`                                                                                                              |
| Cliente no conecta a API                                 | Revisar `NEXT_PUBLIC_API_URL` en `apps/client/.env.local`                                                                                                        |
| `pnpm dev` no arranca la API                             | Asegúrate de tener `apps/api/.env.local` con `MONGODB_URI` (local con Docker o Atlas). Ver `apps/api/.env.example`.                                              |

## Mejoras futuras

Búsquedas, filtros, drag & drop, autenticación, integración real con terceros, etc...

---

Desarrollado como prueba técnica para Platomico.  
**Tecnologías:** TypeScript, NestJS, Next.js, MongoDB, Socket.io, pnpm Workspaces
