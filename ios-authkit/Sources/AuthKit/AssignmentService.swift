import Foundation
import FirebaseAuth
import FirebaseFirestore

public struct Assignment: Codable, Sendable, Identifiable {
    public var id: String
    public var title: String
    public var gameType: String
    public var configRef: String?
    public var token: String?
    public var status: String?
    public var dueAt: Date?
}

public final class AssignmentService: @unchecked Sendable {
    private let db = Firestore.firestore()

    public init() {}

    public func listForCurrentUser() async throws -> [Assignment] {
        guard let user = Auth.auth().currentUser else { return [] }
        let uid = user.uid
        let email = user.email

        // Strategy: union of subcollection (users/{uid}/assignments) and top-level assignments where studentId==uid or studentEmail==email
        var result: [String: Assignment] = [:]

        // 1) Subcollection (new structure)
        do {
            let snap = try await db.collection("users").document(uid).collection("assignments").getDocuments()
            for doc in snap.documents {
                let a = Assignment(
                    id: doc.documentID,
                    title: doc["title"] as? String ?? (doc["gameName"] as? String ?? "Assignment"),
                    gameType: doc["gameType"] as? String ?? "",
                    configRef: doc["configRef"] as? String,
                    token: doc["token"] as? String,
                    status: doc["status"] as? String,
                    dueAt: (doc["dueAt"] as? Timestamp)?.dateValue()
                )
                result[a.id] = a
            }
        } catch {
            // ignore and try top-level fallback
        }

        // 2) Top-level assignments (current prod)
        var topLevelDocs: [QueryDocumentSnapshot] = []
        do {
            let q1 = db.collection("assignments").whereField("studentId", isEqualTo: uid)
            let s1 = try await q1.getDocuments()
            topLevelDocs.append(contentsOf: s1.documents)
        } catch {}
        if let email {
            do {
                let q2 = db.collection("assignments").whereField("studentEmail", isEqualTo: email)
                let s2 = try await q2.getDocuments()
                topLevelDocs.append(contentsOf: s2.documents)
            } catch {}
        }

        for doc in topLevelDocs {
            let id = doc.documentID
            let title = (doc["title"] as? String) ?? (doc["gameName"] as? String) ?? "Assignment"
            let gameType = (doc["gameType"] as? String) ?? ""
            let gameId = doc["gameId"] as? String
            let configRef = gameId != nil ? "userGameConfigs/\(gameId!)" : nil
            let dueAt = (doc["deadline"] as? Timestamp)?.dateValue()
            let status = doc["status"] as? String
            let token = doc["token"] as? String
            let a = Assignment(id: id, title: title, gameType: gameType, configRef: configRef, token: token, status: status, dueAt: dueAt)
            result[id] = a
        }

        return Array(result.values).sorted { ($0.dueAt ?? .distantFuture) < ($1.dueAt ?? .distantFuture) }
    }

    public func loadConfig(configRef: String) async throws -> [String: Any] {
        let doc = try await db.document(configRef).getDocument()
        return doc.data() ?? [:]
    }
}


