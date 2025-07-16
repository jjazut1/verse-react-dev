import { Box, Text, useBreakpointValue } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { playSound } from '../../../utils/soundUtils';
import { speakEnhanced, speakWithPollyPhonemes, speakWithPollyRegular, speakPhonics, speakText, isTTSAvailable } from '../../../utils/soundUtils';

interface ContainerProps {
  onClick: () => void;
  item: string;
  category: string;
  cracked: boolean;
  onWordClick: (item: string, category: string, e: React.MouseEvent) => void;
  enableTextToSpeech?: boolean;
  usePhonicsMode?: boolean;
  useAmazonPolly?: boolean;
  textToSpeechMode?: string;
  containerType?: string;
}

const Container: React.FC<ContainerProps> = ({ 
  onClick, 
  item, 
  category, 
  cracked, 
  onWordClick, 
  enableTextToSpeech = false, 
  usePhonicsMode = false, 
  useAmazonPolly = false,
  textToSpeechMode,
  containerType = 'eggs'
}) => {
  const [showCracks, setShowCracks] = useState(false);
  const [isOpened, setIsOpened] = useState(false);
  const [pastelColor] = useState(generatePastelColor());
  const [isWordPickedUp, setIsWordPickedUp] = useState(false);

  // Get container-specific styling
  const getContainerStyle = () => {
    switch (containerType) {
      case 'balloons':
        return {
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${pastelColor}, ${adjustBrightness(pastelColor, -20)})`,
          boxShadow: 'inset -2px -2px 4px rgba(0, 0, 0, 0.1), inset 2px 2px 4px rgba(255, 255, 255, 0.5)',
          border: '2px solid rgba(255, 255, 255, 0.4)',
        };
      case 'presents':
        return {
          borderRadius: '8px',
          background: `linear-gradient(135deg, ${pastelColor}, ${adjustBrightness(pastelColor, -15)})`,
          boxShadow: 'inset -2px -2px 4px rgba(0, 0, 0, 0.1), inset 2px 2px 4px rgba(255, 255, 255, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
        };
      case 'amazon':
        return {
          borderRadius: '4px',
          background: 'linear-gradient(135deg, #ffd89b, #d4a76a)',
          boxShadow: 'inset -2px -2px 4px rgba(0, 0, 0, 0.1), inset 2px 2px 4px rgba(255, 255, 255, 0.3)',
          border: '2px solid rgba(139, 69, 19, 0.3)',
        };
      default: // eggs
        return {
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          background: pastelColor,
          boxShadow: 'inset -2px -2px 4px rgba(0, 0, 0, 0.1), inset 2px 2px 4px rgba(255, 255, 255, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
        };
    }
  };

  // Get container-specific sound
  const getContainerSound = () => {
    switch (containerType) {
      case 'balloons':
        return '/sounds/pop.mp3';
      case 'presents':
        return '/sounds/unwrap.mp3';
      case 'amazon':
        return '/sounds/cardboard.mp3';
      default: // eggs
        return '/sounds/crack.mp3';
    }
  };

  // Helper function to adjust color brightness
  const adjustBrightness = (color: string, amount: number) => {
    // Simple brightness adjustment for HSL colors
    const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (hslMatch) {
      const [, h, s, l] = hslMatch;
      const newL = Math.max(0, Math.min(100, parseInt(l) + amount));
      return `hsl(${h}, ${s}%, ${newL}%)`;
    }
    return color;
  };
  
  // Responsive values
  const eggWidth = useBreakpointValue({ base: "45px", md: "55px", lg: "65px" });
  const eggHeight = useBreakpointValue({ base: "60px", md: "73px", lg: "86px" });
  const fontSize = useBreakpointValue({ base: "xs", md: "sm", lg: "md" });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let audio: HTMLAudioElement | null = null;

    if (cracked) {
      // Determine TTS mode once
      const ttsMode = textToSpeechMode || (enableTextToSpeech ? 'amazon-polly-phonics' : 'disabled');
      
      // Always play container sound for immediate feedback
      try {
        audio = new Audio(getContainerSound());
        audio.volume = 0.5; // Reduce volume so it doesn't interfere with TTS
        
        // Add error handling for missing sound files
        audio.addEventListener('error', (e) => {
          console.warn(`Sound file not found: ${getContainerSound()}. Please add sound files to public/sounds/`);
        });
        
        audio.play().catch((error) => {
          console.warn('Could not play container sound:', error);
        });
      } catch (error) {
        console.error('Error creating audio element:', error);
      }

      // Add opening effects
      setShowCracks(true);
      setIsOpened(true);
      
              // TTS: Speak the item text when egg is cracked
        if (ttsMode !== 'disabled' && isTTSAvailable()) {
          timeoutId = setTimeout(async () => {
            const ttsOptions = {
              rate: 0.8,
              pitch: 1.0,
              volume: 0.8
            };

            try {
              switch (ttsMode) {
                case 'amazon-polly-phonics':
                  await speakWithPollyPhonemes(item, ttsOptions);
                  break;
                case 'amazon-polly-regular':
                  await speakWithPollyRegular(item, ttsOptions);
                  break;
                case 'web-speech-phonics':
                  await speakPhonics(item, ttsOptions);
                  break;
                case 'web-speech-regular':
                  await speakText(item, ttsOptions);
                  break;
                default:
                  // Fallback to enhanced TTS with backward compatibility
                  if (useAmazonPolly) {
                    if (usePhonicsMode) {
                      await speakWithPollyPhonemes(item, ttsOptions);
                    } else {
                      await speakWithPollyRegular(item, ttsOptions);
                    }
                  } else {
                    if (usePhonicsMode) {
                      await speakPhonics(item, ttsOptions);
                    } else {
                      await speakText(item, ttsOptions);
                    }
                  }
                  break;
              }
            } catch (error) {
              console.error('TTS error:', error);
              // Fallback to enhanced TTS
              try {
                await speakEnhanced(item, usePhonicsMode, ttsOptions);
              } catch (fallbackError) {
                console.error('Fallback TTS error:', fallbackError);
              }
            }
          }, 800); // 800ms delay to let container sound and visual effects complete
        }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [cracked, enableTextToSpeech, usePhonicsMode, useAmazonPolly, item, textToSpeechMode, containerType]);

  // Generate a random pastel color
  function generatePastelColor(): string {
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * 30) + 40; // 40-70%
    const lightness = Math.floor(Math.random() * 20) + 70; // 70-90%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  const handleWordClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWordPickedUp(true);
    onWordClick(item, category, e);
  };

  return (
    <Box
      position="relative"
      cursor="pointer"
      onClick={cracked ? undefined : onClick}
      width={eggWidth}
      height={eggHeight}
      display="flex"
      alignItems="center"
      justifyContent="center"
      userSelect="none"
      transition="all 0.3s ease"
      _hover={{
        transform: cracked ? "none" : "scale(1.05)",
        filter: cracked ? "none" : "brightness(1.1)"
      }}
    >
      {/* Container Shell */}
      <AnimatePresence>
        {!cracked && (
          <motion.div
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              ...getContainerStyle(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Container highlight */}
            <Box
              position="absolute"
              top="20%"
              left="30%"
              width="20%"
              height="20%"
              borderRadius={containerType === 'presents' || containerType === 'amazon' ? '4px' : '50%'}
              backgroundColor="rgba(255, 255, 255, 0.4)"
              filter="blur(2px)"
            />
            
            {/* Container-specific decorations */}
            {containerType === 'presents' && (
              <>
                {/* Ribbon vertical */}
                <Box
                  position="absolute"
                  top="0"
                  left="50%"
                  width="15%"
                  height="100%"
                  backgroundColor="rgba(255, 0, 0, 0.6)"
                  transform="translateX(-50%)"
                />
                {/* Ribbon horizontal */}
                <Box
                  position="absolute"
                  top="50%"
                  left="0"
                  width="100%"
                  height="15%"
                  backgroundColor="rgba(255, 0, 0, 0.6)"
                  transform="translateY(-50%)"
                />
              </>
            )}
            
            {containerType === 'amazon' && (
              <>
                {/* Amazon tape */}
                <Box
                  position="absolute"
                  top="50%"
                  left="0"
                  width="100%"
                  height="10%"
                  backgroundColor="rgba(139, 69, 19, 0.4)"
                  transform="translateY(-50%)"
                />
                {/* Amazon smile */}
                <Box
                  position="absolute"
                  bottom="15%"
                  right="15%"
                  width="20%"
                  height="15%"
                  borderRadius="50%"
                  backgroundColor="rgba(255, 255, 255, 0.8)"
                  fontSize="6px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="orange"
                  fontWeight="bold"
                >
                  📦
                </Box>
              </>
            )}
            
            {containerType === 'balloons' && (
              <>
                {/* Balloon string */}
                <Box
                  position="absolute"
                  bottom="-5px"
                  left="50%"
                  width="2px"
                  height="15px"
                  backgroundColor="rgba(0, 0, 0, 0.3)"
                  transform="translateX(-50%)"
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cracks */}
      <AnimatePresence>
        {showCracks && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 2
            }}
          >
            {/* Crack lines */}
            <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
              <path
                d="M20,30 L25,45 L30,35 L35,50 L40,40"
                stroke="#8B4513"
                strokeWidth="1"
                fill="none"
                opacity="0.7"
              />
              <path
                d="M50,25 L45,40 L55,35 L50,55"
                stroke="#8B4513"
                strokeWidth="1"
                fill="none"
                opacity="0.7"
              />
              <path
                d="M15,45 L25,50 L20,60 L30,55"
                stroke="#8B4513"
                strokeWidth="1"
                fill="none"
                opacity="0.7"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revealed Word */}
      <AnimatePresence>
        {cracked && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3
            }}
          >
            <Text
              fontSize={fontSize}
              fontWeight="bold"
              color="gray.800"
              textAlign="center"
              cursor="pointer"
              onClick={handleWordClick}
              padding="2px"
              borderRadius="4px"
              backgroundColor="rgba(255, 255, 255, 0.9)"
              border="1px solid rgba(0, 0, 0, 0.1)"
              boxShadow="0 2px 4px rgba(0, 0, 0, 0.1)"
              transition="all 0.2s ease"
              _hover={{
                backgroundColor: "rgba(255, 255, 255, 1)",
                transform: "scale(1.05)",
                boxShadow: "0 3px 6px rgba(0, 0, 0, 0.15)"
              }}
              opacity={isWordPickedUp ? 0.5 : 1}
              pointerEvents={isWordPickedUp ? "none" : "auto"}
            >
              {item}
            </Text>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default Container; 