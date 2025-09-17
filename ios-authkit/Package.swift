// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "AuthKit",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(name: "AuthKit", targets: ["AuthKit"])
    ],
    dependencies: [
        // Firebase Auth via SPM
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "10.24.0"),
        // Google Sign-In via SPM
        .package(url: "https://github.com/google/GoogleSignIn-iOS", from: "7.0.0")
    ],
    targets: [
        .target(
            name: "AuthKit",
            dependencies: [
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS")
            ],
            path: "Sources"
        )
    ]
)


