import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDocs, deleteDoc, doc, query, where, getDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCustomToast, ToastComponent } from '../hooks/useCustomToast';
import { getTeacherAssignments, deleteAssignment, getAssignmentAttempts, createAssignmentWithEmailLink, createAssignment } from '../services/assignmentService';
import { Assignment as AssignmentType, Attempt } from '../types';
import { generateAndUploadThumbnail } from '../utils/thumbnailGenerator';
import { useNavigate, useLocation } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import { useFolderManager } from '../components/FolderManager';
import { UnorganizedDropZone } from '../components/UnorganizedDropZone';
import { DraggableGameCard } from '../components/DraggableGameCard';
import { SimpleFolderTree } from '../components/SimpleFolderTree';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { GameWithFolder } from '../types/game';
import { useModal } from '../contexts/ModalContext';
import { GlobalModals } from '../components/GlobalModals';
import { StudentsTab, AssignmentsTab } from './teacher-dashboard';

// Utility function to manage game type filter memory
const GAME_TYPE_FILTER_KEY = 'teacher-dashboard-game-type-filter';
const MEMORY_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

const saveGameTypeFilter = (filterValue: string) => {
  const data = {
    value: filterValue,
    timestamp: Date.now()
  };
  localStorage.setItem(GAME_TYPE_FILTER_KEY, JSON.stringify(data));
};

const loadGameTypeFilter = (): string => {
  try {
    const saved = localStorage.getItem(GAME_TYPE_FILTER_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      const now = Date.now();
      const elapsed = now - data.timestamp;
      
      // If within 15 minutes, return the saved value
      if (elapsed < MEMORY_DURATION) {
        return data.value;
      } else {
        // Remove expired data
        localStorage.removeItem(GAME_TYPE_FILTER_KEY);
      }
    }
  } catch (error) {
    console.error('Error loading game type filter:', error);
    localStorage.removeItem(GAME_TYPE_FILTER_KEY);
  }
  return 'all'; // Default value
};

interface Game extends GameWithFolder {
  id: string;
  title: string;
  description?: string;
  gameType?: string;
  thumbnailUrl?: string;
  createdBy: string;
  share: boolean;
  userId: string;
  // Folder properties from GameWithFolder
  folderId?: string;
  folderName?: string;
  folderColor?: string;
}

interface GameTemplate {
  id: string;
  title: string;
  type: string;
  categories?: any[];
  eggQty?: number;
  thumbnail?: string;
  gameTime?: number;
  speed?: number;
  userId?: string;
  createdBy?: string;
}

// Student interface
interface Student {
  id: string;
  name: string;
  email: string;
  grade?: string;
  age?: number;
  notes?: string;
  createdAt: Timestamp;
  passwordSetupSent?: boolean; // Track if password setup email was sent
}

type TabType = 'assignments' | 'create' | 'students';

// Use the proper Assignment type from types
type Assignment = AssignmentType;

const TeacherDashboard = () => {
  const { currentUser } = useAuth();
  const { toastMessage, showToast } = useCustomToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { showModal } = useModal();
  
  // Check if we're returning from student view
  useEffect(() => {
    if (location.state && location.state.activeTab) {
      setActiveTab(location.state.activeTab as TabType);
    }
  }, [location]);

  const [myGames, setMyGames] = useState<Game[]>([]);
  const [publicGames, setPublicGames] = useState<Game[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  const [assignmentAttempts, setAssignmentAttempts] = useState<Attempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [gameSearchQuery, setGameSearchQuery] = useState<string>('');
  const [gameTypeFilter, setGameTypeFilter] = useState<string>(loadGameTypeFilter());
  const [gameFolderFilter, setGameFolderFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  
  // Game template state
  const [blankTemplates, setBlankTemplates] = useState<GameTemplate[]>([]);
  const [categoryTemplates, setCategoryTemplates] = useState<GameTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Student management state
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  
  // Public games search and filter state
  const [publicGameSearchQuery, setPublicGameSearchQuery] = useState<string>('');
  const [publicGameTypeFilter, setPublicGameTypeFilter] = useState<string>('all');
  const [publicGameCreatorFilter, setPublicGameCreatorFilter] = useState<string>('all');
  
  // Add state to track last visited tab for returning from student view
  const [lastTabBeforeStudentView, setLastTabBeforeStudentView] = useState<TabType>('students');
  
  // Add state for assignment status filter
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | 'active' | 'overdue' | 'completed'>('all');
  
  // State for assignment folder handlers
  const [assignmentFolderHandlers, setAssignmentFolderHandlers] = useState<any>(null);
  
  // Function to get student display name from email
  const getStudentDisplayName = (studentEmail: string): string => {
    return students.find(student => student.email === studentEmail)?.name || 
           studentEmail.split('@')[0] || 'Unknown Student';
  };
  
  // Refs for edit handlers
  const gameToEditRef = useRef<Game | null>(null);

  // Initialize folder manager hook
  const folderManager = useFolderManager({
    userId: currentUser?.uid || '',
    games: myGames as GameWithFolder[],
    onGamesUpdate: (games) => setMyGames(games as Game[]),
    onShowToast: showToast
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced distance for more responsive drag start
      },
    })
  );

  // Drag state for visual feedback
  const [activeItem, setActiveItem] = useState<{
    type: 'game' | 'folder';
    id: string;
    data?: any;
  } | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const dragData = active.data.current;
    
    console.log('🚀 Drag start:', { activeId: active.id, dragData });
    
    if (dragData) {
      setActiveItem({
        id: active.id as string,
        type: dragData.type,
        data: dragData.folder || dragData.game
      });
    }
  }, []);

  const handleDragOver = useCallback((event: any) => {
    const { active, over } = event;
    
    if (over && over.id && over.data.current?.type === 'folder') {
      console.log('🎯 Drag over folder:', { 
        activeId: active.id, 
        overId: over.id,
        overFolder: over.data.current?.folder?.name,
        overType: over.data.current?.type
      });
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('🎯 Drag end:', { 
      activeId: active.id, 
      overId: over?.id,
      activeType: active.data.current?.type,
      overType: over?.data.current?.type,
      overData: over?.data.current
    });
    
    if (active && over && active.id !== over.id) {
      const dragData = active.data.current;
      const dropData = over.data.current;
      
      console.log('📦 Drop data detailed:', { 
        dragData, 
        dropData,
        activeId: active.id,
        overId: over.id,
        dragType: dragData?.type,
        dropType: dropData?.type 
      });
      
      if (dragData && dropData) {
        const dropResult = {
          draggedItem: {
            id: active.id as string,
            type: dragData.type,
            data: dragData.folder || dragData.game
          },
          targetFolderId: over.id as string,
          newParentId: dropData.type === 'folder' ? over.id as string : 
                      dropData.type === 'unorganized' ? null : null
        };
        
        console.log('🔄 Calling handleDrop with:', dropResult);
        folderManager.handleDrop(dropResult);
      } else {
        console.log('❌ Missing drag or drop data:', { dragData, dropData });
      }
    } else {
      console.log('❌ Drop conditions not met:', {
        hasActive: !!active,
        hasOver: !!over,
        sameId: active?.id === over?.id,
        activeId: active?.id,
        overId: over?.id
      });
    }
    
    setActiveItem(null);
  }, [folderManager]);



  // Add click-away handler and keyboard support for folder actions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle if there's an active selection
      if (!folderManager.selectedFolderId) return;
      
      // Check if the click is outside of any folder button or action area
      const target = event.target as HTMLElement;
      const folderButton = target.closest('[data-folder-button]');
      const folderActions = target.closest('[data-folder-actions]');
      
      // If click is not on a folder button or its actions, clear selection
      if (!folderButton && !folderActions) {
        folderManager.setSelectedFolderId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Close folder actions on ESC key
      if (event.key === 'Escape' && folderManager.selectedFolderId) {
        folderManager.setSelectedFolderId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [folderManager.selectedFolderId, folderManager.setSelectedFolderId]);

  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Fetch from userGameConfigs collection instead of games
      const userGameConfigsCollection = collection(db, 'userGameConfigs');
      
      const gameSnapshot = await getDocs(userGameConfigsCollection);
      
      if (gameSnapshot.empty) {
        setMyGames([]);
        setPublicGames([]);
        setIsLoading(false);
        return;
      }
      
      // Convert all games to our Game interface
      const allGames = gameSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Adapt the userGameConfigs data structure to our Game interface
        return {
          id: doc.id,
          title: data.title || 'Untitled Game',
          description: data.description || '',
          gameType: data.type || 'Unknown',
          thumbnailUrl: data.thumbnail || null,
          createdBy: data.email || '',
          share: data.share || false,
          userId: data.userId || '',
          // Folder properties from GameWithFolder
          folderId: data.folderId || '',
          folderName: data.folderName || '',
          folderColor: data.folderColor || ''
        };
      });
      
      // Filter games into my games and public games
      // My games: games created by current user (based on email)
      const myGamesList = allGames.filter(game => 
        game.createdBy === currentUser?.email || game.userId === currentUser?.uid
      );
      
      // Public games: games shared by others
      const publicGamesList = allGames.filter(game => 
        game.share === true && 
        game.createdBy !== currentUser?.email && 
        game.userId !== currentUser?.uid
      );
      
      setMyGames(myGamesList);
      setPublicGames(publicGamesList);
      
    } catch (error) {
      console.error('Error fetching games:', error);
      showToast({
        title: 'Error fetching games',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.email, currentUser?.uid, showToast]);

  const fetchAssignments = useCallback(async () => {
    try {
      if (currentUser?.uid) {
        const teacherAssignments = await getTeacherAssignments(currentUser.uid);
        setAssignments(teacherAssignments);
      }
    } catch {
      showToast({
        title: 'Error fetching assignments',
        status: 'error',
        duration: 3000,
      });
    }
  }, [currentUser?.uid, showToast]);

  // Function to fetch game templates
  const fetchGameTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    
    try {
      // Fetch blank game templates
      const blankTemplatesCollection = collection(db, 'blankGameTemplates');
      const blankTemplatesSnapshot = await getDocs(blankTemplatesCollection);
      
      const blankTemplatesList = blankTemplatesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          userId: data.userId || '',
          createdBy: data.createdBy || data.email || ''
        };
      }) as GameTemplate[];
      
      // Fetch category/modifiable templates
      const categoryTemplatesCollection = collection(db, 'categoryTemplates');
      const categoryTemplatesSnapshot = await getDocs(categoryTemplatesCollection);
      
      const categoryTemplatesList = categoryTemplatesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          userId: data.userId || '',
          createdBy: data.createdBy || data.email || ''
        };
      }) as GameTemplate[];
      
      // Sort blankTemplates by game type (alphabetically), then by title (alphanumerically)
      const sortedBlankTemplates = blankTemplatesList.sort((a, b) => {
        // First sort by game type alphabetically
        const typeComparison = (a.type || '').localeCompare(b.type || '');
        if (typeComparison !== 0) {
          return typeComparison;
        }
        
        // If types are the same, sort by title alphanumerically
        return (a.title || '').localeCompare(b.title || '', undefined, { 
          numeric: true, 
          sensitivity: 'base' 
        });
      });
      
      setBlankTemplates(sortedBlankTemplates);
      setCategoryTemplates(categoryTemplatesList);
    } catch (error) {
      console.error('Error fetching game templates:', error);
      showToast({
        title: 'Error fetching templates',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [showToast]);
  
  // Load templates when the Create Games tab is selected
  useEffect(() => {
    if (activeTab === 'create') {
      fetchGameTemplates();
    }
  }, [activeTab, fetchGameTemplates]);

  // Normalize template card titles for the Start Creating grid
  const getTemplateDisplayTitle = (template: any): string => {
    const raw = String(template?.title || '').trim();
    const isPlaceholder = raw.length === 0 || /enter\s+.*title/i.test(raw);
    if (!isPlaceholder) return raw;
    const type = String(template?.type || '').toLowerCase();
    const defaults: Record<string, string> = {
      'anagram': 'Anagram Game',
      'sort-categories-egg': 'Sort Categories Game',
      'spinner-wheel': 'Spinner Wheel',
      'sentence-sense': 'Sentence Sense',
      'place-value-showdown': 'Place Value Showdown',
      'whack-a-mole': 'Whack-a-Mole Game',
      'word-volley': 'Word Volley Game',
      'name-it': 'Name It Game'
    };
    return defaults[type] || 'Untitled';
  };

  // Fetch students when the Students tab is selected
  useEffect(() => {
    if (activeTab === 'students' && currentUser) {
      fetchStudents();
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchGames();
      fetchAssignments();
    }
  }, [currentUser, fetchGames, fetchAssignments]);

  const handleDeleteGame = async (gameId: string) => {
    const startTime = Date.now();
    console.log('🗑️ handleDeleteGame called with gameId:', gameId, 'at timestamp:', startTime);
    try {
      console.log('🗑️ Starting game deletion...');
      await deleteDoc(doc(db, 'userGameConfigs', gameId));
      console.log('🗑️ Game deleted successfully from database, took:', Date.now() - startTime, 'ms');
      
      setMyGames(myGames.filter(game => game.id !== gameId));
      console.log('🗑️ Updated games state');
      
      showToast({
        title: 'Game deleted',
        status: 'success',
        duration: 3000,
      });
      console.log('🗑️ Game deletion completed successfully, total time:', Date.now() - startTime, 'ms');
    } catch (error) {
      console.error('🗑️ Error deleting game:', error);
      showToast({
        title: 'Error deleting game',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const confirmDeleteGame = (gameId: string) => {
    console.log('🔵 confirmDeleteGame called with gameId:', gameId);
    
    // Find the game to get its details
    const game = myGames.find(g => g.id === gameId);
    if (!game) {
      console.warn('🟡 confirmDeleteGame: Game not found:', gameId);
      return;
    }
    
    console.log('🔵 confirmDeleteGame: Showing modal for game:', {
      gameId,
      gameName: game.title
    });
    
    // Show the global delete confirmation modal
    showModal('delete-confirmation', {
      title: 'Delete Game?',
      itemName: game.title,
      itemType: 'game',
      warningMessage: undefined,
      onDelete: () => handleDeleteGame(gameId)
    });
  };

  const cancelDeleteGame = () => {
    console.log('🔵 cancelDeleteGame called');
    // No cleanup needed since we're using global modal
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    const startTime = Date.now();
    console.log('🗑️ handleDeleteAssignment called with assignmentId:', assignmentId, 'at timestamp:', startTime);
    try {
      console.log('🗑️ Starting assignment deletion...');
      await deleteAssignment(assignmentId);
      console.log('🗑️ Assignment deleted successfully from database, took:', Date.now() - startTime, 'ms');
      
      setAssignments(assignments.filter(assignment => assignment.id !== assignmentId));
      console.log('🗑️ Updated assignments state');
      
      showToast({
        title: 'Assignment deleted',
        status: 'success',
        duration: 3000,
      });
      console.log('🗑️ Assignment deletion completed successfully, total time:', Date.now() - startTime, 'ms');
    } catch (error) {
      console.error('🗑️ Error deleting assignment:', error);
      showToast({
        title: 'Error deleting assignment',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const confirmDeleteAssignment = (assignmentId: string) => {
    console.log('🔵 confirmDeleteAssignment called with assignmentId:', assignmentId);
    
    // Find the assignment to get its details
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      console.warn('🟡 confirmDeleteAssignment: Assignment not found:', assignmentId);
      return;
    }
    
    console.log('🔵 confirmDeleteAssignment: Showing modal for assignment:', {
      assignmentId,
      assignmentName: assignment.gameName,
      studentEmail: assignment.studentEmail
    });
    
    // Show the global delete confirmation modal
    showModal('delete-confirmation', {
      title: 'Delete Assignment?',
      itemName: `${assignment.gameName} (${assignment.studentEmail})`,
      itemType: 'assignment',
      warningMessage: undefined,
      onDelete: () => handleDeleteAssignment(assignmentId)
    });
  };

  const cancelDeleteAssignment = () => {
    console.log('🔵 cancelDeleteAssignment called');
    // No cleanup needed since we're using global modal
  };

  const handleViewAssignment = async (assignment: Assignment) => {
    setLoadingAttempts(true);
    
    try {
      let attempts: any[] = [];
      if (assignment.id) {
        attempts = await getAssignmentAttempts(assignment.id);
      }
      
      showModal('assignment-details', {
        assignment,
        attempts,
        isLoadingAttempts: false
      });
    } catch (error) {
      console.error('Error fetching attempts:', error);
      showToast({
        title: 'Error fetching attempts',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoadingAttempts(false);
    }
  };

  const closeViewAssignment = () => {
    // This function is no longer needed since we use global modal
  };

  // Filter assignments based on search query
  const filteredAssignments = assignments.filter(assignment => {
    const query = searchQuery.toLowerCase();
    return (
      assignment.gameName.toLowerCase().includes(query) || 
      assignment.studentEmail.toLowerCase().includes(query)
    );
  });

  // Filter games based on search query, type, and folder
  const getFilteredGames = useCallback(() => {
    let baseGames = myGames;
    
    // First apply folder selection (this is the existing logic)
    if (folderManager.selectedFolderId) {
      baseGames = folderManager.getGamesInFolder(folderManager.selectedFolderId) as Game[];
    }
    
    // Then apply search and filter logic
    return baseGames.filter(game => {
      // Text search filter
      const matchesSearch = !gameSearchQuery || 
        game.title.toLowerCase().includes(gameSearchQuery.toLowerCase()) ||
        (game.description || '').toLowerCase().includes(gameSearchQuery.toLowerCase()) ||
        (game.gameType || '').toLowerCase().includes(gameSearchQuery.toLowerCase());
      
      // Game type filter
      const matchesType = gameTypeFilter === 'all' || 
        (game.gameType || '').toLowerCase().includes(gameTypeFilter.toLowerCase());
      
      // Folder filter (additional layer on top of folder selection)
      let matchesFolder = true;
      if (gameFolderFilter !== 'all' && !folderManager.selectedFolderId) {
        if (gameFolderFilter === 'unorganized') {
          matchesFolder = !game.folderId;
        } else if (gameFolderFilter === 'in-folders') {
          matchesFolder = !!game.folderId;
        }
      }
      
      return matchesSearch && matchesType && matchesFolder;
    }).sort((a, b) => {
      // First sort by game type alphabetically
      const typeComparison = (a.gameType || '').localeCompare(b.gameType || '');
      if (typeComparison !== 0) {
        return typeComparison;
      }
      
      // If types are the same, sort by title alphanumerically
      return (a.title || '').localeCompare(b.title || '', undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      });
    });
  }, [myGames, gameSearchQuery, gameTypeFilter, gameFolderFilter, folderManager.selectedFolderId, folderManager]);

  // Filter public games based on search query and type
  const getFilteredPublicGames = useCallback(() => {
    return publicGames.filter(game => {
      // Text search filter
      const matchesSearch = !publicGameSearchQuery || 
        game.title.toLowerCase().includes(publicGameSearchQuery.toLowerCase()) ||
        (game.description || '').toLowerCase().includes(publicGameSearchQuery.toLowerCase()) ||
        (game.gameType || '').toLowerCase().includes(publicGameSearchQuery.toLowerCase());
      
      // Game type filter
      const matchesType = publicGameTypeFilter === 'all' || 
        (game.gameType || '').toLowerCase().includes(publicGameTypeFilter.toLowerCase());
      
      return matchesSearch && matchesType;
    }).sort((a, b) => {
      // First sort by game type alphabetically
      const typeComparison = (a.gameType || '').localeCompare(b.gameType || '');
      if (typeComparison !== 0) {
        return typeComparison;
      }
      
      // If types are the same, sort by title alphanumerically
      return (a.title || '').localeCompare(b.title || '', undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      });
    });
  }, [publicGames, publicGameSearchQuery, publicGameTypeFilter]);

  const handleCreateAssignment = (game: Game) => {
    // Use global modal for assignment creation
    showModal('assignment-creation', { game });
    console.log(`Opening assignment modal for ${game.title}`);
  };

  const handleCancelAssignment = () => {
    // No cleanup needed for global modal
  };

  const handleAssignGame = async (game: any, studentEmails: string[], deadline: Date, timesRequired: number) => {
    console.log(`Assigning ${game.title} to ${studentEmails.length} student(s)`);
    console.log(`Deadline: ${deadline}, Times to complete: ${timesRequired}`);
    
    try {
      // Create assignments for each student
      for (const studentEmail of studentEmails) {
      // Create assignment data
      const assignmentData = {
        gameName: game.title,
        gameId: game.id,
        gameType: game.gameType || 'Unknown',
        studentEmail: studentEmail,
        teacherId: currentUser?.uid || '',
        teacherEmail: currentUser?.email || '',
        timesRequired: timesRequired,
        deadline: Timestamp.fromDate(deadline),
      };
      
      // Always use standard assignment creation (simplified approach)
      const assignmentId = await createAssignment(assignmentData);
      console.log('Successfully created assignment, ID:', assignmentId);
      }
      
      // Refresh assignments list
      fetchAssignments();
    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error; // Re-throw so the global modal can handle the error
    }
  };

  // Handle template click to navigate to game configuration page
  const handleTemplateClick = (template: GameTemplate) => {
    console.log('🎯 handleTemplateClick called with template:', template);
    console.log('🎯 Template type:', template.type);
    console.log('🎯 Template ID:', template.id);
    
    // Store the template ID in sessionStorage for auto-selection
    if (template.id) {
      sessionStorage.setItem('selectedTemplateId', template.id);
    }
    
    // Navigate to the correct configuration page based on the template type
    if (template.type === 'whack-a-mole') {
      // If there's a template ID for editing, include it in the path
      if (template.id) {
        navigate(`/configure/whack-a-mole/${template.id}`);
      } else {
        navigate('/configure/whack-a-mole');
      }
    } else if (template.type === 'sort-categories-egg') {
      // If there's a template ID for editing, include it in the path
      if (template.id) {
        navigate(`/configure/sort-categories-egg/${template.id}`);
      } else {
        navigate('/configure/sort-categories-egg');
      }
    } else if (template.type === 'spinner-wheel') {
      // If there's a template ID for editing, include it in the path
      if (template.id) {
        navigate(`/configure/spinner-wheel/${template.id}`);
      } else {
        navigate('/configure/spinner-wheel');
      }
    } else if (template.type === 'anagram') {
      // If there's a template ID for editing, include it in the path
      if (template.id) {
        navigate(`/configure/anagram/${template.id}`);
      } else {
        navigate('/configure/anagram');
      }
    } else if (template.type === 'place-value-showdown') {
      // If there's a template ID for editing, include it in the path
      if (template.id) {
        navigate(`/configure/place-value-showdown/${template.id}`);
      } else {
        navigate('/configure/place-value-showdown');
      }
    } else if (template.type === 'sentence-sense') {
      console.log('🎯 Navigating to sentence-sense configuration');
      // If there's a template ID for editing, include it in the path
      if (template.id) {
        console.log('🎯 Navigating with template ID:', template.id);
        navigate(`/configure/sentence-sense/${template.id}`);
      } else {
        console.log('🎯 Navigating without template ID');
        navigate('/configure/sentence-sense');
      }
    } else if (template.type === 'word-volley') {
      console.log('🎯 Navigating to word-volley configuration');
      // If there's a template ID for editing, include it in the path
      if (template.id) {
        console.log('🎯 Navigating with template ID:', template.id);
        navigate(`/configure/word-volley/${template.id}`);
      } else {
        console.log('🎯 Navigating without template ID');
        navigate('/configure/word-volley');
      }
    } else if (template.type === 'name-it') {
      console.log('🎯 Navigating to name-it configuration');
      // If there's a template ID for editing, include it in the path
      if (template.id) {
        console.log('🎯 Navigating with template ID:', template.id);
        navigate(`/configure/name-it/${template.id}`);
      } else {
        console.log('🎯 Navigating without template ID');
        navigate('/configure/name-it');
      }
    } else {
      console.log('🎯 Unknown template type, navigating to default /configure');
      // Default to the configuration router for unknown types
      navigate('/configure');
    }
  };






  // Template item component
  const TemplateItem = ({ template, onClick }: { template: GameTemplate, onClick: () => void }) => {
    const getItemStyle = () => {
      switch(template.type) {
        case 'whack-a-mole':
          return { bgColor: '#e6fff0', icon: '🔨' };
        case 'sort-categories-egg':
          return { bgColor: '#f0e6ff', icon: '🥚' };
        case 'spinner-wheel':
          return { bgColor: '#fff5e6', icon: '🎡' };
        case 'anagram':
          return { bgColor: '#e6f3ff', icon: '🧩' };
        case 'place-value-showdown':
          return { bgColor: '#ffe6e6', icon: '🎯' };
        case 'sentence-sense':
          return { bgColor: '#e8f5e8', icon: '📝' };
        case 'word-volley':
          return { bgColor: '#fff2e6', icon: '🏓' };
        default:
          return { bgColor: '#f0f0f0', icon: '🎮' };
      }
    };
    
    const { bgColor, icon } = getItemStyle();
    
    // Check if this template is in the categoryTemplates array (modifiable template)
    const isModifiableTemplate = categoryTemplates.some(t => t.id === template.id);
    
    // Check if this template is in the blankTemplates array (blank template)
    const isBlankTemplate = blankTemplates.some(t => t.id === template.id);
    
    // Check if the current user is the template owner
    const isTemplateOwner = 
      (template.userId && template.userId === currentUser?.uid) ||
      (template.createdBy && template.createdBy === currentUser?.email);
    
    // Only show delete button for modifiable templates that user owns
    const showDeleteButton = isModifiableTemplate && isTemplateOwner;
    
    // Show edit button for blank templates
    const showEditButton = isBlankTemplate;
    
    const handleDeleteClick = (e: React.MouseEvent) => {
      // Stop propagation to prevent template click handler from firing
      e.stopPropagation();
      
      // Confirm deletion
      confirmDeleteTemplate(template.id);
    };
    
    const handleEditClick = (e: React.MouseEvent) => {
      // Stop propagation to prevent template click handler from firing
      e.stopPropagation();
      
      // Use the same logic as handleTemplateClick to navigate to config page
      handleTemplateClick(template);
    };
    
    return (
      <div 
        style={{ 
          display: 'flex',
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '12px',
          cursor: 'pointer',
          border: '1px solid #E2E8F0',
          justifyContent: 'space-between'
        }}
        onClick={onClick}
      >
        <div style={{ display: 'flex' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '8px',
            backgroundColor: bgColor,
            marginRight: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            {template.thumbnail ? (
              <img 
                src={template.thumbnail} 
                alt={template.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
              />
            ) : icon}
          </div>
          <div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              marginBottom: '16px',
              color: '#2D3748'
            }}>
              {getTemplateDisplayTitle(template)}
            </h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Type: {template.type}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {showEditButton && (
            <button
              onClick={handleEditClick}
              style={{
                padding: '6px 12px',
                backgroundColor: '#4299E1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Edit template (creates a copy)"
            >
              ✏️ Edit
            </button>
          )}
          
          {showDeleteButton && (
            <button
              onClick={handleDeleteClick}
              style={{
                padding: '6px 12px',
                backgroundColor: '#F56565',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    );
  };

  // Handler for deleting a template
  const handleDeleteTemplate = async (templateId: string) => {
    const startTime = Date.now();
    console.log('🗑️ handleDeleteTemplate called with templateId:', templateId, 'at timestamp:', startTime);
    try {
      console.log('🗑️ Starting template deletion...');
      // First check if it's in the categoryTemplates collection
      await deleteDoc(doc(db, 'categoryTemplates', templateId));
      console.log('🗑️ Template deleted successfully from database, took:', Date.now() - startTime, 'ms');
      
      // Update the templates list
      setCategoryTemplates(categoryTemplates.filter(template => template.id !== templateId));
      console.log('🗑️ Updated templates state');
      
      showToast({
        title: 'Template deleted',
        status: 'success',
        duration: 3000,
      });
      console.log('🗑️ Template deletion completed successfully, total time:', Date.now() - startTime, 'ms');
    } catch (error) {
      console.error('🗑️ Error deleting template:', error);
      showToast({
        title: 'Error deleting template',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Function to confirm template deletion
  const confirmDeleteTemplate = (templateId: string) => {
    console.log('🔵 confirmDeleteTemplate called with templateId:', templateId);
    
    // Find the template to get its details
    const template = categoryTemplates.find(t => t.id === templateId);
    if (!template) {
      console.warn('🟡 confirmDeleteTemplate: Template not found:', templateId);
      return;
    }
    
    console.log('🔵 confirmDeleteTemplate: Showing modal for template:', {
      templateId,
      templateName: template.title
    });
    
    // Show the global delete confirmation modal
    showModal('delete-confirmation', {
      title: 'Delete Template?',
      itemName: template.title,
      itemType: 'template',
      warningMessage: undefined,
      onDelete: () => handleDeleteTemplate(templateId)
    });
  };

  const cancelDeleteTemplate = () => {
    console.log('🔵 cancelDeleteTemplate called');
    // No cleanup needed since we're using global modal
  };

  // Template delete confirmation modal component

  // Function to fetch students for the current teacher
  const fetchStudents = async () => {
    if (!currentUser) return;
    
    setIsLoadingStudents(true);
    try {
      // Use the users collection instead of students
      const usersCollection = collection(db, 'users');
      // Query for users with role 'student' and associated with the current teacher
      const q = query(
        usersCollection, 
        where('role', '==', 'student'), 
        where('teacherId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const studentsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          grade: data.grade || '',
          age: data.age || 0,
          notes: data.notes || '',
          createdAt: data.createdAt || Timestamp.now(),
          passwordSetupSent: data.passwordSetupSent || false
        } as Student;
      });
      
      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast({
        title: 'Error fetching students',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoadingStudents(false);
    }
  };
  
  // Function to add a new student with email-based password setup
  const handleAddStudent = async (studentData: {
    name: string;
    email: string;
    grade: string;
    age: number;
    notes: string;
  }) => {
    if (!currentUser) return;
    
    try {
      console.log('Creating student record for:', studentData.email);
      
      const newStudentData = {
        name: studentData.name,
        email: studentData.email,
        grade: studentData.grade,
        age: studentData.age,
        notes: studentData.notes,
        role: 'student',
        teacherId: currentUser.uid,
        teacherEmail: currentUser.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Authentication and account linking fields
        displayName: studentData.name,
        hasTemporaryPassword: true, // Enables automatic Google Sign-In linking
        linkedToAuth: false, // Will be set to true after Firebase Auth user is created
        authUid: '', // Will be set by Firebase Function with the Auth UID
        emailVerified: false,
        passwordSetupSent: false, // Will be updated by the trigger
        passwordSetupComplete: false,
        lastLogin: null,
        // Additional metadata
        createdBy: 'teacher',
        source: 'teacher_dashboard'
      };
      
      // Add to users collection
      const docRef = await addDoc(collection(db, 'users'), newStudentData);
      
      // Add the new student to the local state
      const newStudent = {
        id: docRef.id,
        name: studentData.name,
        email: studentData.email,
        grade: studentData.grade,
        age: studentData.age,
        notes: studentData.notes,
        createdAt: Timestamp.now(),
        passwordSetupSent: false
      } as Student;
      
      setStudents([...students, newStudent]);
      
      // The password setup email will be sent automatically by the 
      // sendPasswordSetupEmail trigger when the student document is created
      
      showToast({
        title: 'Student added successfully',
        description: `Password setup email will be sent automatically to ${studentData.email}`,
        status: 'success',
        duration: 5000,
      });
      
    } catch (error) {
      console.error('Error adding student:', error);
      showToast({
        title: 'Error adding student',
        status: 'error',
        duration: 3000,
      });
    }
  };
  
  // Function to confirm student deletion
  const confirmDeleteStudent = (studentId: string) => {
    console.log('🔵 confirmDeleteStudent called with studentId:', studentId);
    
    // Find the student to get its details
    const student = students.find(s => s.id === studentId);
    if (!student) {
      console.warn('🟡 confirmDeleteStudent: Student not found:', studentId);
      return;
    }
    
    console.log('🔵 confirmDeleteStudent: Showing modal for student:', {
      studentId,
      studentName: student.name
    });
    
    // Show the global delete confirmation modal
    showModal('delete-confirmation', {
      title: 'Delete Student?',
      itemName: student.name,
      itemType: 'student',
      warningMessage: 'All associated assignments will remain but will no longer be linked to this student.',
      onDelete: () => handleDeleteStudent(studentId)
    });
  };
  
  // Function to cancel student deletion
  const cancelDeleteStudent = () => {
    console.log('🔵 cancelDeleteStudent called');
    // No cleanup needed since we're using global modal
  };
  
  // Function to open the add student modal
  const openAddStudentModal = () => {
    console.log('🔵 openAddStudentModal called');
    showModal('student-modal', {
      student: null // null indicates creating a new student
    });
  };
  
  // Function to open the edit student modal
  const openEditStudentModal = (student: Student) => {
    console.log('🔵 openEditStudentModal called with student:', student);
    showModal('student-modal', {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        grade: student.grade || '',
        age: student.age || 0,
        notes: student.notes || ''
      }
    });
  };

  // Function to open the student notes modal
  const openStudentNotesModal = (student: Student) => {
    console.log('🔵 openStudentNotesModal called with student:', student);
    showModal('student-notes', {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        notes: student.notes || ''
      }
    });
  };

  // Function to save student notes
  const handleSaveStudentNotes = async (studentId: string, notes: string) => {
    try {
      console.log('Saving student notes:', studentId, notes);
      
      // Update in users collection
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, { 
        notes: notes,
        updatedAt: serverTimestamp()
      });
      
      // Update the student in the local state
      setStudents(students.map(s => 
        s.id === studentId ? { ...s, notes: notes } : s
      ));
      
      showToast({
        title: 'Notes saved successfully',
        status: 'success',
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Error saving student notes:', error);
      showToast({
        title: 'Error saving notes',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Function to handle viewing a student's dashboard
  const handleViewStudentDashboard = (student: Student) => {
    // Remember which tab we're coming from for navigation back
    setLastTabBeforeStudentView(activeTab);
    // Navigate to student dashboard with studentId parameter
    navigate(`/student?id=${student.id}&teacherView=true`);
  };

  // Filter assignments based on status
  const getStatusFilteredAssignments = () => {
    if (activeStatusFilter === 'all') return filteredAssignments;
    
    // Calculate today's date for overdue assignments
    const today = new Date();
    
    return filteredAssignments.filter(assignment => {
      const deadlineDate = assignment.deadline?.toDate();
      
      switch(activeStatusFilter) {
        case 'assigned':
          return assignment.status === 'assigned' || assignment.status === 'started';
        case 'overdue':
          return (assignment.status === 'assigned' || assignment.status === 'started') && 
                 deadlineDate && deadlineDate < today;
        case 'completed':
          return assignment.status === 'completed';
        default:
          return true;
      }
    });
  };
  
  // Status tabs component
  const renderStatusTabs = () => {
    const tabs = [
      { id: 'all', label: 'All' },
      { id: 'assigned', label: 'Assigned' },
      { id: 'overdue', label: 'Overdue' },
      { id: 'completed', label: 'Completed' }
    ];
    
    // Count assignments for each tab
    const counts = {
      assigned: filteredAssignments.filter(a => a.status === 'assigned' || a.status === 'started').length,
      overdue: filteredAssignments.filter(a => {
        const deadlineDate = a.deadline?.toDate();
        return (a.status === 'assigned' || a.status === 'started') && deadlineDate && deadlineDate < new Date();
      }).length,
      completed: filteredAssignments.filter(a => a.status === 'completed').length
    };
    
    return (
      <div style={{ 
        display: 'flex', 
        marginBottom: '16px', 
        borderBottom: '1px solid #E2E8F0'
      }}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveStatusFilter(tab.id)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              color: activeStatusFilter === tab.id ? '#4299E1' : '#718096',
              fontWeight: activeStatusFilter === tab.id ? 'bold' : 'normal',
              borderBottom: activeStatusFilter === tab.id ? '2px solid #4299E1' : 'none',
              marginBottom: activeStatusFilter === tab.id ? '-1px' : '0',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label} {tab.id !== 'all' && counts[tab.id as keyof typeof counts] > 0 && 
              `(${counts[tab.id as keyof typeof counts]})`
            }
          </div>
        ))}
      </div>
    );
  };

  // Function to handle playing a game
  const handlePlayGame = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  // Function to handle editing a game (with option to update or copy)
  const handleEditGame = (game: Game) => {
    gameToEditRef.current = game;
    showModal('edit-choice', { 
      gameName: game.title
    });
  };

  // Function to create navigation handlers for edit choices
  const createEditNavigationHandlers = (game: Game) => {
    // Navigate to the appropriate configuration page based on game type
    const gameType = game.gameType;
    let configRoute = '/configure';
    
    if (gameType === 'whack-a-mole') {
      configRoute = '/configure/whack-a-mole';
    } else if (gameType === 'sort-categories-egg') {
      configRoute = '/configure/sort-categories-egg';
    } else if (gameType === 'spinner-wheel') {
      configRoute = '/configure/spinner-wheel';
    } else if (gameType === 'anagram') {
      configRoute = '/configure/anagram';
    } else if (gameType === 'sentence-sense') {
      configRoute = '/configure/sentence-sense';
    } else if (gameType === 'place-value-showdown') {
      configRoute = '/configure/place-value-showdown';
    } else if (gameType === 'word-volley') {
      configRoute = '/configure/word-volley';
    } else if (gameType === 'name-it') {
      configRoute = '/configure/name-it';
    }
    
    return {
      handleUpdate: () => {
        // Edit the existing game
        navigate(`${configRoute}/${game.id}`);
      },
      handleCopy: () => {
        // Create a copy - pass the game ID as template and add copy query parameter
        navigate(`${configRoute}/${game.id}?copy=true`);
      }
    };
  };

  // Function to handle assigning a game to students
  const handleAssignGameFromCreated = (game: Game) => {
    showModal('assignment-creation', { game });
  };

  // Edit confirmation modal component

  // Function to update an existing student
  const handleUpdateStudent = async (studentId: string, studentData: Partial<Student>) => {
    try {
      console.log('Updating student:', studentId, studentData);
      
      // Update in users collection
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, studentData);
      
      // Update the student in the local state
      setStudents(students.map(s => 
        s.id === studentId ? { ...s, ...studentData } : s
      ));
      
      showToast({
        title: 'Student updated successfully',
        status: 'success',
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Error updating student:', error);
      showToast({
        title: 'Error updating student',
        status: 'error',
        duration: 3000,
      });
    }
  };
  
  // Function to delete a student
  const handleDeleteStudent = async (studentId: string) => {
    const startTime = Date.now();
    console.log('🗑️ handleDeleteStudent called with studentId:', studentId, 'at timestamp:', startTime);
    try {
      console.log('🗑️ Starting student deletion...');
      // Delete from users collection
      await deleteDoc(doc(db, 'users', studentId));
      console.log('🗑️ Student deleted successfully from database, took:', Date.now() - startTime, 'ms');
      
      // Remove the student from the local state
      setStudents(students.filter(student => student.id !== studentId));
      console.log('🗑️ Updated students state');
      
      showToast({
        title: 'Student deleted',
        status: 'success',
        duration: 3000,
      });
      console.log('🗑️ Student deletion completed successfully, total time:', Date.now() - startTime, 'ms');
    } catch (error) {
      console.error('🗑️ Error deleting student:', error);
      showToast({
        title: 'Error deleting student',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Handler for game type filter that saves to localStorage
  const handleGameTypeFilterChange = (value: string) => {
    setGameTypeFilter(value);
    saveGameTypeFilter(value);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
      <ToastComponent toastMessage={toastMessage} />



      <GlobalModals 
        onDeleteFolder={folderManager.handleDeleteFolder}
        onSaveFolder={folderManager.handleSaveFolder}
        onCancelFolder={folderManager.handleCancelFolder}
        onSaveStudent={(studentData, studentId) => {
          if (studentId) {
            handleUpdateStudent(studentId, studentData);
          } else {
            handleAddStudent(studentData);
          }
        }}
        onCancelStudent={() => {
          // No cleanup needed since we're using global modal
        }}
        onSaveStudentNotes={handleSaveStudentNotes}
        onUpdateGame={() => {
          const game = gameToEditRef.current;
          if (game) {
            const { handleUpdate } = createEditNavigationHandlers(game);
            handleUpdate();
          }
        }}
        onCopyGame={() => {
          const game = gameToEditRef.current;
          if (game) {
            const { handleCopy } = createEditNavigationHandlers(game);
            handleCopy();
          }
        }}
        onCancelEdit={() => {
          gameToEditRef.current = null;
        }}
        onCloseAssignmentDetails={closeViewAssignment}
        onAssignGame={handleAssignGame}
        onCancelAssignment={handleCancelAssignment}
        showToast={showToast}
      />
      
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '32px' }}>
        Create
      </h1>

      <div>
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #E2E8F0', 
          marginBottom: '24px'
        }}>
          <div
            onClick={() => setActiveTab('create')}
            style={{
              padding: '12px 24px',
              position: 'relative',
              cursor: 'pointer',
              color: activeTab === 'create' ? '#4299E1' : '#718096',
              fontWeight: activeTab === 'create' ? 'bold' : 'normal',
              borderBottom: activeTab === 'create' ? '2px solid #4299E1' : 'none',
              marginBottom: activeTab === 'create' ? '-1px' : '0',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
              backgroundColor: activeTab === 'create' ? '#EBF8FF' : 'transparent',
              borderRadius: '4px 4px 0 0'
            }}
          >
            Create Games
          </div>
          <div
            onClick={() => setActiveTab('assignments')}
            style={{
              padding: '12px 24px',
              position: 'relative',
              cursor: 'pointer',
              color: activeTab === 'assignments' ? '#4299E1' : '#718096',
              fontWeight: activeTab === 'assignments' ? 'bold' : 'normal',
              borderBottom: activeTab === 'assignments' ? '2px solid #4299E1' : 'none',
              marginBottom: activeTab === 'assignments' ? '-1px' : '0',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
              backgroundColor: activeTab === 'assignments' ? '#EBF8FF' : 'transparent',
              borderRadius: '4px 4px 0 0'
            }}
          >
            Track Assignments
          </div>
          <div
            onClick={() => setActiveTab('students')}
            style={{
              padding: '12px 24px',
              position: 'relative',
              cursor: 'pointer',
              color: activeTab === 'students' ? '#4299E1' : '#718096',
              fontWeight: activeTab === 'students' ? 'bold' : 'normal',
              borderBottom: activeTab === 'students' ? '2px solid #4299E1' : 'none',
              marginBottom: activeTab === 'students' ? '-1px' : '0',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
              backgroundColor: activeTab === 'students' ? '#EBF8FF' : 'transparent',
              borderRadius: '4px 4px 0 0'
            }}
          >
            My Students
          </div>
        </div>



        {activeTab === 'assignments' && (
          <AssignmentsTab
            currentUser={currentUser}
            showToast={showToast}
            students={students}
            onAssignmentHandlersReady={(handlers) => {
              // Store handlers for use by GlobalModals
              window.assignmentHandlers = handlers;
            }}
          />
        )}

        {activeTab === 'create' && (
          <div>
            {/* Sticky Sub-Navbar for Create sections */}
            <div style={{
              position: 'sticky',
              top: 64,
              zIndex: 5,
              background: 'white',
              padding: '8px 0',
              borderBottom: '1px solid #E2E8F0',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'start-creating', label: 'Start Creating' },
                  { id: 'my-created', label: 'My Created Games' },
                  { id: 'public-games', label: 'Public Games' }
                ].map(link => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: '#F3E8FF',
                      color: '#553C9A',
                      fontSize: 14,
                      textDecoration: 'none',
                      border: '1px solid #E9D8FD'
                    }}
                  >{link.label}</a>
                ))}
              </div>
            </div>
            {/* Start Creating Section - Moved to top */}
            <div id="start-creating" style={{ marginBottom: '48px', scrollMarginTop: 128 }}>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                marginBottom: '20px',
                color: '#2D3748',
                borderBottom: '2px solid #805AD5',
                paddingBottom: '8px'
              }}>
                Start Creating
              </h2>
              
            {isLoadingTemplates ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  backgroundColor: '#F7FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ fontSize: '16px', color: '#718096' }}>Loading templates...</div>
                </div>
              ) : blankTemplates.length > 0 ? (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                  gap: '20px' 
                }}>
                    {blankTemplates.map((template) => (
                    <div 
                        key={template.id} 
                        onClick={() => {
                          console.log('🎯 Template card clicked:', template);
                          handleTemplateClick(template);
                        }}
                      style={{ 
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        border: '2px solid #E2E8F0',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#805AD5';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E2E8F0';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        backgroundColor: template.type === 'whack-a-mole' ? '#C6F6D5' : 
                                        template.type === 'spinner-wheel' ? '#FED7D7' : 
                                        template.type === 'anagram' ? '#BFDBFE' : 
                                        template.type === 'sentence-sense' ? '#E8F5E8' :
                                        template.type === 'place-value-showdown' ? '#FFE6E6' :
                                        template.type === 'word-volley' ? '#FFF2E6' : '#E9D8FD',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        fontSize: '32px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {/* Default emoji fallback always rendered */}
                        <div aria-hidden="true">
                          {template.type === 'whack-a-mole' ? '🔨' : 
                           template.type === 'spinner-wheel' ? '🎡' : 
                           template.type === 'anagram' ? '🧩' : 
                           template.type === 'sentence-sense' ? '📝' :
                           template.type === 'place-value-showdown' ? '🎯' :
                           template.type === 'word-volley' ? '🏓' : '🥚'}
                        </div>
                        {template.thumbnail && (
                          <img 
                            src={template.thumbnail} 
                            alt={template.title} 
                            style={{ 
                              position: 'absolute',
                              inset: 0,
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover', 
                              borderRadius: '12px' 
                            }}
                            onError={(e) => {
                              // Hide broken images so emoji fallback shows
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      
                      <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: '600', 
                        marginBottom: '16px',
                        color: '#2D3748'
                      }}>
                        {getTemplateDisplayTitle(template)}
                      </h3>
                      
                      <div style={{
                        padding: '8px 16px',
                        backgroundColor: '#805AD5',
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        ✨ Create Game
                      </div>
                    </div>
                    ))}
                  </div>
                ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  backgroundColor: '#F7FAFC',
                  borderRadius: '12px',
                  border: '2px dashed #CBD5E0'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#2D3748' }}>
                    No templates available
                  </h3>
                  <p style={{ color: '#718096' }}>
                    Templates will appear here when they become available
                  </p>
                </div>
              )}
            </div>

            {/* My Created Games Section */}
            <div id="my-created" style={{ marginBottom: '48px', scrollMarginTop: 128 }}>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                marginBottom: '20px',
                color: '#2D3748',
                borderBottom: '2px solid #4299E1',
                paddingBottom: '8px'
              }}>
                My Created Games
              </h2>
              
              {isLoading ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  backgroundColor: '#F7FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ fontSize: '16px', color: '#718096' }}>Loading games...</div>
                  </div>
              ) : myGames.length > 0 ? (
                <div>
                  {/* Search and Filter Section */}
                  <div style={{ 
                    marginBottom: '24px',
                    padding: '16px',
                    backgroundColor: '#FAFAFA',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2D3748' }}>
                        🔍 Search & Filter Games
                      </h3>
                      {(gameSearchQuery || gameTypeFilter !== 'all' || gameFolderFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setGameSearchQuery('');
                            setGameTypeFilter('all');
                            setGameFolderFilter('all');
                          }}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#F7FAFC',
                            color: '#4A5568',
                            border: '1px solid #CBD5E0',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                    
                    {/* Search Input */}
                    <div style={{ marginBottom: '12px' }}>
                      <input
                        type="text"
                        placeholder="Search by title, description, or game type..."
                        value={gameSearchQuery}
                        onChange={(e) => setGameSearchQuery(e.target.value)}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #CBD5E0',
                          borderRadius: '6px',
                          width: '100%',
                          fontSize: '14px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4299E1';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#CBD5E0';
                        }}
                      />
                    </div>
                    
                    {/* Filter Row */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px', 
                      flexWrap: 'wrap',
                      alignItems: 'center' 
                    }}>
                      {/* Game Type Filter */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '14px', color: '#4A5568', fontWeight: '500' }}>
                          Type:
                        </label>
                        <select
                          value={gameTypeFilter}
                          onChange={(e) => handleGameTypeFilterChange(e.target.value)}
                          style={{
                            padding: '6px 8px',
                            border: '1px solid #CBD5E0',
                            borderRadius: '4px',
                            fontSize: '14px',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="all">✅ All Types</option>
                          <option value="anagram">🧩 Anagram</option>
                          <option value="name-it">🎯 Name It</option>
                          <option value="place-value-showdown">🎯 Place Value Showdown</option>
                          <option value="word-volley">🏓 Pong</option>
                          <option value="sentence-sense">📝 Sentence Sense</option>
                          <option value="sort-categories-egg">🥚 Sort Categories</option>
                          <option value="spinner-wheel">🎡 Spinner Wheel</option>
                          <option value="whack-a-mole">🔨 Whack-a-Mole</option>
                        </select>
                      </div>
                      
                      {/* Folder Organization Filter (only show when no specific folder is selected) */}
                      {!folderManager.selectedFolderId && folderManager.folders.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label style={{ fontSize: '14px', color: '#4A5568', fontWeight: '500' }}>
                            Organization:
                          </label>
                          <select
                            value={gameFolderFilter}
                            onChange={(e) => setGameFolderFilter(e.target.value)}
                            style={{
                              padding: '6px 8px',
                              border: '1px solid #CBD5E0',
                              borderRadius: '4px',
                              fontSize: '14px',
                              backgroundColor: 'white',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="all">All Games</option>
                            <option value="in-folders">📁 In Folders</option>
                            <option value="unorganized">📋 Unorganized</option>
                          </select>
                        </div>
                      )}
                      
                      {/* Search Results Count */}
                      <div style={{ 
                        marginLeft: 'auto',
                        fontSize: '14px',
                        color: '#718096',
                        fontWeight: '500'
                      }}>
                        {(() => {
                          const filteredCount = getFilteredGames().length;
                          const totalCount = folderManager.selectedFolderId 
                            ? folderManager.getGamesInFolder(folderManager.selectedFolderId).length
                            : myGames.length;
                          
                          if (gameSearchQuery || gameTypeFilter !== 'all' || gameFolderFilter !== 'all') {
                            return `${filteredCount} of ${totalCount} games`;
                          }
                          return `${totalCount} games`;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Unified Drag & Drop Context for Folders and Games */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                  {/* Folder Management Section */}
                  <div style={{ 
                    marginBottom: '24px',
                    padding: '16px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2D3748' }}>
                        📁 Organize Your Games
                      </h3>
                        
                        {/* Undo/Redo Controls */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            onClick={folderManager.undo}
                            disabled={!folderManager.canUndo}
                          style={{
                              padding: '6px 12px',
                              backgroundColor: folderManager.canUndo ? '#2B6CB0' : '#EDF2F7',
                              color: folderManager.canUndo ? 'white' : '#A0AEC0',
                              border: `2px solid ${folderManager.canUndo ? '#2B6CB0' : '#CBD5E0'}`,
                              borderRadius: '6px',
                              cursor: folderManager.canUndo ? 'pointer' : 'not-allowed',
                              fontSize: '14px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease',
                              boxShadow: folderManager.canUndo ? '0 2px 4px rgba(43, 108, 176, 0.2)' : 'none'
                          }}
                            title={folderManager.canUndo ? `Undo: ${folderManager.undoStack[folderManager.undoStack.length - 1]?.description || 'Last action'}` : 'Nothing to undo'}
                            onMouseEnter={(e) => {
                              if (folderManager.canUndo) {
                                const target = e.target as HTMLButtonElement;
                                target.style.backgroundColor = '#2C5282';
                                target.style.transform = 'translateY(-1px)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (folderManager.canUndo) {
                                const target = e.target as HTMLButtonElement;
                                target.style.backgroundColor = '#2B6CB0';
                                target.style.transform = 'translateY(0)';
                              }
                            }}
                          >
                            ↶ Undo
                        </button>
                          
                        <button
                            onClick={folderManager.redo}
                            disabled={!folderManager.canRedo}
                          style={{
                            padding: '6px 12px',
                              backgroundColor: folderManager.canRedo ? '#38A169' : '#EDF2F7',
                              color: folderManager.canRedo ? 'white' : '#A0AEC0',
                              border: `2px solid ${folderManager.canRedo ? '#38A169' : '#CBD5E0'}`,
                            borderRadius: '6px',
                              cursor: folderManager.canRedo ? 'pointer' : 'not-allowed',
                            fontSize: '14px',
                              fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease',
                              boxShadow: folderManager.canRedo ? '0 2px 4px rgba(56, 161, 105, 0.2)' : 'none'
                            }}
                            title={folderManager.canRedo ? `Redo: ${folderManager.redoStack[folderManager.redoStack.length - 1]?.description || 'Last undone action'}` : 'Nothing to redo'}
                            onMouseEnter={(e) => {
                              if (folderManager.canRedo) {
                                const target = e.target as HTMLButtonElement;
                                target.style.backgroundColor = '#2F855A';
                                target.style.transform = 'translateY(-1px)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (folderManager.canRedo) {
                                const target = e.target as HTMLButtonElement;
                                target.style.backgroundColor = '#38A169';
                                target.style.transform = 'translateY(0)';
                              }
                            }}
                          >
                            ↷ Redo
                        </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* New 4-Level Folder Tree */}
                    {folderManager.folderTree.length > 0 ? (
                      <div style={{ marginBottom: '12px' }}>
                        {/* All Games Button */}
                        <div style={{ marginBottom: '8px' }}>
                        <button
                          onClick={() => {
                            folderManager.setSelectedFolderId(null);
                            setGameFolderFilter('all');
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: folderManager.selectedFolderId === null ? '#E2E8F0' : 'white',
                            color: folderManager.selectedFolderId === null ? '#2D3748' : '#4A5568',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: folderManager.selectedFolderId === null ? '600' : '400'
                          }}
                        >
                          📋 All Games ({myGames.length})
                        </button>
                        </div>
                        
                        {/* Use SimpleFolderTree component (already inside unified DndContext) */}
                        <SimpleFolderTree 
                          folders={folderManager.folderTree}
                          selectedFolderId={folderManager.selectedFolderId}
                          onFolderClick={(folderId: string) => {
                            folderManager.setSelectedFolderId(folderId);
                                    setGameFolderFilter('all');
                          }}
                          onCreateSubfolder={folderManager.openCreateFolderModal}
                          onEditFolder={folderManager.openEditFolderModal}
                          onDeleteFolder={(folderId: string) => folderManager.deleteExistingFolder(folderId)}
                          getGamesInFolder={folderManager.getGamesInFolder}
                          canCreateSubfolder={folderManager.canCreateSubfolder}
                          maxDepth={3}
                          showGameCounts={true}
                          collapsible={true}
                        />
                        
                        {/* Unorganized Games Drop Zone (inside unified DndContext) */}
                        <div style={{ marginTop: '12px' }}>
                          <UnorganizedDropZone unorganizedGamesCount={folderManager.getUnorganizedGames().length} />
                        </div>
                      </div>
                    ) : (
                      /* No folders yet - show getting started message */
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ 
                          marginBottom: '12px', 
                          padding: '16px', 
                          backgroundColor: '#E6F3FF', 
                          borderRadius: '8px', 
                          border: '1px solid #4299E1',
                          textAlign: 'center' as const
                        }}>
                          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#2B6CB0', marginBottom: '8px' }}>
                            🚀 Get Started with Game Folders
                          </h4>
                          <p style={{ color: '#4A5568', marginBottom: '12px' }}>
                            Organize your games into folders to keep track of different subjects, game types, or teaching units.
                          </p>
                              <button
                            onClick={() => folderManager.openCreateFolderModal()}
                                style={{
                              padding: '8px 16px',
                              backgroundColor: '#4299E1',
                              color: 'white',
                              border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '600'
                                }}
                              >
                            📁 Create Your First Game Folder
                              </button>
                                </div>
                      </div>
                    )}
                    
                  </div>

                    {/* Games Grid (already inside unified DndContext) */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                    gap: '20px' 
                  }}>
                    {(() => {
                      // Use filtered games instead of the original logic
                      const gamesToShow = getFilteredGames();
                      
                      // Show no results message if search/filters are active but no games match
                      if (gamesToShow.length === 0 && (gameSearchQuery || gameTypeFilter !== 'all' || gameFolderFilter !== 'all')) {
                        return (
                          <div style={{ 
                            gridColumn: '1 / -1',
                            padding: '40px 20px',
                            textAlign: 'center',
                            backgroundColor: '#F8F9FA',
                            borderRadius: '12px',
                            border: '2px dashed #CBD5E0'
                          }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#2D3748' }}>
                              No games found
                            </h3>
                            <p style={{ color: '#718096', marginBottom: '20px' }}>
                              Try adjusting your search terms or filters
                            </p>
                            <button
                              onClick={() => {
                                setGameSearchQuery('');
                                setGameTypeFilter('all');
                                setGameFolderFilter('all');
                              }}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: '#4299E1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              Clear All Filters
                            </button>
                          </div>
                        );
                      }
                      
                      return gamesToShow.map((game) => (
                        <DraggableGameCard
                          key={game.id} 
                          game={game}
                          onPlay={handlePlayGame}
                          onEdit={handleEditGame}
                          onAssign={handleAssignGameFromCreated}
                          onDelete={confirmDeleteGame}
                        />
                      ));
                          
                    })()}
                    </div>

                    {/* Drag Overlay for visual feedback */}
                    <DragOverlay
                      adjustScale={false}
                      dropAnimation={null}
                    >
                      {activeItem && (
                        activeItem.type === 'game' ? (
                          // Game thumbnail drag overlay
                            <div style={{ 
                              width: '64px', 
                              height: '64px', 
                            backgroundColor: (activeItem.data?.gameType || '').includes('whack') ? '#C6F6D5' : 
                                            (activeItem.data?.gameType || '').includes('spinner') ? '#FED7D7' : 
                                            (activeItem.data?.gameType || '').includes('anagram') ? '#BFDBFE' : 
                                            (activeItem.data?.gameType || '').includes('sentence') ? '#E0F2FE' : 
                                            (activeItem.data?.gameType || '').includes('place') ? '#FFEBE6' : '#E9D8FD',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            border: '3px solid #4299E1',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                            cursor: 'grabbing',
                            pointerEvents: 'none',
                            opacity: 0.95,
                            transform: 'rotate(3deg) scale(1.1)',
                            zIndex: 1000
                            }}>
                            {activeItem.data?.thumbnailUrl ? (
                              <img src={activeItem.data.thumbnailUrl} alt={activeItem.data.title} style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  objectFit: 'cover',
                                borderRadius: '5px',
                                pointerEvents: 'none'
                                }} />
                              ) : (
                              <div style={{ fontSize: '24px', color: '#718096', pointerEvents: 'none' }}>
                                {(activeItem.data?.gameType || '').includes('whack') ? '🔨' : 
                                 (activeItem.data?.gameType || '').includes('spinner') ? '🎡' : 
                                 (activeItem.data?.gameType || '').includes('anagram') ? '🧩' : 
                                 (activeItem.data?.gameType || '').includes('sentence') ? '📝' : 
                                 (activeItem.data?.gameType || '').includes('place') ? '🎯' : '🥚'}
                                </div>
                              )}
                            </div>
                        ) : (
                          // Folder drag overlay (original style)
                                <div style={{
                            padding: '8px 12px',
                            backgroundColor: 'white',
                            border: '2px solid #4299E1',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            fontSize: '14px',
                            fontWeight: '600',
                            display: 'flex',
                                  alignItems: 'center',
                            gap: '8px',
                            transform: 'rotate(2deg)',
                            zIndex: 1000,
                            cursor: 'grabbing',
                            pointerEvents: 'none',
                            opacity: 0.9
                                }}>
                            <span>📁</span>
                            <span>{activeItem.data?.name || 'Folder'}</span>
                                </div>
                        )
                      )}
                    </DragOverlay>
                  </DndContext>
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  backgroundColor: '#F7FAFC',
                  borderRadius: '12px',
                  border: '2px dashed #CBD5E0'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎮</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#2D3748' }}>
                    No games created yet
                  </h3>
                  <p style={{ color: '#718096', marginBottom: '20px' }}>
                    Start by creating your first game using the templates below
                  </p>
                </div>
              )}
            </div>

            {/* Public Games Section */}
            <div id="public-games" style={{ marginBottom: '48px', scrollMarginTop: 128 }}>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                marginBottom: '20px',
                color: '#2D3748',
                borderBottom: '2px solid #38A169',
                paddingBottom: '8px'
              }}>
                Public Games
              </h2>
                              
              {/* Search and Filter Section */}
                                <div style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#FAFAFA',
                borderRadius: '8px',
                border: '1px solid #E2E8F0'
                                }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr auto auto', 
                  gap: '12px', 
                  alignItems: 'center' 
                              }}>
                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder="Search public games..."
                    value={publicGameSearchQuery}
                    onChange={(e) => setPublicGameSearchQuery(e.target.value)}
                                  style={{
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                                    borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white'
                                  }}
                  />
                  
                  {/* Game Type Filter */}
                  <select
                    value={publicGameTypeFilter}
                    onChange={(e) => setPublicGameTypeFilter(e.target.value)}
                                  style={{
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                                    borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      minWidth: '150px'
                    }}
                  >
                    <option value="all">✅ All Types</option>
                    <option value="whack-a-mole">🔨 Whack-a-Mole</option>
                    <option value="spinner-wheel">🎡 Spinner Wheel</option>
                    <option value="sort-categories-egg">🥚 Sort Categories</option>
                    <option value="anagram">🧩 Anagram</option>
                    <option value="name-it">🎯 Name It</option>
                    <option value="sentence-sense">📝 Sentence Sense</option>
                    <option value="place-value-showdown">🎯 Place Value Showdown</option>
                    <option value="word-volley">🏓 Pong</option>
                  </select>
                  
                  {/* Clear Filters Button */}
                                <button
                    onClick={() => {
                      setPublicGameSearchQuery('');
                      setPublicGameTypeFilter('all');
                                  }}
                                  style={{
                      padding: '8px 16px',
                      backgroundColor: '#F3F4F6',
                      border: '1px solid #D1D5DB',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                      fontSize: '14px',
                      color: '#374151'
                                  }}
                                >
                    Clear
                                </button>
                              </div>
                
                {/* Results Count */}
                <div style={{ 
                  marginTop: '12px', 
                  fontSize: '14px', 
                  color: '#6B7280' 
                }}>
                  Showing {getFilteredPublicGames().length} of {publicGames.length} public games
                </div>
            </div>
              
              {isLoading ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  backgroundColor: '#F7FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ fontSize: '16px', color: '#718096' }}>Loading public games...</div>
                </div>
              ) : publicGames.length > 0 ? (
                getFilteredPublicGames().length > 0 ? (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                  gap: '20px' 
                }}>
                    {getFilteredPublicGames().map((game) => (
                    <div key={game.id} style={{ 
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ 
                          width: '64px', 
                          height: '64px', 
                          backgroundColor: (game.gameType || '').includes('whack') ? '#C6F6D5' : 
                                          (game.gameType || '').includes('spinner') ? '#FED7D7' : 
                                          (game.gameType || '').includes('anagram') ? '#BFDBFE' : 
                                          (game.gameType || '').includes('sentence') ? '#E0F2FE' : 
                                          (game.gameType || '').includes('place') ? '#FFEBE6' :
                                          (game.gameType || '').includes('word-volley') ? '#FFF2E6' : '#E9D8FD',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          {game.thumbnailUrl ? (
                            <img src={game.thumbnailUrl} alt={game.title} style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover',
                              borderRadius: '8px'
                            }} />
                          ) : (
                            <div style={{ fontSize: '24px', color: '#718096' }}>
                              {(game.gameType || '').includes('whack') ? '🔨' : 
                               (game.gameType || '').includes('spinner') ? '🎡' : 
                               (game.gameType || '').includes('anagram') ? '🧩' : 
                               (game.gameType || '').includes('sentence') ? '📝' : 
                               (game.gameType || '').includes('place') ? '🎯' :
                               (game.gameType || '').includes('word-volley') ? '🏓' : '🥚'}
                            </div>
                          )}
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ 
                            fontSize: '18px', 
                            fontWeight: '600', 
                            marginBottom: '4px',
                            color: '#2D3748',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {game.title}
                          </h3>
                          <p style={{ 
                            color: '#718096', 
                            fontSize: '14px',
                            marginBottom: '16px',
                            textTransform: 'capitalize'
                          }}>
                            {(game.gameType || 'Unknown').replace('-', ' ')}
                          </p>
                          
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayGame(game.id);
                              }}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#E3F2FD',
                                color: '#1976D2',
                                border: '1px solid #BBDEFB',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.2s',
                                minWidth: 'auto',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#BBDEFB';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#E3F2FD';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              ▶️ Play
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const gameType = game.gameType;
                                let configRoute = '/configure';
                                
                                if (gameType === 'whack-a-mole') {
                                  configRoute = '/configure/whack-a-mole';
                                } else if (gameType === 'sort-categories-egg') {
                                  configRoute = '/configure/sort-categories-egg';
                                } else if (gameType === 'spinner-wheel') {
                                  configRoute = '/configure/spinner-wheel';
                                } else if (gameType === 'anagram') {
                                  configRoute = '/configure/anagram';
                                } else if (gameType === 'sentence-sense') {
                                  configRoute = '/configure/sentence-sense';
                                } else if (gameType === 'place-value-showdown') {
                                  configRoute = '/configure/place-value-showdown';
                                } else if (gameType === 'word-volley') {
                                  configRoute = '/configure/word-volley';
                                }
                                
                                navigate(`${configRoute}/${game.id}?copy=true`);
                              }}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#F3E5F5',
                                color: '#7B1FA2',
                                border: '1px solid #E1BEE7',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.2s',
                                minWidth: 'auto',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#E1BEE7';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#F3E5F5';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              📄 Copy
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignGameFromCreated(game);
                              }}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#E8F5E8',
                                color: '#2E7D32',
                                border: '1px solid #C8E6C9',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.2s',
                                minWidth: 'auto',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#C8E6C9';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#E8F5E8';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              📋 Assign
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px',
                    backgroundColor: '#F7FAFC',
                    borderRadius: '12px',
                    border: '2px dashed #CBD5E0'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#2D3748' }}>
                      No games match your search
                    </h3>
                    <p style={{ color: '#718096', marginBottom: '16px' }}>
                      Try adjusting your search terms or filters
                    </p>
                    <button
                      onClick={() => {
                        setPublicGameSearchQuery('');
                        setPublicGameTypeFilter('all');
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#4299E1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Clear All Filters
                    </button>
                  </div>
                )
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  backgroundColor: '#F7FAFC',
                  borderRadius: '12px',
                  border: '2px dashed #CBD5E0'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌍</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#2D3748' }}>
                    No public games available
                  </h3>
                  <p style={{ color: '#718096' }}>
                    Check back later for games shared by other educators
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div>
            {/* Header with Add Student button */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Student Management</h2>
              <button
                onClick={openAddStudentModal}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#38A169',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>+ Add Student</span>
              </button>
            </div>
            
            {/* Search input */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '4px',
                  width: '100%',
                  fontSize: '16px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                }}
              />
            </div>
            
            {isLoadingStudents ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                Loading students...
              </div>
            ) : students.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F7FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Grade</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Password Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter(student => {
                      if (!studentSearchQuery) return true;
                      const query = studentSearchQuery.toLowerCase();
                      return (
                        student.name.toLowerCase().includes(query) ||
                        student.email.toLowerCase().includes(query) ||
                        (student.grade && student.grade.toLowerCase().includes(query))
                      );
                    })
                    .map((student) => (
                      <tr key={student.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '12px' }}>{student.name}</td>
                        <td style={{ padding: '12px' }}>{student.email}</td>
                        <td style={{ padding: '12px' }}>{student.grade || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {student.passwordSetupSent ? (
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 'medium',
                                backgroundColor: '#FEF3C7',
                                color: '#92400E'
                              }}>
                                🔐 Password Setup Sent
                              </span>
                            ) : (
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 'medium',
                                backgroundColor: '#E5E7EB',
                                color: '#374151'
                              }}>
                                📧 Email Only
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleViewStudentDashboard(student)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#38B2AC', // Teal color for View button
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => openStudentNotesModal(student)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#805AD5', // Purple color for Notes button
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              Notes
                            </button>
                            <button
                              onClick={() => openEditStudentModal(student)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#4299E1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => confirmDeleteStudent(student.id)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#F56565',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 0',
                color: '#718096',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px dashed #E2E8F0',
                marginTop: '24px'
              }}>
                <p style={{ marginBottom: '16px' }}>You haven't added any students yet.</p>
                <button
                  onClick={openAddStudentModal}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#4299E1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Add Your First Student
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard; 