import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { 
  HStack, 
  Button, 
  IconButton, 
  Text, 
  Tooltip,
  useBreakpointValue,
  Box
} from '@chakra-ui/react';

interface PWAGameHeaderProps {
  gameTitle: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  children?: React.ReactNode;
  variant?: 'compact' | 'full';
}

export const PWAGameHeader: React.FC<PWAGameHeaderProps> = ({
  gameTitle,
  showHomeButton = true,
  showBackButton = true,
  onBack,
  children,
  variant = 'full'
}) => {
  const navigate = useNavigate();
  const { isTeacher, isStudent } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Check PWA context and source
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
               (window.navigator as any).standalone ||
               searchParams.get('pwa') === 'true';
  const fromLauncher = searchParams.get('from') === 'launcher';
  const emailAccess = searchParams.get('emailAccess') === 'true';
  
  const buttonSize = useBreakpointValue({ base: 'sm', md: 'md' });
  const titleSize = useBreakpointValue({ base: 'md', md: 'lg' });

  const handleHome = () => {
    // Simple navigation - users are now properly authenticated
    if (isTeacher) {
      navigate('/teacher');
    } else if (isStudent) {
      navigate('/student');
    } else {
      navigate('/');
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to home if no history
      handleHome();
    }
  };

  const getHomeTooltip = () => {
    if (isPWA && emailAccess) {
      return 'Return to App Dashboard';
    } else if (isTeacher) {
      return 'Return to Create Dashboard';
    } else if (isStudent) {
      return 'Return to Student Dashboard';
    }
    return 'Return to Home';
  };

  if (variant === 'compact') {
    return (
      <HStack spacing={2} justify="space-between" w="full" p={2}>
        <HStack spacing={2}>
          {showBackButton && (
            <Tooltip label="Go Back" placement="bottom">
              <IconButton
                aria-label="Go back"
                icon={<ArrowBackIcon />}
                size={buttonSize}
                variant="ghost"
                onClick={handleBack}
                colorScheme="blue"
              />
            </Tooltip>
          )}
          <Text fontSize={titleSize} fontWeight="bold" color="blue.600">
            {gameTitle}
          </Text>
        </HStack>
        
        <HStack spacing={2}>
          {children}
          {showHomeButton && (
            <Tooltip label={getHomeTooltip()} placement="bottom">
              <IconButton
                aria-label="Go to dashboard"
                icon={<span>🏠</span>}
                size={buttonSize}
                colorScheme="blue"
                variant="solid"
                onClick={handleHome}
              />
            </Tooltip>
          )}
        </HStack>
      </HStack>
    );
  }

  return (
    <Box 
      w="full" 
      bg="white" 
      boxShadow="sm" 
      borderRadius="lg" 
      p={4}
      border="1px solid"
      borderColor="gray.200"
    >
      <HStack spacing={4} justify="space-between" w="full">
        <HStack spacing={3}>
          {showBackButton && (
            <Tooltip label="Go Back" placement="bottom">
              <Button
                leftIcon={<ArrowBackIcon />}
                size={buttonSize}
                variant="ghost"
                onClick={handleBack}
                colorScheme="blue"
              >
                Back
              </Button>
            </Tooltip>
          )}
          <Text fontSize={titleSize} fontWeight="bold" color="gray.800">
            {gameTitle}
          </Text>
          {isPWA && (
            <Text fontSize="sm" color="blue.500" fontWeight="medium">
              📱 App Mode
            </Text>
          )}
        </HStack>
        
        <HStack spacing={3}>
          {children}
          {showHomeButton && (
            <Tooltip label={getHomeTooltip()} placement="bottom">
              <Button
                leftIcon={<span>🏠</span>}
                size={buttonSize}
                colorScheme="blue"
                variant="solid"
                onClick={handleHome}
              >
                {isTeacher ? 'Create' : isStudent ? 'Dashboard' : 'Home'}
              </Button>
            </Tooltip>
          )}
        </HStack>
      </HStack>
    </Box>
  );
};

export default PWAGameHeader; 