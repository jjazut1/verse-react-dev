import React, { useState, useEffect, useRef } from 'react';
import './WordSentenceMode.css';

interface WordSentenceModeProps {
  anagram: {
    id: string;
    original: string;
    definition?: string;
  };
  onComplete: (isCorrect: boolean, attempts: number) => void;
  onHintUsed: () => void;
  showDefinition: boolean;
  enableHints: boolean;
  correctFeedbackDuration?: 'always' | 'momentary';
}

interface Word {
  id: string;
  text: string;
  originalIndex: number;
  currentIndex: number;
  isCorrect: boolean;
}

const WordSentenceMode: React.FC<WordSentenceModeProps> = ({
  anagram,
  onComplete,
  onHintUsed,
  showDefinition,
  enableHints,
  correctFeedbackDuration = 'momentary'
}) => {
  const [words, setWords] = useState<Word[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintWordIndex, setHintWordIndex] = useState<number | null>(null);
  
  // New state for temporary visual feedback
  const [showingCorrect, setShowingCorrect] = useState<Set<string>>(new Set());
  
  const containerRef = useRef<HTMLDivElement>(null);
  const correctTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Click-move-click drag state
  const [draggedWord, setDraggedWord] = useState<Word | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    initializeGame();
    
    // Cleanup timeouts on unmount
    return () => {
      correctTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      correctTimeoutsRef.current.clear();
    };
  }, [anagram.id]); // Only reinitialize when the anagram ID changes

  // Global mouse move handler for dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (event: MouseEvent) => {
        setMousePosition({ x: event.clientX, y: event.clientY });
      };
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      return () => document.removeEventListener('mousemove', handleGlobalMouseMove);
    }
  }, [isDragging]);

  const initializeGame = () => {
    // Clear any existing timeouts
    correctTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    correctTimeoutsRef.current.clear();
    setShowingCorrect(new Set());
    
    // Split the original sentence into words
    const originalWords = anagram.original.trim().split(/\s+/);
    
    // Create word objects with original positions
    const wordObjects: Word[] = originalWords.map((word, index) => ({
      id: `word-${index}`,
      text: word,
      originalIndex: index,
      currentIndex: index,
      isCorrect: false
    }));

    // Shuffle the words
    const shuffledWords = [...wordObjects];
    for (let i = shuffledWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
      // Update current indices
      shuffledWords[i].currentIndex = i;
      shuffledWords[j].currentIndex = j;
    }

    setWords(shuffledWords);
    setMoveCount(0);
    setStartTime(null);
    setGameStarted(false);
    setIsComplete(false);
    setShowHint(false);
    setHintWordIndex(null);
    
    // Reset drag state
    setDraggedWord(null);
    setIsDragging(false);
  };

  const startGame = () => {
    if (!gameStarted) {
      setGameStarted(true);
      setStartTime(Date.now());
    }
  };

  const showTemporaryCorrectFeedback = (wordId: string) => {
    // Clear any existing timeout for this word
    const existingTimeout = correctTimeoutsRef.current.get(wordId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Add word to showing correct set
    setShowingCorrect(prev => new Set([...prev, wordId]));
    
    // Only set timeout for momentary feedback
    if (correctFeedbackDuration === 'momentary') {
      const timeout = setTimeout(() => {
        setShowingCorrect(prev => {
          const newSet = new Set(prev);
          newSet.delete(wordId);
          return newSet;
        });
        correctTimeoutsRef.current.delete(wordId);
      }, 1000);
      
      correctTimeoutsRef.current.set(wordId, timeout);
    }
  };

  const handleWordClick = (word: Word, e: React.MouseEvent) => {
    e.stopPropagation();
    startGame();
    
    if (!isDragging && !isComplete) {
      // Start dragging this word
      setDraggedWord(word);
      setIsDragging(true);
      setMousePosition({ x: e.clientX, y: e.clientY });
    } else if (isDragging && draggedWord && draggedWord.id !== word.id) {
      // Swap words if dropping on another word
      swapWords(draggedWord, word);
      setDraggedWord(null);
      setIsDragging(false);
    }
  };

  const handleGameAreaClick = (e: React.MouseEvent) => {
    if (isDragging && draggedWord) {
      // Check if clicking in the sentence area but not on a word
      const sentenceContainer = containerRef.current;
      if (sentenceContainer) {
        const rect = sentenceContainer.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        
        // If clicking within the sentence container, try to move word to end
        if (clickX >= rect.left && clickX <= rect.right && 
            clickY >= rect.top && clickY <= rect.bottom) {
          moveWordToEnd(draggedWord);
          setDraggedWord(null);
          setIsDragging(false);
          return;
        }
      }
      
      // Otherwise cancel drag
      setDraggedWord(null);
      setIsDragging(false);
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging && draggedWord) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  };

  const swapWords = (draggedWord: Word, targetWord: Word) => {
    const draggedIndex = words.findIndex(w => w.id === draggedWord.id);
    const targetIndex = words.findIndex(w => w.id === targetWord.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new words array with swapped positions
    const newWords = [...words];
    
    // Swap the words
    [newWords[draggedIndex], newWords[targetIndex]] = 
    [newWords[targetIndex], newWords[draggedIndex]];
    
    // Update current indices
    newWords[draggedIndex].currentIndex = draggedIndex;
    newWords[targetIndex].currentIndex = targetIndex;

    // Check correctness for each word and manage feedback
    newWords.forEach((word, index) => {
      const wasCorrect = word.isCorrect;
      word.isCorrect = word.originalIndex === index;
      
      if (correctFeedbackDuration === 'always') {
        // For always mode, update showingCorrect to match current correctness
        if (word.isCorrect) {
          setShowingCorrect(prev => new Set([...prev, word.id]));
        } else {
          setShowingCorrect(prev => {
            const newSet = new Set(prev);
            newSet.delete(word.id);
            return newSet;
          });
        }
      } else {
        // For momentary mode, show temporary feedback if word just became correct
        if (!wasCorrect && word.isCorrect) {
          showTemporaryCorrectFeedback(word.id);
        }
      }
    });

    setWords(newWords);
    setMoveCount(prev => prev + 1);

    // Check if game is complete
    const allCorrect = newWords.every(word => word.isCorrect);
    if (allCorrect && !isComplete) {
      setIsComplete(true);
      const endTime = Date.now();
      const totalTime = startTime ? Math.round((endTime - startTime) / 1000) : 0;
      
      setTimeout(() => {
        onComplete(true, moveCount + 1);
      }, 1500); // Delay to show the completion state
    }
  };

  const moveWordToEnd = (draggedWord: Word) => {
    const draggedIndex = words.findIndex(w => w.id === draggedWord.id);
    if (draggedIndex === -1) return;

    // Create new words array with the dragged word moved to the end
    const newWords = [...words];
    const wordToMove = newWords.splice(draggedIndex, 1)[0];
    newWords.push(wordToMove);
    
    // Update current indices and check correctness
    newWords.forEach((word, index) => {
      const wasCorrect = word.isCorrect;
      word.currentIndex = index;
      word.isCorrect = word.originalIndex === index;
      
      if (correctFeedbackDuration === 'always') {
        // For always mode, update showingCorrect to match current correctness
        if (word.isCorrect) {
          setShowingCorrect(prev => new Set([...prev, word.id]));
        } else {
          setShowingCorrect(prev => {
            const newSet = new Set(prev);
            newSet.delete(word.id);
            return newSet;
          });
        }
      } else {
        // For momentary mode, show temporary feedback if word just became correct
        if (!wasCorrect && word.isCorrect) {
          showTemporaryCorrectFeedback(word.id);
        }
      }
    });

    setWords(newWords);
    setMoveCount(prev => prev + 1);

    // Check if game is complete
    const allCorrect = newWords.every(word => word.isCorrect);
    if (allCorrect && !isComplete) {
      setIsComplete(true);
      const endTime = Date.now();
      const totalTime = startTime ? Math.round((endTime - startTime) / 1000) : 0;
      
      setTimeout(() => {
        onComplete(true, moveCount + 1);
      }, 1500); // Delay to show the completion state
    }
  };

  const handleHint = () => {
    if (!enableHints || showHint) return;
    
    onHintUsed();
    
    // Find the first word that's not in the correct position
    const incorrectWordIndex = words.findIndex(word => !word.isCorrect);
    
    if (incorrectWordIndex !== -1) {
      setHintWordIndex(incorrectWordIndex);
      setShowHint(true);
      
      // Auto-hide hint after 3 seconds
      setTimeout(() => {
        setShowHint(false);
        setHintWordIndex(null);
      }, 3000);
    }
  };

  const handleReset = () => {
    initializeGame();
  };

  const getWordClassName = (word: Word, index: number) => {
    let className = 'draggable-word';
    
    // Only show correct styling if the word is in the showingCorrect set
    if (word.isCorrect && showingCorrect.has(word.id)) {
      className += ' correct';
    }
    
    if (draggedWord && draggedWord.id === word.id) {
      className += ' dragging-source';
    }
    
    if (showHint && hintWordIndex === index) {
      className += ' hint-highlight';
    }
    
    return className;
  };

  const getElapsedTime = () => {
    if (!startTime) return 0;
    return Math.round((Date.now() - startTime) / 1000);
  };

  return (
    <div 
      className="word-sentence-mode"
      onMouseMove={handleMouseMove}
      onClick={handleGameAreaClick}
    >
      <div className="game-header">
      </div>

      {/* Game Statistics */}
      <div className="game-stats">
        <div className="stat-item">
          <span className="stat-label">Moves:</span>
          <span className="stat-value">{moveCount}</span>
        </div>
        {gameStarted && (
          <div className="stat-item">
            <span className="stat-label">Time:</span>
            <span className="stat-value">{getElapsedTime()}s</span>
          </div>
        )}
      </div>

      {/* Sentence Area - Single horizontal line */}
      <div className="sentence-container" ref={containerRef}>
        <div className="sentence-line">
          {words.map((word, index) => (
            <span
              key={word.id}
              className={getWordClassName(word, index)}
              onClick={(e) => handleWordClick(word, e)}
              title={isComplete ? '' : 'Click to pick up, click another word to swap'}
              style={{
                opacity: draggedWord && draggedWord.id === word.id ? 0.3 : 1,
                cursor: isComplete ? 'default' : 'pointer'
              }}
            >
              {word.text}
            </span>
          ))}
        </div>
      </div>

      {/* Ghost word that follows mouse */}
      {isDragging && draggedWord && (
        <div
          style={{
            position: 'fixed',
            left: mousePosition.x - 30,
            top: mousePosition.y - 15,
            background: 'rgba(255, 255, 255, 0.95)',
            border: '2px solid #007bff',
            borderRadius: '8px',
            padding: '5px 10px',
            fontSize: 'clamp(1rem, 4vw, 1.4rem)',
            fontWeight: 'bold',
            color: '#007bff',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transform: 'rotate(-2deg)',
            whiteSpace: 'nowrap'
          }}
        >
          {draggedWord.text}
        </div>
      )}

      {/* Hint Display */}
      {showHint && hintWordIndex !== null && (
        <div className="hint-area">
          <p>
            💡 The word "<strong>{words[hintWordIndex].text}</strong>" belongs in position {words[hintWordIndex].originalIndex + 1}
          </p>
        </div>
      )}

      {/* Game Controls */}
      <div className="game-controls">
        {enableHints && !isComplete && !showHint && (
          <button 
            className="hint-button"
            onClick={handleHint}
          >
            Show Hint
          </button>
        )}
        
        <button 
          className="reset-button"
          onClick={handleReset}
          disabled={isComplete}
        >
          Reset
        </button>
      </div>

      {/* Completion Message */}
      {isComplete && (
        <div className="completion-message">
          <h3>🎉 Perfect! You arranged the sentence correctly!</h3>
          <div className="completion-stats">
            <p>Completed in <strong>{moveCount}</strong> moves and <strong>{getElapsedTime()}</strong> seconds</p>
            <p><em>Fewer moves = better score!</em></p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordSentenceMode; 