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
}


