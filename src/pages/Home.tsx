import { FaGamepad, FaChalkboardTeacher, FaTrophy } from 'react-icons/fa';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  useToast, 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalCloseButton,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  Switch,
  HStack,
  Select,
  FormHelperText,
} from '@chakra-ui/react';
import { generateAndUploadThumbnail } from '../utils/thumbnailGenerator';
import GameItemDisplay from '../components/GameItemDisplay';

const SearchBar = ({ onSearch }: { onSearch: (query: string) => void }) => (
  <div style={{
    marginBottom: 'var(--spacing-4)',
    position: 'relative'
  }}>
    <input
      type="text"
      placeholder="Search..."
      onChange={(e) => onSearch(e.target.value)}
      style={{
        width: '100%',
        padding: 'var(--spacing-2) var(--spacing-3)',
        borderRadius: 'var(--border-radius-md)',
        border: '1px solid var(--color-gray-200)',
        fontSize: 'var(--font-size-md)',
        outline: 'none',
      }}
    />
  </div>
);

interface GameItemProps {
  title: string;
  type: string;
  thumbnail?: string;
  id?: string;
  isPlayable?: boolean;
  config?: any;
  onClick?: () => void;
  share?: boolean;
  userId?: string;
  isOwner?: boolean;
  onDelete?: () => void;
}

// Helper function to get background color based on game type
function getBackgroundColorByType(type: string): string {
  const colors: Record<string, string> = {
    'sort-categories-egg': '#f0e6ff', // Light purple
    'whack-a-mole': '#e6fff0',  // Light green
    'spinner-wheel': '#fff3e0', // Light orange
    'anagram': '#e3f2fd', // Light blue
    'sentence-sense': '#e8f5e8', // Light green
    'place-value-showdown': '#ffe6e6', // Light red
    'default': 'var(--color-primary-100)'
  };
  
  return colors[type] || colors.default;
}

// Helper function to get icon based on game type
function getIconByType(type: string): string {
  switch (type) {
    case 'sort-categories-egg':
      return '🥚';
    case 'whack-a-mole':
      return '🔨';
    case 'spinner-wheel':
      return '🎡';
    case 'anagram':
      return '🧩';
    case 'sentence-sense':
      return '📝';
    case 'place-value-showdown':
      return '🎯';
    default:
      return '';
  }
}

const GameItem = ({ title, type, thumbnail, id, isPlayable, config, onClick, isOwner, onDelete }: GameItemProps) => {
  // The icon to show when no thumbnail is available
  const gameIcon = getIconByType(type) || title.charAt(0);
  // Background color for the thumbnail placeholder
  const bgColor = getBackgroundColorByType(type);
  
  const renderThumbnail = () => (
    <div style={{
      width: '60px',
      height: '60px',
      backgroundColor: bgColor,
      borderRadius: 'var(--border-radius-md)',
      marginRight: 'var(--spacing-3)',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative'
    }}>
      {thumbnail ? (
        <img 
          src={thumbnail} 
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-primary-700)',
          fontSize: 'var(--font-size-xl)'
        }}>
          {gameIcon}
        </div>
      )}
    </div>
  );
  
  const renderInfo = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-1)',
      flex: 1
    }}>
      <h3 style={{
        fontSize: 'var(--font-size-md)',
        color: 'var(--color-gray-800)',
        margin: 0
      }}>
        {title}
      </h3>
      <span style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-gray-600)',
      }}>
        Type: {type}
      </span>
    </div>
  );

  const containerStyles = {
    display: 'flex',
    alignItems: 'center',
    padding: 'var(--spacing-3)',
    backgroundColor: 'white',
    borderRadius: 'var(--border-radius-md)',
    margin: 'var(--spacing-2) 0',
    border: '1px solid var(--color-gray-200)',
    cursor: isPlayable || onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease-in-out',
    textDecoration: 'none',
    color: 'inherit',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    '&:hover': {
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
    }
  };

  const renderDeleteButton = () => (
    isOwner && onDelete && (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        style={{
          position: 'absolute',
          top: '50%',
          right: '16px',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-gray-500)',
          padding: 'var(--spacing-1)',
          borderRadius: 'var(--border-radius-sm)',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
        aria-label="Delete"
        title="Delete"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
        </svg>
      </button>
    )
  );

  if (onClick) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={containerStyles} onClick={onClick}>
          {renderThumbnail()}
          {renderInfo()}
        </div>
        {renderDeleteButton()}
      </div>
    );
  }

  return isPlayable && id ? (
    <div style={{ position: 'relative' }}>
      <RouterLink to={`/game/${id}`} style={containerStyles}>
        {renderThumbnail()}
        {renderInfo()}
      </RouterLink>
        {renderDeleteButton()}
    </div>
  ) : (
    <div style={{ position: 'relative' }}>
      <div style={containerStyles}>
        {renderThumbnail()}
        {renderInfo()}
      </div>
        {renderDeleteButton()}
    </div>
  );
};

// Define a proper interface for game objects
interface GameObject {
  id: string;
  title: string;
  type: string;
  thumbnail?: string;
  userId?: string;
  share?: boolean;
  categories?: any[];
  eggQty?: number;
}

const Home = () => {
  // State for games and search
  const [publicGames, setPublicGames] = useState<GameObject[]>([]);
  const [freeGamesSearch, setFreeGamesSearch] = useState('');
  const [modifiableSearch, setModifiableSearch] = useState('');
  const [blankSearch, setBlankSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser, isTeacher, isStudent } = useAuth();
  const toast = useToast();
  const [modifiableTemplates, setModifiableTemplates] = useState<GameObject[]>([]);
  const [blankTemplates, setBlankTemplates] = useState<GameObject[]>([]);
  
  // State for deletion confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'template' | 'game', title: string} | null>(null);

  // Redirect students to their dashboard
  useEffect(() => {
    if (isStudent && currentUser) {
      navigate('/student');
    }
  }, [isStudent, currentUser, navigate]);

  // Redirect teachers to their Create dashboard
  useEffect(() => {
    if (isTeacher && currentUser) {
      navigate('/teacher');
    }
  }, [isTeacher, currentUser, navigate]);

  // Handler for opening delete confirmation dialog
  const handleDeleteClick = (id: string, type: 'template' | 'game', title: string) => {
    setItemToDelete({id, type, title});
    setIsDeleteDialogOpen(true);
  };

  // Function to delete a template and its associated games
  const deleteTemplateAndGames = async () => {
    if (!itemToDelete || !currentUser) return;
    
    try {
      setLoading(true);
      
      // First delete the template
      if (itemToDelete.type === 'template') {
        await deleteDoc(doc(db, 'categoryTemplates', itemToDelete.id));
        
        // Then find and delete any associated games with the same title
        const gamesQuery = query(
          collection(db, 'userGameConfigs'),
          where('userId', '==', currentUser.uid),
          where('title', '==', itemToDelete.title)
        );
        
        const gamesSnapshot = await getDocs(gamesQuery);
        const deletePromises = gamesSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        
        await Promise.all(deletePromises);
        
        // Update local state
        setModifiableTemplates(prev => 
          prev.filter(template => template.id !== itemToDelete.id)
        );
        
        // Update games list too
        setPublicGames(prev => 
          prev.filter(game => 
            !(game.userId === currentUser.uid && game.title === itemToDelete.title)
          )
        );
        
        toast({
          title: "Deleted Successfully",
          description: `Deleted template "${itemToDelete.title}" and its associated games`,
          status: "success",
          duration: 3000,
        });
      } 
      // Delete just a single game
      else if (itemToDelete.type === 'game') {
        await deleteDoc(doc(db, 'userGameConfigs', itemToDelete.id));
        
        // Update local state
        setPublicGames(prev => 
          prev.filter(game => game.id !== itemToDelete.id)
        );
        
        toast({
          title: "Deleted Successfully", 
          description: `Deleted game "${itemToDelete.title}"`,
          status: "success",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast({
        title: "Error",
        description: "Failed to delete. Please try again.",
        status: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  // Deletion confirmation dialog
  const DeleteConfirmationDialog = () => (
    <Modal isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Confirm Deletion</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {itemToDelete?.type === 'template' ? (
            <p>
              Are you sure you want to delete the template "{itemToDelete?.title}"? 
              This will also delete any associated games with the same title.
            </p>
          ) : (
            <p>Are you sure you want to delete the game "{itemToDelete?.title}"?</p>
          )}
        </ModalBody>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
          <Button 
            onClick={() => setIsDeleteDialogOpen(false)}
            style={{ marginRight: '0.5rem' }}
          >
            Cancel
          </Button>
          <Button 
            colorScheme="red" 
            onClick={deleteTemplateAndGames}
            isLoading={loading}
          >
            Delete
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );

  // Fetch public games, modifiable templates, and blank templates
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        console.log("Starting fetchGames function");
        
        // Base promises for games - these are loaded for all users
        const promises = [
          // Get all of the current user's games (both private and public)
          currentUser ? (async () => {
            console.log("Attempting to fetch current user's games");
            try {
              const userGamesQuery = query(
                collection(db, 'userGameConfigs'),
                where('userId', '==', currentUser.uid)
              );
              console.log("User games query:", userGamesQuery);
              const result = await getDocs(userGamesQuery);
              console.log(`Successfully fetched ${result.docs.length} user games`);
              return result;
            } catch (error) {
              console.error("Error fetching user's games:", error);
              return { docs: [] };
            }
          })() : Promise.resolve({ docs: [] }),
          
          // Get public games (we'll filter by userId in JavaScript)
          (async () => {
            console.log("Attempting to fetch public games with share=true");
            try {
              const publicGamesQuery = query(
                collection(db, 'userGameConfigs'),
                where('share', '==', true)
              );
              console.log("Public games query:", publicGamesQuery);
              const result = await getDocs(publicGamesQuery);
              console.log(`Successfully fetched ${result.docs.length} public games`);
              return result;
            } catch (error) {
              console.error("Error fetching public games:", error);
              throw error; // Re-throw to be caught by the main try/catch
            }
          })()
        ];
        
        // Add template queries only if the user is a teacher or admin
        if (isTeacher) {
          console.log("User is teacher, attempting to fetch templates");
          // Add template queries to the promises array
          promises.push(
            // Get sort-categories-egg modifiable templates
            (async () => {
              console.log("Attempting to fetch sort-categories-egg templates");
              try {
                const result = await getDocs(query(
                  collection(db, 'categoryTemplates'),
                  where('type', '==', 'sort-categories-egg')
                ));
                console.log(`Successfully fetched ${result.docs.length} sort-categories-egg templates`);
                return result;
              } catch (error) {
                console.error("Error fetching sort-categories-egg templates:", error);
                return { docs: [] };
              }
            })(),
            
            // Get whack-a-mole modifiable templates
            (async () => {
              console.log("Attempting to fetch whack-a-mole templates");
              try {
                const result = await getDocs(query(
                  collection(db, 'categoryTemplates'),
                  where('type', '==', 'whack-a-mole')
                ));
                console.log(`Successfully fetched ${result.docs.length} whack-a-mole templates`);
                return result;
              } catch (error) {
                console.error("Error fetching whack-a-mole templates:", error);
                return { docs: [] };
              }
            })(),
            
            // Get blank templates
            (async () => {
              console.log("Attempting to fetch blank templates");
              try {
                const result = await getDocs(collection(db, 'blankGameTemplates'));
                console.log(`Successfully fetched ${result.docs.length} blank templates`);
                return result;
              } catch (error) {
                console.error("Error fetching blank templates:", error);
                return { docs: [] };
              }
            })()
          );
        }
        
        console.log("Executing all promises");
        // Execute all promises
        const results = await Promise.all(promises);
        console.log("All promises resolved successfully");
        
        // Always process games data
        const userOwnGamesSnapshot = results[0];
        const publicGamesSnapshot = results[1];

        // Process the user's own games
        const userGames = userOwnGamesSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || 'Untitled Game',
          type: doc.data().type || 'sort-categories-egg',
          thumbnail: doc.data().thumbnail || undefined,
          userId: doc.data().userId || undefined,
          share: doc.data().share || false
        }));

        // Process other users' public games (filter out current user's games)
        const otherGames = publicGamesSnapshot.docs
          .filter(doc => !currentUser || doc.data().userId !== currentUser.uid)
          .map(doc => ({
            id: doc.id,
            title: doc.data().title || 'Untitled Game',
            type: doc.data().type || 'sort-categories-egg',
            thumbnail: doc.data().thumbnail || undefined,
            userId: doc.data().userId || undefined,
            share: doc.data().share || false
          }));

        // Combine into a single array for public games display
        setPublicGames([...userGames, ...otherGames]);
        console.log(`Set publicGames with ${userGames.length} user games and ${otherGames.length} other games`);
        
        // Process templates only if the user is a teacher/admin and templates were fetched
        if (isTeacher && promises.length > 2) {
          const sortCategoriesTemplatesSnapshot = results[2];
          const whackAMoleTemplatesSnapshot = results[3];
          const blankTemplatesSnapshot = results[4];
          
          // Process sort-categories-egg templates
          const sortCategoriesTemplates = sortCategoriesTemplatesSnapshot.docs.map(doc => ({
            id: doc.id,
            title: doc.data().title || 'Untitled Template',
            type: doc.data().type || 'sort-categories-egg',
            thumbnail: doc.data().thumbnail,
            userId: doc.data().userId,
            categories: doc.data().categories || [],
            eggQty: doc.data().eggQty || 6,
            share: doc.data().share || false
          }));
          
          // Process whack-a-mole templates
          const whackAMoleTemplates = whackAMoleTemplatesSnapshot.docs.map(doc => ({
            id: doc.id,
            title: doc.data().title || 'Untitled Template',
            type: doc.data().type || 'whack-a-mole',
            thumbnail: doc.data().thumbnail,
            userId: doc.data().userId,
            words: doc.data().words || [],
            share: doc.data().share || false
          }));
          
          // Combine all templates
          setModifiableTemplates([...sortCategoriesTemplates, ...whackAMoleTemplates]);

          // Process blank templates
          const blankTemplatesData = blankTemplatesSnapshot.docs.map(doc => {
            const docData = doc.data();
            console.log('🔍 Processing blank template:', {
              id: doc.id,
              title: docData.title,
              originalType: docData.type,
              allData: docData
            });

            // Ensure blank templates have a valid game type
            let type = docData.type || 'sort-categories-egg';
            
            // List of all supported game types
            const supportedGameTypes = [
              'whack-a-mole', 
              'sort-categories-egg', 
              'spinner-wheel', 
              'anagram', 
              'sentence-sense', 
              'place-value-showdown',
              'word-volley'
            ];
            
            // Make sure the type is one of our supported game types
            if (!supportedGameTypes.includes(type)) {
              console.warn('🚨 Unsupported blank template type:', type, 'for template:', doc.id);
              // Default to sort-categories-egg if type is not supported
              type = 'sort-categories-egg';
            }
            
            const processedTemplate = {
              id: doc.id,
              title: docData.title || 'Untitled Template',
              type: type, // Use the validated type
              thumbnail: docData.thumbnail,
              categories: docData.categories || [],
              eggQty: docData.eggQty || 6,
              share: docData.share || false
            };

            console.log('🔍 Processed blank template:', processedTemplate);
            return processedTemplate;
          });
          console.log('🔍 All processed blank templates:', blankTemplatesData);
          console.log('🔍 Setting blankTemplates state with:', blankTemplatesData.length, 'templates');
          setBlankTemplates(blankTemplatesData);
        } else {
          // Set empty arrays for non-teacher users
          setModifiableTemplates([]);
          setBlankTemplates([]);
        }
      } catch (error: any) {
        console.error('Error fetching games:', error);
        // Log detailed error information
        if (error.code) {
          console.error(`Firebase error code: ${error.code}`);
        }
        if (error.message) {
          console.error(`Error message: ${error.message}`);
        }
        toast({
          title: 'Error',
          description: 'Could not load games and templates.',
          status: 'error',
          duration: 5000,
        });
      } finally {
        setLoading(false);
        console.log("Finished fetchGames function");
      }
    };

    fetchGames();
  }, [toast, currentUser, isTeacher]);

  // Filter and separate games based on ownership and search
  const userOwnedGames = publicGames.filter(game => 
    currentUser && game.userId === currentUser.uid &&
    game.title.toLowerCase().includes(freeGamesSearch.toLowerCase())
  );
  
  const otherPublicGames = publicGames.filter(game => 
    (!currentUser || game.userId !== currentUser.uid) &&
    game.share === true && // Only show other users' games if they're public
    game.title.toLowerCase().includes(freeGamesSearch.toLowerCase())
  );

  // Filter and separate templates based on ownership and search
  const userOwnedTemplates = modifiableTemplates.filter(template => 
    currentUser && template.userId === currentUser.uid &&
    template.title.toLowerCase().includes(modifiableSearch.toLowerCase())
  );
  
  const otherTemplates = modifiableTemplates.filter(template => 
    !currentUser || template.userId !== currentUser.uid &&
    template.title.toLowerCase().includes(modifiableSearch.toLowerCase())
  );

  // Filter blank templates based on search
  const filteredBlank = blankTemplates.filter(template =>
    template.title.toLowerCase().includes(blankSearch.toLowerCase())
  );

  const handleTemplateClick = (template: any, isBlankTemplate: boolean = false) => {
    // Add comprehensive debug logging
    console.log('🔍 handleTemplateClick called with:', {
      template,
      isBlankTemplate,
      templateId: template?.id,
      templateType: template?.type,
      templateTitle: template?.title
    });

    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to access templates.',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    // Get the template type from the template
    const templateType = template.type;
    console.log('🔍 Template type:', templateType);

    // List of game types that have dedicated configuration pages
    const supportedGameTypes = [
      'whack-a-mole', 
      'sort-categories-egg', 
      'spinner-wheel', 
      'anagram', 
      'sentence-sense', 
      'place-value-showdown',
      'word-volley'
    ];

    console.log('🔍 Supported game types:', supportedGameTypes);
    console.log('🔍 Is templateType supported?', supportedGameTypes.includes(templateType));

    // Navigate to the appropriate configuration page based on game type
    if (supportedGameTypes.includes(templateType)) {
      // For games with dedicated config pages, navigate to the appropriate route
      if (template.id) {
        const navigateUrl = `/configure/${templateType}/${template.id}`;
        console.log('🔍 Navigating to:', navigateUrl);
        navigate(navigateUrl);
      } else {
        const navigateUrl = `/configure/${templateType}`;
        console.log('🔍 Navigating to (no ID):', navigateUrl);
        navigate(navigateUrl);
      }
    } else {
      // For unsupported game types, navigate to a default fallback
      const fallbackType = 'sort-categories-egg'; // Default fallback
      console.warn(`🚨 Unsupported template type: ${templateType}, falling back to ${fallbackType}`);
      console.log('🔍 Template object causing fallback:', template);
      navigate(`/configure/${fallbackType}`);
    }
  };

  // For free games section
  const renderGamesList = (
    games: GameObject[],
    isOwner: boolean,
    handleDeleteClick: (id: string, type: 'template' | 'game', title: string) => void
  ) => {
    return games.length > 0 ? (
      <div>
        {games.map(game => (
          <GameItemDisplay
            key={game.id}
            id={game.id}
            title={game.title}
            type={game.type}
            thumbnail={game.thumbnail}
            isPlayable={true}
            isOwner={isOwner}
            onDelete={() => handleDeleteClick(game.id, 'game', game.title)}
          />
        ))}
      </div>
    ) : (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-4)', color: 'var(--color-gray-500)' }}>
        No games found
      </div>
    );
  };

  // For modifiable and blank templates section
  const renderTemplatesList = (
    templates: GameObject[],
    isOwner: boolean,
    onTemplateClick: (template: any) => void,
    handleDeleteClick?: (id: string, type: 'template' | 'game', title: string) => void
  ) => {
    console.log('🔍 renderTemplatesList called with:', {
      templatesCount: templates.length,
      isOwner,
      hasOnTemplateClick: !!onTemplateClick,
      hasDeleteHandler: !!handleDeleteClick,
      templates: templates.map(t => ({ id: t.id, title: t.title, type: t.type }))
    });
    
    return templates.length > 0 ? (
      <div>
        {templates.map(template => {
          console.log('🔍 Rendering GameItemDisplay for template:', {
            id: template.id,
            title: template.title,
            type: template.type,
            hasClickHandler: !!onTemplateClick
          });
          
          return (
            <GameItemDisplay
              key={template.id}
              title={template.title}
              type={template.type}
              thumbnail={template.thumbnail}
              isPlayable={false}
              onClick={() => {
                console.log('🔍 GameItemDisplay onClick triggered for:', template.title, template.type);
                onTemplateClick(template);
              }}
              isOwner={isOwner}
              onDelete={handleDeleteClick ? () => handleDeleteClick(template.id, 'template', template.title) : undefined}
            />
          );
        })}
      </div>
    ) : (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-4)', color: 'var(--color-gray-500)' }}>
        No templates found
      </div>
    );
  };

  return (
    <div style={{ width: '100vw', overflow: 'hidden' }}>
      {/* Debug PWA Status - Temporary for testing */}
      {currentUser && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          <div>🔍 PWA Debug:</div>
          <div>User: {currentUser.email}</div>
          <div>Page: Home (/)</div>
          <div>PWA Banner: Only on /student</div>
          <div>
            <a href="/student" style={{ color: '#4299E1' }}>
              → Go to Student Dashboard
            </a>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div style={{ backgroundColor: 'var(--color-primary-500)', color: 'white', padding: 'var(--spacing-20) 0', width: '100%' }}>
        <div style={{ width: '100%', margin: '0 auto', padding: '0 var(--spacing-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)', alignItems: 'center', width: '100%' }}>
            <h1 style={{ fontSize: 'var(--font-size-5xl)', fontWeight: 'bold' }}>
              Lumino Learning
            </h1>
            <p style={{ fontSize: 'var(--font-size-xl)' }}>
              Create Efficiently. Spark Curiosity. Shape Minds.
            </p>
          </div>
        </div>
      </div>

      {/* Three Column Section */}
      <div style={{ 
        padding: 'var(--spacing-16) var(--spacing-4)',
        backgroundColor: 'var(--color-gray-50)',
        width: '100%'
      }}>
        {/* Show redirect message for students or teachers */}
        {(isStudent && currentUser) || (isTeacher && currentUser) ? (
          <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            textAlign: 'center',
            padding: 'var(--spacing-8)',
            backgroundColor: 'white',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ 
              fontSize: 'var(--font-size-2xl)', 
              marginBottom: 'var(--spacing-4)',
              color: 'var(--color-primary-600)'
            }}>
              {isStudent ? '🎓' : '👨‍🏫'}
            </div>
            <h2 style={{ 
              fontSize: 'var(--font-size-xl)',
              color: 'var(--color-gray-800)',
              marginBottom: 'var(--spacing-2)'
            }}>
              {isStudent ? 'Redirecting to Your Dashboard' : 'Redirecting to Create'}
            </h2>
            <p style={{ color: 'var(--color-gray-600)' }}>
              {isStudent 
                ? 'Taking you to your personal learning dashboard...' 
                : 'Taking you to your creation and management dashboard...'
              }
            </p>
          </div>
        ) : (
        <div style={{ 
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'grid',
            gridTemplateColumns: isTeacher ? 'repeat(3, 1fr)' : '1fr',
          gap: 'var(--spacing-8)',
          width: '100%'
        }}>
          {/* Student Dashboard Quick Access */}
          {isStudent && currentUser && (
            <div style={{
              maxWidth: '600px',
              margin: '0 auto 40px auto',
              textAlign: 'center',
              padding: 'var(--spacing-6)',
              backgroundColor: 'linear-gradient(135deg, #4299E1 0%, #3182CE 100%)',
              background: 'linear-gradient(135deg, #4299E1 0%, #3182CE 100%)',
              borderRadius: 'var(--border-radius-lg)',
              boxShadow: '0 4px 12px rgba(66, 153, 225, 0.3)',
              color: 'white'
            }}>
              <div style={{ 
                fontSize: '2rem', 
                marginBottom: 'var(--spacing-4)'
              }}>
                📱
              </div>
              <h2 style={{ 
                fontSize: 'var(--font-size-xl)',
                marginBottom: 'var(--spacing-2)',
                color: 'white'
              }}>
                Ready for the App Experience?
              </h2>
              <p style={{ 
                marginBottom: 'var(--spacing-4)',
                opacity: 0.9
              }}>
                Access your assignments and install the Lumino Learning app from your dashboard!
              </p>
              <a 
                href="/student"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                Go to My Dashboard →
              </a>
            </div>
          )}

          {/* Free Games Column */}
          <div style={{ 
            padding: 'var(--spacing-6)',
            backgroundColor: 'white',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <h2 style={{ 
              fontSize: 'var(--font-size-2xl)',
              color: 'var(--color-gray-800)',
              marginBottom: 'var(--spacing-4)'
            }}>
              Free Games
            </h2>
            <SearchBar onSearch={setFreeGamesSearch} />
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>
                  Loading games...
                </div>
              ) : (
                <>
                  {/* User's own games section */}
                  {currentUser && userOwnedGames.length > 0 && (
                    <div>
                      <h3 style={{ 
                        fontSize: 'var(--font-size-lg)',
                        color: 'var(--color-gray-700)',
                        margin: 'var(--spacing-4) 0',
                        paddingBottom: 'var(--spacing-2)',
                        borderBottom: '1px solid var(--color-gray-200)'
                      }}>
                        My Games
                      </h3>
                      {renderGamesList(userOwnedGames, true, handleDeleteClick)}
                    </div>
                  )}
                  
                  {/* Other public games section */}
                  {otherPublicGames.length > 0 && (
                    <div>
                      {currentUser && userOwnedGames.length > 0 && (
                        <h3 style={{ 
                          fontSize: 'var(--font-size-lg)',
                          color: 'var(--color-gray-700)',
                          margin: 'var(--spacing-4) 0',
                          paddingBottom: 'var(--spacing-2)',
                          borderBottom: '1px solid var(--color-gray-200)'
                        }}>
                          Other Public Games
                        </h3>
                      )}
                      {renderGamesList(otherPublicGames, false, handleDeleteClick)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Modifiable Templates Column */}
          {isTeacher && (
            <div style={{ 
              padding: 'var(--spacing-6)',
              backgroundColor: 'white',
              borderRadius: 'var(--border-radius-lg)',
              boxShadow: 'var(--shadow-md)'
            }}>
              <h2 style={{ 
                fontSize: 'var(--font-size-2xl)',
                color: 'var(--color-gray-800)',
                marginBottom: 'var(--spacing-4)'
              }}>
                Modifiable Game Templates
              </h2>
              <SearchBar onSearch={setModifiableSearch} />
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>
                    Loading templates...
                  </div>
                ) : (
                  renderTemplatesList(
                    modifiableTemplates.filter(template => template.title.toLowerCase().includes(modifiableSearch.toLowerCase())),
                    false,
                    (template) => handleTemplateClick(template),
                    handleDeleteClick
                  )
                )}
              </div>
            </div>
          )}

          {/* Blank Templates Column */}
          {isTeacher && (
            <div style={{ 
              padding: 'var(--spacing-6)',
              backgroundColor: 'white',
              borderRadius: 'var(--border-radius-lg)',
              boxShadow: 'var(--shadow-md)'
            }}>
              <h2 style={{ 
                fontSize: 'var(--font-size-2xl)',
                color: 'var(--color-gray-800)',
                marginBottom: 'var(--spacing-4)'
              }}>
                Blank Game Templates
              </h2>
              <SearchBar onSearch={setBlankSearch} />
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>
                    Loading templates...
                  </div>
                ) : (
                  <>
                    {/* Hard-coded Sentence Sense Template */}
                    <GameItemDisplay
                      title="Sentence Sense - Word Arrangement"
                      type="sentence-sense"
                      isPlayable={false}
                      onClick={() => {
                        console.log('🔍 Clicking hard-coded Sentence Sense template');
                        navigate('/configure/sentence-sense');
                      }}
                    />
                    
                    {/* Database-loaded templates */}
                    {(() => {
                      const filteredTemplates = blankTemplates.filter(template => 
                        template.title.toLowerCase().includes(blankSearch.toLowerCase())
                      );
                      console.log('🔍 Filtered blank templates for rendering:', {
                        totalBlankTemplates: blankTemplates.length,
                        filteredCount: filteredTemplates.length,
                        searchTerm: blankSearch,
                        filteredTemplates: filteredTemplates
                      });
                      
                      return renderTemplatesList(
                        filteredTemplates,
                        false,
                        (template) => {
                          console.log('🔍 Template click handler created for:', template.title, template.type);
                          return handleTemplateClick(template, true);
                        }
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Render the confirmation dialog */}
      <DeleteConfirmationDialog />
    </div>
  );
};

export default Home; 