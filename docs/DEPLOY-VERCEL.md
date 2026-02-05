# Deploy en Vercel

Este documento describe cómo desplegar el **frontend** (Next.js) y opcionalmente el **backend** (NestJS) en Vercel.

---

## Deploy del frontend (KDS Client)

Solo el **frontend** (Next.js en `apps/client`) se despliega en Vercel. La **API** puede estar en otro servicio (Railway, Render, Fly.io) o también en Vercel (ver sección siguiente).

## Requisitos previos

- La API debe estar desplegada y accesible por HTTPS (ej. `https://tu-api.railway.app` o `https://api.tudominio.com`).
- MongoDB en producción (p. ej. [MongoDB Atlas](https://www.mongodb.com/atlas)) con la API configurada con `MONGODB_URI`.

## Pasos en Vercel (Dashboard)

1. **Importar el repositorio**
   - Ve a [vercel.com/new](https://vercel.com/new).
   - Conecta tu cuenta de GitHub/GitLab/Bitbucket y selecciona el repo `kds`.

2. **Configurar el proyecto**
   - **Root Directory**: haz clic en *Edit* y selecciona `apps/client`. Así Vercel usa solo la app Next.js y pnpm instalará el monorepo desde ahí (resolviendo `@kds/shared`).
   - **Framework Preset**: se detecta automáticamente como Next.js.
   - No cambies *Build Command* ni *Output Directory* (valores por defecto).

3. **Variables de entorno**
   - En *Environment Variables* añade:
     - **Name:** `NEXT_PUBLIC_API_URL`
     - **Value:** URL base de tu API (sin barra final), ej. `https://tu-api.railway.app`
   - Así el cliente sabrá a qué dominio hacer las peticiones REST y conectar el WebSocket (Socket.io).

4. **Deploy**
   - Pulsa *Deploy*. Vercel instalará dependencias (pnpm desde el monorepo), construirá la app y desplegará.

## Usar la CLI (opcional)

Desde la **raíz del monorepo**:

```bash
pnpm add -g vercel   # si no tienes la CLI
vercel link          # enlaza el directorio con un proyecto Vercel (elige "client" / Root Directory apps/client)
vercel               # deploy preview
vercel --prod        # deploy a producción
```

Asegúrate de que en el proyecto de Vercel esté configurado **Root Directory** = `apps/client` y la variable `NEXT_PUBLIC_API_URL` en el dashboard (o con `vercel env add`).

## CORS y API

La API debe permitir el origen del frontend en Vercel (ej. `https://kds.vercel.app` o tu dominio). En NestJS suele estar `app.enableCors()`. Si restringes orígenes, añade la URL de tu deploy de Vercel.

---

## Deploy del Backend (API NestJS) en Vercel

Puedes desplegar la API NestJS en Vercel como una [Vercel Function](https://vercel.com/docs/functions). La documentación oficial: [NestJS on Vercel](https://vercel.com/docs/frameworks/backend/nestjs).

### Requisitos

- MongoDB en producción (p. ej. [MongoDB Atlas](https://www.mongodb.com/atlas)).
- Cuenta en Vercel.

### Limitaciones a tener en cuenta

- **Tamaño**: la función está limitada a 250 MB ([límites de Vercel Functions](https://vercel.com/docs/functions/limitations)).
- **WebSockets / Socket.io**: **no están soportados** en Vercel. Las Serverless Functions no mantienen conexiones WebSocket; si tu API usa Socket.io (como el KDS para actualizaciones en tiempo real), **no funcionará** desplegada en Vercel. Opciones:
  - **Desplegar la API en un host que sí soporte WebSockets** (Railway, Render, Fly.io, etc.) y usar Vercel solo para el frontend.
  - Usar un **servicio externo de tiempo real** (Ably, Pusher, Partykit, Supabase Realtime, etc.) desde el frontend y dejar la API en Vercel solo para REST; eso implica cambiar la arquitectura (el cliente hablaría con ese servicio en lugar de con Socket.io en tu backend).
- **PORT**: Vercel inyecta `PORT` automáticamente; la API ya lo usa vía `app.config.ts`.

### Pasos en Vercel (Dashboard)

1. **Nuevo proyecto para la API**
   - Ve a [vercel.com/new](https://vercel.com/new) y selecciona el mismo repositorio `kds` (o crea un segundo proyecto vinculado al mismo repo).

2. **Configurar el proyecto**
   - **Root Directory**: haz clic en *Edit* y selecciona **`apps/api`**.
   - **Framework Preset**: Vercel detecta NestJS por el entrypoint `src/main.ts` (no hace falta elegir un preset concreto).
   - **Build Command** y **Install Command**: el `vercel.json` en `apps/api` ya define:
     - `installCommand`: instala desde la raíz del monorepo para resolver `@kds/shared`.
     - `buildCommand`: `pnpm run build` (ejecuta `nest build`).
   - No cambies *Output Directory* (no aplica a backends).

3. **Variables de entorno**
   - En *Environment Variables* añade al menos:
     - **`MONGODB_URI`**: URI de tu cluster MongoDB (Atlas u otro).
   - Opcionales (según `app.config.ts`): `MONGODB_MAX_POOL_SIZE`, `MONGODB_SERVER_SELECTION_TIMEOUT_MS`, `MONGODB_SOCKET_TIMEOUT_MS`.
   - No definas `PORT`; Vercel lo inyecta en runtime.

4. **Deploy**
   - Pulsa *Deploy*. Vercel instalará dependencias (desde la raíz del monorepo), construirá la API y la desplegará como función.

### Usar la CLI (opcional)

Desde la **raíz del monorepo**, para desplegar solo la API necesitas un proyecto Vercel con Root Directory = `apps/api`:

```bash
pnpm add -g vercel   # si no tienes la CLI
cd apps/api && vercel link   # enlaza este directorio a un proyecto Vercel (elige o crea uno para la API)
vercel               # deploy preview
vercel --prod        # deploy a producción
```

Configura en el dashboard (o con `vercel env add`) la variable `MONGODB_URI` y las opcionales que uses.

### Probar en local

```bash
cd apps/api && vercel dev
```

Requisito mínimo: [Vercel CLI 48.4.0](https://vercel.com/docs/frameworks/backend/nestjs).

---

## Resumen

| Dónde        | Qué                          |
|-------------|------------------------------|
| **Vercel**  | Frontend Next.js (`apps/client`) y/o API NestJS (`apps/api`) |
| **Otro host** (opcional) | API NestJS si prefieres servidor siempre activo (Railway, Render, Fly.io) para WebSockets intensivos |

El cliente usa `NEXT_PUBLIC_API_URL` para REST y Socket.io. Si la API está en Vercel, usa la URL que te asigne Vercel (ej. `https://kds-api-xxx.vercel.app`) en esa variable del proyecto del frontend.
