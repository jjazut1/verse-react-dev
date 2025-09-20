import SwiftUI

public struct AssignmentsView: View {
    @State private var assignments: [Assignment] = []
    @State private var error: String?
    @State private var isLoading = false
    private let service = AssignmentService()

    public init() {}

    public var body: some View {
        List {
            if isLoading { ProgressView() }
            if let error { Text(error).foregroundColor(.red) }
            ForEach(assignments) { a in
                NavigationLink(destination: destination(for: a)) {
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
    }

    // Decide native vs web at tap time
    private func destination(for a: Assignment) -> some View {
        if a.gameType == "anagram", let configRef = a.configRef {
            return AnyView(AnagramGameView(assignmentId: a.id, configRef: configRef))
        } else if a.gameType == "place-value-showdown", let configRef = a.configRef {
            return AnyView(PlaceValueShowdownGameView(assignmentId: a.id, configRef: configRef))
        } else {
            return AnyView(ComingSoonGameView(gameType: a.gameType))
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


