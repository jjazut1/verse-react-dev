import SwiftUI
import AuthenticationServices

public struct AuthRootView: View {
    @StateObject private var auth = AuthService()
    public init() {}
    public var body: some View {
        Group {
            if auth.user != nil {
                SignedInView(onSignOut: { try? auth.signOut() })
            } else {
                SignInView()
                    .environmentObject(auth)
            }
        }
    }
}

public struct SignInView: View {
    @EnvironmentObject var auth: AuthService
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    public init() {}
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
    private func signInEmail() async {
        do { try await auth.signIn(email: email, password: password) } catch { self.error = error.localizedDescription }
    }
}

struct SignedInView: View {
    let onSignOut: () -> Void
    var body: some View {
        VStack(spacing: 16) {
            Text("Signed In").font(.headline)
            Button("Sign Out", action: onSignOut)
        }.padding()
    }
}

// UIWindowScene keyWindow helper
import UIKit
extension UIWindowScene { var keyWindow: UIWindow? { windows.first { $0.isKeyWindow } } }


