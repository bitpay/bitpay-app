import Foundation

/// Compile-time placeholder for the React Native bundle's SHA-256 hash.
///
/// The 64-character sentinel below is embedded in the Mach-O binary at compile time.
/// During the "Inject Bundle Hash" build phase (after the JS bundle is produced),
/// `inject-bundle-hash.sh` locates this exact byte sequence in the linked executable
/// and overwrites it with the real SHA-256 hex digest (also 64 characters).
///
/// Why not Info.plist?  A plist is a plain-text XML file on the device filesystem.
/// On a jailbroken device an attacker can trivially edit it to match a tampered bundle.
/// Embedding the hash in compiled code forces the attacker to patch the Mach-O binary,
/// which is a significantly higher bar.
enum BundleHash {
    // DO NOT change this value or its length (64 chars = SHA-256 hex digest).
    // The build script searches for this exact string in the compiled binary.
    static let expected = "__RN_BUNDLE_HASH_PLACEHOLDER_00000000000000000000000000000000000"
}
