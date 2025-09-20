import Foundation
import FirebaseAuth
import FirebaseFirestore

public struct UserProfile: Codable, Sendable {
    public var email: String
    public var name: String?
    public var roles: [String]
    public var providerLinks: [String]
    public var createdAt: Date?
    public var updatedAt: Date?
}

public enum ProfileError: Error { case notFound }

public final class ProfileService: @unchecked Sendable {
    private let db = Firestore.firestore()

    public init() {}

    public func bootstrapForCurrentUser() async throws -> UserProfile {
        guard let user = Auth.auth().currentUser else { throw ProfileError.notFound }
        return try await bootstrap(uid: user.uid, authUser: user)
    }

    public func bootstrap(uid: String, authUser: User) async throws -> UserProfile {
        let ref = db.collection("users").document(uid)
        let snap = try await ref.getDocument()
        guard snap.exists else { throw ProfileError.notFound }

        // Build enriched fields but do not overwrite teacher-provisioned data unnecessarily
        var updates: [String: Any] = [
            "updatedAt": FieldValue.serverTimestamp()
        ]
        if let email = authUser.email { updates["email"] = email }
        if let name = authUser.displayName, (snap.data()? ["name"] as? String)?.isEmpty ?? true { updates["name"] = name }
        // Provider links
        let providers = Set(authUser.providerData.map { $0.providerID.replacingOccurrences(of: ".com", with: "") })
        updates["providerLinks"] = Array(providers)

        try await ref.setData(updates, merge: true)

        let finalSnap = try await ref.getDocument()
        let data = finalSnap.data() ?? [:]
        let profile = UserProfile(
            email: data["email"] as? String ?? authUser.email ?? "",
            name: data["name"] as? String,
            roles: data["roles"] as? [String] ?? ["student"],
            providerLinks: data["providerLinks"] as? [String] ?? Array(providers),
            createdAt: (data["createdAt"] as? Timestamp)?.dateValue(),
            updatedAt: (data["updatedAt"] as? Timestamp)?.dateValue()
        )
        return profile
    }
}


