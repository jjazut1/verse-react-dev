import SwiftUI
import FirebaseAuth

public struct StudentDashboardView: View {
    @State private var selectedTab = 0
    public init() {}
    public var body: some View {
        Group {
            if Auth.auth().currentUser == nil {
                StudentEmailSignInView(onSignedIn: {})
            } else {
                TabView(selection: $selectedTab) {
                    NavigationView { AssignmentsView() }
                        .tabItem { Label("Assignments", systemImage: "list.bullet.rectangle") }
                        .tag(0)
                    NavigationView { PublicGamesView() }
                        .tabItem { Label("Explore", systemImage: "gamecontroller") }
                        .tag(1)
                    HighScoresMiniView()
                        .tabItem { Label("High Scores", systemImage: "trophy") }
                        .tag(2)
                }
                .onAppear { configureTabBarForLandscapeStickiness() }
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

// MARK: - UITabBar appearance (stick to bottom in landscape)
import UIKit
private func configureTabBarForLandscapeStickiness() {
    let appearance = UITabBarAppearance()
    appearance.configureWithOpaqueBackground()
    appearance.backgroundColor = UIColor.systemBackground
    UITabBar.appearance().standardAppearance = appearance
    if #available(iOS 15.0, *) {
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}

// Placeholder explore page for public games
public struct PublicGamesView: View {
    public init() {}
    public var body: some View {
        ScrollView { VStack(alignment: .leading, spacing: 12) { Text("Browse public games (coming soon)") } }
            .padding()
            .background(Color(red: 0.93, green: 0.96, blue: 1.0).ignoresSafeArea())
            .navigationTitle("Explore")
    }
}

struct HighScoresMiniView: View {
    @State private var gameType: String = "anagram"
    @State private var entries: [HighScoreEntry] = []
    @State private var errorMessage: String?
    private let service = HighScoreService()

    private let gameTypes = [
        "anagram",
        "sort-categories-egg",
        "spinner-wheel",
        "sentence-sense",
        "place-value-showdown",
        "word-volley",
        "name-it",
        "whack-a-mole"
    ]

    var body: some View {
        NavigationView {
            List {
                Section {
                    Picker("Game", selection: $gameType) {
                        ForEach(gameTypes, id: \.self) { Text($0) }
                    }
                    .pickerStyle(.segmented)
                }
                if let errorMessage { Text(errorMessage).foregroundColor(.red) }
                ForEach(entries) { e in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(e.playerName).font(.headline)
                            Text(e.gameType).font(.caption).foregroundColor(.secondary)
                        }
                        Spacer()
                        Text("\(e.score)")
                    }
                }
            }
            .navigationTitle("High Scores")
        }
        .onAppear { Task { await load() } }
        .onChange(of: gameType) { _ in Task { await load() } }
    }

    private func load() async {
        do { entries = try await service.top(forGameType: gameType) ; errorMessage = nil }
        catch let e { errorMessage = e.localizedDescription }
    }
}


