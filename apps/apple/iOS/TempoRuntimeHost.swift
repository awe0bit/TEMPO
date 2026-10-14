import SwiftUI
import TempoRuntime
import UIKit

final class TempoRuntimeAppDelegate: NSObject, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    ReactNativeHostManager.shared.initialize()
    return true
  }
}

struct TempoRuntimeScreen: View {
  let route: AppTab
  @State private var runtimeReady = false
  @State private var startupTimedOut = false
  @State private var runtimeGeneration = UUID()

  var body: some View {
    ZStack(alignment: .top) {
      ReactNativeView(
        moduleName: "main",
        initialProps: [
          "route": route.runtimeRoute,
          "locale": Locale.current.identifier,
        ]
      )
      .id(runtimeGeneration)
      .ignoresSafeArea(edges: .bottom)

      TempoRuntimeChrome(route: route)

      if !runtimeReady {
        runtimePlaceholder
      }
    }
    .task(id: runtimeGeneration) {
      runtimeReady = false
      startupTimedOut = false
      try? await Task.sleep(for: .seconds(8))
      guard !Task.isCancelled, !runtimeReady else { return }
      startupTimedOut = true
    }
    .onReceive(NotificationCenter.default.publisher(for: .tempoRuntimeReady)) { _ in
      runtimeReady = true
      startupTimedOut = false
      sendRoute()
    }
    .onChange(of: route) { _, _ in
      sendRoute()
    }
  }

  private func sendRoute() {
    TempoNativeRegistry.shared.sendCommand(
      "navigate",
      payload: ["route": route.runtimeRoute]
    )
  }

  private var runtimePlaceholder: some View {
    VStack(spacing: 14) {
      if startupTimedOut {
        Image(systemName: "exclamationmark.arrow.trianglehead.2.clockwise.rotate.90")
          .font(.system(size: 28, weight: .medium))
          .foregroundStyle(TempoPalette.accent)
        Text("界面运行时没有连接")
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(TempoPalette.ink)
        Text("已保留原生导航，可重新加载当前页面。")
          .font(.system(size: 14))
          .foregroundStyle(TempoPalette.quiet)
        Button("重新加载") {
          runtimeGeneration = UUID()
        }
        .buttonStyle(.borderedProminent)
        .tint(TempoPalette.accent)
      } else {
        ProgressView()
          .tint(TempoPalette.accent)
        Text("正在载入")
          .font(.system(size: 14, weight: .medium))
          .foregroundStyle(TempoPalette.quiet)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(TempoPalette.background)
  }
}

private struct TempoRuntimeChrome: View {
  @State private var searchExpanded = false
  @State private var searchText = ""
  @FocusState private var searchFocused: Bool
  let route: AppTab

  var body: some View {
    ZStack(alignment: .top) {
      if searchExpanded {
        Color.clear
          .contentShape(Rectangle())
          .ignoresSafeArea()
          .onTapGesture(perform: closeSearch)
      }

      HStack(spacing: 10) {
        if searchExpanded || route == .inbox || route == .rss {
          searchControl
        } else if route == .pomodoro {
          chromeButton("chart.xyaxis.line", command: "statistics")
        }

        Spacer()

        if route != .settings {
          optionsMenu
            .allowsHitTesting(!searchExpanded)
        }
      }
      .padding(.horizontal, 18)
      .padding(.top, 8)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .onChange(of: route) { _, _ in
      closeSearch()
    }
  }

  private var searchControl: some View {
    HStack(spacing: 0) {
      Button {
        if searchExpanded {
          searchFocused = true
        } else {
          openSearch()
        }
      } label: {
        Image(systemName: "magnifyingglass")
          .font(.system(size: 17, weight: .semibold))
          .foregroundStyle(searchExpanded ? TempoPalette.quiet : TempoPalette.ink)
          .frame(width: 48, height: 48)
          .contentShape(Circle())
      }
      .buttonStyle(.plain)
      .accessibilityLabel("搜索")

      TextField(searchPlaceholder, text: $searchText)
        .font(.system(size: 16, weight: .medium))
        .foregroundStyle(TempoPalette.ink)
        .tint(TempoPalette.accent)
        .submitLabel(.search)
        .focused($searchFocused)
        .disabled(!searchExpanded)
        .opacity(searchExpanded ? 1 : 0)
        .frame(width: searchExpanded ? searchExpandedWidth - 96 : 0, alignment: .leading)
        .onChange(of: searchText) { _, value in
          TempoNativeRegistry.shared.sendCommand("search", payload: ["query": value])
        }

      Button(action: closeSearch) {
        Image(systemName: "xmark.circle.fill")
          .font(.system(size: 17, weight: .semibold))
          .foregroundStyle(TempoPalette.quiet)
          .frame(width: searchExpanded ? 48 : 0, height: 48)
      }
      .buttonStyle(.plain)
      .disabled(!searchExpanded)
      .opacity(searchExpanded ? 1 : 0)
      .accessibilityLabel("关闭搜索")
    }
    .frame(width: searchExpanded ? searchExpandedWidth : 48, height: 48)
    .clipped()
    .tempoSearchSurface()
    .animation(.smooth(duration: 0.28, extraBounce: 0), value: searchExpanded)
  }

  private var searchExpandedWidth: CGFloat {
    min(320, max(220, UIScreen.main.bounds.width - 104))
  }

  private var searchPlaceholder: String {
    switch route {
    case .inbox: "搜索收集箱"
    case .today: "搜索这一天"
    case .rss: "搜索标题、来源或摘要"
    default: "搜索"
    }
  }

  private func openSearch() {
    withAnimation(.smooth(duration: 0.28, extraBounce: 0)) {
      searchExpanded = true
    }
    TempoNativeRegistry.shared.sendCommand("search", payload: ["query": searchText])
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.30) {
      guard searchExpanded else { return }
      searchFocused = true
    }
    UIImpactFeedbackGenerator(style: .soft).impactOccurred()
  }

  private func closeSearch() {
    searchFocused = false
    searchText = ""
    TempoNativeRegistry.shared.sendCommand("search", payload: ["query": ""])
    withAnimation(.smooth(duration: 0.24, extraBounce: 0)) {
      searchExpanded = false
    }
  }

  private func chromeButton(_ symbol: String, command: String) -> some View {
    Button {
      TempoNativeRegistry.shared.sendCommand(command)
      UIImpactFeedbackGenerator(style: .soft).impactOccurred()
    } label: {
      Image(systemName: symbol)
        .font(.system(size: 17, weight: .semibold))
        .foregroundStyle(TempoPalette.ink)
        .frame(width: 48, height: 48)
        .contentShape(Circle())
    }
    .buttonStyle(.plain)
    .tempoFloatingSurface()
    .accessibilityLabel(command == "search" ? "搜索" : command == "statistics" ? "专注统计" : "更多")
  }

  private var optionsMenu: some View {
    Menu {
      switch route {
      case .inbox:
        commandButton("记到收集箱", symbol: "square.and.pencil", command: "newTask")
        searchCommandButton("搜索任务")
        Divider()
        commandButton("显示已完成", symbol: "checkmark.circle", command: "showCompleted")
        commandButton("隐藏已完成", symbol: "circle", command: "hideCompleted")
      case .today:
        commandButton("安排任务", symbol: "calendar.badge.plus", command: "newTask")
        searchCommandButton("搜索任务")
        commandButton("回到今天", symbol: "calendar", command: "returnToday")
        Divider()
        commandButton("显示已完成", symbol: "checkmark.circle", command: "showCompleted")
        commandButton("隐藏已完成", symbol: "circle", command: "hideCompleted")
      case .pomodoro:
        commandButton("专注统计", symbol: "chart.xyaxis.line", command: "statistics")
        commandButton("重新计时", symbol: "arrow.counterclockwise", command: "resetTimer")
        Button(role: .destructive) {
          send("stopTimer")
        } label: {
          Label("结束本次计时", systemImage: "stop.fill")
        }
      case .rss:
        commandButton("添加订阅", symbol: "plus.circle", command: "addFeed")
        commandButton("刷新全部", symbol: "arrow.clockwise", command: "refreshFeeds")
        searchCommandButton("搜索文章")
        Divider()
        commandButton("全部标为已读", symbol: "checkmark.circle", command: "markAllRead")
      case .settings:
        EmptyView()
      }
    } label: {
      Image(systemName: "ellipsis")
        .font(.system(size: 17, weight: .semibold))
        .foregroundStyle(TempoPalette.ink)
        .frame(width: 48, height: 48)
        .contentShape(Circle())
    }
    .buttonStyle(.plain)
    .tempoFloatingSurface()
    .accessibilityLabel("更多")
  }

  private func commandButton(_ title: String, symbol: String, command: String) -> some View {
    Button {
      send(command)
    } label: {
      Label(title, systemImage: symbol)
    }
  }

  private func searchCommandButton(_ title: String) -> some View {
    Button(action: openSearch) {
      Label(title, systemImage: "magnifyingglass")
    }
  }

  private func send(_ command: String) {
    TempoNativeRegistry.shared.sendCommand(command)
    UIImpactFeedbackGenerator(style: .soft).impactOccurred()
  }
}

private extension AppTab {
  var runtimeRoute: String {
    switch self {
    case .inbox: "inbox"
    case .today: "today"
    case .pomodoro: "focus"
    case .rss: "rss"
    case .settings: "settings"
    }
  }
}
