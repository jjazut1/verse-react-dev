import Foundation
import FirebaseAuth
import FirebaseFirestore

public struct GameResult: @unchecked Sendable {
    public var assignmentId: String
    public var gameType: String
    public var score: Int
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
            "score": result.score,
            "stats": result.stats,
            "updatedAt": FieldValue.serverTimestamp(),
            "createdAt": FieldValue.serverTimestamp()
        ]
        try await ref.setData(data, merge: true)

        // Parity writes with web app
        try? await writeAttempt(assignmentId: result.assignmentId, gameType: result.gameType, score: result.score)
        try? await updateAssignments(assignmentId: result.assignmentId)
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

    // MARK: - Parity helpers
    private func writeAttempt(assignmentId: String, gameType: String, score: Int) async throws {
        let user = Auth.auth().currentUser
        var payload: [String: Any] = [
            "assignmentId": assignmentId,
            "gameType": gameType,
            "score": score,
            "createdAt": FieldValue.serverTimestamp(),
            // Web app expects 'timestamp' for attempt rows
            "timestamp": FieldValue.serverTimestamp()
        ]
        if let uid = user?.uid { payload["userId"] = uid }
        if let email = user?.email { payload["studentEmail"] = email }
        try await db.collection("attempts").addDocument(data: payload)
    }

    private func updateAssignments(assignmentId: String) async throws {
        let user = Auth.auth().currentUser
        guard let uid = user?.uid else { return }
        // Top-level assignment
        let topRef = db.collection("assignments").document(assignmentId)
        try? await topRef.setData([
            "status": "completed",
            "lastCompletedAt": FieldValue.serverTimestamp(),
            "completedCount": FieldValue.increment(Int64(1)),
            "studentId": uid
        ], merge: true)

        // Per-user subcollection if exists
        let subRef = db.collection("users").document(uid).collection("assignments").document(assignmentId)
        try? await subRef.setData([
            "status": "completed",
            "lastCompletedAt": FieldValue.serverTimestamp(),
            "completedCount": FieldValue.increment(Int64(1))
        ], merge: true)
    }
}


