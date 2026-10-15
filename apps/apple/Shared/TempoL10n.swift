import Foundation

enum TempoL10n {
  static func string(_ key: String) -> String {
    NSLocalizedString(key, bundle: .main, comment: "")
  }

  static func format(_ key: String, _ arguments: CVarArg...) -> String {
    String(format: string(key), locale: Locale.current, arguments: arguments)
  }
}
