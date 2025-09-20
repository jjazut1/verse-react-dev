// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "AuthKit",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(name: "AuthKit", type: .static, targets: ["AuthKit"]) 
    ],
    dependencies: [
        // Firebase via SPM
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "12.0.0"),
        // Google Sign-In via SPM
        .package(url: "https://github.com/google/GoogleSignIn-iOS", from: "9.0.0")
    ],
    targets: [
        .target(
            name: "AuthKit",
            dependencies: [
                .product(name: "FirebaseCore", package: "firebase-ios-sdk"),
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(name: "FirebaseFirestore", package: "firebase-ios-sdk"),
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS")
            ],
            path: "Sources"
        )
    ]
)


