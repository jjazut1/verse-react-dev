// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// -- Custom command for Firebase auth --
Cypress.Commands.add('login', (email, password, options = {}) => {
  cy.log(`Mocking login for ${email}`);
  
  // Skip UI interaction and directly mock the authentication
  const { role = 'user', uid = 'test-user-id' } = options;
  
  // Mock Firebase authentication
  cy.intercept('POST', '**/identitytoolkit/v3/relyingparty/verifyPassword*', {
    statusCode: 200,
    body: {
      kind: 'identitytoolkit#VerifyPasswordResponse',
      localId: uid,
      email: email,
      displayName: 'Test User',
      idToken: 'fake-token',
      registered: true
    }
  }).as('signIn');
  
  // Mock the user document request
  cy.intercept('POST', '**/google.firestore.v1.Firestore/GetDocument*', req => {
    if (req.body.toString().includes(`users/${uid}`)) {
      req.reply({
        statusCode: 200,
        body: {
          document: {
            name: `projects/test-project/databases/(default)/documents/users/${uid}`,
            fields: {
              email: { stringValue: email },
              role: { stringValue: role }
            }
          }
        }
      });
    }
  }).as('getUserDoc');
  
  // Directly set the authentication state in localStorage
  window.localStorage.setItem('firebase:authUser:AIzaSyAQAexEk6s14lkn-CAw-74Nn5IPqlc3SQA:[DEFAULT]', JSON.stringify({
    uid,
    email,
    displayName: 'Test User',
    emailVerified: true
  }));
  
  // Trigger auth state change
  window.dispatchEvent(new Event('storage'));
  
  return cy.wrap({ uid, email, role });
});

// Custom command to mock admin user
Cypress.Commands.add('mockAdminUser', () => {
  return cy.login('admin@example.com', 'password123', { role: 'admin', uid: 'admin-user-id' });
});

// Custom command to mock teacher user
Cypress.Commands.add('mockTeacherUser', () => {
  return cy.login('teacher@example.com', 'password123', { role: 'teacher', uid: 'teacher-user-id' });
});

// Custom command to mock student user
Cypress.Commands.add('mockStudentUser', () => {
  return cy.login('student@example.com', 'password123', { role: 'student', uid: 'student-user-id' });
});

// Custom command to mock templates
Cypress.Commands.add('mockTemplates', () => {
  cy.intercept('POST', '**/google.firestore.v1.Firestore/RunQuery*', req => {
    if (req.body.toString().includes('categoryTemplates') || req.body.toString().includes('blankGameTemplates')) {
      req.reply({
        statusCode: 200,
        body: [
          {
            document: {
              name: 'projects/test-project/databases/(default)/documents/categoryTemplates/template1',
              fields: {
                title: { stringValue: 'Animals Template' },
                type: { stringValue: 'sort-categories-egg' },
                categories: {
                  arrayValue: {
                    values: [
                      {
                        mapValue: {
                          fields: {
                            name: { stringValue: 'Mammals' },
                            items: {
                              arrayValue: {
                                values: [
                                  { stringValue: 'dog' },
                                  { stringValue: 'cat' },
                                  { stringValue: 'elephant' }
                                ]
                              }
                            }
                          }
                        }
                      },
                      {
                        mapValue: {
                          fields: {
                            name: { stringValue: 'Birds' },
                            items: {
                              arrayValue: {
                                values: [
                                  { stringValue: 'eagle' },
                                  { stringValue: 'sparrow' },
                                  { stringValue: 'penguin' }
                                ]
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                },
                eggQty: { integerValue: 6 }
              }
            }
          }
        ]
      });
    }
  }).as('getTemplates');
});

// Command to handle drag and drop for the game
Cypress.Commands.add('dragAndDrop', (subject, target) => {
  cy.wrap(subject).trigger('mousedown', { which: 1 });
  cy.wrap(target).trigger('mousemove').trigger('mouseup', { force: true });
});

// Command to simulate completing a game
Cypress.Commands.add('completeGame', (score = 950, timeElapsed = 45) => {
  cy.window().then(win => {
    const event = new CustomEvent('game-completed', { 
      detail: { score, timeElapsed } 
    });
    win.document.dispatchEvent(event);
  });
}); 