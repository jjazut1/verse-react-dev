import SwiftUI
import AuthenticationServices
import FirebaseAuth
import FirebaseFirestore
import FirebaseCore

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
    @Environment(\.verticalSizeClass) private var verticalSizeClass
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var checkedEmail = false
    @State private var showPassword = false
    @State private var showGoogle = false
    @State private var showApple = false
    private let options: AuthUIOptions
    public init(options: AuthUIOptions = .default) { self.options = options }
    public var body: some View {
        VStack(spacing: 12) {
            if let _ = UIImage(named: "BrandLogo") {
                let side: CGFloat = (verticalSizeClass == .compact ? 56 : 72)
                Image("BrandLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: side, height: side)
                    .padding(12)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .shadow(color: Color.black.opacity(0.08), radius: 16, x: 0, y: 8)
                    .accessibilityHidden(true)
                    .padding(.top, 16)
            }
            Text("Welcome")
                .font(.largeTitle.bold())
                .kerning(-0.5)
                .padding(.top, 4)
            Text("Sign in to continue")
                .font(.callout)
                .foregroundColor(.secondary)

            // Card container for email/password
            VStack(spacing: 12) {
                TextField("Email", text: $email)
                    .textInputAutocapitalization(.never)
                    .textContentType(.username)
                    .keyboardType(.emailAddress)
                    .padding(.leading, 36).padding(.vertical, 12)
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .overlay(
                        HStack { Image(systemName: "envelope").foregroundColor(.gray).padding(.leading, 10); Spacer() }
                    )
                if !showPassword {
                    Button("Continue") { Task { await checkEmail() } }
                        .buttonStyle(.borderedProminent)
                }
                if showPassword {
                    SecureField("Password", text: $password)
                        .textContentType(.password)
                        .padding(.leading, 36).padding(.vertical, 12)
                        .background(Color(.systemBackground))
                        .cornerRadius(12)
                        .overlay(
                            HStack { Image(systemName: "lock").foregroundColor(.gray).padding(.leading, 10); Spacer() }
                        )
                    Button("Sign In") { Task { await signInEmail() } }
                        .buttonStyle(.borderedProminent)
                }
                HStack(spacing: 16) {
                    if options.showsPasswordReset {
                        if checkedEmail { Button("Forgot password?") { Task { await resetPassword() } } }
                    }
                }.font(.footnote)
            }
            .padding(16)
            .background(RoundedRectangle(cornerRadius: 16).fill(Color(.secondarySystemBackground)))
            .shadow(color: Color.black.opacity(0.08), radius: 12, y: 6)
            .padding(.horizontal)

            // Or separator
            HStack { Rectangle().frame(height: 1).foregroundColor(Color.black.opacity(0.1)); Text("OR").font(.caption).foregroundColor(.secondary); Rectangle().frame(height: 1).foregroundColor(Color.black.opacity(0.1)) }
                .padding(.horizontal)

            // Provider buttons below card
            if showGoogle {
                GoogleBrandButton(title: "Continue with Google") {
                    Task { await signInGoogle() }
                }
                .padding(.horizontal)
            }
            if showApple {
                SignInWithAppleButton(.signIn) { _ in } onCompletion: { _ in }
                    .frame(height: 48)
                    .onTapGesture { Task { await signInApple() } }
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)
            }

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
    private func checkEmail() async {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !trimmed.isEmpty else { self.error = "Enter your email to continue."; return }
        do {
            let methods = try await Auth.auth().fetchSignInMethods(forEmail: trimmed)
            checkedEmail = true
            showPassword = methods.contains(EmailAuthProvider.id)
            showGoogle = methods.contains("google.com")
            showApple = methods.contains("apple.com")
            if methods.isEmpty {
                // Firestore fallback: if a users doc exists for this email, allow password entry and suppress error
                do {
                    let snap = try await Firestore.firestore().collection("users")
                        .whereField("email", isEqualTo: trimmed)
                        .limit(to: 1)
                        .getDocuments()
                    if !snap.isEmpty {
                        showPassword = true
                        self.error = nil
                        let data = snap.documents.first!.data()
                        let links = (data["providerLinks"] as? [String]) ?? []
                        let hasTemp = (data["hasTemporaryPassword"] as? Bool) == true
                        showApple = links.contains("apple") && !hasTemp
                        showGoogle = links.contains("google") && !hasTemp
                    } else {
                        self.error = "Account not found. Please check with your teacher."
                        showPassword = true // still allow manual password entry
                        showApple = false
                    }
                } catch {
                    self.error = "Account not found. Please check with your teacher."
                    showPassword = true
                    showApple = false
                    showGoogle = false
                }
            } else { self.error = nil }
        } catch {
            self.error = (error as NSError).localizedDescription
        }
    }
}

struct SignedInView: View {
    let onSignOut: () -> Void
    let requireVerification: Bool
    @EnvironmentObject var auth: AuthService
    @State private var info: String?
    @State private var showChangePassword = false
    var body: some View {
        VStack(spacing: 12) {
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
            HStack {
                Spacer()
                Menu {
                    AccountPanel(info: $info)
                    Button("Sign Out", action: onSignOut)
                } label: {
                    Label("Account", systemImage: "person.crop.circle.fill")
                        .imageScale(.large)
                        .foregroundColor(.blue)
                }
            }
            if let info { Text(info).font(.caption).foregroundColor(.secondary) }
        }.padding()
        .task {
            await checkTempPassword()
        }
        .sheet(isPresented: $showChangePassword) {
            ChangePasswordView(onComplete: { info = "Password updated." ; showChangePassword = false })
        }
    }
    private func checkTempPassword() async {
        guard let u = Auth.auth().currentUser else { return }
        do {
            let ref = Firestore.firestore().collection("users").document(u.uid)
            let snap = try await ref.getDocument()
            if (snap.data()? ["hasTemporaryPassword"] as? Bool) == true {
                showChangePassword = true
            }
        } catch { }
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
    @State private var hasTempPassword = false
    var body: some View {
        VStack(spacing: 8) {
            Text("Account").font(.subheadline.bold())
            HStack(spacing: 12) {
                if hasTempPassword {
                    Text("Finish setting your new password to link accounts.")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                } else if let user = auth.user {
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
        .task { await loadTempFlag() }
    }

    private func linkGoogle() async {
        guard let root = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene }).first?.keyWindow?.rootViewController else { return }
        do {
            try await auth.linkGoogle(presenting: root)
            info = "Google linked successfully."
            await syncProviderLinksNow()
        } catch { info = error.localizedDescription }
    }

    private func linkApple() async {
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene }).first?.keyWindow else { return }
        do {
            try await auth.linkApple(presentationAnchor: window)
            info = "Apple linked successfully."
            await syncProviderLinksNow()
        } catch { info = error.localizedDescription }
    }

    private func loadTempFlag() async {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        do {
            let snap = try await Firestore.firestore().collection("users").document(uid).getDocument()
            hasTempPassword = (snap.data()? ["hasTemporaryPassword"] as? Bool) == true
        } catch { hasTempPassword = false }
    }

    private func syncProviderLinksNow() async {
        guard let u = Auth.auth().currentUser else { return }
        let links = Set(u.providerData.map { $0.providerID.replacingOccurrences(of: ".com", with: "") })
        let ref = Firestore.firestore().collection("users").document(u.uid)
        try? await ref.setData([
            "providerLinks": Array(links),
            "updatedAt": FieldValue.serverTimestamp()
        ], merge: true)
    }
}

// UIWindowScene keyWindow helper
import UIKit
extension UIWindowScene { var keyWindow: UIWindow? { windows.first { $0.isKeyWindow } } }

// MARK: - Change Password Modal (minimal)
import FirebaseAuth
import FirebaseFirestore
private struct ChangePasswordView: View {
    var onComplete: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var current = ""
    @State private var newPass = ""
    @State private var confirm = ""
    @State private var error: String?
    var body: some View {
        NavigationView {
            Form {
                SecureField("Current temporary password", text: $current)
                SecureField("New password", text: $newPass)
                SecureField("Confirm new password", text: $confirm)
                if let error { Text(error).foregroundColor(.red) }
                Button("Update Password") { Task { await change() } }
            }
            .navigationTitle("Change Password")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
        }
    }
    private func change() async {
        guard newPass.count >= 6, newPass == confirm else { error = "Passwords do not match or too short."; return }
        do {
            guard let u = Auth.auth().currentUser, let email = u.email else { return }
            let cred = EmailAuthProvider.credential(withEmail: email, password: current)
            _ = try await u.reauthenticate(with: cred)
            try await u.updatePassword(to: newPass)
            try? await u.reload()
            // Flip flags in Firestore
            let ref = Firestore.firestore().collection("users").document(u.uid)
            try? await ref.setData(["hasTemporaryPassword": false, "passwordSetupComplete": true, "updatedAt": FieldValue.serverTimestamp()], merge: true)
            onComplete()
            dismiss()
        } catch { self.error = (error as NSError).localizedDescription }
    }
}

// MARK: - Google Brand Button
private struct GoogleBrandButton: View {
    let title: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            ZStack {
                HStack(spacing: 12) {
                    Group {
                        if UIImage(named: "GoogleGlyph") != nil {
                            Image("GoogleGlyph").resizable().scaledToFit()
                        } else {
                            ZStack {
                                Circle().fill(Color.white)
                                Text("G").font(.headline).foregroundColor(.black)
                            }
                        }
                    }
                    .frame(width: 22, height: 22)
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 16)

                Text(title)
                    .font(.headline)
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity, minHeight: 48)
            .padding(.horizontal, 16)
            .background(Color.white)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color(.separator), lineWidth: 1)
            )
            .cornerRadius(12)
        }
    }
}

// MARK: - App Icon Provider
import UIKit
private enum AppIconProvider {
    static var appIcon: UIImage? {
        // Note: AppIcon.appiconset items are not directly accessible by name.
        // Add a separate imageset (e.g., "BrandLogo") to Assets.xcassets for display use.
        return UIImage(named: "BrandLogo")
    }
}


