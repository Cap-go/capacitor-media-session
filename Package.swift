// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapgoMediaSession",
    platforms: [.iOS(.v14)],
    products: [
        .library(
            name: "CapgoMediaSession",
            targets: ["MediaSessionPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0")
    ],
    targets: [
        .target(
            name: "MediaSessionPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/MediaSessionPlugin"),
        .testTarget(
            name: "MediaSessionPluginTests",
            dependencies: ["MediaSessionPlugin"],
            path: "ios/Tests/MediaSessionPluginTests")
    ]
)
