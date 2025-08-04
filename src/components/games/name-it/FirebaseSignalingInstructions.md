# Firebase Signaling Server Setup Instructions

## 🔥 **Firebase Realtime Database Setup**

Your Name It game now uses Firebase Realtime Database for WebRTC signaling! Follow these steps to enable multiplayer functionality.

### **1. Enable Firebase Realtime Database**

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `verse-dev-central`
3. In the left sidebar, click **"Realtime Database"**
4. Click **"Create Database"**
5. Choose **"Start in test mode"** (we'll add security rules later)
6. Select your preferred region (choose closest to your users)

### **2. Get Database URL**

After creating the database, you'll see a URL like:
```
https://verse-dev-central-default-rtdb.firebaseio.com/
```

### **3. Add Environment Variable**

Add this to your `.env` file:
```bash
# Add this line to your .env file
VITE_FIREBASE_DATABASE_URL=https://verse-dev-central-default-rtdb.firebaseio.com/
```

**Note**: Replace with your actual database URL from step 2.

### **4. Security Rules (Important!)**

Replace the default rules with these secure rules:

```json
{
  "rules": {
    "name-it-signaling": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null",
        "messages": {
          ".indexOn": "timestamp",
          "$messageId": {
            ".validate": "newData.hasChildren(['type', 'data', 'timestamp', 'senderId'])"
          }
        },
        "metadata": {
          "participants": {
            "$playerId": {
              ".validate": "$playerId === auth.uid"
            }
          }
        }
      }
    }
  }
}
```

### **5. Test the Setup**

1. **Restart your development server** after adding the environment variable
2. Navigate to the Name It game configuration
3. **Enable Multiplayer** in game settings
4. **Create a room** - you should see a room ID generated
5. **Open another browser window** and join the room with the ID
6. **Start the game** - both players should see synchronized game state

## 🧪 **Testing Checklist**

- [ ] Environment variable added to `.env`
- [ ] Development server restarted
- [ ] Realtime Database created in Firebase Console
- [ ] Security rules updated
- [ ] Room creation works (generates ID)
- [ ] Room joining works (accepts valid ID)
- [ ] Game state synchronizes between players
- [ ] Icon clicks are shared in real-time

## 🔧 **Troubleshooting**

### **"Database URL not found" Error**
- Check your `.env` file has the correct `VITE_FIREBASE_DATABASE_URL`
- Restart your development server
- Verify the URL format matches your Firebase project

### **"Permission denied" Error**
- Ensure you're logged in to the app
- Check that Realtime Database security rules allow authenticated reads/writes
- Verify the Firebase project is correct

### **Rooms not connecting**
- Check browser console for WebRTC errors
- Ensure both players are authenticated
- Try creating a new room ID

### **Game state not syncing**
- Check Firebase Console → Realtime Database to see if messages are being written
- Verify both players are in the same room
- Look for JavaScript errors in browser console

## 🚀 **Production Considerations**

### **Room Cleanup** (Recommended)
Consider adding a Firebase Function to clean up old rooms:

```javascript
// Firebase Function to clean up old signaling rooms
exports.cleanupSignalingRooms = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    const snapshot = await admin.database()
      .ref('name-it-signaling')
      .orderByChild('metadata/lastActivity')
      .endAt(cutoff)
      .once('value');
    
    const updates = {};
    snapshot.forEach(child => {
      updates[child.key] = null; // Delete room
    });
    
    return admin.database().ref('name-it-signaling').update(updates);
  });
```

### **Rate Limiting**
Firebase has generous limits, but consider implementing client-side rate limiting for very high traffic:

```typescript
// Add to useWebRTC.ts if needed
const messageBuffer = useRef<WebRTCMessage[]>([]);
const RATE_LIMIT_MS = 100; // Max 1 message per 100ms

const sendThrottledMessage = useCallback((message: WebRTCMessage) => {
  messageBuffer.current.push(message);
  // Implement throttling logic here
}, []);
```

## ✅ **Deployment Ready**

Once you've completed the setup:
- Your app supports **real-time multiplayer** Name It games
- **Secure** - only authenticated users can create/join rooms  
- **Scalable** - Firebase handles the signaling infrastructure
- **Cost-effective** - signaling traffic is minimal after connection

The WebRTC connection becomes **peer-to-peer** after the initial handshake, so game performance is excellent even with the signaling server. 