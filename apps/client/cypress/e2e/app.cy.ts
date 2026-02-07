function mockApi() {
  cy.intercept("GET", "**/orders", { statusCode: 200, body: [] }).as("getOrders");
  cy.intercept("GET", "**/simulation/status", {
    statusCode: 200,
    body: { isRunning: false },
  }).as("getSimulationStatus");
  cy.intercept("POST", "**/simulation/toggle", {
    statusCode: 200,
    body: { status: "started" },
  }).as("toggleSimulation");
}

function waitForKanban() {
  cy.dataCy("kanban-column-pending").should("exist", { timeout: 15000 });
}

describe("KDS", () => {
  beforeEach(() => {
    mockApi();
  });

  describe("Layout y navegación", () => {
    it("carga la página y muestra el layout principal", () => {
      cy.visit("/");
      cy.contains("KDS: Krazy Display Service").should("be.visible");
      cy.dataCy("create-order-btn").should("be.visible");
      cy.dataCy("metrics-btn").should("be.visible");
      cy.dataCy("sim-toggle-btn").should("be.visible");
    });
  });

  describe("Kanban", () => {
    it("muestra las columnas tras cargar (vacío)", () => {
      cy.visit("/");
      waitForKanban();
      cy.dataCy("kanban-column-in_progress").should("exist");
      cy.dataCy("kanban-column-ready").should("exist");
    });

    it("muestra órdenes cuando la API devuelve datos (fixture)", () => {
      cy.intercept("GET", "**/orders*", { fixture: "orders" }).as("getOrders");
      cy.intercept("GET", "**/simulation/status", {
        statusCode: 200,
        body: { isRunning: false },
      }).as("getSimulationStatus");
      cy.visit("/");
      waitForKanban();
      cy.contains("E2E-001").should("exist");
      cy.contains("Cliente E2E").should("exist");
    });
  });

  describe("Modal Crear orden", () => {
    const createdOrderMock = {
      _id: "new-order-1",
      externalId: "MAN-001",
      status: "PENDING",
      customerName: "Test E2E",
      items: [
        { id: "item-1", name: "Café", quantity: 1, price: { amount: 350, currency: "EUR" } },
      ],
      total: { amount: 350, currency: "EUR" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    function rellenarFormularioCrearOrden() {
      cy.contains("label", "Nombre del cliente").find("input").type("Test E2E");
      cy.contains("label", "Nombre del producto").find("input").type("Café");
      cy.contains("label", "Precio (€)").find("input").clear().type("3.50");
    }

    it("abre el modal y lo cierra", () => {
      cy.visit("/");
      waitForKanban();
      cy.dataCy("create-order-btn").should("be.visible").click();
      cy.dataCy("create-order-dialog").should("be.visible").and("contain", "Crear orden");
      cy.dataCy("create-order-dialog-close").should("be.visible").click();
      cy.dataCy("create-order-dialog").should("not.exist");
    });

    it("abre modal y rellena cliente, producto y precio", () => {
      cy.visit("/");
      waitForKanban();
      cy.dataCy("create-order-btn").should("be.visible").click();
      cy.dataCy("create-order-dialog").should("be.visible").within(rellenarFormularioCrearOrden);
      cy.dataCy("create-order-submit").should("be.visible");
    });

    it("envía formulario y se cierra el modal (mock POST)", () => {
      cy.intercept("POST", "**/orders", { statusCode: 200, body: createdOrderMock }).as("createOrder");
      cy.visit("/");
      waitForKanban();
      cy.dataCy("create-order-btn").should("be.visible").click();
      cy.dataCy("create-order-dialog").should("be.visible").within(() => {
        rellenarFormularioCrearOrden();
        cy.dataCy("create-order-submit").should("be.visible").click();
      });
      cy.wait("@createOrder");
      cy.dataCy("create-order-dialog").should("not.exist");
    });

    it("la orden creada se visualiza en el Kanban (ID y nombre cliente)", () => {
      cy.intercept("POST", "**/orders", { statusCode: 200, body: createdOrderMock }).as("createOrder");
      cy.visit("/");
      waitForKanban();
      cy.dataCy("create-order-btn").should("be.visible").click();
      cy.dataCy("create-order-dialog").should("be.visible").within(() => {
        rellenarFormularioCrearOrden();
        cy.dataCy("create-order-submit").should("be.visible").click();
      });
      cy.wait("@createOrder");
      cy.dataCy("create-order-dialog").should("not.exist");
      cy.contains("MAN-001", { timeout: 5000 }).should("exist");
      cy.contains("Test E2E").should("exist");
    });
  });

  describe("Modal Métricas", () => {
    it("abre el modal y muestra las secciones de estado", () => {
      cy.visit("/");
      waitForKanban();
      cy.dataCy("metrics-btn").should("be.visible").click();
      cy.dataCy("metrics-dialog").should("be.visible");
      cy.contains("Estado de Entregas").should("exist");
      cy.contains("En proceso").should("exist");
      cy.contains("Para entregar").should("exist");
      cy.contains("Sin rider").should("exist");
      cy.contains("Entregados").should("exist");
      cy.dataCy("metrics-dialog-close").should("be.visible").click();
      cy.dataCy("metrics-dialog").should("not.exist");
    });
  });

  describe("Simulación", () => {
    it("inicia la simulación (mock toggle)", () => {
      cy.visit("/");
      waitForKanban();
      cy.dataCy("sim-toggle-btn").should("be.visible").click();
      cy.wait("@toggleSimulation");
      cy.dataCy("sim-toggle-btn").should("have.attr", "aria-label", "Detener simulación");
    });
  });
});
