import Foundation

public struct AuthUIOptions: Sendable {
    public var showsCreateAccount: Bool
    public var showsPasswordReset: Bool
    public var requireEmailVerification: Bool
    public var showsGuestSignIn: Bool
    public var requireProvisionedUser: Bool
    public var guestFallbackOnUnprovisioned: Bool

    public init(
        showsCreateAccount: Bool = true,
        showsPasswordReset: Bool = true,
        requireEmailVerification: Bool = true,
        showsGuestSignIn: Bool = true,
        requireProvisionedUser: Bool = true,
        guestFallbackOnUnprovisioned: Bool = true
    ) {
        self.showsCreateAccount = showsCreateAccount
        self.showsPasswordReset = showsPasswordReset
        self.requireEmailVerification = requireEmailVerification
        self.showsGuestSignIn = showsGuestSignIn
        self.requireProvisionedUser = requireProvisionedUser
        self.guestFallbackOnUnprovisioned = guestFallbackOnUnprovisioned
    }
}

public extension AuthUIOptions {
    static let `default` = AuthUIOptions()
}


