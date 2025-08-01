import { useState, useEffect } from 'react';
import { GameConfig } from '../../../types/game';
import { SpinnerWheelItem, GameState, ZoomTarget } from './types';
import { getItemColors, getSegmentAtPointer, getSegmentCenterAngle, calculateZoomTarget } from './utils';
import { useAudio } from './useAudio';

export const useGameLogic = (onGameComplete: (score: number) => void, config: GameConfig) => {
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    items: [],
    selected: null,
    spinning: false,
    rotation: 0,
    spinCount: 0,
    gameComplete: false,
    selectionHistory: [],
    isZoomed: false,
    zoomTarget: { x: 0, y: 0, segmentIndex: 0 }
  });

  // Audio hook
  const audio = useAudio();

  // Initialize items from config
  useEffect(() => {
    if (config && (config as any).items) {
      const configItems = (config as any).items as SpinnerWheelItem[];
      console.log('🎮 [useGameLogic] Raw config items received:', configItems);
      console.log('🎮 [useGameLogic] First item details:', configItems[0]);
      console.log('🎮 [useGameLogic] First item has content field:', !!configItems[0]?.content);
      
      const theme = (config as any).wheelTheme || 'primaryColors';
      const customColors = (config as any).customColors;
      
      const itemsWithColors = getItemColors(configItems, theme, customColors);
      console.log('🎮 [useGameLogic] Items after color processing:', itemsWithColors);
      console.log('🎮 [useGameLogic] First processed item:', itemsWithColors[0]);
      
      setGameState(prev => ({ ...prev, items: itemsWithColors }));
    }
  }, [config]);

  // Check if game is complete
  useEffect(() => {
    const maxSpins = (config as any).maxSpins || 0;
    if (maxSpins > 0 && gameState.spinCount >= maxSpins && !gameState.gameComplete) {
      setGameState(prev => ({ ...prev, gameComplete: true }));
      onGameComplete(gameState.spinCount);
    }
  }, [gameState.spinCount, config, onGameComplete, gameState.gameComplete]);

  const spin = async () => {
    if (gameState.items.length < 2 || gameState.spinning || gameState.gameComplete) return;
    
    // Ensure audio is ready
    await audio.ensureAudioReady();
    
    // Check max spins limit
    const maxSpins = (config as any).maxSpins || 0;
    if (maxSpins > 0 && gameState.spinCount >= maxSpins) {
      setGameState(prev => ({ ...prev, gameComplete: true }));
      onGameComplete(gameState.spinCount);
      return;
    }

    setGameState(prev => ({ ...prev, spinning: true }));
    
    // Ensure we're using current items state
    const currentItems = gameState.items;
    const spins = 5 + Math.floor(Math.random() * 3);
    
    // Animate the wheel rotation
    const duration = 3000; // 3 seconds
    
    // Start clicking sound
    audio.startClickingSound(duration, currentItems.length);
    
    // Randomly select winning segment
    const winnerIndex = Math.floor(Math.random() * currentItems.length);
    
    // Calculate segment center angle using the same function as pointer detection
    const segmentCenterAngle = getSegmentCenterAngle(winnerIndex, currentItems.length);
    
    // Calculate where this segment currently is (after existing rotation)
    const currentSegmentPosition = (segmentCenterAngle + gameState.rotation) % 360;
    
    // Calculate how much additional rotation is needed to reach 180°
    const targetPosition = 180;
    let rotationNeeded = (targetPosition - currentSegmentPosition + 360) % 360;
    
    // Add full spins for visual effect, then the exact alignment needed
    const totalSpinRotation = 360 * spins;
    const finalRotation = gameState.rotation + totalSpinRotation + rotationNeeded;
    
    console.log('=== SPIN CALCULATION ===');
    console.log(`Winner: "${currentItems[winnerIndex]?.text}" (index ${winnerIndex})`);
    console.log(`Segment center: ${segmentCenterAngle.toFixed(1)}°`);
    console.log(`Current position: ${currentSegmentPosition.toFixed(1)}°`);
    console.log(`Rotation needed: ${rotationNeeded.toFixed(1)}°`);
    console.log(`Final rotation: ${finalRotation.toFixed(1)}°`);
    console.log('=======================');

    // Animate the wheel rotation
    const startTime = Date.now();
    const startRotation = gameState.rotation;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic for smooth deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + (finalRotation - startRotation) * easedProgress;
      
      setGameState(prev => ({ ...prev, rotation: currentRotation }));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete - no correction needed, animation should end perfectly
        setGameState(prev => ({ ...prev, rotation: finalRotation }));
        
        // Spinning complete - determine which segment is at the pointer
        const actualSegmentAtPointer = getSegmentAtPointer(finalRotation, currentItems);
        const winner = currentItems[actualSegmentAtPointer];
        
        console.log('=== SPIN COMPLETE ===');
        console.log(`Final winner: "${winner?.text}" (intended: "${currentItems[winnerIndex]?.text}")`);
        console.log(`Final rotation: ${finalRotation.toFixed(1)}°`);
        console.log('=====================');
        
        // Calculate zoom target - use default wheelSize for now since it's not passed to this hook
        // TODO: In a future refactor, wheelSize could be passed to useGameLogic for better accuracy
        const defaultWheelSize = 480;
        const zoomCoords = calculateZoomTarget(actualSegmentAtPointer, defaultWheelSize);
        
        setGameState(prev => ({
          ...prev,
          spinning: false,
          selected: winner.text,
          selectionHistory: [...prev.selectionHistory, winner.text],
          spinCount: prev.spinCount + 1,
          zoomTarget: zoomCoords
        }));
        
        // Trigger zoom after a brief pause for dramatic effect
        setTimeout(() => {
          setGameState(prev => ({ ...prev, isZoomed: true }));
        }, 500);
        
        audio.stopClickingSounds();
      }
    };
    
    requestAnimationFrame(animate);
  };

  const handleZoomOut = () => {
    setGameState(prev => ({
      ...prev,
      isZoomed: false,
      zoomTarget: { x: 0, y: 0, segmentIndex: 0 }
    }));
  };

  const removeSelectedItem = () => {
    if (!gameState.selected) return;
    
    // Find and remove the selected item
    const updatedItems = gameState.items.filter(item => item.text !== gameState.selected);
    
    // Add to history if not already there
    const updatedHistory = gameState.selectionHistory.includes(gameState.selected)
      ? gameState.selectionHistory
      : [...gameState.selectionHistory, gameState.selected];
    
    setGameState(prev => ({
      ...prev,
      items: updatedItems,
      selected: null,
      selectionHistory: updatedHistory,
      rotation: 0,
      isZoomed: false,
      zoomTarget: { x: 0, y: 0, segmentIndex: 0 }
    }));
  };

  const resetGame = () => {
    if (config && (config as any).items) {
      const configItems = (config as any).items as SpinnerWheelItem[];
      const theme = (config as any).wheelTheme || 'primaryColors';
      const customColors = (config as any).customColors;
      
      const itemsWithColors = getItemColors(configItems, theme, customColors);
      
      setGameState({
        items: itemsWithColors,
        selected: null,
        spinning: false,
        rotation: 0,
        spinCount: 0,
        gameComplete: false,
        selectionHistory: [],
        isZoomed: false,
        zoomTarget: { x: 0, y: 0, segmentIndex: 0 }
      });
    }
    
    audio.stopClickingSounds();
  };

  return {
    ...gameState,
    spin,
    handleZoomOut,
    removeSelectedItem,
    resetGame
  };
}; 