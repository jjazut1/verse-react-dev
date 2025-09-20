import Foundation
import FirebaseAuth
import FirebaseFirestore

public struct GuestSession: Codable, Sendable, Identifiable {
    public var id: String
    public var startedAt: Date
    public var endedAt: Date?
    public var notes: String?
}

public final class GuestSessionService: @unchecked Sendable {
    private let db = Firestore.firestore()
    public init() {}

    public func start(notes: String? = nil) async throws -> String? {
        guard let uid = Auth.auth().currentUser?.uid else { return nil }
        let ref = db.collection("guestSessions").document(uid).collection("sessions").document()
        var data: [String: Any] = [
            "startedAt": FieldValue.serverTimestamp()
        ]
        if let notes { data["notes"] = notes }
        try await ref.setData(data, merge: false)
        return ref.documentID
    }

    public func end(sessionId: String) async throws {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        let ref = db.collection("guestSessions").document(uid).collection("sessions").document(sessionId)
        try await ref.setData(["endedAt": FieldValue.serverTimestamp()], merge: true)
    }
}


