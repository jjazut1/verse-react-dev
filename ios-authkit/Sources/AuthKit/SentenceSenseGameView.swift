import SwiftUI
import AVFoundation
import UniformTypeIdentifiers
import UIKit

// Minimal native Sentence Sense game based on userGameConfigs schema
private struct SentenceSenseConfigModel {
    struct Item: Identifiable { let id: String; let original: String }
    let title: String
    let showHints: Bool
    let enableTTS: Bool
    let sentences: [Item]

    static func from(dict: [String: Any]) -> SentenceSenseConfigModel? {
        if let type = dict["type"] as? String, type != "sentence-sense" { return nil }
        let title = (dict["title"] as? String) ?? "Sentence Sense"
        let showHints = (dict["showHints"] as? Bool) ?? true
        let enableTTS = (dict["enableTextToSpeech"] as? Bool) ?? true
        let arr = (dict["sentences"] as? [[String: Any]] ?? []).map { m in
            Item(id: (m["id"] as? String) ?? UUID().uuidString,
                 original: (m["original"] as? String) ?? "")
        }.filter { !$0.original.isEmpty }
        return SentenceSenseConfigModel(title: title, showHints: showHints, enableTTS: enableTTS, sentences: arr)
    }
}

public struct SentenceSenseGameView: View {
    public let assignmentId: String
    public let configRef: String
    @State private var config: SentenceSenseConfigModel?
    @State private var error: String?
    @State private var currentIndex: Int = 0
    // Single-row reorder model
    @State private var current: [String] = [] // current arrangement
    @State private var target: [String] = []  // correct order
    @State private var misses: Int = 0
    @State private var moves: Int = 0
    @State private var timeElapsed: Int = 0
    @State private var timer: Timer? = nil
    @State private var showHint = false
    @State private var draggingText: String? = nil
    private enum DragSource { case row(Int) }
    @State private var dragSource: DragSource? = nil
    @State private var hintScrambledIndex: Int? = nil
    @State private var activeDrop: Int? = nil
    private let configService = UserGameConfigService()
    private let resultsService = ResultsService()
    private let speechSynth = AVSpeechSynthesizer()
    @State private var dynamicFont: CGFloat = 16
    @State private var isLandscape: Bool = true
    @Environment(\.colorScheme) private var colorScheme

    public init(assignmentId: String, configRef: String) {
        self.assignmentId = assignmentId
        self.configRef = configRef
    }

    public var body: some View {
        ZStack {
            Color(uiColor: .systemGroupedBackground).ignoresSafeArea()
            ScrollView {
                VStack(spacing: 20) {
                    if !isLandscape {
                        HStack(spacing: 8) {
                            Image(systemName: "iphone.landscape")
                            Text("For the best experience, rotate your device to landscape.")
                        }
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.orange)
                        .padding(8)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color.orange.opacity(0.12))
                        )
                    }
                    if let error { Text(error).foregroundColor(.red) }
                    if let cfg = config, currentIndex < cfg.sentences.count {
                        let item = cfg.sentences[currentIndex]
                        HStack { Spacer(minLength: 0)
                            VStack(alignment: .leading, spacing: 14) {
                                Text(cfg.title).font(.title3.bold()).padding(.horizontal, 4)

                        // Progress & counters
                        ProgressView(value: Double(correctCount()), total: Double(target.count))
                                    .progressViewStyle(.linear)
                                HStack(spacing: 20) {
                                    Label("Moves: \(moves)", systemImage: "hand.point.up.left")
                                        .font(.footnote).foregroundColor(.secondary)
                                    Label("Misses: \(misses)", systemImage: "xmark.circle")
                                        .font(.footnote).foregroundColor(.secondary)
                                    Label("Time: \(timeElapsed)s", systemImage: "clock")
                                        .font(.footnote).foregroundColor(.secondary)
                                }

                                Text("Arrange the sentence").font(.caption).foregroundColor(.secondary)
                                reorderRow()

                                HStack(spacing: 12) {
                                    if cfg.showHints {
                                        Button(showHint ? "Hint Shown" : "Show Hint") { showNextHint() }
                                            .buttonStyle(.bordered)
                                            .disabled(showHint)
                                    }
                                    if cfg.enableTTS {
                                        Button("Speak Sentence") { speak(item.original) }
                                            .buttonStyle(.bordered)
                                    }
                                    Button("Reset") { resetSentence() }
                                        .buttonStyle(.borderedProminent)
                                }
                                .padding(.top, 8)
                                .frame(maxWidth: .infinity, alignment: .leading)

                                if showHint {
                                    if let first = item.original.split(separator: " ").first {
                                        Text("💡 First word: \(first)")
                                            .foregroundColor(.orange)
                                            .font(.footnote)
                                    }
                                }
                                Text("Misses: \(misses)").font(.footnote).foregroundColor(.secondary)
                            }
                            .padding(.vertical, 16)
                            .padding(.horizontal, 20)
                            .frame(maxWidth: 700)
                            Spacer(minLength: 0)
                        }
                    } else if config != nil {
                        VStack(spacing: 12) {
                            Image(systemName: "checkmark.seal.fill").foregroundColor(.green).font(.largeTitle)
                            Text("Great job! Saving your result...")
                        }.padding(.top, 40)
                    } else {
                        ProgressView().padding(.top, 40)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
        }
        .navigationTitle("Sentence Sense")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadConfig() }
        .onDisappear { timer?.invalidate(); timer = nil }
        .onAppear { updateOrientation() }
        .onReceive(NotificationCenter.default.publisher(for: UIDevice.orientationDidChangeNotification)) { _ in
            updateOrientation()
        }
    }

    private func loadConfig() async {
        do {
            let data = try await configService.loadConfig(fromPath: configRef)
            guard let cfg = SentenceSenseConfigModel.from(dict: data) else { error = "Invalid config"; return }
            config = cfg
            startSentence()
        } catch { self.error = error.localizedDescription }
    }

    private func startSentence() {
        guard let cfg = config, currentIndex < cfg.sentences.count else { return }
        let sentence = cfg.sentences[currentIndex].original
        target = tokenize(sentence)
        current = scramble(target)
        showHint = false
        moves = 0
        misses = 0
        timeElapsed = 0
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            timeElapsed += 1
        }
    }

    private func resetSentence() { startSentence() }

    private func tokenize(_ sentence: String) -> [String] {
        sentence
            .replacingOccurrences(of: "\n", with: " ")
            .split(separator: " ")
            .map { String($0) }
            .filter { !$0.isEmpty }
    }

    private func updateOrientation() {
        let bounds = UIScreen.main.bounds
        isLandscape = bounds.width > bounds.height
    }

    private func scramble(_ words: [String]) -> [String] {
        var arr = words
        for i in stride(from: arr.count - 1, through: 1, by: -1) {
            let j = Int.random(in: 0...i)
            arr.swapAt(i, j)
        }
        return arr
    }

    // MARK: - UI helpers
    private func reorderRow() -> some View {
        GeometryReader { geo in
            let fs = computeFontSize(containerWidth: geo.size.width)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: max(0.0, fs * 0.01)) {
                    dropZone(at: 0, font: fs)
                    ForEach(Array(current.enumerated()), id: \.offset) { idx, token in
                        tokenView(token, index: idx, font: fs)
                        dropZone(at: idx + 1, font: fs)
                    }
                }
                .padding(.horizontal, 12)
                .onAppear { dynamicFont = fs }
                .onChange(of: current) { _ in dynamicFont = fs }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
    }

    private func tokenView(_ token: String, index: Int, font: CGFloat) -> some View {
        VStack(spacing: 1) {
            Text(token)
                .font(.system(size: font, weight: .semibold))
                .padding(.vertical, max(5, font * 0.45))
                .padding(.horizontal, max(3, font * 0.15))
                .background(Color(uiColor: .secondarySystemBackground))
                .cornerRadius(8)

            // Drag handle below the word to avoid finger covering the text
            Capsule()
                .fill(Color.secondary.opacity(0.35))
                .frame(width: max(24, font * 1.2), height: 6)
                .overlay(
                    Capsule().stroke(Color.secondary.opacity(0.5), lineWidth: 0.5)
                )
                .contentShape(Rectangle())
                .accessibilityLabel(Text("Drag \(token)"))
        }
        // Make the entire token stack draggable so users can drag the word itself or the handle
        .contentShape(Rectangle())
        .onDrag {
            draggingText = token
            dragSource = .row(index)
            return NSItemProvider(object: token as NSString)
        }
    }

    private func dropZone(at position: Int, font: CGFloat) -> some View {
        let isActive = activeDrop == position
        let visualW = max(2, font * 0.03) // 50% tighter visible gap
        let hitW = max(28, font * 0.45) // keep generous hit zone
        let hitH = max(32, font * 1.3)
        return Rectangle()
            .fill(Color.clear)
            .frame(width: visualW, height: max(28, font * 1.2))
            .overlay(
                Rectangle()
                    .fill(Color.accentColor)
                    .frame(width: isActive ? 2 : 0, height: max(22, font * 1.0))
            )
            // Large invisible interactive layer that does not affect layout
            .overlay(
                Color.clear
                    .frame(width: hitW, height: hitH)
                    .contentShape(Rectangle())
                    .onDrop(
                        of: [UTType.text],
                        isTargeted: Binding(
                            get: { self.activeDrop == position },
                            set: { hovering in self.activeDrop = hovering ? position : nil }
                        )
                    ) { providers, session in
                        let res = handleDropInRow(at: position, providers: providers)
                        self.activeDrop = nil
                        return res
                    }
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { _ in self.activeDrop = position }
                            .onEnded { _ in self.activeDrop = nil }
                    )
            )
    }

    private func computeFontSize(containerWidth: CGFloat) -> CGFloat {
        let minFont: CGFloat = 12
        let maxFont: CGFloat = 24
        guard containerWidth > 0, !current.isEmpty else { return 16 }

        func rowWidth(for font: CGFloat) -> CGFloat {
            let fontObj = UIFont.systemFont(ofSize: font, weight: .semibold)
            let attrs: [NSAttributedString.Key: Any] = [.font: fontObj]
            let tokenHPad = max(3, font * 0.15) * 2
            let tokenVPad = max(5, font * 0.45) // not used in width
            _ = tokenVPad
            let spacing = max(0.0, font * 0.01)
            let dropW = max(2, font * 0.03)
            let tokenWidths = current.map { (t: String) -> CGFloat in
                let w = (t as NSString).size(withAttributes: attrs).width
                return ceil(w) + tokenHPad
            }
            let sumTokens = tokenWidths.reduce(0, +)
            let totalSpacing = spacing * CGFloat(max(0, current.count - 1))
            let totalDrops = dropW * CGFloat(current.count + 1)
            return sumTokens + totalSpacing + totalDrops
        }

        var low = minFont
        var high = maxFont
        // binary search for maximal font that fits
        let margin: CGFloat = 12 // smaller safety margin to reclaim width
        for _ in 0..<16 {
            let mid = (low + high) / 2
            if rowWidth(for: mid) <= max(0, containerWidth - margin) { // keep ends from clipping
                low = mid
            } else {
                high = mid
            }
        }
        return max(minFont, min(maxFont, low))
    }

    // MARK: - Single-row move handler
    private func handleDropInRow(at position: Int, providers: [NSItemProvider]) -> Bool {
        // Reorder immediately using our dragSource; don't depend on provider payload
        guard case .row(let src)? = dragSource else { activeDrop = nil; return false }
        var from = src
        var to = position
        if from == to || from + 1 == to { draggingText = nil; dragSource = nil; activeDrop = nil; return true }
        let tokenMoved = current.remove(at: from)
        if from < to { to -= 1 }
        current.insert(tokenMoved, at: max(0, min(to, current.count)))
        moves += 1
        if target.indices.contains(to) { if tokenMoved != target[to] { misses += 1 } }
        if current == target { Task { await saveAndFinish() } }
        draggingText = nil
        dragSource = nil
        hintScrambledIndex = nil
        activeDrop = nil
        return true
    }

    // MARK: - Hint logic
    private func showNextHint() {
        showHint = true
        guard target.count == current.count else { return }
        // highlight the next incorrect token's source position
        if let firstMismatch = current.enumerated().first(where: { idx, tok in tok != target[idx] })?.offset {
            // find where the needed token currently lives
            let needed = target[firstMismatch]
            hintScrambledIndex = current.firstIndex(of: needed)
        }
    }

    // Tap swaps with neighbor drop logic: simple fallback for accessibility
    private func tapWord(index: Int, fromScrambled: Bool) {
        // For the one-row model, treat taps as no-ops; drag handles reordering.
    }

    private func correctCount() -> Int {
        guard current.count == target.count else { return 0 }
        var count = 0
        for i in 0..<target.count { if current[i] == target[i] { count += 1 } }
        return count
    }

    private func saveAndFinish() async {
        do {
            let result = GameResult(assignmentId: assignmentId, gameType: "sentence-sense", score: misses, stats: ["sentences": config?.sentences.count ?? 0])
            try await resultsService.saveWithRetry(result)
        } catch { self.error = error.localizedDescription }
    }

    private func speak(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = 0.45
        utterance.pitchMultiplier = 1.0
        utterance.volume = 0.9
        speechSynth.stopSpeaking(at: .immediate)
        speechSynth.speak(utterance)
    }
}


