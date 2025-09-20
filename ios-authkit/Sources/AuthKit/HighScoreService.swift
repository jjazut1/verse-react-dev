import Foundation
import FirebaseFirestore

public struct HighScoreEntry: Codable, Sendable, Identifiable {
    public var id: String
    public var playerName: String
    public var score: Int
    public var gameType: String
    public var configId: String
    public var createdAt: Date
}

public final class HighScoreService: @unchecked Sendable {
    private let db = Firestore.firestore()
    public init() {}

    public func top(forGameType gameType: String, limit: Int = 20) async throws -> [HighScoreEntry] {
        let snap = try await db.collection("highScores")
            .whereField("gameType", isEqualTo: gameType)
            .order(by: "score", descending: true)
            .limit(to: limit)
            .getDocuments()
        return snap.documents.compactMap { doc in
            guard let score = doc["score"] as? Int else { return nil }
            return HighScoreEntry(
                id: doc.documentID,
                playerName: doc["playerName"] as? String ?? "",
                score: score,
                gameType: doc["gameType"] as? String ?? "",
                configId: doc["configId"] as? String ?? "",
                createdAt: (doc["createdAt"] as? Timestamp)?.dateValue() ?? Date()
            )
        }
    }
}


