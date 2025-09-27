import Foundation
import UserNotifications
import UIKit

enum AppBadgeManager {
    static func requestAuthorizationIfNeeded() {
        if #available(iOS 10.0, *) {
            UNUserNotificationCenter.current().requestAuthorization(options: [.badge]) { _, _ in }
        }
    }

    static func setBadge(_ count: Int) {
        DispatchQueue.main.async {
            UIApplication.shared.applicationIconBadgeNumber = max(0, count)
        }
    }

    static func clear() { setBadge(0) }
}


