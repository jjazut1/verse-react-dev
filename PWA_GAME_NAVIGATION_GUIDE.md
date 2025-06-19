# PWA Game Navigation Implementation Guide

## 🏠 **Best Practices for PWA Game Home Routing**

### **1. Reusable PWA Game Header Component**

Use the `PWAGameHeader` component for consistent navigation across all games:

```tsx
import PWAGameHeader from '../PWAGameHeader';

// In your game component
<PWAGameHeader 
  gameTitle="Your Game Name"
  variant="compact"  // or "full"
  showHomeButton={true}
  showBackButton={true}
/>
```

### **2. Implementation Patterns by Game Type**

#### **A. Simple Integration (Recommended)**
Add to the top of your game's main container:

```tsx
<VStack spacing={6} maxW="4xl" mx="auto">
  {/* PWA Navigation Header */}
  <PWAGameHeader 
    gameTitle="Game Name"
    variant="compact"
  />
  
  {/* Existing game content */}
  <YourGameContent />
</VStack>
```

#### **B. Full Integration with Custom Controls**
For games with complex headers:

```tsx
<PWAGameHeader 
  gameTitle="Game Name"
  variant="full"
  showHomeButton={true}
  showBackButton={true}
>
  {/* Custom controls go in children */}
  <Button onClick={resetGame}>Reset</Button>
  <Button onClick={pauseGame}>Pause</Button>
</PWAGameHeader>
```

### **3. High Score Modal Navigation**

Ensure all high score modals include role-based navigation:

```tsx
const handleClose = () => {
  onClose();
  
  // Navigate based on user role
  if (isTeacher) {
    navigate('/teacher');
  } else if (isStudent) {
    navigate('/student');
  } else {
    navigate('/');
  }
};
```

### **4. PWA Context Detection**

The component automatically detects:
- ✅ **Standalone Mode**: `(display-mode: standalone)`
- ✅ **PWA Parameters**: `?pwa=true`
- ✅ **Email Link Access**: `?emailAccess=true`
- ✅ **Launcher Source**: `?from=launcher`

### **5. Role-Based Navigation Targets**

**Students**: `navigate('/student')` → Student Dashboard
**Teachers**: `navigate('/teacher')` → Teacher Create Dashboard  
**Unauthenticated**: `navigate('/')` → Home Page

### **6. Quick Implementation Checklist**

For each game, add these elements:

#### **Main Game Component:**
```tsx
// 1. Import PWA header
import PWAGameHeader from '../PWAGameHeader';

// 2. Add to top of game layout
<PWAGameHeader 
  gameTitle="[Game Name]"
  variant="compact"
/>
```

#### **High Score/Completion Modals:**
```tsx
// 1. Import navigation hooks
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// 2. Add role-based navigation
const handleClose = () => {
  onClose();
  if (isTeacher) navigate('/teacher');
  else if (isStudent) navigate('/student');
  else navigate('/');
};
```

#### **Game Controls/Settings:**
```tsx
// Add home button to any game control panels
<Button onClick={handleHome} leftIcon={<span>🏠</span>}>
  {isTeacher ? 'Create' : isStudent ? 'Dashboard' : 'Home'}
</Button>
```

### **7. Game-Specific Implementation Status**

#### **✅ Implemented:**
- **Sentence Sense**: PWA header added
- **Place Value Showdown**: PWA header added with layout adjustments

#### **🔄 Needs Implementation:**
- **Sort Categories Egg Reveal**: Add PWA header  
- **Anagram**: Add PWA header
- **Syllable Egg Hunt**: Add PWA header
- **Spinner Wheel**: Add PWA header
- **Whack-a-Mole**: Add PWA header

### **8. Implementation Examples**

#### **Compact Header (Most Games):**
```tsx
<PWAGameHeader 
  gameTitle="Place Value Showdown"
  variant="compact"
/>
```

#### **Full Header with Custom Controls:**
```tsx
<PWAGameHeader 
  gameTitle="Spinner Wheel"
  variant="full"
>
  <Button onClick={spinWheel} colorScheme="green">
    Spin! 🎯
  </Button>
  <Button onClick={resetGame} variant="outline">
    Reset
  </Button>
</PWAGameHeader>
```

#### **Custom Back Behavior:**
```tsx
<PWAGameHeader 
  gameTitle="Whack-a-Mole"
  variant="compact"
  onBack={() => {
    // Custom back logic
    pauseGame();
    showExitConfirmation();
  }}
/>
```

### **9. Mobile/PWA Considerations**

- **Responsive Design**: Headers automatically adjust for mobile
- **Touch Targets**: Buttons are properly sized for touch
- **App Mode Indicator**: Shows "📱 App Mode" when in PWA
- **Context-Aware Tooltips**: Different messages for PWA vs browser

### **10. Testing Checklist**

For each game implementation:

- [ ] **Browser Mode**: Home button navigates correctly
- [ ] **PWA Mode**: Home button navigates to appropriate dashboard
- [ ] **Email Link Access**: Navigation preserves context
- [ ] **Teacher vs Student**: Correct role-based navigation
- [ ] **Mobile Responsive**: Header works on all screen sizes
- [ ] **High Score Modal**: Includes navigation on close

### **11. Quick Start Command**

To implement across all games quickly, follow this pattern:

1. **Add Import**: `import PWAGameHeader from '../PWAGameHeader';`
2. **Add Header**: Place at top of game layout
3. **Update Modals**: Add role-based navigation to completion flows
4. **Test Navigation**: Verify all routes work correctly

### **12. Advanced Features**

#### **Game State Preservation:**
```tsx
<PWAGameHeader 
  onBack={() => {
    // Save game state before navigation
    saveGameState(currentGameData);
    navigate('/student');
  }}
/>
```

#### **PWA-Specific Behaviors:**
```tsx
// Component automatically handles:
// - Standalone mode detection
// - Email access parameters
// - Launcher source tracking
// - Role-based navigation targets
```

This implementation ensures **consistent**, **PWA-aware** navigation across all games while maintaining **simplicity** and **flexibility** for game-specific needs. 