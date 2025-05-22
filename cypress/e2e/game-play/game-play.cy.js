describe('Game Play Tests', () => {
  beforeEach(() => {
    // Mock student login without UI interaction
    cy.mockStudentUser();
    
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
    
    // Mock game document for specific IDs
    cy.intercept('POST', '**/google.firestore.v1.Firestore/GetDocument*', req => {
      if (req.body.toString().includes('userGameConfigs')) {
        req.reply({
          statusCode: 200,
          body: {
            document: {
              name: 'projects/test-project/databases/(default)/documents/userGameConfigs/game1',
              fields: {
                type: { stringValue: 'sort-categories-egg' },
                name: { stringValue: 'Test Game' },
                title: { stringValue: 'Test Game' },
                categories: {
                  arrayValue: {
                    values: [
                      {
                        mapValue: {
                          fields: {
                            name: { stringValue: 'Category 1' },
                            items: {
                              arrayValue: {
                                values: [
                                  { stringValue: 'item1' },
                                  { stringValue: 'item2' }
                                ]
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        });
      }
    }).as('getGameDoc');
  });

  it('should load the game player component', () => {
    cy.visit('/game/demo');
    cy.url().should('include', '/game/demo');
    cy.get('body').should('be.visible');
    cy.log('Game player page loaded successfully');
  });
  
  it('should navigate to game-related routes', () => {
    // Test game-related routes
    const routes = [
      '/game/demo',
      '/'
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