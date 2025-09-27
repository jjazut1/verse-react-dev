import SwiftUI
import FirebaseAuth

public struct StudentDashboardView: View {
    @State private var selectedTab = 0
    @State private var pendingAssignments = 0
    @Environment(\.verticalSizeClass) private var vSize
    public init() {}
    public var body: some View {
        Group {
            if Auth.auth().currentUser == nil {
                StudentEmailSignInView(onSignedIn: {})
            } else {
                TabView(selection: $selectedTab) {
                    NavigationView {
                        AssignmentsView(onPendingCountChange: { count in
                            pendingAssignments = count
                            AppBadgeManager.setBadge(count)
                        })
                    }
                    .tabItem { Label("Assignments", systemImage: "list.bullet.rectangle") }
                    .modifier(TabBadgeIfNeeded(count: pendingAssignments))
                    .tag(0)
                    NavigationView { PublicGamesView() }
                        .tabItem { Label("Explore", systemImage: "gamecontroller") }
                        .tag(1)
                    HighScoresMiniView()
                        .tabItem { Label("High Scores", systemImage: "trophy") }
                        .tag(2)
                    // Removed Account tab per revert
                }
                .onAppear { configureTabBarAppearance() }
                .task { AppBadgeManager.requestAuthorizationIfNeeded() }
                // Keep default safe-area behavior
                .modifier(TabBarBackgroundVisible())
                // Use only the system tab bar (remove custom bar and do not hide it)
            }
        }
    }
}

// Lightweight email sign-in page (separate view)
public struct StudentEmailSignInView: View {
    var onSignedIn: () -> Void
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    public var body: some View {
        VStack(spacing: 16) {
            Text("Welcome").font(.largeTitle.bold())
            if let error { Text(error).foregroundColor(.red) }
            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled(true)
                .keyboardType(.emailAddress)
                .padding(12).background(.white).cornerRadius(10)
            SecureField("Password", text: $password)
                .padding(12).background(.white).cornerRadius(10)
            Button("Sign In") { Task { await signIn() } }
                .buttonStyle(.borderedProminent)
        }
        .padding()
        .background(Color(red: 0.93, green: 0.96, blue: 1.0).ignoresSafeArea())
    }
    private func signIn() async {
        do {
            _ = try await Auth.auth().signIn(withEmail: email.trimmingCharacters(in: .whitespaces), password: password)
            onSignedIn()
        } catch { self.error = error.localizedDescription }
    }
}

// (Custom tab bar removed per latest design)

// Lightweight Account placeholder – aligns with a dedicated tab in landscape
public struct AccountView: View {
    @State private var info: String? = nil
    public init() {}
    public var body: some View {
        VStack(spacing: 12) {
            Text("Account").font(.title2.bold())
            if let info { Text(info).font(.footnote).foregroundColor(.secondary) }
            Text("Profile and settings coming soon.")
        }
        .padding()
        .navigationTitle("Account")
    }
}

// MARK: - Tab bar appearance helpers
import UIKit
private func configureTabBarAppearance() {
    let appearance = UITabBarAppearance()
    appearance.configureWithOpaqueBackground()
    appearance.backgroundColor = UIColor.systemBackground
    UITabBar.appearance().isTranslucent = false
    UITabBar.appearance().standardAppearance = appearance
    if #available(iOS 15.0, *) {
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}

private struct TabBarBackgroundVisible: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 16.0, *) {
            content.toolbarBackground(.visible, for: .tabBar)
        } else {
            content
        }
    }
}

// Conditionally apply a badge only when count > 0, without using nil literals
private struct TabBadgeIfNeeded: ViewModifier {
    let count: Int
    func body(content: Content) -> some View {
        if #available(iOS 15.0, *) {
            if count > 0 {
                content.badge(count)
            } else {
                content
            }
        } else {
            content
        }
    }
}

// PublicGamesView and HighScoresMiniView now live in their own files to avoid redeclarations
