import SwiftUI
import AVFoundation
import UniformTypeIdentifiers
import UIKit
import CoreHaptics
import AudioToolbox
import FirebaseAuth
import FirebaseFirestore

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

// MARK: - Themes
private enum SentenceTheme: String, CaseIterable, Identifiable {
    case classic, ocean, jungle, space
    var id: String { rawValue }

    func background(for scheme: ColorScheme) -> Color {
        switch self {
        case .classic:
            return scheme == .dark ? Color(red: 0.10, green: 0.14, blue: 0.22) : Color(red: 0.86, green: 0.93, blue: 1.0)
        case .ocean:
            return scheme == .dark ? Color(red: 0.05, green: 0.12, blue: 0.20) : Color(red: 0.80, green: 0.92, blue: 1.0)
        case .jungle:
            return scheme == .dark ? Color(red: 0.08, green: 0.16, blue: 0.10) : Color(red: 0.88, green: 0.97, blue: 0.88)
        case .space:
            return scheme == .dark ? Color(red: 0.04, green: 0.05, blue: 0.10) : Color(red: 0.90, green: 0.92, blue: 1.00)
        }
    }

    func tokenSurface(for scheme: ColorScheme) -> Color {
        switch self {
        case .classic:
            return background(for: scheme)
        case .ocean:
            return scheme == .dark ? Color(red: 0.08, green: 0.18, blue: 0.28) : Color(red: 0.84, green: 0.95, blue: 1.0)
        case .jungle:
            return scheme == .dark ? Color(red: 0.12, green: 0.22, blue: 0.14) : Color(red: 0.90, green: 0.98, blue: 0.90)
        case .space:
            return scheme == .dark ? Color(red: 0.09, green: 0.10, blue: 0.18) : Color(red: 0.93, green: 0.94, blue: 1.0)
        }
    }
}

// MARK: - Layout preference keys
private struct GapPositionsKey: PreferenceKey, @unchecked Sendable {
    nonisolated(unsafe) static var defaultValue: [Int: CGFloat] = [:]
    static func reduce(value: inout [Int: CGFloat], nextValue: () -> [Int: CGFloat]) {
        value.merge(nextValue(), uniquingKeysWith: { _, new in new })
    }
}

private struct TokenPositionsKey: PreferenceKey, @unchecked Sendable {
    nonisolated(unsafe) static var defaultValue: [Int: CGFloat] = [:]
    static func reduce(value: inout [Int: CGFloat], nextValue: () -> [Int: CGFloat]) {
        value.merge(nextValue(), uniquingKeysWith: { _, new in new })
    }
}

// Lightweight tone player for short success beeps (no asset required)
private final class BeepPlayer {
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private var isPrepared = false

    func prepare() {
        guard !isPrepared else { return }
        // Configure session to allow quiet UI sounds that mix with others
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.ambient, options: [.mixWithOthers])
        try? session.setActive(true, options: [])

        engine.attach(player)
        let mixFormat = engine.mainMixerNode.outputFormat(forBus: 0)
        engine.connect(player, to: engine.mainMixerNode, format: mixFormat)
        engine.mainMixerNode.outputVolume = 1.0
        do { try engine.start(); isPrepared = true } catch { /* ignore */ }
    }

    func playSuccess(frequency: Double = 600, duration: Double = 0.12, volume: Float = 0.30) {
        prepare()
        let format = engine.mainMixerNode.outputFormat(forBus: 0)
        let sr = format.sampleRate
        let frames = AVAudioFrameCount(duration * sr)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames) else { return }
        buffer.frameLength = frames
        let thetaIncrement = 2.0 * Double.pi * frequency / sr
        var theta = 0.0
        if let chan = buffer.floatChannelData?[0] {
            for n in 0..<Int(frames) {
                // Simple sine with quick fade-in/out to avoid clicks
                let t = Double(n) / (Double(frames) - 1.0)
                let envelope = Float(min(t / 0.15, 1.0)) * Float(min((1.0 - t) / 0.2, 1.0))
                chan[n] = sin(Float(theta)) * volume * max(0.0, envelope)
                theta += thetaIncrement
            }
        }
        player.stop()
        player.volume = 1.0
        player.scheduleBuffer(buffer, at: nil, options: .interrupts, completionHandler: nil)
        if engine.isRunning {
            if !player.isPlaying { player.play() }
        } else {
            // Fallback to system sound if engine not running
            AudioServicesPlaySystemSound(1108) // Tink
        }
    }

    func playCelebration() {
        // A short ascending arpeggio (pleasant success cue)
        prepare()
        let format = engine.mainMixerNode.outputFormat(forBus: 0)
        let sr = format.sampleRate
        let notes: [(Double, Double, Float)] = [
            (520, 0.12, 0.28), (700, 0.12, 0.30), (900, 0.16, 0.32)
        ]
        var startTime: AVAudioTime? = nil
        for (freq, dur, vol) in notes {
            let frames = AVAudioFrameCount(dur * sr)
            guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames) else { continue }
            buffer.frameLength = frames
            let thetaIncrement = 2.0 * Double.pi * freq / sr
            var theta = 0.0
            if let chan = buffer.floatChannelData?[0] {
                for n in 0..<Int(frames) {
                    let t = Double(n) / (Double(frames) - 1.0)
                    let envelope = Float(min(t / 0.12, 1.0)) * Float(min((1.0 - t) / 0.25, 1.0))
                    chan[n] = sin(Float(theta)) * vol * max(0.0, envelope)
                    theta += thetaIncrement
                }
            }
            if startTime == nil { startTime = nil }
            player.scheduleBuffer(buffer, at: startTime, options: [], completionHandler: nil)
        }
        if engine.isRunning {
            if !player.isPlaying { player.play() }
        } else {
            AudioServicesPlaySystemSound(1114) // Tri-tone like
        }
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
    @Environment(\.dismiss) private var dismiss
    @State private var showConfetti: Bool = false
    @State private var showResetConfirm: Bool = false
    // Rewards & reactions
    @State private var mascotEmotion: String = "🙂"
    @State private var showStarBurst: Bool = false
    @State private var stickers: [String] = [] // earned sticker emojis
    // Theme
    @State private var theme: SentenceTheme = .classic
    // Tap-to-move support
    @State private var selectedIndex: Int? = nil
    @State private var draggingIndex: Int? = nil
    // Geometry caches (row coordinate space)
    @State private var gapCenters: [Int: CGFloat] = [:]
    @State private var tokenCenters: [Int: CGFloat] = [:]
    // Drag visual offset (for moving token with finger)
    @State private var dragOffsetX: CGFloat = 0
    // Anchor the token's original center when drag begins
    @State private var dragStartCenterX: CGFloat? = nil
    // Haptics
    @State private var hapticsEngine: CHHapticEngine? = nil
    // Beep player
    @State private var beepPlayer: BeepPlayer = BeepPlayer()
    // Sound FX toggle
    @State private var soundFxEnabled: Bool = true

    public init(assignmentId: String, configRef: String) {
        self.assignmentId = assignmentId
        self.configRef = configRef
    }

    public var body: some View {
        ZStack {
            theme.background(for: colorScheme)
            .ignoresSafeArea()
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 20) {
                    if !isLandscape && UIDevice.current.userInterfaceIdiom == .phone {
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
                    // Mascot reactions row
                    HStack(spacing: 8) {
                        Text(mascotEmotion).font(.system(size: 28))
                        if !stickers.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 6) {
                                    ForEach(stickers.indices, id: \.self) { i in
                                        Text(stickers[i]).font(.title3)
                                    }
                                }
                            }.frame(height: 24)
                        }
                        Spacer()
                    }
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

                                // Controls moved to bottom toolbar to avoid accidental taps near the sentence

                                if showHint {
                                    if let first = item.original.split(separator: " ").first {
                                        Text("💡 First word: \(first)")
                                            .foregroundColor(.orange)
                                            .font(.footnote)
                                    }
                                }
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
            // Global celebration overlay (avoids being clipped inside list)
            if showConfetti {
                VStack {
                    Spacer()
                    if #available(iOS 17.0, *) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 72, weight: .bold))
                            .foregroundColor(.yellow)
                            .symbolEffect(.bounce, options: .nonRepeating, value: showConfetti)
                            .transition(.scale)
                            .shadow(color: .yellow.opacity(0.6), radius: 16, x: 0, y: 8)
                    } else {
                        Image(systemName: "sparkles")
                            .font(.system(size: 72, weight: .bold))
                            .foregroundColor(.yellow)
                            .transition(.scale)
                            .shadow(color: .yellow.opacity(0.6), radius: 16, x: 0, y: 8)
                    }
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.black.opacity(0.0001))
                .allowsHitTesting(false)
            }
        }
        .navigationTitle("Sentence Sense")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadConfig() }
        .onDisappear { timer?.invalidate(); timer = nil }
        .onAppear { updateOrientation(); prepareHapticsIfNeeded(); beepPlayer.prepare() }
        .onReceive(NotificationCenter.default.publisher(for: UIDevice.orientationDidChangeNotification)) { _ in
            updateOrientation()
        }
        .toolbar {
            // Top-right: Reset
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    let gen = UIImpactFeedbackGenerator(style: .light)
                    gen.impactOccurred()
                    showResetConfirm = true
                } label: { Label("Reset", systemImage: "arrow.counterclockwise") }
            }
            // Bottom toolbar actions: show hint and speak
            ToolbarItemGroup(placement: .bottomBar) {
                if let cfg = config, cfg.showHints {
                    Button(showHint ? "Hint Shown" : "Show Hint") { showNextHint() }
                        .disabled(showHint)
                }
                Spacer()
                if let cfg = config, cfg.enableTTS, currentIndex < cfg.sentences.count {
                    Button("Speak Sentence") { speak(cfg.sentences[currentIndex].original) }
                }
                Spacer()
                // Sticker book quick view button (optional)
                if !stickers.isEmpty {
                    Text("Stickers: \(stickers.count)")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Button {
                    soundFxEnabled.toggle()
                } label: {
                    Label(soundFxEnabled ? "Sound On" : "Sound Off",
                          systemImage: soundFxEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill")
                }
                .accessibilityLabel("Toggle Sound Effects")
                Spacer()
                Menu {
                    Button("Classic") { theme = .classic }
                    Button("Ocean") { theme = .ocean }
                    Button("Jungle") { theme = .jungle }
                    Button("Space") { theme = .space }
                } label: {
                    Label("Theme", systemImage: "paintpalette.fill")
                }
            }
        }
        .alert("Reset sentence?", isPresented: $showResetConfirm) {
            Button("Reset", role: .destructive) { resetSentence() }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("This will reshuffle the current sentence.")
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
            let lift = max(28, fs * 1.4)
            let tokenVPad = max(5, fs * 0.45)
            let rowHeight = max(72, lift + tokenVPad * 2 + 28)
            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: max(0.0, fs * 0.01)) {
                        dropZone(at: 0, font: fs)
                        ForEach(Array(current.enumerated()), id: \.offset) { idx, token in
                            tokenView(token, index: idx, font: fs)
                            dropZone(at: idx + 1, font: fs)
                        }
                    }
                    .zIndex(0)
                    .padding(.horizontal, 12)
                    .padding(.top, lift)
                    .onAppear { dynamicFont = fs }
                    .onChange(of: current) { _ in dynamicFont = fs }
                    .coordinateSpace(name: "row")
                    .onPreferenceChange(GapPositionsKey.self) { centers in
                        // low-pass filter to reduce jitter in measurements during drag
                        if draggingIndex != nil {
                            var smoothed = gapCenters
                            for (k, v) in centers { smoothed[k] = (gapCenters[k] ?? v) * 0.6 + v * 0.4 }
                            gapCenters = smoothed
                        } else {
                            gapCenters = centers
                        }
                    }
                    .onPreferenceChange(TokenPositionsKey.self) { centers in
                        if draggingIndex != nil {
                            var smoothed = tokenCenters
                            for (k, v) in centers { smoothed[k] = (tokenCenters[k] ?? v) * 0.6 + v * 0.4 }
                            tokenCenters = smoothed
                        } else {
                            tokenCenters = centers
                        }
                    }
                }
                .modifier(ScrollDisableDuringDrag(disable: draggingIndex != nil))
                // Eat horizontal pan during drag so ScrollView cannot steal delta
                .simultaneousGesture(
                    draggingIndex != nil ? DragGesture(minimumDistance: 0).onChanged { _ in }.onEnded { _ in } : nil
                )
                .frame(minHeight: rowHeight)
                .onChange(of: activeDrop) { newValue in
                    // Avoid programmatic scroll while dragging to keep 1:1 fidelity
                    guard draggingIndex == nil else { return }
                    guard let pos = newValue else { return }
                    // Proactive autoscroll when near edges
                    if pos <= 1 {
                        withAnimation(.easeInOut(duration: 0.12)) {
                            proxy.scrollTo("gap-0", anchor: .leading)
                        }
                    } else if pos >= max(0, current.count - 1) {
                        withAnimation(.easeInOut(duration: 0.12)) {
                            proxy.scrollTo("gap-\(current.count)", anchor: .trailing)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
    }

    private func tokenView(_ token: String, index: Int, font: CGFloat) -> some View {
        VStack(spacing: 0) {
            Text(token)
                .font(.system(size: font, weight: .semibold))
                .padding(.vertical, max(5, font * 0.45))
                .padding(.horizontal, max(3, font * 0.15))
                .background(theme.tokenSurface(for: colorScheme))
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke((selectedIndex == index || draggingIndex == index) ? Color.accentColor : Color.clear, lineWidth: 2)
                )
                .shadow(color: (draggingIndex == index ? Color.black.opacity(0.18) : Color.clear), radius: 10, x: 0, y: 6)
                .rotationEffect(draggingIndex == index ? .degrees(-2) : .degrees(0))
                .scaleEffect(draggingIndex == index ? 1.05 : 1.0)
                .onTapGesture {
                    selectedIndex = index
                    let gen = UIImpactFeedbackGenerator(style: .rigid)
                    gen.impactOccurred()
                }
                .background(
                    GeometryReader { geo in
                        Color.clear
                            .preference(key: TokenPositionsKey.self, value: [index: geo.frame(in: .named("row")).midX])
                    }
                )
                .highPriorityGesture(
                    DragGesture(minimumDistance: 2, coordinateSpace: .named("row"))
                        .onChanged { value in
                            // When gesture begins, mark this token as being dragged
                            if draggingIndex == nil {
                                draggingIndex = index; selectedIndex = nil
                                dragOffsetX = 0
                                // Capture the token's original center once
                                dragStartCenterX = tokenCenters[index]
                            }
                            // 1:1 mapping: align token center to finger's absolute x in row space
                            if let startCenter = dragStartCenterX ?? tokenCenters[index] {
                                dragOffsetX = value.location.x - startCenter
                            } else {
                                dragOffsetX = value.translation.width
                            }
                            // Determine nearest gap using same absolute x
                            let nearest = nearestGap(forX: value.location.x, inFont: font)
                            if let nearest {
                                // Apply small hysteresis to prevent oscillation near midpoints
                                if let current = activeDrop, current != nearest, !gapCenters.isEmpty,
                                   let curX = gapCenters[current], let newX = gapCenters[nearest] {
                                    // Compute the dragged token's row-space X
                                    let baseX: CGFloat = value.location.x
                                    let curDist = abs(curX - baseX)
                                    let newDist = abs(newX - baseX)
                                    let hysteresis: CGFloat = 6
                                    if newDist + hysteresis < curDist {
                                        activeDrop = nearest
                                    }
                                } else {
                                    activeDrop = nearest
                                }
                            }
                        }
                        .onEnded { value in
                            if let from = draggingIndex {
                                // Finalize target from finger x to avoid nil activeDrop edge cases
                                let finalX = value.location.x
                                let finalTo = nearestGap(forX: finalX, inFont: font) ?? activeDrop ?? from
                                _ = performMove(from: from, to: finalTo)
                            }
                            clearDragState()
                            dragStartCenterX = nil
                        }
                )
        }
        .offset(x: draggingIndex == index ? dragOffsetX : 0)
        .offset(y: draggingIndex == index ? -max(28, font * 1.4) : 0)
        .zIndex(draggingIndex == index ? 50 : 1)
        // Do not attach drag to the text; selection starts from the handle below
    }

    private func dropZone(at position: Int, font: CGFloat) -> some View {
        let isActive = activeDrop == position
        let showLine = isActive || selectedIndex != nil || draggingIndex != nil
        let visualW = max(6, font * 0.05) // slightly wider for visibility
        let hitW = max(28, font * 0.45) // keep generous hit zone
        let hitH = max(32, font * 1.3)
        return Rectangle()
            .fill(Color.clear)
            .frame(width: visualW, height: max(28, font * 1.2))
            .overlay(
                Rectangle()
                    .fill(isActive ? Color.accentColor : Color.secondary.opacity(0.4))
                    .frame(width: showLine ? 2 : 0, height: max(22, font * 1.0))
            )
            .background(
                GeometryReader { geo in
                    Color.clear
                        .preference(key: GapPositionsKey.self, value: [position: geo.frame(in: .named("row")).midX])
                }
            )
            .id("gap-\(position)")
            // Large invisible interactive layer that does not affect layout
            .overlay(
                Color.clear
                    .frame(width: hitW, height: hitH)
                    .contentShape(Rectangle())
                    // High-priority tap to ensure click-drop always works
                    .highPriorityGesture(
                        TapGesture().onEnded {
                            guard let src = selectedIndex else { return }
                            activeDrop = position
                            _ = performMove(from: src, to: position)
                            selectedIndex = nil
                            activeDrop = nil
                        }
                    )
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
                    // Use simultaneous gesture so it doesn't preempt tap
                    .simultaneousGesture(
                        DragGesture(minimumDistance: 12)
                            .onChanged { _ in self.activeDrop = position }
                            .onEnded { _ in self.activeDrop = nil }
                    )
            )
            // Ghost tracker preview when a word is selected or being dragged
            .overlay(
                Group {
                    let ghostToken: String? = {
                        if let sel = selectedIndex, current.indices.contains(sel) { return current[sel] }
                        if let ds = dragSource {
                            switch ds {
                            case .row(let i):
                                if current.indices.contains(i) { return current[i] }
                                return draggingText
                            }
                        }
                        return draggingText
                    }()

                    if let ghost = ghostToken, showLine {
                        Text(ghost)
                            .font(.system(size: font, weight: .semibold))
                            .padding(.vertical, max(5, font * 0.45))
                            .padding(.horizontal, max(3, font * 0.15))
                            .background(theme.tokenSurface(for: colorScheme))
                            .cornerRadius(8)
                            .opacity(0.45)
                            .offset(y: -max(28, font * 1.6))
                            .allowsHitTesting(false)
                            .animation(.easeInOut(duration: 0.12), value: showLine)
                    }
                }
            )
            .zIndex(10)
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
        // Prefer internal drag if available
        if case .row(let src)? = dragSource {
            _ = performMove(from: src, to: position)
            clearDragState()
            return true
        }

        // Fallback: external provider text
        for provider in providers {
            if provider.canLoadObject(ofClass: NSString.self) {
                provider.loadObject(ofClass: NSString.self) { obj, _ in
                    // Convert to a Sendable value before hopping to the main actor
                    let text = (obj as? String) ?? ""
                    Task { @MainActor in
                        let token = text.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !token.isEmpty else { return }
                        let insertAt = max(0, min(position, current.count))
                        current.insert(token, at: insertAt)
                        moves += 1
                        if target.indices.contains(insertAt) {
                            if token != target[insertAt] { misses += 1 }
                        }
                        clearDragState()
                    }
                }
                return true
            }
        }
        activeDrop = nil
        return false
    }

    private func clearDragState() {
        draggingText = nil
        dragSource = nil
        hintScrambledIndex = nil
        activeDrop = nil
        selectedIndex = nil
        draggingIndex = nil
        dragOffsetX = 0
    }

    private func showQuickConfetti() {
        // Trigger confetti where supported
        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
            showConfetti = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            withAnimation(.easeInOut(duration: 0.35)) { showConfetti = false }
        }
        // Haptic feedback for successful sentence completion
        playSuccessHaptic()
        // Celebration sound (if enabled)
        if soundFxEnabled {
            beepPlayer.playCelebration()
        }
    }

    private func randomSticker() -> String {
        let all = ["⭐️","🌟","💫","🎖️","🏅","🌈","🐶","🐱","🐼","🦊","🦄","🚀","🎈","🍭","🍎"]
        return all.randomElement() ?? "⭐️"
    }

    // MARK: - Haptics
    private func prepareHapticsIfNeeded() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        do {
            let engine = try CHHapticEngine()
            hapticsEngine = engine
            try? engine.start()
            engine.resetHandler = { [weak hapticsEngine] in
                try? hapticsEngine?.start()
            }
        } catch {
            // fall back silently
        }
    }

    private func playSuccessHaptic() {
        if let engine = hapticsEngine {
            do {
                // Stronger pattern: two transients + short continuous buzz
                let p1 = CHHapticEventParameter(parameterID: .hapticIntensity, value: 1.0)
                let s1 = CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.9)
                let p2 = CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.8)
                let s2 = CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.7)
                let buzzIntensity = CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.6)
                let buzzSharp = CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.4)

                let e1 = CHHapticEvent(eventType: .hapticTransient, parameters: [p1, s1], relativeTime: 0)
                let e2 = CHHapticEvent(eventType: .hapticTransient, parameters: [p2, s2], relativeTime: 0.12)
                let e3 = CHHapticEvent(eventType: .hapticContinuous, parameters: [buzzIntensity, buzzSharp], relativeTime: 0.2, duration: 0.25)

                let pattern = try CHHapticPattern(events: [e1, e2, e3], parameters: [])
                let player = try engine.makePlayer(with: pattern)
                try player.start(atTime: 0)
                return
            } catch {
                // fall through to UIFeedback
            }
        }
        // Stronger fallback sequence
        let success = UINotificationFeedbackGenerator()
        success.prepare(); success.notificationOccurred(.success)
        let heavy = UIImpactFeedbackGenerator(style: .heavy)
        heavy.prepare(); heavy.impactOccurred(intensity: 1.0)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
            heavy.impactOccurred(intensity: 0.9)
        }
    }

    // Shared move logic for drag or tap-to-move
    @discardableResult
    private func performMove(from src: Int, to position: Int) -> Bool {
        var from = src
        var to = position
        if from == to || from + 1 == to { return false }
        let tokenMoved = current.remove(at: from)
        if from < to { to -= 1 }
        current.insert(tokenMoved, at: max(0, min(to, current.count)))
        moves += 1
        if target.indices.contains(to) {
            if tokenMoved != target[to] {
                misses += 1
            } else {
                // Correct placement ping
                if soundFxEnabled { beepPlayer.playSuccess() }
            }
        }
        if current == target {
            if let cfg = config, currentIndex + 1 < cfg.sentences.count {
                showQuickConfetti(); mascotEmotion = "🎉"; showStarBurst.toggle()
                if Int.random(in: 0..<3) == 0 { stickers.append(randomSticker()) }
                currentIndex += 1
                // Hold a bit longer so celebration is noticeable
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    startSentence()
                }
            } else {
                showQuickConfetti(); mascotEmotion = "🎉"
                if Int.random(in: 0..<2) == 0 { stickers.append(randomSticker()) }
                Task {
                    await saveAndFinish()
                    // Wait until the celebration completes before dismissing
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3.2) { dismiss() }
                }
            }
        }
        return true
    }

    // MARK: - Nearest gap helper
    private func nearestGap(forX x: CGFloat, inFont font: CGFloat) -> Int? {
        let gapCount = current.count + 1
        guard gapCount > 0 else { return nil }
        // Use measured gap centers if available
        if !gapCenters.isEmpty {
            var bestIndex = 0
            var bestDist = CGFloat.greatestFiniteMagnitude
            for i in 0..<gapCount {
                guard let gx = gapCenters[i] else { continue }
                let d = abs(gx - x)
                if d < bestDist { bestDist = d; bestIndex = i }
            }
            return bestIndex
        }
        // Fallback: even spacing if centers not measured yet
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene }).first?.keyWindow else { return nil }
        let totalWidth = window.bounds.width - 24
        let spacing = totalWidth / CGFloat(max(gapCount, 1))
        var bestIndex = 0
        var bestDist = CGFloat.greatestFiniteMagnitude
        for i in 0..<gapCount {
            let gx = spacing * CGFloat(i)
            let d = abs(gx - x)
            if d < bestDist { bestDist = d; bestIndex = i }
        }
        return bestIndex
    }

    private func nearestGap(fromGesture value: DragGesture.Value, forIndex index: Int, font: CGFloat) -> Int? {
        return nearestGap(forX: value.location.x, inFont: font)
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
            // Save user-scoped result only (server handles progress + high scores)
            let result = GameResult(
                assignmentId: assignmentId,
                gameType: "sentence-sense",
                misses: misses,
                score: nil,
                stats: ["sentences": config?.sentences.count ?? 0]
            )
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

// Prevent horizontal ScrollView from intercepting drag to ensure 1:1 token movement
private struct ScrollDisableDuringDrag: ViewModifier {
    let disable: Bool
    func body(content: Content) -> some View {
        if #available(iOS 16.0, *) {
            content.scrollDisabled(disable)
        } else {
            content
        }
    }
}


