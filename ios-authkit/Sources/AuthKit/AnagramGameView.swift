import SwiftUI

// Minimal Swift anagram game based on userGameConfigs schema
struct AnagramConfigModel {
    struct Item: Identifiable {
        let id: String
        let original: String
        let definition: String?
    }
    let title: String
    let showHints: Bool
    let enableTTS: Bool
    let items: [Item]

    static func from(dict: [String: Any]) -> AnagramConfigModel? {
        guard let type = dict["type"] as? String, type == "anagram" else { return nil }
        let title = (dict["title"] as? String) ?? "Anagram"
        let showHints = (dict["enableHints"] as? Bool) ?? (dict["showHints"] as? Bool ?? true)
        let enableTTS = (dict["enableTextToSpeech"] as? Bool) ?? true
        let arr = (dict["anagrams"] as? [[String: Any]] ?? []).map { m in
            Item(id: (m["id"] as? String) ?? UUID().uuidString,
                 original: (m["original"] as? String) ?? "",
                 definition: m["definition"] as? String)
        }.filter { !$0.original.isEmpty }
        return AnagramConfigModel(title: title, showHints: showHints, enableTTS: enableTTS, items: arr)
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
    private let configService = UserGameConfigService()
    private let resultsService = ResultsService()

    public init(assignmentId: String, configRef: String) {
        self.assignmentId = assignmentId
        self.configRef = configRef
    }

    public var body: some View {
        VStack(spacing: 16) {
            Text(config?.title ?? "Anagram").font(.title2).bold()
            if let error { Text(error).foregroundColor(.red) }

            if let cfg = config, currentIndex < cfg.items.count {
                let item = cfg.items[currentIndex]
                VStack(spacing: 12) {
                    Text("Scrambled Letters").font(.caption).foregroundColor(.secondary)
                    flowGrid(scrambled, fromScrambled: true)
                    Text("Your Answer").font(.caption).foregroundColor(.secondary)
                    flowGrid(answer, fromScrambled: false)
                    HStack(spacing: 12) {
                        if cfg.showHints { Button(showHint ? "Hint Shown" : "Show Hint") { showHint = true } .disabled(showHint) }
                        Button("Reset") { resetWord() }
                    }
                    if showHint { Text("First letter: \(item.original.first.map{String($0)} ?? "")").foregroundColor(.orange) }
                    Text("Misses: \(misses)").font(.footnote).foregroundColor(.secondary)
                }
            } else if config != nil {
                VStack(spacing: 12) {
                    Image(systemName: "checkmark.seal.fill").foregroundColor(.green).font(.largeTitle)
                    Text("Great job! Saving your result...")
                }
            } else {
                ProgressView()
            }
            Spacer()
        }
        .padding()
        .navigationTitle("Anagram")
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
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(letters.enumerated()), id: \.offset) { idx, ch in
                    let isEmpty = ch.isEmpty
                    Text(isEmpty ? " " : ch)
                        .font(.title3).bold()
                        .frame(width: 44, height: 44)
                        .background(isEmpty ? Color.gray.opacity(0.15) : Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 6).stroke(fromScrambled ? Color.blue.opacity(0.6) : Color.green.opacity(0.6), lineWidth: 2))
                        .cornerRadius(6)
                        .onTapGesture { tapLetter(index: idx, fromScrambled: fromScrambled) }
                }
            }
        }
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
}


