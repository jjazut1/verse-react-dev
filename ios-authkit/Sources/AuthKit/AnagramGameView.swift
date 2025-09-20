import SwiftUI
import AVFoundation

// Minimal Swift anagram game based on userGameConfigs schema
struct AnagramConfigModel {
    struct Item: Identifiable {
        let id: String
        let original: String
        let definition: String?
    }
    let title: String
    let showHints: Bool
    let showDefinitions: Bool
    let enableTTS: Bool
    let items: [Item]

    static func from(dict: [String: Any]) -> AnagramConfigModel? {
        guard let type = dict["type"] as? String, type == "anagram" else { return nil }
        let title = (dict["title"] as? String) ?? "Anagram"
        let showHints = (dict["enableHints"] as? Bool) ?? (dict["showHints"] as? Bool ?? true)
        let showDefinitions = (dict["showDefinitions"] as? Bool) ?? false
        let enableTTS = (dict["enableTextToSpeech"] as? Bool) ?? true
        let arr = (dict["anagrams"] as? [[String: Any]] ?? []).map { m in
            Item(id: (m["id"] as? String) ?? UUID().uuidString,
                 original: (m["original"] as? String) ?? "",
                 definition: m["definition"] as? String)
        }.filter { !$0.original.isEmpty }
        return AnagramConfigModel(title: title, showHints: showHints, showDefinitions: showDefinitions, enableTTS: enableTTS, items: arr)
    }
}

public struct AnagramGameView: View {
    public let assignmentId: String
    public let configRef: String
    @State private var config: AnagramConfigModel?
    @State private var error: String?
    @State private var currentIndex: Int = 0
    @State private var scrambled: [String] = []
    @State private var answer: [String] = []
    @State private var misses: Int = 0
    @State private var showHint = false
    @State private var showDefinition = false
    private let configService = UserGameConfigService()
    private let resultsService = ResultsService()
    private let speechSynth = AVSpeechSynthesizer()

    public init(assignmentId: String, configRef: String) {
        self.assignmentId = assignmentId
        self.configRef = configRef
    }

    public var body: some View {
        ZStack {
            // Light blue play surface
            Color(red: 0.93, green: 0.96, blue: 1.0)
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 20) {
                    if let error { Text(error).foregroundColor(.red) }

                    if let cfg = config, currentIndex < cfg.items.count {
                        let item = cfg.items[currentIndex]

                        HStack { // center container horizontally
                            Spacer(minLength: 0)
                            VStack(alignment: .leading, spacing: 14) {
                                Text(cfg.title)
                                    .font(.title3).bold()
                                    .padding(.horizontal, 4)

                                Text("Scrambled Letters").font(.caption).foregroundColor(.secondary)
                                flowGrid(scrambled, fromScrambled: true)

                                Text("Your Answer").font(.caption).foregroundColor(.secondary)
                                flowGrid(answer, fromScrambled: false)

                                if cfg.showDefinitions, let def = item.definition, !def.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                    DisclosureGroup(isExpanded: $showDefinition) {
                                        definitionView(def)
                                    } label: {
                                        Text("Definition").font(.subheadline).bold()
                                    }
                                    .padding(12)
                                    .background(RoundedRectangle(cornerRadius: 10).fill(Color(UIColor.systemBackground)))
                                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.gray.opacity(0.2)))
                                }

                                HStack(spacing: 12) {
                                    if cfg.showHints {
                                        Button(showHint ? "Hint Shown" : "Show Hint") { showHint = true }
                                            .buttonStyle(.bordered)
                                            .disabled(showHint)
                                    }
                                    if cfg.enableTTS {
                                        Button("Speak Word") { speak(item.original) }
                                            .buttonStyle(.bordered)
                                    }
                                    Button("Reset") { resetWord() }
                                        .buttonStyle(.borderedProminent)
                                }
                                .padding(.top, 8)
                                .frame(maxWidth: .infinity, alignment: .leading)

                                if showHint {
                                    Text("💡 First letter: \(item.original.first.map{String($0)} ?? "")")
                                        .foregroundColor(.orange)
                                        .font(.footnote)
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
                        }
                        .padding(.top, 40)
                    } else {
                        ProgressView().padding(.top, 40)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
        }
        .navigationTitle("Anagram")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadConfig() }
    }

    private func loadConfig() async {
        do {
            let data = try await configService.loadConfig(fromPath: configRef)
            guard let cfg = AnagramConfigModel.from(dict: data) else {
                error = "Invalid config"
                return
            }
            config = cfg
            startWord()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func startWord() {
        guard let cfg = config, currentIndex < cfg.items.count else { return }
        let word = cfg.items[currentIndex].original
        answer = Array(repeating: "", count: word.count)
        scrambled = scramble(word)
        showHint = false
    }

    private func resetWord() { startWord() }

    private func scramble(_ text: String) -> [String] {
        let letters = text.replacingOccurrences(of: "[^A-Za-z]", with: "", options: .regularExpression).map { String($0) }
        var arr = letters
        for i in stride(from: arr.count - 1, through: 1, by: -1) {
            let j = Int.random(in: 0...i)
            arr.swapAt(i, j)
        }
        return arr
    }

    // MARK: - UI helpers
    private func flowGrid(_ letters: [String], fromScrambled: Bool) -> some View {
        let count = max(letters.count, 1)
        let spacing: CGFloat = 8
        let screenW = UIScreen.main.bounds.width
        // Estimated content width = min(card, screen - outer paddings)
        let containerWidth = min(700, screenW - 32) - 40 // 32: Scroll padding, 40: card inner padding
        let widthTile = floor((containerWidth - spacing * CGFloat(count - 1)) / CGFloat(count))
        let minTile: CGFloat = 28
        let maxTile: CGFloat = 64
        let tile = max(minTile, min(widthTile, maxTile))

        return HStack(spacing: spacing) {
            ForEach(Array(letters.enumerated()), id: \.offset) { idx, ch in
                let isEmpty = ch.isEmpty
                Text(isEmpty ? " " : ch)
                    .font(.system(size: tile * 0.42, weight: .bold))
                    .frame(width: tile, height: tile)
                    .background(isEmpty ? Color.gray.opacity(0.15) : Color.white)
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(fromScrambled ? Color.blue.opacity(0.6) : Color.green.opacity(0.6), lineWidth: 2))
                    .cornerRadius(10)
                    .onTapGesture { tapLetter(index: idx, fromScrambled: fromScrambled) }
            }
        }
        .frame(maxWidth: .infinity, minHeight: tile, alignment: .center)
    }

    private func tapLetter(index: Int, fromScrambled: Bool) {
        guard var cfg = config, currentIndex < cfg.items.count else { return }
        let word = cfg.items[currentIndex].original
        if fromScrambled {
            let ch = scrambled[index]
            guard !ch.isEmpty else { return }
            // place in first empty slot
            if let pos = answer.firstIndex(of: "") {
                answer[pos] = ch
                scrambled[index] = ""
                // check sequential correctness
                let correctChar = String(word[word.index(word.startIndex, offsetBy: pos)])
                if ch.lowercased() != correctChar.lowercased() { misses += 1 }
                checkCompletion()
            }
        } else {
            let ch = answer[index]
            guard !ch.isEmpty else { return }
            if let pos = scrambled.firstIndex(of: "") { scrambled[pos] = ch; answer[index] = "" }
        }
    }

    private func checkCompletion() {
        guard let cfg = config else { return }
        let word = cfg.items[currentIndex].original
        let assembled = answer.joined()
        if assembled.count == word.count {
            if assembled.lowercased() == word.lowercased() {
                // next word or finish
                if currentIndex + 1 < cfg.items.count {
                    currentIndex += 1
                    startWord()
                } else {
                    Task { await saveAndFinish() }
                }
            } else {
                // count as miss and reset
                misses += 1
                resetWord()
            }
        }
    }

    private func saveAndFinish() async {
        do {
            let result = GameResult(assignmentId: assignmentId, gameType: "anagram", score: misses, stats: ["words": config?.items.count ?? 0])
            try await resultsService.saveWithRetry(result)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func definitionView(_ html: String) -> some View {
        let attributed: AttributedString = {
            if let data = html.data(using: .utf8),
               let ns = try? NSAttributedString(data: data, options: [.documentType: NSAttributedString.DocumentType.html], documentAttributes: nil) {
                return AttributedString(ns)
            }
            return AttributedString(html)
        }()
        return Text(attributed).font(.callout)
            .frame(maxWidth: .infinity, alignment: .leading)
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


