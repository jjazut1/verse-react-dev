import Foundation
import AuthenticationServices
import FirebaseAuth
import FirebaseCore
import GoogleSignIn
import Security
import FirebaseFirestore

@MainActor
public final class AuthService: NSObject, ObservableObject {
    public enum AuthServiceError: Error { case internalError, googleIDTokenMissing }
    public enum Provider { case apple, google, email }
    @Published public private(set) var user: User?
    @Published public private(set) var unprovisionedFallback: Bool = false
    public var requireProvisionedUser: Bool = true
    public var guestFallbackOnUnprovisioned: Bool = true

    public override init() {
        self.user = Auth.auth().currentUser
        super.init()
        Auth.auth().addStateDidChangeListener { _, user in
            Task { @MainActor in
                self.user = user
            }
        }
    }

    // MARK: - Apple
    private var currentNonce: String?

    public func signInWithApple(presentationAnchor: ASPresentationAnchor) async throws {
        let nonce = Self.randomNonceString()
        currentNonce = nonce
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = Self.sha256(nonce)

        let controller = ASAuthorizationController(authorizationRequests: [request])
        let delegate = AppleDelegate()
        controller.delegate = delegate
        controller.presentationContextProvider = delegate
        delegate.anchor = presentationAnchor
        controller.performRequests()

        let credential = try await delegate.credential()
        guard let appleIDToken = credential.identityToken,
              let idTokenString = String(data: appleIDToken, encoding: .utf8),
              let nonce = currentNonce else { throw AuthServiceError.internalError }

        let firebaseCredential = OAuthProvider.appleCredential(
            withIDToken: idTokenString,
            rawNonce: nonce,
            fullName: credential.fullName
        )
        let result = try await Auth.auth().signIn(with: firebaseCredential)
        try await handlePostSignIn(result: result)
    }

    public func linkApple(presentationAnchor: ASPresentationAnchor) async throws {
        guard let _ = Auth.auth().currentUser else { throw AuthServiceError.internalError }
        let nonce = Self.randomNonceString()
        currentNonce = nonce
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = Self.sha256(nonce)

        let controller = ASAuthorizationController(authorizationRequests: [request])
        let delegate = AppleDelegate()
        controller.delegate = delegate
        controller.presentationContextProvider = delegate
        delegate.anchor = presentationAnchor
        controller.performRequests()

        let credential = try await delegate.credential()
        guard let appleIDToken = credential.identityToken,
              let idTokenString = String(data: appleIDToken, encoding: .utf8),
              let nonce = currentNonce else { throw AuthServiceError.internalError }
        let firebaseCredential = OAuthProvider.appleCredential(
            withIDToken: idTokenString,
            rawNonce: nonce,
            fullName: credential.fullName
        )
        _ = try await Auth.auth().currentUser?.link(with: firebaseCredential)
    }

    // MARK: - Google
    public func signInWithGoogle(presenting viewController: UIViewController) async throws {
        // Set configuration explicitly from Firebase to avoid missing GIDClientID in Info.plist
        guard let clientID = FirebaseApp.app()?.options.clientID else { throw AuthServiceError.internalError }
        let webClientID = Bundle.main.object(forInfoDictionaryKey: "GOOGLE_WEB_CLIENT_ID") as? String
        if let webClientID, !webClientID.isEmpty {
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID, serverClientID: webClientID)
        } else {
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        }
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: viewController)
        guard let idToken = result.user.idToken?.tokenString else { throw AuthServiceError.googleIDTokenMissing }
        let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: result.user.accessToken.tokenString)
        let authResult = try await Auth.auth().signIn(with: credential)
        try await handlePostSignIn(result: authResult)
    }

    // MARK: - Linking Providers
    public func linkGoogle(presenting viewController: UIViewController) async throws {
        guard let _ = Auth.auth().currentUser else { throw AuthServiceError.internalError }
        guard let clientID = FirebaseApp.app()?.options.clientID else { throw AuthServiceError.internalError }
        let webClientID = Bundle.main.object(forInfoDictionaryKey: "GOOGLE_WEB_CLIENT_ID") as? String
        if let webClientID, !webClientID.isEmpty {
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID, serverClientID: webClientID)
        } else {
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        }
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: viewController)
        guard let idToken = result.user.idToken?.tokenString else { throw AuthServiceError.googleIDTokenMissing }
        let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: result.user.accessToken.tokenString)
        _ = try await Auth.auth().currentUser?.link(with: credential)
    }

    // MARK: - Email
    public func signIn(email: String, password: String) async throws {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)
        let result = try await Auth.auth().signIn(withEmail: trimmedEmail, password: trimmedPassword)
        try await handlePostSignIn(result: result)
    }
    public func createUser(email: String, password: String) async throws {
        _ = try await Auth.auth().createUser(withEmail: email, password: password)
    }
    public func sendEmailVerification() async throws {
        guard let user = Auth.auth().currentUser else { return }
        try await user.sendEmailVerification()
        try await user.reload()
        self.user = Auth.auth().currentUser
    }
    public func sendPasswordReset(email: String) async throws {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        try await Auth.auth().sendPasswordReset(withEmail: trimmedEmail)
    }
    public func signOut() throws { try Auth.auth().signOut() }

    // MARK: - Guest (Anonymous)
    public func signInAnonymously() async throws {
        let result = try await Auth.auth().signInAnonymously()
        // No profile bootstrap for guests (no pre-provisioned doc); keep minimal footprint
        self.user = result.user
    }

    // MARK: - Provisioning Enforcement
    private func handlePostSignIn(result: AuthDataResult) async throws {
        do {
            let _ = try await ProfileService().bootstrapForCurrentUser()
            print("[Auth] provisioned user uid=\(result.user.uid)")
            self.user = result.user
            self.unprovisionedFallback = false
        } catch {
            // Missing profile doc
            if requireProvisionedUser {
                // Optionally fall back to guest
                if guestFallbackOnUnprovisioned {
                    do {
                        try? Auth.auth().signOut()
                        let anon = try await Auth.auth().signInAnonymously()
                        print("[Auth] unprovisioned → guest uid=\(anon.user.uid)")
                        self.user = anon.user
                        self.unprovisionedFallback = true
                    } catch {
                        // If anonymous sign-in fails, keep signed-out state
                        print("[Auth] guest fallback failed: \(error.localizedDescription)")
                        self.user = nil
                        self.unprovisionedFallback = false
                    }
                } else {
                    try? Auth.auth().signOut()
                    self.user = nil
                    self.unprovisionedFallback = false
                }
            } else {
                self.user = result.user
                self.unprovisionedFallback = false
            }
        }
    }
}

// MARK: - Apple Delegate Helper
private final class AppleDelegate: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    var continuation: CheckedContinuation<ASAuthorizationAppleIDCredential, Error>?
    var anchor: ASPresentationAnchor = .init()
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor { anchor }
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        if let credential = authorization.credential as? ASAuthorizationAppleIDCredential {
            continuation?.resume(returning: credential)
        } else {
            continuation?.resume(throwing: AuthService.AuthServiceError.internalError)
        }
        continuation = nil
    }
    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        continuation?.resume(throwing: error)
        continuation = nil
    }
    func credential() async throws -> ASAuthorizationAppleIDCredential {
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<ASAuthorizationAppleIDCredential, Error>) in
            continuation = c
        }
    }
}

// MARK: - Nonce utils
import CryptoKit
extension AuthService {
    static func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        let charset: Array<Character> = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remainingLength = length
        while remainingLength > 0 {
            var randoms = [UInt8](repeating: 0, count: 16)
            let errorCode = SecRandomCopyBytes(kSecRandomDefault, randoms.count, &randoms)
            if errorCode != errSecSuccess { fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)") }
            randoms.forEach { random in
                if remainingLength == 0 { return }
                if random < charset.count { result.append(charset[Int(random)]) ; remainingLength -= 1 }
            }
        }
        return result
    }
    static func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashed = SHA256.hash(data: inputData)
        return hashed.compactMap { String(format: "%02x", $0) }.joined()
    }
}


