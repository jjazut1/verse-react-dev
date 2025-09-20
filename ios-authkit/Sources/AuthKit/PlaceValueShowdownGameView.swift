import SwiftUI

public struct PlaceValueShowdownGameView: View {
    let assignmentId: String
    let configRef: String
    @State private var config: [String: Any] = [:]
    @State private var isLoading = true
    @State private var error: String?
    private let configService = UserGameConfigService()
    private let resultsService = ResultsService()

    public init(assignmentId: String, configRef: String) {
        self.assignmentId = assignmentId
        self.configRef = configRef
    }

    public var body: some View {
        VStack(spacing: 12) {
            if isLoading { ProgressView() }
            if let error { Text(error).foregroundColor(.red) }

            if !config.isEmpty {
                Text((config["title"] as? String) ?? "Place Value Showdown")
                    .font(.title3.bold())
                // TODO: Implement full gameplay UI. For now, a simple completion button.
                Button("Complete Round (save result)") {
                    Task {
                        await completeWithScore()
                    }
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .navigationTitle("Place Value Showdown")
        .task { await loadConfig() }
    }

    private func loadConfig() async {
        isLoading = true
        defer { isLoading = false }
        do {
            config = try await configService.loadConfig(fromPath: configRef)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func completeWithScore() async {
        // Placeholder: derive a simple score, e.g., random or based on config
        let score = Int.random(in: 0...100)
        let stats: [String: Any] = [
            "mode": (config["mode"] as? String) ?? "largest",
            "digits": (config["numberOfCards"] as? Int) ?? 3
        ]
        let result = GameResult(assignmentId: assignmentId, gameType: "place-value-showdown", score: score, stats: stats)
        try? await resultsService.saveWithRetry(result)
    }
}


