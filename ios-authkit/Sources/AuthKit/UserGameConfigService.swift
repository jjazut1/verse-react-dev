import Foundation
import FirebaseFirestore

public final class UserGameConfigService: @unchecked Sendable {
    private let db = Firestore.firestore()
    public init() {}

    public func loadConfig(byId id: String) async throws -> [String: Any] {
        let doc = try await db.collection("userGameConfigs").document(id).getDocument()
        return doc.data() ?? [:]
    }

    public func loadConfig(fromPath path: String) async throws -> [String: Any] {
        let doc = try await db.document(path).getDocument()
        return doc.data() ?? [:]
    }

    public struct PublicConfig: Identifiable, Sendable {
        public let id: String
        public let title: String
        public let gameType: String
        public let ownerName: String?
        public let path: String
    }

    public func listPublicConfigs(limit: Int = 50) async throws -> [PublicConfig] {
        // Avoid composite index requirement by not ordering; simple equality filter is always allowed.
        let snap = try await db.collection("userGameConfigs")
            .whereField("share", isEqualTo: true)
            .limit(to: limit)
            .getDocuments()
        return snap.documents.map { d in
            let data = d.data()
            return PublicConfig(
                id: d.documentID,
                title: data["title"] as? String ?? "Untitled",
                gameType: data["gameType"] as? String ?? (data["type"] as? String ?? "unknown"),
                ownerName: data["ownerName"] as? String ?? data["author"] as? String,
                path: d.reference.path
            )
        }
    }
}


