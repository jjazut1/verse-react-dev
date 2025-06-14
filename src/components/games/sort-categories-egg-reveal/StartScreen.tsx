import React from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  SimpleGrid,
  Button,
  useBreakpointValue
} from '@chakra-ui/react';

interface StartScreenProps {
  onStartGame: () => void;
  onLoadConfig: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStartGame, onLoadConfig }) => {
  // Responsive values
  const containerPadding = useBreakpointValue({ base: 2, md: 3, lg: 4 });
  const headingSize = useBreakpointValue({ base: "sm", md: "md" });

  return (
    <Box 
      width="100vw" 
      maxWidth="100%" 
      position="relative"
      left="50%"
      transform="translateX(-50%)"
      bg="gray.50"
    >
      <Box
        width="100%"
        maxW="1400px"
        mx="auto"
        px={containerPadding}
        py={8}
      >
        <VStack spacing={6} align="center" width="100%">
          <Heading size={headingSize} textAlign="center" fontFamily="'Comic Neue', sans-serif">
            Sort Categories Egg Reveal
          </Heading>
          <Text 
            fontSize={{ base: "sm", md: "md" }} 
            textAlign="center" 
            maxW="600px"
            fontFamily="'Comic Neue', sans-serif"
          >
            Find eggs, crack them open, and sort words into the correct categories!
          </Text>
          
          <SimpleGrid 
            columns={{ base: 1, md: 2 }} 
            spacing={4} 
            width="100%" 
            maxW="600px" 
            mt={4}
          >
            <Button
              colorScheme="blue"
              size={{ base: "md", md: "lg" }}
              onClick={onStartGame}
              width="100%"
              fontFamily="'Comic Neue', sans-serif"
            >
              Start Game
            </Button>
            
            <Button
              variant="outline"
              size={{ base: "md", md: "lg" }}
              onClick={onLoadConfig}
              width="100%"
              fontFamily="'Comic Neue', sans-serif"
            >
              Load Saved Configuration
            </Button>
          </SimpleGrid>
        </VStack>
      </Box>
    </Box>
  );
};

export default StartScreen; 