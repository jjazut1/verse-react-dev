import SwiftUI
import FirebaseAuth

public struct AssignmentsView: View {
    @State private var assignments: [Assignment] = []
    @State private var error: String?
    @State private var isLoading = false
    private let service = AssignmentService()
    @State private var presented: Assignment?

    public init() {}

    @State private var greetingTitle: String = "Assignments"

    public var body: some View {
        VStack(spacing: 12) {
            // Navigation title is provided by the parent NavigationView
            ZStack {
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color(.systemGray6))
                Group {
                    if #available(iOS 16.0, *) {
                        List {
                            if isLoading { ProgressView() }
                            if let error { Text(error).foregroundColor(.red) }
                            ForEach(assignments) { a in
                                Button { presented = a } label: {
                                    HStack(alignment: .center, spacing: 12) {
                                        Image(systemName: icon(for: a.gameType))
                                            .foregroundColor(.blue)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(a.title).font(.headline)
                                            HStack(spacing: 6) {
                                                Text(a.gameType).font(.caption).foregroundColor(.secondary)
                                                if let due = a.dueAt { Text("Due \(formatted(due))").font(.caption2).foregroundColor(.orange) }
                                            }
                                            if let done = a.completedCount, let total = a.timesRequired, total > 0 {
                                                ProgressView(value: Double(done), total: Double(total))
                                                    .progressViewStyle(.linear)
                                            }
                                        }
                                        Spacer()
                                        Image(systemName: "chevron.right").foregroundColor(.secondary)
                                    }
                                    .padding(12)
                                    .background(RoundedRectangle(cornerRadius: 12).fill(Color(.systemBackground)))
                                    .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 4)
                                }
                            }
                        }
                        .listStyle(.plain)
                        .scrollContentBackground(.hidden)
                        .background(Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 24))
                    } else {
                        List {
                            if isLoading { ProgressView() }
                            if let error { Text(error).foregroundColor(.red) }
                            ForEach(assignments) { a in
                                Button { presented = a } label: {
                                    HStack(alignment: .center, spacing: 12) {
                                        Image(systemName: icon(for: a.gameType))
                                            .foregroundColor(.blue)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(a.title).font(.headline)
                                            HStack(spacing: 6) {
                                                Text(a.gameType).font(.caption).foregroundColor(.secondary)
                                                if let due = a.dueAt { Text("Due \(formatted(due))").font(.caption2).foregroundColor(.orange) }
                                            }
                                            if let done = a.completedCount, let total = a.timesRequired, total > 0 {
                                                ProgressView(value: Double(done), total: Double(total))
                                                    .progressViewStyle(.linear)
                                            }
                                        }
                                        Spacer()
                                        Image(systemName: "chevron.right").foregroundColor(.secondary)
                                    }
                                    .padding(12)
                                    .background(RoundedRectangle(cornerRadius: 12).fill(Color(.systemBackground)))
                                    .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 4)
                                }
                            }
                        }
                        .listStyle(.plain)
                        .background(Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 24))
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .navigationTitle(greetingTitle)
        .navigationBarTitleDisplayMode(.large)
        .onAppear { greetingTitle = makeGreeting() }
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

    private func icon(for type: String) -> String {
        switch type {
        case "anagram": return "textformat.abc"
        case "place-value-showdown": return "number"
        case "sort-categories-egg": return "square.grid.2x2"
        case "spinner-wheel": return "dial.max"
        default: return "gamecontroller"
        }
    }

    private func formatted(_ date: Date) -> String {
        let df = DateFormatter()
        df.dateStyle = .medium
        return df.string(from: date)
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do { assignments = try await service.listForCurrentUser() }
        catch { self.error = error.localizedDescription }
    }

    private func makeGreeting() -> String {
        let base: [String] = [
            "Hello",
            "Good Day",
            "Welcome Back",
            "Keep Going",
            "Great to See You",
            "You’ve Got This"
        ]
        let name: String = {
            if let display = Auth.auth().currentUser?.displayName, !display.isEmpty { return display }
            if let email = Auth.auth().currentUser?.email, let prefix = email.split(separator: "@").first { return String(prefix) }
            return "Student"
        }()
        return "\(base.randomElement() ?? "Hello"), \(name)"
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


