import React, { useState, useEffect, useRef } from 'react';
import { Box, VStack, HStack, Text, Button, Heading, Center } from '@chakra-ui/react';
import { GameConfig } from '../../../types/game';

interface SpinnerWheelProps {
  onGameComplete: (score: number) => void;
  config: GameConfig;
}

interface SpinnerWheelItem {
  id: string;
  text: string;
  color: string;
}

const SpinnerWheel: React.FC<SpinnerWheelProps> = ({
  onGameComplete,
  config
}) => {
  const [items, setItems] = useState<SpinnerWheelItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinCount, setSpinCount] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [selectionHistory, setSelectionHistory] = useState<string[]>([]);
  
  // Zoom state for dramatic winner reveal
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomTarget, setZoomTarget] = useState({ x: 0, y: 0, segmentIndex: 0 });
  
  // Add audio context and click generation
  const audioContextRef = useRef<AudioContext | null>(null);
  const clickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize items from config
  useEffect(() => {
    if (config && (config as any).items) {
      setItems((config as any).items);
    }
  }, [config]);

  // Initialize audio context
  useEffect(() => {
    // Create audio context on first user interaction
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    
    // Add click listener to initialize audio on first interaction
    document.addEventListener('click', initAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', initAudio);
      if (clickIntervalRef.current) {
        clearInterval(clickIntervalRef.current);
      }
    };
  }, []);

  // Color themes
  const colorThemes = {
    primaryColors: ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
    pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E1BAFF', '#FFBADB', '#C9BAFF'],
    bright: ['#FF0000', '#FF8800', '#FFFF00', '#88FF00', '#00FF00', '#00FF88', '#00FFFF', '#0088FF'],
    patriotic: ['#DC143C', '#FFFFFF', '#000080', '#FF0000', '#87CEEB', '#4169E1', '#C0C0C0', '#191970'],
    greenShades: ['#90EE90', '#32CD32', '#228B22', '#006400', '#2E8B57', '#6B8E23', '#00FF7F', '#ADFF2F'],
    desert: ['#F4A460', '#D2B48C', '#F5F5DC', '#A0522D', '#B7410E', '#FF8C00', '#E2725B', '#C3B091'],
    ocean: ['#ADD8E6', '#87CEEB', '#00BFFF', '#40E0D0', '#008080', '#000080', '#00FFFF', '#4682B4'],
    sunset: ['#FFC0CB', '#FF7F50', '#FFA500', '#FFD700', '#FFFF00', '#FF6347', '#DDA0DD', '#E6E6FA'],
    custom: (config as any).customColors || ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
  };

  const getItemColors = () => {
    const theme = (config as any).wheelTheme || 'primaryColors';
    const themeColors = colorThemes[theme as keyof typeof colorThemes];
    return items.map((item, index) => ({
      ...item,
      color: themeColors[index % themeColors.length]
    }));
  };

  // Helper function to calculate segment center angle - ensures consistency
  const getSegmentCenterAngle = (segmentIndex: number, totalSegments: number) => {
    const degreesPerSlice = 360 / totalSegments;
    return segmentIndex * degreesPerSlice + degreesPerSlice / 2;
  };

  // Helper function to determine which segment is at the pointer position
  const getSegmentAtPointer = (currentRotation: number, currentItems: SpinnerWheelItem[]) => {
    console.log('=== POINTER DETECTION ===');
    console.log(`Current rotation: ${currentRotation.toFixed(1)}°`);
    console.log(`Looking for segment closest to 180° (9 o'clock pointer)`);
    console.log(`Using ${currentItems.length} segments for detection`);
    
    // Find the segment whose center is closest to the pointer
    let closestIndex = 0;
    let minDistance = 360;
    
    for (let i = 0; i < currentItems.length; i++) {
      // Use the same calculation as the alignment calculation
      const segmentCenter = getSegmentCenterAngle(i, currentItems.length);
      const segmentCenterAfterRotation = (segmentCenter + currentRotation) % 360;
      
      // Calculate distance to pointer (handling wrap-around)
      const distance = Math.min(
        Math.abs(segmentCenterAfterRotation - 180),
        360 - Math.abs(segmentCenterAfterRotation - 180)
      );
      
      console.log(`${i}: "${currentItems[i]?.text}" - base center: ${segmentCenter.toFixed(1)}°, after rotation: ${segmentCenterAfterRotation.toFixed(1)}°, distance to 180°: ${distance.toFixed(1)}°`);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    console.log(`Closest segment: "${currentItems[closestIndex]?.text}" (index ${closestIndex}) with distance ${minDistance.toFixed(1)}°`);
    console.log('========================');
    
    return closestIndex;
  };

  const spin = () => {
    if (items.length < 2 || spinning || gameComplete) return;
    
    // Check max spins limit
    const maxSpins = (config as any).maxSpins || 0;
    if (maxSpins > 0 && spinCount >= maxSpins) {
      setGameComplete(true);
      onGameComplete(spinCount);
      return;
    }

    setSpinning(true);
    
    // Ensure we're using current items state
    const currentItems = items;
    const spins = 5 + Math.floor(Math.random() * 3);
    
    // Animate the wheel rotation
    const duration = 3000; // 3 seconds
    
    // Clear any existing click sounds
    if (clickIntervalRef.current) {
      clearTimeout(clickIntervalRef.current);
    }
    
    // Start clicking sound
    startClickingSound(duration, currentItems.length);
    
    // Randomly select winning segment
    const winnerIndex = Math.floor(Math.random() * currentItems.length);
    
    // Calculate segment center angle using the same function as pointer detection
    const segmentCenterAngle = getSegmentCenterAngle(winnerIndex, currentItems.length);
    
    // Calculate where this segment currently is (after existing rotation)
    const currentSegmentPosition = (segmentCenterAngle + rotation) % 360;
    
    // Calculate how much additional rotation is needed to reach 180°
    const targetPosition = 180;
    let rotationNeeded = (targetPosition - currentSegmentPosition + 360) % 360;
    
    // Add full spins for visual effect, then the exact alignment needed
    const totalSpinRotation = 360 * spins;
    const endRotation = rotation + totalSpinRotation + rotationNeeded;
    
    console.log('=== SPIN ALIGNMENT CALCULATION ===');
    console.log(`Winner selected: "${currentItems[winnerIndex]?.text}" (index ${winnerIndex})`);
    console.log(`Segment base center angle: ${segmentCenterAngle.toFixed(1)}°`);
    console.log(`Current segment position: (${segmentCenterAngle.toFixed(1)}° + ${rotation.toFixed(1)}°) % 360 = ${currentSegmentPosition.toFixed(1)}°`);
    console.log(`Rotation needed to reach 180°: (180° - ${currentSegmentPosition.toFixed(1)}° + 360°) % 360 = ${rotationNeeded.toFixed(1)}°`);
    console.log(`Current rotation: ${rotation.toFixed(1)}°`);
    console.log(`Total spins: ${spins} rotations = ${totalSpinRotation}°`);
    console.log(`End rotation: ${rotation.toFixed(1)}° + ${totalSpinRotation}° + ${rotationNeeded.toFixed(1)}° = ${endRotation.toFixed(1)}°`);
    console.log(`Expected final position: ${((segmentCenterAngle + endRotation) % 360).toFixed(1)}° (should be 180°)`);
    console.log('=====================================');

    // Animate the wheel rotation
    const startTime = Date.now();
    const startRotation = rotation;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for more realistic spinning
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + (endRotation - startRotation) * easeOut;
      
      setRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete - no correction needed, animation should end perfectly
        setRotation(endRotation);
        
        // Spinning complete - determine which segment is at the pointer
        const actualSegmentAtPointer = getSegmentAtPointer(endRotation, currentItems);
        const winner = currentItems[actualSegmentAtPointer];
        
        console.log('=== SPIN COMPLETE ===');
        console.log(`Final winner: "${winner?.text}" (intended: "${currentItems[winnerIndex]?.text}")`);
        console.log(`Final rotation: ${endRotation.toFixed(1)}°`);
        console.log('=====================');
        
        // Instead of immediately showing winner, trigger zoom effect
        const zoomCoords = calculateZoomTarget(actualSegmentAtPointer);
        setZoomTarget(zoomCoords);
        setSelected(winner.text);
        setSelectionHistory(prev => [...prev, winner.text]);
        setSpinCount(prev => prev + 1);
        setSpinning(false);
        
        // Trigger zoom after a brief pause for dramatic effect
        setTimeout(() => {
          setIsZoomed(true);
        }, 500);
      }
    };

    animate();
  };

  // Generate click sound using Web Audio API
  const generateClick = () => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Create a sharp click sound
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime); // High pitched click
    
    // Short, sharp envelope
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.001); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05); // Quick decay
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  };

  // Calculate click timing based on wheel speed
  const startClickingSound = (duration: number, segmentCount: number) => {
    if (!audioContextRef.current) return;
    
    const startTime = Date.now();
    const initialInterval = 50; // Start with clicks every 50ms (fast)
    const finalInterval = 300; // End with clicks every 300ms (slow)
    
    // Calculate stopping threshold based on segment count
    let stopThreshold: number;
    switch (segmentCount) {
      case 2:
        stopThreshold = 0.65;
        break;
      case 3:
        stopThreshold = 0.70;
        break;
      case 4:
        stopThreshold = 0.75;
        break;
      case 5:
        stopThreshold = 0.85;
        break;
      case 6:
        stopThreshold = 0.86;
        break;
      case 7:
        stopThreshold = 0.87;
        break;
      case 8:
        stopThreshold = 0.88;
        break;
      case 9:
        stopThreshold = 0.89;
        break;
      default: // 10 or more segments
        stopThreshold = 0.95;
        break;
    }
    
    let currentInterval = initialInterval;
    
    const scheduleNextClick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Stop clicking based on segment-correlated threshold
      if (progress < stopThreshold) {
        // Easing function to slow down clicks (matches wheel deceleration)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        currentInterval = initialInterval + (finalInterval - initialInterval) * easeOut;
        
        generateClick();
        clickIntervalRef.current = setTimeout(scheduleNextClick, currentInterval);
      }
    };
    
    scheduleNextClick();
  };

  // Calculate zoom target coordinates for winning segment
  const calculateZoomTarget = (segmentIndex: number) => {
    const radius = 220;
    const center = 240;
    
    // Always focus on 9 o'clock position (180 degrees) where the winning segment lands
    // This is where our pointer is positioned and where the winning segment stops
    const targetX = center - (radius * 0.5); // 9 o'clock position (left side)
    const targetY = center; // Center vertically
    
    return { x: targetX, y: targetY, segmentIndex };
  };

  // Zoom out function
  const handleZoomOut = () => {
    setIsZoomed(false);
    setZoomTarget({ x: 0, y: 0, segmentIndex: 0 });
  };

  const renderWheel = () => {
    const radius = 220;
    const center = 240;
    const angle = 360 / items.length;
    const coloredItems = getItemColors();

    // Calculate zoom transform - reduced by 20%
    const zoomScale = isZoomed ? 2.4 : 1;
    const zoomTranslateX = isZoomed ? (240 - zoomTarget.x) : 0;
    const zoomTranslateY = isZoomed ? (240 - zoomTarget.y) : 0;

    return (
      <Box 
        position="relative" 
        width="480px" 
        height="480px"
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        mx="auto"
        overflow="visible"
        style={{
          transform: `scale(${zoomScale}) translate(${zoomTranslateX}px, ${zoomTranslateY}px)`,
          transition: isZoomed ? 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'transform 0.6s ease-out'
        }}
      >
        <svg 
          width={480}
          height={480}
          style={{ 
            transition: spinning ? 'none' : 'transform 0.3s ease',
            transform: `rotate(${rotation}deg)`
          }}
        >
          <g>
            {coloredItems.map((item, i) => {
              const startAngle = angle * i;
              const endAngle = startAngle + angle;
              const largeArc = angle > 180 ? 1 : 0;
              
              const x1 = center + radius * Math.cos((Math.PI * startAngle) / 180);
              const y1 = center + radius * Math.sin((Math.PI * startAngle) / 180);
              const x2 = center + radius * Math.cos((Math.PI * endAngle) / 180);
              const y2 = center + radius * Math.sin((Math.PI * endAngle) / 180);
              
              const path = `M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`;
              
              // Text position
              const textAngle = startAngle + angle / 2;
              const textRadius = radius * 0.7;
              const textX = center + textRadius * Math.cos((Math.PI * textAngle) / 180);
              const textY = center + textRadius * Math.sin((Math.PI * textAngle) / 180);
              
              // Text only readable at 9 o'clock position (where pointer is)
              const transformText = `rotate(${textAngle + 180}, ${textX}, ${textY})`;
              
              // Check if this is the winning segment for special highlighting
              const isWinningSegment = isZoomed && i === zoomTarget.segmentIndex;
              
              return (
                <g key={item.id}>
                  <path
                    d={path}
                    fill={item.color}
                    stroke={isWinningSegment ? "#FFD700" : "#fff"}
                    strokeWidth={isWinningSegment ? "4" : "2"}
                    filter={isWinningSegment ? "drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))" : "none"}
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="18"
                    fontWeight="bold"
                    fontFamily="'Comic Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                    fill="#333"
                    transform={transformText}
                  >
                    {item.text.length > 10 ? item.text.substring(0, 10) + '...' : item.text}
                  </text>
                </g>
              );
            })}
          </g>
          
          {/* Center circle */}
          <circle cx={center} cy={center} r={20} fill="#9CA3AF" />
          <circle cx={center} cy={center} r={12} fill="#fff" />
        </svg>
        
        {/* Pointer - realistic teardrop pin that just touches the wheel edge */}
        {/* Outer container: ONLY handles positioning */}
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-254px, -40px)"
          zIndex={10}
        >
          {/* Inner container: ONLY handles animation */}
          <Box
            transformOrigin="12.5px 40px"
            sx={{
              animation: spinning ? 'pointerBounce 0.1s ease-in-out infinite alternate' : 'none',
              '@keyframes pointerBounce': {
                '0%': { transform: 'rotate(86deg)' }, // 86° total
                '100%': { transform: 'rotate(90deg)' }  // 90° total
              },
              transform: spinning ? undefined : 'rotate(90deg)' // Base rotation when not spinning
            }}
          >
            <svg width="25" height="50" viewBox="0 0 25 50">
              {/* Main teardrop body */}
              <path 
                d="M12.5 45 C6 45, 2 37, 2 28 C2 18, 8 8, 12.5 8 C17 8, 23 18, 23 28 C23 37, 19 45, 12.5 45 Z" 
                fill="#E2E8F0"
                stroke="#2D3748"
                strokeWidth="1"
              />
              
              {/* Highlight for 3D effect */}
              <path 
                d="M12.5 10 C9 10, 5 18, 5 28 C5 35, 8 42, 12.5 42 C17 42, 20 35, 20 28 C20 18, 16 10, 12.5 10 Z" 
                fill="#F7FAFC"
              />
              
              {/* Center hole */}
              <circle cx="12.5" cy="40" r="3" fill="#2D3748" />
            </svg>
          </Box>
        </Box>
      </Box>
    );
  };

  const resetGame = () => {
    if (config && (config as any).items) {
      setItems((config as any).items);
    }
    setSelected(null);
    setSpinCount(0);
    setGameComplete(false);
    setSelectionHistory([]);
    setRotation(0);
    // Reset zoom state
    setIsZoomed(false);
    setZoomTarget({ x: 0, y: 0, segmentIndex: 0 });
  };

  if (items.length === 0) {
    return (
      <Center p={8}>
        <Text>No items configured for this spinner wheel.</Text>
      </Center>
    );
  }

  return (
    <Box 
      position="fixed"
      top="0"
      left="0"
      w="100vw" 
      h="100vh" 
      bg="#E6F3FF" 
      display="flex"
      justifyContent="center"
      alignItems="center"
      zIndex={1}
      overflow="auto"
    >
      <Box 
        maxW="600px" 
        p={6} 
        fontFamily="'Comic Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
        bg="#E6F3FF" 
        borderRadius="xl"
        position="relative"
        marginTop="auto"
        marginBottom="auto"
      >
        <VStack spacing={6}>
          {/* Header - Only show when NOT zoomed */}
          {!isZoomed && (
            <VStack spacing={2} textAlign="center">
              <Heading size="lg" color="blue.600">
                🎡 {config.title || 'Spinner Wheel'}
              </Heading>
            </VStack>
          )}

          {/* Wheel */}
          <Box bg="#E6F3FF" p={6} borderRadius="xl" shadow={isZoomed ? "none" : "lg"} position="relative">
            {renderWheel()}
            
            {/* Floating buttons when zoomed - positioned above pointer area */}
            {isZoomed && (
              <VStack 
                position="absolute" 
                top="80px" 
                left="-155px" 
                spacing={3}
                zIndex={1000}
              >
                <Button
                  onClick={handleZoomOut}
                  bg="#4ECDC4"
                  color="white"
                  _hover={{ bg: "#45B7D1" }}
                  _active={{ bg: "#3A9BC1" }}
                  size="md"
                  fontSize="lg"
                  px={6}
                  py={4}
                  borderRadius="full"
                  shadow="lg"
                >
                  🔍 ZOOM OUT
                </Button>
                
                {((config as any).removeOnSelect) && selected && (
                  <Button
                    onClick={() => {
                      if (selected) {
                        // Find and remove the selected item
                        setItems(prev => prev.filter(item => item.text !== selected));
                        // Clear the selection
                        setSelected(null);
                        // Add to history before clearing
                        if (!selectionHistory.includes(selected)) {
                          setSelectionHistory(prev => [...prev, selected]);
                        }
                        // Reset wheel rotation to avoid state confusion
                        setRotation(0);
                        // Reset zoom state
                        setIsZoomed(false);
                        setZoomTarget({ x: 0, y: 0, segmentIndex: 0 });
                      }
                    }}
                    bg="#F5F5DC"
                    color="#8B4513"
                    _hover={{ bg: "#F0E68C" }}
                    _active={{ bg: "#DDD6C1" }}
                    size="md"
                    fontSize="lg"
                    px={6}
                    py={4}
                    borderRadius="full"
                    shadow="lg"
                    leftIcon={<span>🗑️</span>}
                  >
                    REMOVE
                  </Button>
                )}
              </VStack>
            )}
          </Box>

          {/* Winner Display - Show when zoomed */}
          {isZoomed && selected && (
            <Box 
              bg="rgba(255, 215, 0, 0.95)" 
              p={4} 
              borderRadius="xl" 
              shadow="xl" 
              border="3px solid #FFD700"
              textAlign="center"
            >
              <Text fontSize="2xl" fontWeight="bold" color="#8B4513" mb={2}>
                🎉 WINNER! 🎉
              </Text>
              <Text fontSize="xl" fontWeight="bold" color="#2D3748">
                {selected}
              </Text>
            </Box>
          )}

          {/* Controls and Results - Only show when NOT zoomed */}
          {!isZoomed && (
            <VStack spacing={4} align="center" justify="center" w="100%">
              {/* Spin Button */}
              <Button
                onClick={spin}
                isDisabled={spinning || items.length < 2 || gameComplete}
                bg="#F5F5DC"
                color="#8B4513"
                _hover={{ bg: "#F0E68C" }}
                _active={{ bg: "#DDD6C1" }}
                size="lg"
                fontSize="xl"
                px={8}
                py={6}
                isLoading={spinning}
                loadingText="SPINNING..."
              >
                🎯 SPIN THE WHEEL!
              </Button>

              {gameComplete && (
                <VStack spacing={2}>
                  <Text fontSize="lg" fontWeight="bold" color="blue.600">
                    Game Complete! 🎊
                  </Text>
                  <Text>Total spins: {spinCount}</Text>
                  <Button onClick={resetGame} colorScheme="blue" variant="outline">
                    🔄 Play Again
                  </Button>
                </VStack>
              )}
            </VStack>
          )}
        </VStack>
      </Box>
    </Box>
  );
};

export default SpinnerWheel; 