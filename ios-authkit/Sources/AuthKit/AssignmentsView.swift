import SwiftUI
import FirebaseAuth
import FirebaseFirestore

public struct AssignmentsView: View {
    public typealias TabSelect = (Int) -> Void
    @State private var assignments: [Assignment] = []
    @State private var error: String?
    @State private var isLoading = false
    private let service = AssignmentService()
    @State private var presented: Assignment?
    private enum ListMode { case active, completed }
    @State private var mode: ListMode = .active
    @State private var showSavedToast: Bool = false
    @State private var countsBeforePlay: [String: Int] = [:]
    @State private var lastPlayedAssignmentId: String? = nil

    private var onSelectTab: TabSelect?
    private var onPendingCountChange: ((Int) -> Void)?
    public init(onSelectTab: TabSelect? = nil, onPendingCountChange: ((Int) -> Void)? = nil) {
        self.onSelectTab = onSelectTab
        self.onPendingCountChange = onPendingCountChange
    }

    @State private var greetingTitle: String = "Assignments"
    @Environment(\.verticalSizeClass) private var vSize
    private var isCompact: Bool { vSize == .compact }

    public var body: some View {
        VStack(spacing: 12) {
            // List of assignments
            Group {
                    // Filter switcher
                    HStack {
                        Picker("Mode", selection: $mode) {
                            Text("Active").tag(ListMode.active)
                            Text("Completed").tag(ListMode.completed)
                        }
                        .pickerStyle(.segmented)
                    }
                    .padding(.horizontal, 16)
                    if #available(iOS 16.0, *) {
                        List {
                            if isLoading { ProgressView() }
                            if let error { Text(error).foregroundColor(.red) }
                            ForEach(mode == .active ? activeAssignments() : completedAssignments()) { a in
                                Button {
                                    if mode == .active {
                                        countsBeforePlay = currentCountsMap()
                                        lastPlayedAssignmentId = a.id
                                        presented = a
                                    }
                                } label: {
                                    HStack(alignment: .center, spacing: 12) {
                                        Image(systemName: icon(for: a.gameType))
                                            .foregroundColor(.blue)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(a.title).font(.headline)
                                            HStack(spacing: 6) {
                                                Text(a.gameType).font(.caption).foregroundColor(.secondary)
                                                if let due = a.dueAt { Text("Due \(formatted(due))").font(.caption2).foregroundColor(isOverdue(a) ? .red : .orange) }
                                            }
                                            if let done = a.completedCount, let total = a.timesRequired, total > 0 {
                                                VStack(alignment: .leading, spacing: 2) {
                                                    ProgressView(value: Double(done), total: Double(total))
                                                        .progressViewStyle(.linear)
                                                    if mode == .active {
                                                        HStack {
                                                            let remaining = max(0, total - done)
                                                            Text("\(remaining) left")
                                                                .font(.caption2)
                                                                .foregroundColor(.secondary)
                                                            Spacer()
                                                            Text("\(done)/\(total)")
                                                                .font(.caption2)
                                                                .foregroundColor(.secondary)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        Spacer()
                                        if mode == .active {
                                            Image(systemName: "chevron.right").foregroundColor(.secondary)
                                        } else {
                                            Image(systemName: "checkmark.seal.fill").foregroundColor(.green)
                                        }
                                    }
                                    .padding(12)
                                    .background(
                                        RoundedRectangle(cornerRadius: 16)
                                            .fill(cardFill(for: a))
                                            .shadow(color: Color.black.opacity(0.12), radius: 14, x: 0, y: 8)
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(Color.black.opacity(0.06), lineWidth: 1)
                                    )
                                }
                                .disabled(mode == .completed)
                                .listRowBackground(Color.clear)
                                .listRowSeparator(.hidden)
                            }
                        }
                        .listStyle(.plain)
                        .frame(maxHeight: .infinity, alignment: .top)
                    } else {
                        List {
                            if isLoading { ProgressView() }
                            if let error { Text(error).foregroundColor(.red) }
                            ForEach(mode == .active ? activeAssignments() : completedAssignments()) { a in
                                Button {
                                    if mode == .active {
                                        countsBeforePlay = currentCountsMap()
                                        lastPlayedAssignmentId = a.id
                                        presented = a
                                    }
                                } label: {
                                    HStack(alignment: .center, spacing: 12) {
                                        Image(systemName: icon(for: a.gameType))
                                            .foregroundColor(.blue)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(a.title).font(.headline)
                                            HStack(spacing: 6) {
                                                Text(a.gameType).font(.caption).foregroundColor(.secondary)
                                                if let due = a.dueAt { Text("Due \(formatted(due))").font(.caption2).foregroundColor(isOverdue(a) ? .red : .orange) }
                                            }
                                            if let done = a.completedCount, let total = a.timesRequired, total > 0 {
                                                VStack(alignment: .leading, spacing: 2) {
                                                    ProgressView(value: Double(done), total: Double(total))
                                                        .progressViewStyle(.linear)
                                                    if mode == .active {
                                                        HStack {
                                                            let remaining = max(0, total - done)
                                                            Text("\(remaining) left")
                                                                .font(.caption2)
                                                                .foregroundColor(.secondary)
                                                            Spacer()
                                                            Text("\(done)/\(total)")
                                                                .font(.caption2)
                                                                .foregroundColor(.secondary)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        Spacer()
                                        if mode == .active {
                                            Image(systemName: "chevron.right").foregroundColor(.secondary)
                                        } else {
                                            Image(systemName: "checkmark.seal.fill").foregroundColor(.green)
                                        }
                                    }
                                    .padding(12)
                                    .background(
                                        RoundedRectangle(cornerRadius: 16)
                                            .fill(cardFill(for: a))
                                            .shadow(color: Color.black.opacity(0.12), radius: 14, x: 0, y: 8)
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(Color.black.opacity(0.06), lineWidth: 1)
                                    )
                                }
                                .disabled(mode == .completed)
                                .listRowBackground(Color.clear)
                                .modifier(HideSeparatorIfAvailable())
                            }
                        }
                        .listStyle(.plain)
                        .frame(maxHeight: .infinity, alignment: .top)
                    }
            }
            .padding(.horizontal, 16)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .navigationTitle(isCompact ? "" : greetingTitle)
        .navigationBarTitleDisplayMode(isCompact ? .inline : .large)
        .onAppear { Task { await loadGreeting() } }
        .task { await load() }
        .refreshable { await load() }
        .fullScreenCover(item: $presented, onDismiss: {
            Task {
                let oldCounts = countsBeforePlay
                let playedId = lastPlayedAssignmentId
                await load()
                if let pid = playedId {
                    let newCount = assignments.first(where: { $0.id == pid })?.completedCount ?? oldCounts[pid] ?? 0
                    let oldCount = oldCounts[pid] ?? 0
                    if newCount > oldCount {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.9)) { showSavedToast = true }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
                            withAnimation(.easeInOut(duration: 0.25)) { showSavedToast = false }
                        }
                    }
                }
                // reset cache
                countsBeforePlay = [:]
                lastPlayedAssignmentId = nil
            }
        }) { a in
            GamePresentationView(assignment: a)
        }
        .overlay(alignment: .bottom) {
            if showSavedToast {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
                    Text("Saved! Progress updated").font(.footnote.bold())
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(.ultraThinMaterial, in: Capsule())
                .shadow(color: Color.black.opacity(0.12), radius: 8, x: 0, y: 4)
                .padding(.bottom, 18)
            }
        }
        // Custom bar moved to StudentDashboardView to avoid duplication/interference with List layout
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
                    } else if assignment.gameType == "sentence-sense", let ref = assignment.configRef {
                        SentenceSenseGameView(assignmentId: assignment.id, configRef: ref)
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
        reportPendingCount()
    }

    private func reportPendingCount() {
        let count = activeAssignments().count
        onPendingCountChange?(count)
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

    private func loadGreeting() async {
        let base: [String] = [
            "Hello",
            "Good Day",
            "Welcome Back",
            "Keep Going",
            "Great to See You",
            "You’ve Got This"
        ]
        let salutation = base.randomElement() ?? "Hello"
        guard let email = Auth.auth().currentUser?.email else {
            greetingTitle = makeGreeting()
            return
        }
        let lower = email.lowercased()
        do {
            let db = Firestore.firestore()
            let snap = try await db.collection("users").whereField("email", isEqualTo: lower).limit(to: 1).getDocuments()
            if let doc = snap.documents.first, let name = doc.data()["name"] as? String, !name.isEmpty {
                greetingTitle = "\(salutation), \(name)"
                return
            }
        } catch {
            // Fall back silently
        }
        greetingTitle = makeGreeting()
    }

    // MARK: - Filtering, visuals
    private func activeAssignments() -> [Assignment] {
        assignments.filter { a in
            if let s = a.status?.lowercased(), s == "completed" { return false }
            if let done = a.completedCount, let total = a.timesRequired, total > 0 { return done < total }
            return true
        }
    }

    private func completedAssignments() -> [Assignment] {
        assignments.filter { a in
            if let s = a.status?.lowercased(), s == "completed" { return true }
            if let done = a.completedCount, let total = a.timesRequired, total > 0 { return done >= total }
            return false
        }
    }

    private func currentCountsMap() -> [String: Int] {
        var m: [String: Int] = [:]
        for a in assignments { m[a.id] = a.completedCount ?? 0 }
        return m
    }

    private func isOverdue(_ a: Assignment) -> Bool {
        guard let due = a.dueAt else { return false }
        return due < Date()
    }

    private func cardFill(for a: Assignment) -> Color {
        if isOverdue(a) { return Color(red: 1.0, green: 0.95, blue: 0.95) }
        return Color(.systemBackground)
    }

    // iOS 15 fallback to hide separators
    private struct HideSeparatorIfAvailable: ViewModifier {
        func body(content: Content) -> some View {
            if #available(iOS 16.0, *) {
                content.listRowSeparator(.hidden)
            } else {
                content
            }
        }
    }
    // Dynamic inset sized for tab bar in both portrait/landscape and devices
    private func tabBarInset() -> CGFloat {
        #if os(iOS)
        let window = UIApplication.shared
            .connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.keyWindow
        let bottomSafe = window?.safeAreaInsets.bottom ?? 0
        let isLandscape = UIDevice.current.orientation.isValidInterfaceOrientation ? UIDevice.current.orientation.isLandscape : (UIScreen.main.bounds.width > UIScreen.main.bounds.height)
        // Reduced spacer: ~44 in landscape, ~54 in portrait (+ safe area + small padding)
        let likelyTabBar: CGFloat = isLandscape ? 44 : 54
        return likelyTabBar + bottomSafe + 6
        #else
        return 100
        #endif
    }
}

private struct TabPillButton: View {
    let label: String
    let systemImage: String
    let isSelected: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: systemImage)
                Text(label)
                    .font(.subheadline.weight(.semibold))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .foregroundColor(isSelected ? .blue : .primary)
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(isSelected ? Color.blue.opacity(0.12) : Color.clear)
            )
        }
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
            // Dev helper: write results-only payload (no client progress mutations)
            let payload = GameResult(
                assignmentId: assignment.id,
                gameType: assignment.gameType,
                misses: nil,
                score: nil,
                stats: ["sample": true]
            )
            try await resultsService.saveWithRetry(payload)
            message = "Result saved."
        } catch { message = error.localizedDescription }
    }
}


