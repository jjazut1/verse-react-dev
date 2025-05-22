describe('Template Selection Tests', () => {
  beforeEach(() => {
    // Mock admin login without UI interaction
    cy.mockAdminUser();
    
    // Mock templates data
    cy.mockTemplates();
    
    // Mock standard Firebase responses
    cy.intercept('POST', '**/google.firestore.v1.Firestore/RunQuery*', {
      statusCode: 200,
      body: []
    }).as('firebaseQuery');
    
    cy.intercept('POST', '**/google.firestore.v1.Firestore/Commit*', {
      statusCode: 200,
      body: {
        commitTime: '2023-06-01T00:00:00.000000Z',
        writeResults: [{ updateTime: '2023-06-01T00:00:00.000000Z' }]
      }
    }).as('firebaseCommit');
  });

  it('should load the teacher dashboard with templates', () => {
    cy.visit('/teacher');
    cy.url().should('include', '/teacher');
    
    // Verify page loaded
    cy.get('body').should('be.visible');
    cy.log('Teacher dashboard loaded successfully');
    
    // Look for the Create header - using contains because it's plain text
    cy.contains('h1', 'Create').should('be.visible');
    
    // Look for tab that says "Create Games"
    cy.contains('Create Games').should('be.visible');
  });

  it('should load the configuration page', () => {
    cy.visit('/configure/sort-categories-egg');
    cy.url().should('include', '/configure/sort-categories-egg');
    cy.get('body').should('be.visible');
    cy.log('Configuration page loaded successfully');
  });

  it('should allow access to other core routes', () => {
    // Test configuration-related routes
    const routes = [
      '/configure',
      '/teacher'
    ];
    
    // Visit each route and check that the page loads
    routes.forEach(route => {
      cy.visit(route);
      cy.url().should('include', route);
      cy.get('body').should('be.visible');
      cy.log(`Route ${route} loaded successfully`);
    });
  });
}); 