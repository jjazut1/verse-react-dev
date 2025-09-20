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
