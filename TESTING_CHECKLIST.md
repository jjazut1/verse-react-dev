# Name It Game - Multiplayer Testing Checklist

## 🎯 Pre-Development Validation

Before adding new features, ensure these core scenarios work reliably:

### ✅ Basic Multiplayer Flow
- [ ] **Host creates room** - Gets shareable room ID
- [ ] **Joiner joins room** - Successfully connects to host
- [ ] **Both players see correct UI** - Proper player names and connection status
- [ ] **Game can be started** - Timer begins, cards appear
- [ ] **Both players can click icons** - Each sees their designated icons only
- [ ] **Scores update correctly** - Points increment and sync between players
- [ ] **Game completes properly** - Timer ends, final scores displayed

### 🔄 Tab Switching & Persistence 
- [ ] **Start game on Player 2 tab**
- [ ] **Player 2 scores a few points**
- [ ] **Switch to Player 1 tab** - Should see P2's score
- [ ] **Player 1 scores points** - Should increment properly
- [ ] **Switch back to Player 2** - Both scores should be preserved
- [ ] **Continue playing** - No score resets or connection loss

### 🌐 Network Resilience
- [ ] **Brief WiFi disconnect** - Game recovers when reconnected
- [ ] **Browser refresh mid-game** - Connection re-establishes
- [ ] **One player closes tab** - Other player gets appropriate feedback
- [ ] **Rejoin after disconnect** - Can reconnect to existing game

### ⚡ Performance & Edge Cases
- [ ] **Rapid clicking** - No double-scoring or race conditions
- [ ] **Simultaneous scoring** - Both players click at exact same time
- [ ] **Multiple game rounds** - Reset and replay without issues
- [ ] **Long gaming session** - No memory leaks or degradation

## 🐛 Known Issues to Monitor

### Current Status (Post scoresByPlayerId Fix):
- ✅ **Player 1 connection issues** - RESOLVED
- ✅ **Score reset on tab switch** - RESOLVED  
- ✅ **Cross-player score sync** - RESOLVED
- ✅ **Placeholder player IDs** - RESOLVED

### Watch For:
- [ ] **Console errors** - No unhandled exceptions
- [ ] **Memory usage** - Stable over time
- [ ] **WebRTC connection stability** - Consistent data channel state
- [ ] **Firebase rate limits** - No quota exceeded errors

## 🚀 Ready for New Development When:

1. ✅ **All basic scenarios pass consistently**
2. ✅ **No critical console errors**  
3. ✅ **Scores persist reliably across all conditions**
4. ✅ **Network interruptions handled gracefully**
5. ✅ **Performance remains stable over extended play**

---

## 🧪 Test Execution Notes

**Date:** [Fill in when testing]
**Tester:** [Your name]
**Browser:** [Chrome/Firefox/Safari/etc.]
**Network:** [WiFi/Cellular/etc.]

### Results:
- [ ] **PASS** - All scenarios work perfectly
- [ ] **PARTIAL** - Minor issues noted below
- [ ] **FAIL** - Critical issues require fixes

### Issues Found:
[List any problems discovered during testing]

### Next Steps:
[Actions needed before proceeding with new features] 