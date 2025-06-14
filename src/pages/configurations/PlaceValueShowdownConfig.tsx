import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { generateAndUploadThumbnail } from '../../utils/thumbnailGenerator';
import {
  Box,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  Switch,
  useToast,
  Heading,
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  RadioGroup,
  Radio,
  Spinner,
  Center,
  Card,
  CardBody,
  CardHeader,
  Alert,
  AlertIcon,
  AlertDescription,
  Divider,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';

interface OutletContextType {
  onError?: (message: string) => void;
}

const PlaceValueShowdownConfig = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { onError } = useOutletContext<OutletContextType>();
  const toast = useToast();
  
  const [title, setTitle] = useState('Place Value Showdown');
  const [numberOfCards, setNumberOfCards] = useState<2 | 3 | 4 | 5>(3);
  const [objective, setObjective] = useState<'largest' | 'smallest'>('largest');
  const [winningScore, setWinningScore] = useState(5);
  const [enableHints, setEnableHints] = useState(true);
  const [gameMode, setGameMode] = useState<'student-vs-teacher' | 'practice'>('student-vs-teacher');
  const [shareConfig, setShareConfig] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teacherName, setTeacherName] = useState('Teacher');

  const hasUnsavedChanges = true; // Always assume changes for simplicity
  const { safeNavigate } = useUnsavedChanges(hasUnsavedChanges);

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Add CSS styles to match existing game configs
  const styles = `
    .apple-input {
      border-radius: 8px !important;
      border-color: #E2E8F0 !important;
      background-color: #F8F9FC !important;
      transition: all 0.2s ease !important;
    }
    
    .apple-input:focus-within {
      border-color: #007AFF !important;
      box-shadow: 0 0 0 1px #007AFF !important;
      background-color: white !important;
    }
  `;

  // Add styles to the document
  useEffect(() => {
    const existingStyle = document.querySelector('style[data-place-value-styles]');
    if (!existingStyle) {
      const styleElement = document.createElement('style');
      styleElement.setAttribute('data-place-value-styles', 'true');
      styleElement.textContent = styles;
      document.head.appendChild(styleElement);
    }
  }, []);

  // Fetch teacher name on component load
  useEffect(() => {
    const fetchTeacherName = async () => {
      if (currentUser?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Try different possible name fields in the user document
            const name = userData.displayName || userData.name || userData.firstName || currentUser.displayName || 'Teacher';
            setTeacherName(name);
          }
        } catch (error) {
          console.error('Error fetching teacher name:', error);
          // Keep default 'Teacher' name if fetch fails
        }
      }
    };

    fetchTeacherName();
  }, [currentUser]);

  const getGameModeDescription = (mode: string) => {
    switch (mode) {
      case 'student-vs-teacher':
        return 'Competitive mode where student plays against AI teacher';
      case 'practice':
        return 'Practice mode for learning place value concepts';
      default:
        return '';
    }
  };

  const handleSaveConfig = async () => {
    setSaveAttempted(true);

    if (!title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for your game',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (winningScore < 1 || winningScore > 20) {
      toast({
        title: 'Invalid Winning Score',
        description: 'Winning score must be between 1 and 20',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const gameConfig = {
        title,
        type: 'place-value-showdown' as const,
        description: `Place value game with ${numberOfCards} cards, aiming for ${objective} number. First to ${winningScore} points wins!`,
        difficulty: 'medium' as const,
        timeLimit: 300,
        targetScore: winningScore,
        numberOfCards,
        objective,
        winningScore,
        aiDifficulty: 'medium' as const,
        playerName: 'Student',
        teacherName,
        enableHints,
        gameMode,
        share: shareConfig,
        email: currentUser?.email,
        userId: currentUser?.uid,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'userGameConfigs'), gameConfig);
      console.log('Game configuration saved with ID:', docRef.id);

      try {
        const thumbnailUrl = await generateAndUploadThumbnail(docRef.id, gameConfig);
        await updateDoc(doc(db, 'userGameConfigs', docRef.id), {
          thumbnail: thumbnailUrl
        });
        console.log('Thumbnail generated and saved');
      } catch (thumbnailError) {
        console.error('Error generating thumbnail:', thumbnailError);
      }

      toast({
        title: 'Success',
        description: 'Configuration saved successfully!',
        status: 'success',
        duration: 3000,
      });

      const shouldNavigate = confirm('Configuration saved successfully! Would you like to go back to the home page?');
      if (shouldNavigate) {
        safeNavigate('/');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save configuration. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Center p={8}>
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Box maxW="4xl" mx="auto" p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>
            Create Place Value Showdown
          </Heading>
          <Text color="gray.600">
            Create an exciting competitive place value game where students challenge an AI teacher to build the largest or smallest numbers!
          </Text>
        </Box>

        {/* Basic Settings */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Game Settings</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={6}>
              <FormControl>
                <FormLabel>Title</FormLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter game title"
                  isInvalid={saveAttempted && !title.trim()}
                  className="apple-input"
                />
              </FormControl>

              <HStack spacing={6} w="full" align="flex-start">
                <FormControl flex="1">
                  <FormLabel>Number of Cards</FormLabel>
                  <Select
                    value={numberOfCards}
                    onChange={(e) => setNumberOfCards(parseInt(e.target.value) as 2 | 3 | 4 | 5)}
                    className="apple-input"
                  >
                    <option value={2}>2 Cards (2-digit numbers)</option>
                    <option value={3}>3 Cards (3-digit numbers)</option>
                    <option value={4}>4 Cards (4-digit numbers)</option>
                    <option value={5}>5 Cards (5-digit numbers)</option>
                  </Select>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    More cards = bigger numbers and more complex place value concepts
                  </Text>
                </FormControl>

                <FormControl flex="1">
                  <FormLabel>Objective</FormLabel>
                  <RadioGroup
                    value={objective}
                    onChange={(value) => setObjective(value as 'largest' | 'smallest')}
                  >
                    <VStack align="flex-start" spacing={2}>
                      <Radio value="largest">Create the largest number</Radio>
                      <Radio value="smallest">Create the smallest number</Radio>
                    </VStack>
                  </RadioGroup>
                </FormControl>
              </HStack>

              <HStack spacing={6} w="full" align="flex-start">
                <FormControl flex="1">
                  <FormLabel>Winning Score</FormLabel>
                  <NumberInput
                    value={winningScore}
                    onChange={(valueString) => setWinningScore(parseInt(valueString) || 5)}
                    min={1}
                    max={20}
                    className="apple-input"
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Points needed to win the game (1-20)
                  </Text>
                </FormControl>

                <FormControl flex="1">
                  <FormLabel>Game Mode</FormLabel>
                  <Select
                    value={gameMode}
                    onChange={(e) => setGameMode(e.target.value as 'student-vs-teacher' | 'practice')}
                    className="apple-input"
                  >
                    <option value="student-vs-teacher">Student vs Teacher</option>
                    <option value="practice">Practice Mode</option>
                  </Select>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {getGameModeDescription(gameMode)}
                  </Text>
                </FormControl>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Learning Features */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Learning Features</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0" flex="1">
                  Enable Place Value Hints
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Show visual cues to help students understand place value positions
                  </Text>
                </FormLabel>
                <Switch
                  isChecked={enableHints}
                  onChange={(e) => setEnableHints(e.target.checked)}
                  colorScheme="blue"
                />
              </FormControl>

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <AlertDescription>
                  This game teaches place value by having students arrange digit cards to create numbers. 
                  Students learn that the position of a digit determines its value (ones, tens, hundreds, etc.).
                </AlertDescription>
              </Alert>
            </VStack>
          </CardBody>
        </Card>

        {/* Sharing Settings */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Sharing</Heading>
          </CardHeader>
          <CardBody>
            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Share this game publicly</FormLabel>
              <Switch
                isChecked={shareConfig}
                onChange={(e) => setShareConfig(e.target.checked)}
                colorScheme="green"
              />
            </FormControl>
            <Text fontSize="sm" color="gray.600" mt={2}>
              Public games can be used by other teachers as templates.
            </Text>
          </CardBody>
        </Card>

        {/* Preview */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Game Preview</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="flex-start">
              <Text><strong>Game:</strong> {title}</Text>
              <Text><strong>Cards per round:</strong> {numberOfCards} cards</Text>
              <Text><strong>Objective:</strong> Create the {objective} number possible</Text>
              <Text><strong>Winning condition:</strong> First to {winningScore} points</Text>
              <Text><strong>AI Difficulty:</strong> Medium - Teacher plays strategically most of the time</Text>
              <Text><strong>Players:</strong> Student vs {teacherName}</Text>
              <Text><strong>Hints:</strong> {enableHints ? 'Enabled' : 'Disabled'}</Text>
            </VStack>
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <HStack spacing={4} justify="flex-end">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveConfig}
            colorScheme="blue"
            isLoading={isLoading}
            loadingText="Saving..."
            size="lg"
          >
            Save Game Configuration
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default PlaceValueShowdownConfig; 