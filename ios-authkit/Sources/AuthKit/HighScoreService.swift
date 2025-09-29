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

public struct SentenceSenseHighScoreEntry: Codable, Sendable, Identifiable {
    public var id: String
    public var configId: String
    public var configTitle: String
    public var displayName: String
    public var bestMisses: Int
    public var attempts: Int
    public var updatedAt: Date
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

    // Sentence Sense – lower bestMisses is better; show config title and user displayName
    public func sentenceSenseTop(limit: Int = 25) async throws -> [SentenceSenseHighScoreEntry] {
        // Order by bestMisses asc (first attempts should have it set by function)
        let snap = try await db.collection("highScores")
            .whereField("gameType", isEqualTo: "sentence-sense")
            .order(by: "bestMisses", descending: false)
            .limit(to: limit)
            .getDocuments()

        // Collect ids for fan-out fetches
        var userIds: Set<String> = []
        var configIds: Set<String> = []
        for doc in snap.documents {
            if let uid = doc["userId"] as? String { userIds.insert(uid) }
            if let cid = doc["configId"] as? String { configIds.insert(cid) }
        }

        // Fetch users and configs in parallel (batched by whereIn groups of 10)
        async let usersMap = fetchUserDisplayNames(userIds: Array(userIds))
        async let titlesMap = fetchConfigTitles(configIds: Array(configIds))
        let (userNames, configTitles) = try await (usersMap, titlesMap)

        // Build entries
        let entries: [SentenceSenseHighScoreEntry] = snap.documents.compactMap { doc in
            guard let best = (doc["bestMisses"] as? Int) ?? (doc["bestMisses"] as? NSNumber)?.intValue else { return nil }
            let id = doc.documentID
            let configId = (doc["configId"] as? String) ?? ""
            let uid = (doc["userId"] as? String) ?? ""
            let attempts = (doc["attempts"] as? Int) ?? (doc["attempts"] as? NSNumber)?.intValue ?? 0
            let updatedAt = (doc["updatedAt"] as? Timestamp)?.dateValue() ?? Date()
            let title = configTitles[configId] ?? (doc["title"] as? String) ?? "Sentence Sense"
            let name = userNames[uid] ?? (doc["studentEmail"] as? String) ?? "Student"
            return SentenceSenseHighScoreEntry(id: id, configId: configId, configTitle: title, displayName: name, bestMisses: best, attempts: attempts, updatedAt: updatedAt)
        }
        return entries
    }

    private func fetchUserDisplayNames(userIds: [String]) async throws -> [String: String] {
        var result: [String: String] = [:]
        guard !userIds.isEmpty else { return result }
        // Firestore whereIn allows up to 10 per query; batch as needed
        let chunks = stride(from: 0, to: userIds.count, by: 10).map { Array(userIds[$0..<min($0+10, userIds.count)]) }
        for chunk in chunks {
            let q = db.collection("users").whereField(FieldPath.documentID(), in: chunk)
            let snap = try await q.getDocuments()
            for doc in snap.documents {
                let data = doc.data()
                let name = (data["name"] as? String) ?? (data["displayName"] as? String) ?? (data["email"] as? String) ?? "Student"
                result[doc.documentID] = name
            }
        }
        return result
    }

    private func fetchConfigTitles(configIds: [String]) async throws -> [String: String] {
        var result: [String: String] = [:]
        guard !configIds.isEmpty else { return result }
        let chunks = stride(from: 0, to: configIds.count, by: 10).map { Array(configIds[$0..<min($0+10, configIds.count)]) }
        for chunk in chunks {
            let q = db.collection("userGameConfigs").whereField(FieldPath.documentID(), in: chunk)
            let snap = try await q.getDocuments()
            for doc in snap.documents {
                let title = (doc["title"] as? String) ?? (doc["name"] as? String) ?? "Sentence Sense"
                result[doc.documentID] = title
            }
        }
        return result
    }
}


