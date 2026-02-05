import { defineConfig } from "cypress";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    video: false,
    screenshotOnRunFailure: true,
    retries: { runMode: 2, openMode: 0 },
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    allowCypressEnv: false,
  },
  env: {
    apiBase,
  },
});
