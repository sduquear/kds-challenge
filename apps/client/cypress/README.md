# E2E con Cypress

Tests mínimos del cliente. **Todo se mockea** (API y simulación); no hace falta levantar la API.

1. En una terminal: `pnpm dev` (app en http://localhost:3000).
2. En otra: `pnpm test:e2e` (headless) o `pnpm test:e2e:open` (UI).

El cliente usa `NEXT_PUBLIC_API_URL` o por defecto `http://localhost:4000`; los intercepts en los specs apuntan a esa URL.
