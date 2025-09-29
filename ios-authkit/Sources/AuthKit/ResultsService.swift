import Foundation
import FirebaseAuth
import FirebaseFirestore

public struct GameResult: @unchecked Sendable {
    public var assignmentId: String
    public var gameType: String
    public var misses: Int?
    public var score: Int?
    public var stats: [String: Any]
}

public final class ResultsService: @unchecked Sendable {
    private let db = Firestore.firestore()

    public init() {}

    public func saveResult(_ result: GameResult) async throws {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        let ref = db.collection("users").document(uid).collection("results").document(result.assignmentId)
        var data: [String: Any] = [
            "assignmentId": result.assignmentId,
            "gameType": result.gameType,
            "stats": result.stats,
            "updatedAt": FieldValue.serverTimestamp(),
            "createdAt": FieldValue.serverTimestamp()
        ]
        if let misses = result.misses { data["misses"] = misses }
        if let score = result.score { data["score"] = score }
        try await ref.setData(data, merge: true)
    }

    // Basic retry wrapper
    public func saveWithRetry(_ result: GameResult, retries: Int = 3, delayMs: UInt64 = 500) async throws {
        var lastError: Error?
        for attempt in 0..<retries {
            do {
                try await saveResult(result)
                return
            } catch {
                lastError = error
                try? await Task.sleep(nanoseconds: delayMs * 1_000_000)
                if attempt == retries - 1 { throw error }
            }
        }
        if let lastError { throw lastError }
    }
}


