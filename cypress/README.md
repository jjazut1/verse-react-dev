# Automated Testing with Cypress

This project uses Cypress for end-to-end testing of critical user flows.

## Setup

1. Make sure you have all dependencies installed:
   ```
   npm install
   ```

2. To open Cypress UI for interactive testing:
   ```
   npm run cy:open
   ```

3. To run all tests headlessly:
   ```
   npm run test:e2e
   ```

## Running Specific Tests

- Run all tests: `npm run test:basic`
- Run template tests: `npm run test:template`
- Run assignment tests: `npm run test:assignment`
- Run gameplay tests: `npm run test:gameplay`

## Current Test Status

The tests are organized by key user flows:

### Basic Navigation Tests
These tests verify that core routes in the application load correctly:
- Home page navigation
- Login page access
- Configuration page access

### Template Selection
Tests for the template selection workflow in the teacher dashboard:
- Loading the template page
- Verifying templates display
- Basic template selection

### Assignment Creation
Tests for the assignments page:
- Loading the assignments view
- Navigation to relevant routes

### Game Play
Basic tests for the game player:
- Loading the game component
- Testing navigation

## Firebase Mocking

The tests use custom commands to mock Firebase authentication and database operations:

- `cy.mockAdminUser()` - Sets up authentication and user document for an admin user
- `cy.mockTeacherUser()` - Sets up authentication and user document for a teacher user
- `cy.mockStudentUser()` - Sets up authentication and user document for a student user
- `cy.mockTemplates()` - Mocks template data for configuration tests
- `cy.completeGame()` - Simulates completing a game with a given score

## Adding Test IDs to Components

To make tests more reliable, add `data-testid` attributes to key elements:

```jsx
// Example in your React component
<button data-testid="create-template-btn" onClick={handleCreate}>
  Create Template
</button>

// Then in your test
cy.get('[data-testid="create-template-btn"]').click();
```

Recommended elements to add test IDs to:
- Navigation tabs and buttons
- Form submission buttons
- Game interaction elements
- Template and assignment items
- Modal dialogs

## Troubleshooting

If you encounter issues with the tests:

1. **Authentication issues**: The tests bypass the UI login process using localStorage and mocked network requests. If your app changes how authentication is handled, you may need to update the `login` command in `cypress/support/commands.js`.

2. **UI structure changes**: If your UI elements change (selectors, text, etc.), the tests will need to be updated. Use Cypress Test Runner (`npm run cy:open`) to interactively debug.

3. **Firebase structure changes**: If your Firebase database structure changes, update the mock responses in the test files.

4. **DOM structure explorer**: Run the structure explorer test to understand your app's current DOM structure:
   ```
   npx cypress run --spec 'cypress/e2e/structure-explorer.cy.js'
   ```

## Running in CI

These tests are designed to run in CI environments. In a GitHub Actions workflow, you might use:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:e2e
``` 