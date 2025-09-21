import SwiftUI

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


