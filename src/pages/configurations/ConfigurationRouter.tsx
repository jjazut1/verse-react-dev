import { useEffect, useState } from 'react';
import { useParams, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useToast, Box, Heading, Container, Spinner, Center, Tabs, TabList, Tab, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ConfigurationRouter component
 * 
 * This component serves as a router for different game configuration pages.
 * It validates authentication, extracts game type from URL path, and renders
 * the appropriate configuration page through the Outlet component.
 */
const ConfigurationRouter = () => {
  const { templateId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isNewConfig, setIsNewConfig] = useState<boolean>(false);

  // Extract game type from the path
  const getGameTypeFromPath = () => {
    const path = location.pathname;
    if (path.includes('whack-a-mole')) return 'whack-a-mole';
    if (path.includes('sort-categories-egg')) return 'sort-categories-egg';
    if (path.includes('spinner-wheel')) return 'spinner-wheel';
    if (path.includes('anagram')) return 'anagram';
    if (path.includes('sentence-sense')) return 'sentence-sense';
    if (path.includes('place-value-showdown')) return 'place-value-showdown';
    if (path.includes('word-volley')) return 'word-volley';
    if (path.includes('name-it')) return 'name-it';
    return null;
  };

  const gameType = getGameTypeFromPath();

  // Check if this is a new configuration without templateId
  useEffect(() => {
    // If we have a game type but no templateId, this is a new configuration
    if (gameType && !templateId) {
      setIsNewConfig(true);
      // Clear any errors if this is a new config
      setError(null);
    } else {
      setIsNewConfig(false);
    }
  }, [gameType, templateId]);

  // Auto-redirect to blank template when entering a game route without templateId
  useEffect(() => {
    const redirectToBlankTemplateIfMissingId = async () => {
      if (!gameType || templateId) return;
      try {
        let typeForQuery: string | null = null;
        switch (gameType) {
          case 'whack-a-mole':
            typeForQuery = 'whack-a-mole';
            break;
          case 'sort-categories-egg':
            typeForQuery = 'sort-categories-egg';
            break;
          case 'spinner-wheel':
            typeForQuery = 'spinner-wheel';
            break;
          case 'anagram':
            typeForQuery = 'anagram';
            break;
          case 'sentence-sense':
            typeForQuery = 'sentence-sense';
            break;
          case 'place-value-showdown':
            typeForQuery = 'place-value-showdown';
            break;
          case 'word-volley':
            typeForQuery = 'word-volley';
            break;
          case 'name-it':
            typeForQuery = 'name-it';
            break;
          default:
            typeForQuery = null;
        }
        if (!typeForQuery) return;
        const qBlank = query(
          collection(db, 'blankGameTemplates'),
          where('type', '==', typeForQuery),
          limit(1)
        );
        const snap = await getDocs(qBlank);
        if (!snap.empty) {
          const id = snap.docs[0].id;
          navigate(`/configure/${gameType}/${id}`);
        }
      } catch (err) {
        console.error('Auto-redirect to blank template failed:', err);
      }
    };
    redirectToBlankTemplateIfMissingId();
  }, [gameType, templateId, navigate]);

  // Check if user is authenticated
  useEffect(() => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to access configuration pages.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      navigate('/');
    }
  }, [currentUser, navigate, toast]);

  // Validate game type
  useEffect(() => {
    if (!gameType && location.pathname !== '/configure') {
      toast({
        title: 'Missing Game Type',
        description: 'A game type is required to configure a game.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      navigate('/');
    }
  }, [gameType, navigate, toast, location.pathname]);

  // Clear error when route changes
  useEffect(() => {
    setError(null);
  }, [location.pathname]);

  // Custom error handler to prevent multiple error messages
  const handleError = (errorMessage: string) => {
    // Only set the error if this is not a new configuration without a templateId
    if (!(gameType && !templateId)) {
      setError(errorMessage);
    }
  };

  // If still loading authentication or at base configure path, show loading spinner
  if (!currentUser || (location.pathname === '/configure' && !gameType)) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  // Determine which tab should be active based on the current path
  const getActiveIndex = () => {
    if (!gameType) return 0;
    if (gameType === 'whack-a-mole') return 0;
    if (gameType === 'sort-categories-egg') return 1;
    if (gameType === 'spinner-wheel') return 2;
    if (gameType === 'anagram') return 3;
    if (gameType === 'sentence-sense') return 4;
    if (gameType === 'place-value-showdown') return 5;
    if (gameType === 'word-volley') return 6;
    if (gameType === 'name-it') return 7;
    return 0;
  };

  // Handle tab change
  const handleTabChange = async (index: number) => {
    if (index === 0) {
      try {
        const q = query(
          collection(db, 'blankGameTemplates'),
          where('type', '==', 'whack-a-mole'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const id = snap.docs[0].id;
          navigate(`/configure/whack-a-mole/${id}`);
          return;
        }
      } catch (e) {
        console.error('Failed to load blank template for Whack-a-Mole:', e);
      }
      navigate('/configure/whack-a-mole');
      return;
    }
    if (index === 1) {
      try {
        // Option A: Always open the default blank template for Sort Categories
        const q = query(
          collection(db, 'blankGameTemplates'),
          where('type', '==', 'sort-categories-egg'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const id = snap.docs[0].id;
          navigate(`/configure/sort-categories-egg/${id}`);
          return;
        }
      } catch (e) {
        console.error('Failed to load blank template for Sort Categories:', e);
      }
      // Fallback to generic route if no template found
      navigate('/configure/sort-categories-egg');
      return;
    }
    if (index === 2) {
      try {
        const q = query(
          collection(db, 'blankGameTemplates'),
          where('type', '==', 'spinner-wheel'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const id = snap.docs[0].id;
          navigate(`/configure/spinner-wheel/${id}`);
          return;
        }
      } catch (e) {
        console.error('Failed to load blank template for Spinner Wheel:', e);
      }
      navigate('/configure/spinner-wheel');
      return;
    }
    if (index === 3) {
      try {
        const q = query(
          collection(db, 'blankGameTemplates'),
          where('type', '==', 'anagram'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const id = snap.docs[0].id;
          navigate(`/configure/anagram/${id}`);
          return;
        }
      } catch (e) {
        console.error('Failed to load blank template for Anagram:', e);
      }
      navigate('/configure/anagram');
      return;
    }
    if (index === 4) {
      try {
        const q = query(
          collection(db, 'blankGameTemplates'),
          where('type', '==', 'sentence-sense'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const id = snap.docs[0].id;
          navigate(`/configure/sentence-sense/${id}`);
          return;
        }
      } catch (e) {
        console.error('Failed to load blank template for Sentence Sense:', e);
      }
      navigate('/configure/sentence-sense');
      return;
    }
    if (index === 5) {
      try {
        const q = query(
          collection(db, 'blankGameTemplates'),
          where('type', '==', 'place-value-showdown'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const id = snap.docs[0].id;
          navigate(`/configure/place-value-showdown/${id}`);
          return;
        }
      } catch (e) {
        console.error('Failed to load blank template for Place Value Showdown:', e);
      }
      navigate('/configure/place-value-showdown');
      return;
    }
    if (index === 6) {
      try {
        const q = query(
          collection(db, 'blankGameTemplates'),
          where('type', '==', 'word-volley'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const id = snap.docs[0].id;
          navigate(`/configure/word-volley/${id}`);
          return;
        }
      } catch (e) {
        console.error('Failed to load blank template for Word Volley:', e);
      }
      navigate('/configure/word-volley');
      return;
    }
    if (index === 7) {
      try {
        const q = query(
          collection(db, 'blankGameTemplates'),
          where('type', '==', 'name-it'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const id = snap.docs[0].id;
          navigate(`/configure/name-it/${id}`);
          return;
        }
      } catch (e) {
        console.error('Failed to load blank template for Name It:', e);
      }
      navigate('/configure/name-it');
      return;
    }
  };

  // Display configuration page title and content
  return (
    <Container maxW="container.xl" py={8}>
      <Box mb={8}>
        <Heading mb={6}>Game Configuration</Heading>
        
        <Tabs index={getActiveIndex()} onChange={handleTabChange} variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Whack-a-Mole</Tab>
            <Tab>Sort Categories</Tab>
            <Tab>Spinner Wheel</Tab>
            <Tab>Anagram</Tab>
            <Tab>Sentence Sense</Tab>
            <Tab>Place Value Showdown</Tab>
            <Tab>Pong</Tab>
            <Tab>Name It</Tab>
          </TabList>
        </Tabs>
      </Box>
      
      {/* Show error if one exists and this is not a new config */}
      {error && !isNewConfig && (
        <Alert status="error" mb={6}>
          <AlertIcon />
          <AlertTitle>Error:</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Child routes will be rendered here */}
      <Outlet context={{ onError: handleError }} />
    </Container>
  );
};

export default ConfigurationRouter; 