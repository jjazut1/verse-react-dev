import Foundation
import AuthenticationServices
import FirebaseAuth
import GoogleSignIn

@MainActor
public final class AuthService: NSObject, ObservableObject {
    public enum Provider { case apple, google, email }
    @Published public private(set) var user: User?

    public override init() {
        self.user = Auth.auth().currentUser
        super.init()
        Auth.auth().addStateDidChangeListener { _, user in
            self.user = user
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
              let nonce = currentNonce else { throw AuthErrorCode.internalError }

        let firebaseCredential = OAuthProvider.credential(withProviderID: "apple.com", idToken: idTokenString, rawNonce: nonce)
        _ = try await Auth.auth().signIn(with: firebaseCredential)
    }

    // MARK: - Google
    public func signInWithGoogle(presenting viewController: UIViewController) async throws {
        guard let clientID = FirebaseApp.app()?.options.clientID else { throw AuthErrorCode.internalError }
        let config = GIDConfiguration(clientID: clientID)
        let result = try await GIDSignIn.sharedInstance.signIn(with: config, presenting: viewController)
        guard let idToken = result.user.idToken?.tokenString else { throw AuthErrorCode.internalError }
        let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: result.user.accessToken.tokenString)
        _ = try await Auth.auth().signIn(with: credential)
    }

    // MARK: - Email
    public func signIn(email: String, password: String) async throws {
        _ = try await Auth.auth().signIn(withEmail: email, password: password)
    }
    public func createUser(email: String, password: String) async throws {
        _ = try await Auth.auth().createUser(withEmail: email, password: password)
    }
    public func signOut() throws { try Auth.auth().signOut() }
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
            continuation?.resume(throwing: AuthErrorCode.internalError)
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


