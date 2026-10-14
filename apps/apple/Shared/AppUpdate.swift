import Combine
import Foundation

struct TempoRelease: Decodable, Identifiable, Equatable {
  struct Asset: Decodable, Equatable, Identifiable {
    let name: String
    let browserDownloadURL: URL

    var id: String { browserDownloadURL.absoluteString }

    private enum CodingKeys: String, CodingKey {
      case name
      case browserDownloadURL = "browser_download_url"
    }
  }

  let tagName: String
  let name: String
  let body: String
  let htmlURL: URL
  let assets: [Asset]

  var id: String { tagName }
  var version: String { tagName.trimmingCharacters(in: CharacterSet(charactersIn: "vV")) }
  var usesNumericVersion: Bool {
    tagName.range(of: #"^v?[0-9]+\.[0-9]+\.[0-9]+$"#, options: .regularExpression) != nil
  }
  var iOSAsset: Asset? {
    assets.first {
      $0.name.lowercased().contains("ios") && $0.name.lowercased().hasSuffix(".ipa")
    }
  }
  var macOSAsset: Asset? {
    assets.first {
      let name = $0.name.lowercased()
      return name.contains("macos") && (name.hasSuffix(".dmg") || name.hasSuffix(".zip"))
    }
  }
  var currentPlatformAsset: Asset? {
    #if os(iOS)
    return iOSAsset
    #elseif os(macOS)
    return macOSAsset
    #else
    return nil
    #endif
  }

  private enum CodingKeys: String, CodingKey {
    case tagName = "tag_name"
    case name, body, assets
    case htmlURL = "html_url"
  }
}

@MainActor
final class AppUpdateChecker: ObservableObject {
  enum State: Equatable {
    case idle
    case checking
    case current
    case available(TempoRelease)
    case failed(String)
  }

  @Published private(set) var state: State = .idle
  private var hasChecked = false

  let currentVersion: String
  let currentBuild: String

  init(bundle: Bundle = .main) {
    currentVersion = bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
      ?? "0.0.0"
    currentBuild = bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String
      ?? "0"
  }

  @discardableResult
  func check(force: Bool = false) async -> TempoRelease? {
    if case .checking = state { return availableRelease }
    if hasChecked, !force { return availableRelease }

    state = .checking
    do {
      var request = URLRequest(
        url: URL(string: "https://api.github.com/repos/awe0bit/TEMPO/releases?per_page=50")!
      )
      request.timeoutInterval = 15
      request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
      request.setValue("TEMPO-iOS/\(currentVersion)", forHTTPHeaderField: "User-Agent")

      let (data, response) = try await URLSession.shared.data(for: request)
      guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
        throw UpdateError.invalidResponse
      }
      let releases = try JSONDecoder().decode([TempoRelease].self, from: data)
      guard let release = releases.first(where: {
        $0.usesNumericVersion && $0.currentPlatformAsset != nil
      }) else {
        hasChecked = true
        state = .current
        return nil
      }
      hasChecked = true
      if Self.isNewer(release.version, than: currentVersion) {
        state = .available(release)
        return release
      }
      state = .current
      return nil
    } catch is CancellationError {
      return nil
    } catch {
      state = .failed(error.localizedDescription)
      return nil
    }
  }

  var availableRelease: TempoRelease? {
    guard case .available(let release) = state else { return nil }
    return release
  }

  private static func isNewer(_ candidate: String, than installed: String) -> Bool {
    let lhs = versionParts(candidate)
    let rhs = versionParts(installed)
    let count = max(lhs.count, rhs.count)
    for index in 0..<count {
      let left = index < lhs.count ? lhs[index] : 0
      let right = index < rhs.count ? rhs[index] : 0
      if left != right { return left > right }
    }
    return false
  }

  private static func versionParts(_ value: String) -> [Int] {
    value
      .trimmingCharacters(in: CharacterSet(charactersIn: "vV"))
      .split(separator: ".")
      .map { component in
        Int(component.prefix { $0.isNumber }) ?? 0
      }
  }
}

private enum UpdateError: LocalizedError {
  case invalidResponse

  var errorDescription: String? {
    switch self {
    case .invalidResponse: "无法获取最新版本，请稍后重试。"
    }
  }
}
