import React, { useState, useRef, useEffect } from 'react';
import { Box, VStack, Button, Text, Code } from '@chakra-ui/react';
import NameIt from './NameIt';
import { DEFAULT_CONFIG } from './constants';

/**
 * Isolation Test Component for debugging re-render issues
 * Use this to test NameIt component with controlled props
 */
export const IsolationTest: React.FC = () => {
  console.log('🧪 ISOLATION TEST: Component rendered');
  
  // Test states
  const [enableWebRTC, setEnableWebRTC] = useState(false);
  const [testCounter, setTestCounter] = useState(0);
  const [staticProps, setStaticProps] = useState(true);
  
  // Render tracking
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  
  renderCountRef.current += 1;
  const currentTime = Date.now();
  const timeSinceLastRender = currentTime - lastRenderTimeRef.current;
  lastRenderTimeRef.current = currentTime;
  
  console.log(`🧪 ISOLATION TEST RENDER #${renderCountRef.current} (+${timeSinceLastRender}ms)`);
  
  // Static test config (never changes reference)
  const STATIC_CONFIG = {
    ...DEFAULT_CONFIG,
    id: 'isolation-test',
    title: 'Isolation Test Game',
    enableWebRTC: enableWebRTC
  };
  
  // Dynamic test config (changes reference each render)
  const DYNAMIC_CONFIG = {
    ...DEFAULT_CONFIG,
    id: 'isolation-test',
    title: 'Isolation Test Game',
    enableWebRTC: enableWebRTC,
    testCounter // This changes the object reference
  };
  
  const selectedConfig = staticProps ? STATIC_CONFIG : DYNAMIC_CONFIG;
  
  // Static callbacks (never change reference)
  const handleGameComplete = React.useCallback((score: number, timeElapsed: number) => {
    console.log('🎯 Game completed:', { score, timeElapsed });
  }, []);
  
  const handleExit = React.useCallback(() => {
    console.log('🚪 Game exit requested');
  }, []);
  
  // Dynamic callbacks (change reference each render)
  const handleGameCompleteDynamic = (score: number, timeElapsed: number) => {
    console.log('🎯 Game completed (dynamic):', { score, timeElapsed, testCounter });
  };
  
  const handleExitDynamic = () => {
    console.log('🚪 Game exit requested (dynamic):', { testCounter });
  };
  
  const selectedCallbacks = staticProps ? {
    onGameComplete: handleGameComplete,
    onGameExit: handleExit
  } : {
    onGameComplete: handleGameCompleteDynamic,
    onGameExit: handleExitDynamic
  };
  
  return (
    <VStack spacing={6} padding={6} backgroundColor="gray.50" minHeight="100vh">
      <Box backgroundColor="white" padding={4} borderRadius="lg" boxShadow="md" width="100%">
        <Text fontSize="xl" fontWeight="bold" marginBottom={4}>
          🧪 NameIt Isolation Test
        </Text>
        
        <VStack spacing={3} align="stretch">
          <Box>
            <Text fontSize="sm" color="gray.600">Test Controls:</Text>
            <VStack spacing={2} align="stretch">
              <Button
                size="sm"
                colorScheme={staticProps ? 'green' : 'red'}
                onClick={() => setStaticProps(!staticProps)}
              >
                Props Mode: {staticProps ? 'STATIC (stable refs)' : 'DYNAMIC (changing refs)'}
              </Button>
              
              <Button
                size="sm"
                colorScheme={enableWebRTC ? 'blue' : 'gray'}
                onClick={() => setEnableWebRTC(!enableWebRTC)}
              >
                WebRTC: {enableWebRTC ? 'ENABLED' : 'DISABLED'}
              </Button>
              
              <Button
                size="sm"
                colorScheme="orange"
                onClick={() => setTestCounter(prev => prev + 1)}
              >
                Force Re-render (Counter: {testCounter})
              </Button>
            </VStack>
          </Box>
          
          <Box>
            <Text fontSize="sm" color="gray.600">Current Status:</Text>
            <Code fontSize="xs" padding={2} backgroundColor="gray.100" borderRadius="md">
              Renders: {renderCountRef.current} | 
              Last Gap: {timeSinceLastRender}ms | 
              Props: {staticProps ? 'Static' : 'Dynamic'} | 
              WebRTC: {enableWebRTC ? 'On' : 'Off'}
            </Code>
          </Box>
        </VStack>
      </Box>
      
      {/* The actual NameIt component under test */}
      <Box backgroundColor="white" padding={4} borderRadius="lg" boxShadow="md" width="100%">
        <NameIt
          gameConfig={selectedConfig}
          playerName="IsolationTester"
          configId={`isolation-${testCounter}`}
          enableWebRTC={enableWebRTC}
          {...selectedCallbacks}
        />
      </Box>
      
      <Box backgroundColor="yellow.50" padding={4} borderRadius="lg" border="1px solid" borderColor="yellow.200" width="100%">
        <Text fontSize="sm" fontWeight="bold" color="yellow.800" marginBottom={2}>
          🔍 What to Watch:
        </Text>
        <VStack align="start" spacing={1} fontSize="xs" color="yellow.700">
          <Text>• Check console for rapid re-renders (&lt;100ms apart)</Text>
          <Text>• Compare STATIC vs DYNAMIC props behavior</Text>
          <Text>• Monitor when WebRTC hooks reinitialize</Text>
          <Text>• Look for "useGameLogic REINITIALIZED!" spam</Text>
          <Text>• Test with/without WebRTC to isolate issues</Text>
        </VStack>
      </Box>
    </VStack>
  );
};

export default IsolationTest; 