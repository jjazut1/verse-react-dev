# Lumino Learning Platform

[![React](https://img.shields.io/badge/React-18.x-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-10.x-orange)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

## Overview

Lumino Learning is a comprehensive educational platform designed for K-12 teachers and students. It enables educators to create engaging custom games, manage student assignments, and track progress through an intuitive dashboard system. Students enjoy a personalized learning experience with visual feedback, achievement tracking, and seamless access to both assigned and public games.

**Tagline:** Create Efficiently. Spark Curiosity. Shape Minds.

## ✨ Key Features

### 🎓 For Teachers

#### **Enhanced Teacher Dashboard**
- **Multi-Tab Interface**: Streamlined navigation between Create Games, Create Assignments, Track Assignments, and My Students
- **Assignment Status Filtering**: View assignments by status (All, Assigned, Overdue, Completed) with real-time counts
- **Visual Assignment Tracking**: Color-coded assignments with status indicators and progress bars
- **Student Dashboard Access**: Direct view access to student dashboards for progress monitoring

#### **Advanced Student Management**
- **Comprehensive Student Profiles**: Create and manage detailed student accounts with grades and notes
- **Student Dashboard Viewing**: Teachers can access student views to understand their experience
- **Multi-Student Assignment**: Efficiently assign games to multiple students simultaneously
- **Search and Filter**: Quick student lookup with advanced filtering options

#### **Game Creation & Assignment**
- **Template-Based Creation**: Create games from blank templates or modify existing ones
- **Thumbnail Generation**: Automatic visual thumbnails for game identification
- **Public Game Sharing**: Mark games as public for community access
- **Assignment Analytics**: Detailed attempt tracking with scores, duration, and completion rates

#### **Assignment Management**
- **Flexible Deadline Setting**: Set custom deadlines with overdue tracking
- **Completion Requirements**: Define how many times students must complete assignments
- **Email Notifications**: Automated assignment delivery with secure access links
- **Progress Monitoring**: Real-time tracking of student progress and completion status

### 🎮 For Students

#### **Personalized Student Dashboard**
- **Smart Assignment Organization**: Assignments automatically sorted into Overdue, Current, and Completed sections
- **Visual Progress Tracking**: Progress bars, completion status, and achievement indicators
- **Game Thumbnails**: Visual identification of assignments with game previews
- **Achievement System**: Personal progress tracking with badges and milestones

#### **Enhanced Free Play Experience**
- **Dual Game Access**: Play both previously assigned games for practice and public games for exploration
- **My Assigned Games**: Practice section for replaying educational content
- **Public Game Library**: Access to community-shared educational games
- **Visual Game Cards**: Thumbnail previews and game descriptions

#### **Seamless Gaming Experience**
- **Direct Assignment Access**: Click-to-play functionality from dashboard
- **Overdue Assignment Handling**: Clear warnings with continued access to late assignments
- **Progress Persistence**: Automatic saving of game progress and scores
- **Cross-Device Compatibility**: Consistent experience across devices

#### **Authentication & Security**
- **Role-Based Access**: Automatic routing based on student/teacher roles
- **Secure Assignment Links**: Unique tokens for assignment access
- **Email Authentication**: Passwordless login options for younger students
- **Session Management**: Persistent login with secure token handling

## 🏗️ Technology Stack

- **Frontend**: React 18 with TypeScript, Vite build system
- **UI Framework**: Custom CSS with CSS variables for theming
- **Backend**: Firebase Firestore for data, Firebase Auth for authentication
- **Storage**: Firebase Storage for game assets and thumbnails
- **Routing**: React Router for navigation and deep linking
- **State Management**: React Context API with custom hooks
- **Rich Text Engine**: SlateJS for advanced text editing with custom formatting

## 🛠️ Rich Text Architecture

### Cross-Platform Rendering Engine
Our rich text system supports multiple rendering environments:

- **SVG Rendering (Spinner Wheel)**: Custom `renderRichTextSVG()` function with `tspan` positioning
  - Solved cumulative `dy` offset issues for proper super/subscript character spacing
  - Handles mid-word scripts like "H₂O" and "Option⁵" with precise positioning
  
- **3D Canvas Rendering (Whack-a-Mole)**: Direct canvas text rendering with rich formatting
  - HTML parsing with styled canvas text drawing
  - Dynamic font sizing and positioning for scripts
  - Character spacing calculations for complex formulas

- **CSS/HTML Rendering (Sort Categories)**: Native browser rendering with React components
  - `RichText` components with CSS `verticalAlign` for super/subscript
  - Preserved formatting through drag-and-drop operations

### Data Storage Strategy
```typescript
interface CategoryItem {
  content: string;  // Rich HTML: "<em>italicize</em>"
  text: string;     // Plain text: "italicize"
}
```
- **Dual Storage**: Rich HTML content + extracted plain text for game compatibility
- **Backward Compatibility**: Seamless migration from legacy plain text format
- **Rich Categories**: New `richCategories` format with fallback to legacy `categories`

## 🚀 Recent Major Updates

### ⚡ Latest Platform Improvements (January 2025)

#### **UI/UX Improvements** 🎨
- **Spinner Wheel Ocean Theme Fix** - Improved text readability and accessibility
  - Removed dark blue color (#000080) from ocean theme's 6th position due to poor text contrast
  - Updated both `SpinnerWheel.tsx` and `SpinnerWheelConfig.tsx` for consistency
  - Ocean theme now uses 7 accessible colors: Light Blue, Sky Blue, Deep Sky Blue, Turquoise, Teal, Bright Cyan, Steel Blue
  - Enhanced color accessibility across all spinner wheel themes for better educational content visibility

- **Spinner Wheel Audio System Enhancement** - Fixed first-spin audio initialization
  - Resolved audio context initialization timing issues where first spin was silent
  - Implemented proper audio context state management with resume logic for suspended contexts
  - Added async audio initialization with better error handling
  - Enhanced click sound generation during wheel spinning for improved user feedback

#### **Critical Bug Fixes** 🔧
- **Modal Provider Context Error** - Fixed app-breaking error preventing home page from loading
  - Added missing `ModalProvider` and `LoadingProvider` to the provider stack in `App.tsx`
  - Resolved "useModal must be used within ModalProvider" errors
  - Ensured proper context nesting for all modal and loading functionality

- **Teacher Signup Bug** - Fixed Firestore user document creation for teachers
  - Enhanced both email/password and Google signup flows
  - Automatically creates Firestore user documents with `role: "teacher"`
  - Enables proper teacher dashboard access and game creation interface
  - Resolved issue where teachers couldn't access "Start Creating" games

- **High Score Display Bug** - Fixed scoring inconsistencies in leaderboards
  - Corrected React state timing issues where final scores weren't properly saved
  - Updated `SortCategoriesEggReveal.tsx` and `WhackAMole.tsx` with proper score parameter handling
  - Implemented fallback logic: `const scoreToSave = finalScore !== undefined ? finalScore : score`

#### **Major New Features** 🆕

- **Enhanced Authentication System** with dual access methods
  - **Teacher Signup**: "Get Started as a Teacher" with dedicated signup modal
  - **Member Login**: "Members Login" for existing users only
  - Proper Firebase Auth integration with Firestore user document creation
  - Automatic navigation to appropriate dashboards after authentication

- **Folder Management System** for game organization
  - Create, edit, and delete custom folders for games
  - Drag-and-drop game assignment to folders
  - Color-coded folder system with descriptions
  - Enhanced teacher dashboard with organized game library

- **LoadingSpinner & GlobalModals Components**
  - **LoadingSpinner**: Reusable component with bouncing logo animation, pulsing background, and progress dots
  - **LoadingContext**: Global loading state management across the application
  - **GlobalModals**: Centralized modal system with multiple modal types
  - **ModalContext**: Unified modal state management

- **Student Password Setup Email System**
  - Automatic password setup emails when teachers create student accounts
  - Firebase Functions integration with SendGrid for email delivery
  - Professional branded email templates with secure password reset links
  - Enhanced student management with password status tracking

#### **Achievement & Scoring System Fixes** 🏆

- **Percentage-Based Achievement Badges**
  - **LEGEND** (96-100%), **CHAMPION** (85-95%), **EXPERT** (70-84%)
  - **SKILLED** (50-69%), **RISING STAR** (25-49%), **ACHIEVER** (0-24%)
  - Game-specific max score calculations for fair recognition
  - Fixed star rating system to properly reflect achievement levels

- **Game-Specific Scoring Logic**
  - **Sort Categories Egg Reveal**: `eggQty × 10 points` max score
  - **Whack-a-Mole**: Speed-based scoring (Easy: 60, Medium: 90, Hard: 120)
  - **Spinner Wheel**: Config-based or default 100 points

#### **Platform Improvements** 📈

- **Production Deployment** to https://verse-dev-central.web.app
  - All improvements live and tested in production environment
  - Enhanced build and deployment pipeline
  - Comprehensive testing across all game types and user flows

- **Teacher Dashboard Enhancements**
  - Improved student management with detailed profiles
  - Enhanced assignment creation and tracking
  - Direct access to student dashboard views
  - Streamlined navigation and workflow optimization

- **Student Experience Improvements**
  - Better authentication flows with clear error handling
  - Enhanced dashboard organization and visual feedback
  - Improved assignment access and completion tracking
  - Cross-device compatibility and session management

### Rich Text Formatting System ✨
- **Comprehensive Rich Text Support**: Full formatting capabilities across all three games (Spinner Wheel, Whack-a-Mole, Sort Categories Egg Reveal)
- **Universal Formatting**: Bold, italic, underline, superscript, and subscript support for educational content like chemical formulas (H₂O), mathematical expressions (x²), and styled text
- **Cross-Platform Rendering**: Advanced implementation supporting SVG (Spinner Wheel), 3D Canvas (Whack-a-Mole), and CSS/HTML (Sort Categories) environments
- **SlateEditor Integration**: Professional-grade rich text editing with intuitive toolbar and keyboard shortcuts
- **Technical Innovations**: 
  - Fixed SVG `tspan` cumulative dy offset issues for proper mid-word super/subscript positioning
  - Enhanced HTML parsing for complex formatting combinations
  - Dual storage system (rich HTML content + plain text) for backward compatibility
- **Seamless Experience**: Rich text preserved throughout entire game flow including drag-and-drop operations
- **Production Ready**: Comprehensive testing and deployment across all game types with fallback mechanisms

### Spinner Wheel Enhancements
- **Rich Text Items**: Full formatting support for wheel items with visual toolbar
- **Enhanced Color Themes**: Added Patriotic, Green Shades, Desert, Ocean, and Sunset color schemes
- **Improved UI/UX**: Apple-style design with smooth animations and hover effects
- **Item Management**: Drag-and-drop reordering, move up/down controls, and visual indicators
- **Zoom Functionality**: Dramatic winner reveal with zoom effects and clean interface
- **Audio Integration**: Click sounds during spinning with speed-based timing
- **Template System**: Database-driven blank templates for consistent game creation

### Game Configuration Improvements
- **Unsaved Changes Detection**: Smart tracking prevents data loss with proper comparison logic
- **Template Loading**: Enhanced database integration for blank game templates
- **Category Management**: Removed unnecessary fields, streamlined configuration process
- **Focus Management**: Automatic focus on newly added items for better user experience
- **Apple-Style Design**: Consistent design language across all configuration interfaces

### Student Experience Overhaul
- **New Student Dashboard**: Complete redesign with intuitive assignment organization
- **Assignment Status Visualization**: Color-coded sections for overdue, current, and completed work
- **Enhanced Free Play**: Dual-section layout for assigned games practice and public game exploration
- **Game Thumbnails**: Visual game identification throughout the platform
- **Name Integration**: Student names pulled from database for personalized experience

### Teacher Workflow Improvements
- **Assignment Status Filtering**: Sub-tabs for tracking assignments by status with counts
- **Student Management Integration**: Direct access to student dashboards from teacher interface
- **Multi-Student Selection**: Improved assignment creation for multiple students
- **Assignment Analytics**: Enhanced tracking with detailed attempt histories
- **Navigation Streamlining**: Removed redundant pages, consolidated functionality

### Authentication & Access Control
- **Role-Based Redirects**: Students automatically routed to dashboard, teachers to create page
- **Overdue Assignment Access**: Students can complete late assignments with warnings
- **Logout Improvements**: Proper redirect handling after logout
- **Session Persistence**: Improved user experience with maintained login state

### UI/UX Enhancements
- **Visual Hierarchy**: Clear sectioning with color-coded categories
- **Interactive Elements**: Hover effects, smooth transitions, and visual feedback
- **Responsive Design**: Optimized for various screen sizes and devices
- **Accessibility**: Improved navigation and screen reader compatibility

## 📁 Project Structure

```
/src
  /components         # Reusable UI components
    /games           # Game-specific components
  /contexts          # React context providers (Auth, UnsavedChanges)
  /hooks             # Custom React hooks (Toast, etc.)
  /pages             # Application pages/routes
    StudentDashboard.tsx    # Student learning dashboard
    TeacherDashboard.tsx    # Teacher management interface
    GameByToken.tsx         # Assignment gameplay interface
  /services          # Firebase service layer
  /types             # TypeScript definitions
  /utils             # Utility functions
  /config            # Firebase configuration
```

## 🎯 Getting Started

### Prerequisites

- **Node.js** (version 20.x or higher)
- **npm** (version 8.x or higher)
- **Firebase Account** with Firestore and Authentication enabled

### Installation

1. **Clone the repository:**
```bash
   git clone https://github.com/your-username/lumino-learning.git
   cd lumino-learning
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure Firebase:**
   - Create a `.env` file in the root directory
   - Add your Firebase configuration:
```
VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

4. **Start development server:**
```bash
npm run dev
   ```

5. **Access the application:**
   - Open `http://localhost:3000`
   - Create teacher account to get started

## 🎮 Usage Guide

### For Teachers
1. **Sign up** as a teacher through the registration flow
2. **Create students** in the "My Students" tab
3. **Design games** using templates in "Create Games"
4. **Assign games** to students with deadlines in "Create Assignments"
5. **Monitor progress** in "Track Assignments" with status filtering

### For Students
1. **Access assignments** through teacher-provided links or login
2. **View dashboard** with organized assignment sections
3. **Complete assignments** by clicking assignment cards
4. **Practice games** in the Free Play section
5. **Track progress** through visual indicators and completion status

## 🔧 Development

### Running Tests
```bash
npm run test:basic       # Run all tests
npm run test:template    # Template functionality
npm run test:assignment  # Assignment workflows
npm run test:gameplay    # Game interaction tests
```

### Building for Production
```bash
npm run build           # Create production build
npm run preview         # Preview production build locally
```

## 🗂️ Database Schema

### Collections
- **users**: Teacher and student profiles with roles
- **assignments**: Assignment data with deadlines and requirements
- **attempts**: Student game attempt records with scores
- **userGameConfigs**: Game templates and configurations

### Key Fields
- **assignments**: `gameId`, `studentEmail`, `deadline`, `status`, `completedCount`
- **users**: `role`, `name`, `email`, `teacherId` (for students)
- **attempts**: `assignmentId`, `studentEmail`, `score`, `duration`, `timestamp`

## 📊 Achievement System (Planned)

Future updates will include comprehensive achievement workflows:
- **Subject-specific progressions** (Math Ninja, Word Wizard, etc.)
- **Cross-curricular achievements** for interdisciplinary learning
- **Visual reward systems** with character progression
- **Certificate generation** for completed milestones

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For questions, support, or feature requests:
- **Email**: [support@luminolearning.com](mailto:support@luminolearning.com)
- **Documentation**: [Wiki](https://github.com/your-username/lumino-learning/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/lumino-learning/issues)

---

**Built with ❤️ for educators and students worldwide**
