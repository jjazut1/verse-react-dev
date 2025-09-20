import SwiftUI

public struct AssignmentsView: View {
    @State private var assignments: [Assignment] = []
    @State private var error: String?
    @State private var isLoading = false
    private let service = AssignmentService()
    @State private var presented: Assignment?

    public init() {}

    public var body: some View {
        List {
            if isLoading { ProgressView() }
            if let error { Text(error).foregroundColor(.red) }
            ForEach(assignments) { a in
                Button {
                    presented = a
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(a.title).font(.headline)
                        Text(a.gameType).font(.caption).foregroundColor(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Assignments")
        .task { await load() }
        .refreshable { await load() }
        .fullScreenCover(item: $presented) { a in
            GamePresentationView(assignment: a)
        }
    }

    // Full screen presenter
    private struct GamePresentationView: View {
        let assignment: Assignment
        @Environment(\.dismiss) private var dismiss
        var body: some View {
            NavigationView {
                Group {
                    if assignment.gameType == "anagram", let ref = assignment.configRef {
                        AnagramGameView(assignmentId: assignment.id, configRef: ref)
                    } else if assignment.gameType == "place-value-showdown", let ref = assignment.configRef {
                        PlaceValueShowdownGameView(assignmentId: assignment.id, configRef: ref)
                    } else {
                        ComingSoonGameView(gameType: assignment.gameType)
                    }
                }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close") { dismiss() }
                    }
                }
            }
            .navigationViewStyle(StackNavigationViewStyle())
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do { assignments = try await service.listForCurrentUser() }
        catch { self.error = error.localizedDescription }
    }
}

public struct AssignmentDetailView: View {
    public let assignment: Assignment
    @State private var config: [String: Any] = [:]
    @State private var message: String?
    private let configService = UserGameConfigService()
    private let resultsService = ResultsService()

    public var body: some View {
        VStack(spacing: 12) {
            Text(assignment.title).font(.title3.bold())
            if let message { Text(message).font(.footnote).foregroundColor(.secondary) }
            Button("Load Config") { Task { await loadConfig() } }
                .buttonStyle(.bordered)
            Button("Complete (save result)") { Task { await saveResult() } }
                .buttonStyle(.borderedProminent)
            if assignment.gameType == "anagram", let assignmentId = Optional(assignment.id), let configRef = assignment.configRef {
                NavigationLink("Play Anagram (native)") {
                    AnagramGameView(assignmentId: assignmentId, configRef: configRef)
                }
            }
            if assignment.gameType == "place-value-showdown", let assignmentId = Optional(assignment.id), let configRef = assignment.configRef {
                NavigationLink("Play Place Value Showdown (native)") {
                    PlaceValueShowdownGameView(assignmentId: assignmentId, configRef: configRef)
                }
            }
        }
        .padding()
        .navigationTitle("Details")
    }

    private func loadConfig() async {
        do {
            if let ref = assignment.configRef { config = try await configService.loadConfig(fromPath: ref) ; message = "Config loaded." }
            else { message = "No configRef provided." }
        } catch { message = error.localizedDescription }
    }

    private func saveResult() async {
        do {
            let result = GameResult(assignmentId: assignment.id, gameType: assignment.gameType, score: Int.random(in: 50...100), stats: ["sample": true])
            try await resultsService.saveWithRetry(result)
            message = "Result saved."
        } catch { message = error.localizedDescription }
    }
}


