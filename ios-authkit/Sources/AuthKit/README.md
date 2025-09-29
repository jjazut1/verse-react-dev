# AuthKit Setup (iOS)

## Prerequisites
- Add `GoogleService-Info.plist` to the app target (Target Membership checked).
- Add URL Type with the `REVERSED_CLIENT_ID` from the plist.
- Optional: Add `GOOGLE_WEB_CLIENT_ID` (string) to Info.plist if you use server auth / token exchange.

## App Bootstrap
```swift
import SwiftUI
import AuthKit

@main
struct LuminateApp: App {
  init() { AuthKitBootstrap.configureFirebaseIfNeeded() }
  var body: some Scene { WindowGroup { AuthRootView() } }
}
```

## UI Options
```swift
AuthRootView(options: AuthUIOptions(
  showsCreateAccount: true,
  showsPasswordReset: true,
  requireEmailVerification: true
))
```

## Provider Linking
- Use the built-in buttons (demo) or call `linkGoogle(...)` / `linkApple(...)` from `AuthService`.

## Notes
- Emails are stored in Firebase Authentication; Firestore `users` is optional profile data.

## High Scores – Sentence Sense (iOS UI)

- The High Scores tab uses `HighScoresMiniView`.
- For "sentence-sense" it calls `HighScoreService.sentenceSenseTop()` which:
  - Loads leaderboard entries ordered by `bestMisses` ascending.
  - Joins `userGameConfigs` to show the config title.
  - Joins `users` to show the student's display name.
- Display shows: `configTitle` (game name), `displayName` (student), and `Best Misses`.

## Writing Results (Client → Server)

- After a successful repetition, write a result document to trigger server progress:

```swift
let db = Firestore.firestore()
let uid = Auth.auth().currentUser!.uid
let ref = db.collection("users").document(uid).collection("results").document(assignmentId)
try await ref.setData([
  "gameType": "sentence-sense",
  "misses": misses,
  "stats": [
    "moves": moves,
    "durationMs": durationMs
  ]
], merge: true)
```

The backend resolves the canonical assignment id, increments progress transactionally, mirrors fields into `users/{uid}/assignments/{id}`, and updates high scores (`bestMisses`).

## Testing Recipe

1. Launch the app, go to Assignments, start a Sentence Sense assignment with `timesRequired > 1`.
2. Complete one repetition → expect UI to reload (AssignmentsView reload on dismiss) and show 1/5, toast "Saved! Progress updated".
3. Check Firestore:
   - `assignments/{id}`: `completedCount` incremented, `attemptsRemaining` decremented.
   - `users/{uid}/assignments/{id}`: mirrored values.
   - `highScores/ss:{configId}:{uid}`: `attempts` incremented, `bestMisses` updated if improved.
