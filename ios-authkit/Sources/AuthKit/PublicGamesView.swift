import SwiftUI

public struct PublicGamesView: View {
    @State private var items: [UserGameConfigService.PublicConfig] = []
    @State private var error: String?
    private let service = UserGameConfigService()
    public init() {}
    public var body: some View {
        List {
            if let error { Text(error).foregroundColor(.red) }
            ForEach(items) { item in
                NavigationLink {
                    PublicGamePlayView(item: item)
                } label: {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(item.title).font(.headline)
                        HStack(spacing: 8) {
                            Text(item.gameType).font(.caption).foregroundColor(.secondary)
                            if let owner = item.ownerName { Text("by \(owner)").font(.caption).foregroundColor(.secondary) }
                        }
                    }
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle("Explore")
        .onAppear { Task { await load() } }
        .refreshable { await load() }
    }

    private func load() async {
        do { items = try await service.listPublicConfigs(limit: 100); error = nil }
        catch { self.error = error.localizedDescription }
    }
}

private struct PublicGamePlayView: View {
    let item: UserGameConfigService.PublicConfig
    var body: some View {
        Group {
            switch item.gameType {
            case "anagram":
                AnagramGameView(assignmentId: "public-\(item.id)", configRef: item.path)
            case "place-value-showdown":
                PlaceValueShowdownGameView(assignmentId: "public-\(item.id)", configRef: item.path)
            default:
                ComingSoonGameView(gameType: item.gameType)
            }
        }
        .navigationTitle(item.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}


