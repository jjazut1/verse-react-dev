import SwiftUI

struct HighScoresMiniView: View {
    @State private var gameType: String = "anagram"
    @State private var entries: [HighScoreEntry] = []
    @State private var ssEntries: [SentenceSenseHighScoreEntry] = []
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
                if gameType == "sentence-sense" {
                    ForEach(ssEntries) { e in
                        HStack(alignment: .firstTextBaseline) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(e.configTitle).font(.headline)
                                Text(e.displayName).font(.subheadline).foregroundColor(.secondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing) {
                                Text("Best Misses")
                                    .font(.caption2).foregroundColor(.secondary)
                                Text("\(e.bestMisses)")
                                    .font(.title3.monospacedDigit())
                            }
                        }
                    }
                } else {
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
            }
            .navigationTitle("High Scores")
        }
        .onAppear { Task { await load() } }
        .onChange(of: gameType) { _ in Task { await load() } }
    }

    private func load() async {
        do {
            if gameType == "sentence-sense" {
                ssEntries = try await service.sentenceSenseTop()
                entries = []
            } else {
                entries = try await service.top(forGameType: gameType)
                ssEntries = []
            }
            errorMessage = nil
        }
        catch let e { errorMessage = e.localizedDescription }
    }
}


