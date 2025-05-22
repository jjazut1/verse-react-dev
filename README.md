# Lumino Learning Platform

[![React](https://img.shields.io/badge/React-18.x-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-10.x-orange)](https://firebase.google.com/)
[![ChakraUI](https://img.shields.io/badge/ChakraUI-2.x-teal)](https://chakra-ui.com/)

## Overview

Lumino Learning is an interactive educational platform designed for K-6 teachers and students. It enables teachers to create custom educational games, assign them to students, and track progress. Students receive a personalized learning experience with engaging, age-appropriate games.

**Tagline:** Create Efficiently. Spark Curiosity. Shape Minds.

## Features

### For Teachers

- **Student Management**
  - Create and manage student accounts
  - View student profiles and progress
  - Bulk actions for managing groups/classes

- **Game Creation and Templates**
  - Create custom educational games from templates
  - Modify existing games to suit curriculum
  - Share games with other teachers

- **Assignment Management**
  - Assign games to individual or multiple students
  - Set deadlines and completion requirements
  - Track student progress and completion

- **Analytics and Reporting**
  - View student performance metrics
  - Track engagement and identify learning gaps
  - Generate progress reports

### For Students

- **Personalized Dashboard**
  - View assigned games and due dates
  - Track personal progress and achievements
  - Access previously completed games

- **Game Experience**
  - Age-appropriate interface
  - Visual and audio feedback
  - Accessibility features for different learning needs

- **Progress Tracking**
  - Achievement badges
  - Performance history
  - Personal high scores

## Technology Stack

- **Frontend**: React with Vite, ChakraUI
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Testing**: Cypress for E2E testing
- **Deployment**: Firebase Hosting

## Getting Started

### Prerequisites

- Node.js (version 20.x or higher)
- npm (version 8.x or higher)
- Firebase account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/lumino-learning.git
   cd lumino-learning
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add your Firebase configuration

4. Start the development server:
   ```
   npm run dev
   ```

5. Run tests:
   ```
   npm run test:basic
   ```

## Project Structure

```
/src
  /components         # Reusable UI components
  /contexts           # React context providers
  /hooks              # Custom React hooks
  /pages              # Application pages/routes
  /services           # Service layer for API interaction
  /types              # TypeScript type definitions
  /utils              # Utility functions
  /styles             # Global styles and theme
  /config             # Application configuration
  App.tsx             # Main application component
  main.tsx            # Application entry point
```

## Testing

We use Cypress for end-to-end testing. The test suite covers:

- Authentication flows
- Teacher dashboard functionality
- Student management
- Game creation and assignment workflows
- Student experience

Run tests with:
```
npm run test:basic       # Run all tests
npm run test:template    # Run template-related tests
npm run test:assignment  # Run assignment-related tests
npm run test:gameplay    # Run gameplay tests
```

## Recent Updates

### Student Management Enhancement
- Added ability to manage students from the teacher dashboard
- Implemented multi-student selection for batch assignments
- Created intuitive student management interface
- Added student data visualization
  
### Assignments Workflow Improvements
- Simplified the assignment creation process
- Added multi-student selection in assignment modal
- Implemented deadline and completion tracking
- Enhanced email notifications for assignments

### UI/UX Refinements
- Standardized input field sizes and styles
- Added visual feedback in forms
- Improved modal dialogs for better user interaction
- Enhanced accessibility for diverse user needs

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or support, please contact [support@luminolearning.com](mailto:support@luminolearning.com).
