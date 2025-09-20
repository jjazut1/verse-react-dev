import Foundation
import FirebaseCore

public enum AuthKitBootstrap {
    /// Configures Firebase if it has not been configured yet. Safe to call multiple times.
    public static func configureFirebaseIfNeeded() {
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
    }
}


