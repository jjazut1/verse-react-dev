import SwiftUI
import AuthenticationServices

public struct AuthRootView: View {
    @StateObject private var auth = AuthService()
    private let options: AuthUIOptions
    public init(options: AuthUIOptions = .default) { self.options = options }
    public var body: some View {
        Group {
            if auth.user != nil {
                SignedInView(onSignOut: { try? auth.signOut() }, requireVerification: options.requireEmailVerification)
            } else {
                SignInView(options: options)
            }
        }
        .environmentObject(auth)
        .onAppear {
            auth.requireProvisionedUser = options.requireProvisionedUser
            auth.guestFallbackOnUnprovisioned = options.guestFallbackOnUnprovisioned
        }
    }
}

public struct SignInView: View {
    @EnvironmentObject var auth: AuthService
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    private let options: AuthUIOptions
    public init(options: AuthUIOptions = .default) { self.options = options }
    public var body: some View {
        VStack(spacing: 12) {
            Text("Welcome").font(.title.bold())
            SignInWithAppleButton(.signIn) { request in
                // handled in coordinator
            } onCompletion: { _ in }
                .frame(height: 44)
                .onTapGesture { Task { await signInApple() } }

            Button(action: { Task { await signInGoogle() } }) {
                HStack { Image(systemName: "g.circle"); Text("Continue with Google") }
            }.buttonStyle(.borderedProminent)

            Divider().padding(.vertical, 4)

            TextField("Email", text: $email).textInputAutocapitalization(.never)
                .textContentType(.username).keyboardType(.emailAddress)
                .padding(10).background(Color(.secondarySystemBackground)).cornerRadius(8)
            SecureField("Password", text: $password)
                .textContentType(.password).padding(10).background(Color(.secondarySystemBackground)).cornerRadius(8)
            Button("Sign In") { Task { await signInEmail() } }
                .buttonStyle(.bordered)
            HStack(spacing: 16) {
                if options.showsCreateAccount {
                    Button("Create Account") { Task { await createAccount() } }
                }
                if options.showsPasswordReset {
                    Button("Forgot password?") { Task { await resetPassword() } }
                }
            }.font(.footnote)

            if options.showsGuestSignIn {
                Divider().padding(.vertical, 4)
                Button("Continue as Guest") { Task { await signInGuest() } }
                    .buttonStyle(.bordered)
            }

            if let error { Text(error).foregroundColor(.red).font(.footnote) }
        }
        .padding()
    }

    private func signInApple() async {
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene }).first?.keyWindow else { return }
        do { try await auth.signInWithApple(presentationAnchor: window) } catch { self.error = error.localizedDescription }
    }
    private func signInGoogle() async {
        guard let root = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene }).first?.keyWindow?.rootViewController else { return }
        do { try await auth.signInWithGoogle(presenting: root) } catch { self.error = error.localizedDescription }
    }
    // Linking is moved to the signed-in Account panel
    private func signInGuest() async {
        do { try await auth.signInAnonymously() } catch { self.error = error.localizedDescription }
    }
    private func signInEmail() async {
        do {
            try await auth.signIn(email: email, password: password)
        } catch {
            let ns = error as NSError
            switch ns.code {
            case 17009: self.error = "Wrong password."
            case 17008: self.error = "Invalid email address."
            case 17011: self.error = "No user found with this email."
            case 17004: self.error = "Malformed credential. Please try again."
            default: self.error = ns.localizedDescription
            }
        }
    }
    private func createAccount() async {
        do {
            try await auth.createUser(email: email, password: password)
        } catch {
            let ns = error as NSError
            switch ns.code {
            case 17007: self.error = "Email already in use. Try Sign In instead."
            case 17008: self.error = "Invalid email address."
            case 17026: self.error = "Password is too weak."
            default: self.error = ns.localizedDescription
            }
        }
    }
    private func resetPassword() async {
        do {
            try await auth.sendPasswordReset(email: email)
            self.error = "Password reset email sent. Check your inbox."
        } catch {
            let ns = error as NSError
            switch ns.code {
            case 17008: self.error = "Enter a valid email address to send reset link."
            case 17011: self.error = "No user found with this email."
            default: self.error = ns.localizedDescription
            }
        }
    }
}

struct SignedInView: View {
    let onSignOut: () -> Void
    let requireVerification: Bool
    @EnvironmentObject var auth: AuthService
    @State private var info: String?
    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 8) {
                Text("Signed In").font(.headline)
                if let user = auth.user, user.isAnonymous {
                    Text("Guest").font(.caption2).padding(4).background(Color(.secondarySystemBackground)).cornerRadius(4)
                }
            }
            if auth.unprovisionedFallback {
                Text("Your account isn’t provisioned; public access only.")
                    .font(.footnote)
                    .foregroundColor(.orange)
                    .multilineTextAlignment(.center)
            } else if let user = auth.user, user.isAnonymous {
                Text("Guest mode.")
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }
            VerificationBanner(requireVerification: requireVerification)
            StudentDashboardView()
                .frame(maxHeight: 400)
            AccountPanel(info: $info)
            Button("Sign Out", action: onSignOut)
            if let info { Text(info).font(.caption).foregroundColor(.secondary) }
        }.padding()
    }
}

private struct VerificationBanner: View {
    let requireVerification: Bool
    @EnvironmentObject var auth: AuthService
    @State private var info: String?
    var body: some View {
        Group {
            if requireVerification, let user = auth.user, user.email != nil, user.providerData.contains(where: { $0.providerID == "password" }), user.isEmailVerified == false {
                VStack(spacing: 8) {
                    Text("Please verify your email to unlock all features.").font(.subheadline)
                    Button("Resend verification link") {
                        Task {
                            do { try await auth.sendEmailVerification() ; info = "Verification email sent." }
                            catch { info = error.localizedDescription }
                        }
                    }
                    if let info { Text(info).font(.caption).foregroundColor(.secondary) }
                }.padding(.vertical, 8)
            }
        }
    }
}

private struct AccountPanel: View {
    @EnvironmentObject var auth: AuthService
    @Binding var info: String?
    var body: some View {
        VStack(spacing: 8) {
            Text("Account").font(.subheadline.bold())
            HStack(spacing: 12) {
                if let user = auth.user {
                    if user.providerData.contains(where: { $0.providerID == "password" }) == false {
                        Button("Link Email/Password") { info = "Use Create Account or Reset on sign-in screen to set a password." }
                    }
                    if user.providerData.contains(where: { $0.providerID == "google.com" }) == false {
                        Button("Link Google") { Task { await linkGoogle() } }
                    }
                    if user.providerData.contains(where: { $0.providerID == "apple.com" }) == false {
                        Button("Link Apple") { Task { await linkApple() } }
                    }
                }
            }
        }
    }

    private func linkGoogle() async {
        guard let root = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene }).first?.keyWindow?.rootViewController else { return }
        do {
            try await auth.linkGoogle(presenting: root)
            info = "Google linked successfully."
        } catch { info = error.localizedDescription }
    }

    private func linkApple() async {
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene }).first?.keyWindow else { return }
        do {
            try await auth.linkApple(presentationAnchor: window)
            info = "Apple linked successfully."
        } catch { info = error.localizedDescription }
    }
}

// UIWindowScene keyWindow helper
import UIKit
extension UIWindowScene { var keyWindow: UIWindow? { windows.first { $0.isKeyWindow } } }


