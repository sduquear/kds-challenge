declare global {
  namespace Cypress {
    interface Chainable {
      dataCy(value: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

Cypress.Commands.add("dataCy", (value: string) => {
  return cy.get(`[data-cy="${value}"]`);
});

export {};
