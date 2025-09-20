import SwiftUI

public struct ComingSoonGameView: View {
    let gameType: String

    public init(gameType: String) {
        self.gameType = gameType
    }

    public var body: some View {
        VStack(spacing: 12) {
            Text("\(prettyTitle(for: gameType))")
                .font(.title2.bold())
            Text("Native version coming soon.")
                .foregroundColor(.secondary)
            Text("We're porting games to SwiftUI for the best offline experience.")
                .font(.footnote)
                .foregroundColor(.secondary)
        }
        .padding()
        .navigationTitle("Game")
    }

    private func prettyTitle(for key: String) -> String {
        switch key {
        case "place-value-showdown": return "Place Value Showdown"
        case "sentence-sense": return "Sentence Sense"
        case "sort-categories-egg-reveal": return "Sort Categories"
        default: return key.replacingOccurrences(of: "-", with: " ").capitalized
        }
    }
}


