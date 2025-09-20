import SwiftUI
import WebKit

public struct WebGameView: View {
    private let urlString: String
    private let assignmentId: String
    private let gameType: String
    @State private var isLoading: Bool = true
    @State private var errorMessage: String?
    private let resultsService = ResultsService()

    public init(urlString: String, assignmentId: String, gameType: String) {
        self.urlString = urlString
        self.assignmentId = assignmentId
        self.gameType = gameType
    }

    public var body: some View {
        ZStack {
            WebViewContainer(urlString: urlString,
                             assignmentId: assignmentId,
                             gameType: gameType,
                             onLoadingChanged: { isLoading = $0 },
                             onComplete: { score, stats in
                                 let safeStats: [String: Any] = stats ?? [:]
                                 let result = GameResult(assignmentId: assignmentId, gameType: gameType, score: score, stats: safeStats)
                                 Task { try? await resultsService.saveWithRetry(result) }
                             },
                             onError: { errorMessage = $0 })
            if isLoading { ProgressView().scaleEffect(1.4) }
            if let errorMessage { Text(errorMessage).foregroundColor(.red) }
        }
        .navigationTitle("Game")
    }
}

private struct WebViewContainer: UIViewRepresentable {
    let urlString: String
    let assignmentId: String
    let gameType: String
    let onLoadingChanged: (Bool) -> Void
    let onComplete: (Int, [String: Any]?) -> Void
    let onError: (String) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> WKWebView {
        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "native")

        // Inject initial payload for the web app to read
        let payload = [
            "assignmentId": assignmentId,
            "gameType": gameType,
            "native": "ios"
        ] as [String: Any]
        if let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
           let json = String(data: data, encoding: .utf8) {
            let js = "window.LUMI_NATIVE = \(json);"
            let userScript = WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true)
            contentController.addUserScript(userScript)
        }

        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator

        if let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        } else {
            onError("Invalid URL")
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        private let parent: WebViewContainer
        init(_ parent: WebViewContainer) { self.parent = parent }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "native" else { return }
            if let body = message.body as? [String: Any], let type = body["type"] as? String {
                if type == "complete" {
                    let score = body["score"] as? Int ?? 0
                    let stats = body["stats"] as? [String: Any]
                    parent.onComplete(score, stats)
                }
            }
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.onLoadingChanged(true)
        }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.onLoadingChanged(false)
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.onLoadingChanged(false)
            parent.onError(error.localizedDescription)
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            parent.onLoadingChanged(false)
            parent.onError(error.localizedDescription)
        }
    }
}


