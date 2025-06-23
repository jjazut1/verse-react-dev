import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  GameFolder, 
  GameWithFolder,
  GameWithFolderAndId,
  FolderTreeNode, 
  GameFolderAssignment,
  DropResult,
  FolderOperation 
} from '../types/game';
import { 
  createFolder, 
  getUserFolders, 
  updateFolder, 
  deleteFolder,
  assignGameToFolder,
  removeGameFromFolder,
  getGameFolderAssignments,
  buildFolderTree,
  validateFolderDepth,
  canCreateSubfolder,
  handleFolderDrop,
  getFolderPath,
  getAllDescendantIds,
  isValidFolderMove,
  getFolderStats
} from '../services/folderService';
import { ToastOptions } from '../hooks/useCustomToast';
import { useModal } from '../contexts/ModalContext';

interface FolderManagerProps {
  userId: string;
  games: GameWithFolderAndId[];
  onGamesUpdate: (games: GameWithFolderAndId[]) => void;
  onShowToast: (options: ToastOptions) => void;
}

interface FolderModalData {
  id?: string;
  name: string;
  description: string;
  color: string;
}

const DEFAULT_FOLDER_COLORS = [
  '#3182CE', // Blue
  '#38A169', // Green
  '#805AD5', // Purple
  '#D69E2E', // Yellow
  '#E53E3E', // Red
  '#DD6B20', // Orange
  '#319795', // Teal
  '#ED64A6', // Pink
];

interface FolderManagerReturn {
  // State
  folders: GameFolder[];
  folderTree: FolderTreeNode[];
  assignments: GameFolderAssignment[];
  selectedFolderId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Folder operations
  createNewFolder: (folderData: Omit<GameFolder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExistingFolder: (folderId: string, updates: Partial<GameFolder>) => Promise<void>;
  deleteExistingFolder: (folderId: string) => Promise<void>;
  
  // Game-Folder operations
  assignGame: (gameId: string, folderId: string) => Promise<void>;
  removeGame: (gameId: string) => Promise<void>;
  
  // Tree operations
  handleDrop: (dropResult: DropResult) => Promise<void>;
  expandFolder: (folderId: string) => void;
  collapseFolder: (folderId: string) => void;
  
  // Selection and navigation
  selectFolder: (folderId: string | null) => void;
  getFolderBreadcrumbs: (folderId: string) => GameFolder[];
  
  // Utility functions
  getGamesInFolder: (folderId: string) => GameWithFolder[];
  getGamesInFolderTree: (folderId: string) => GameWithFolder[];
  canCreateSubfolder: (parentId: string | null) => boolean;
  getFolderStats: () => { totalFolders: number; totalGames: number; maxDepth: number };
  searchFolders: (searchTerm: string) => GameFolder[];
  
  // Data refresh
  refreshData: () => Promise<void>;
}

export const useFolderManager = ({
  userId,
  games,
  onGamesUpdate,
  onShowToast
}: FolderManagerProps): FolderManagerReturn => {
  // State
  const [folders, setFolders] = useState<GameFolder[]>([]);
  const [assignments, setAssignments] = useState<GameFolderAssignment[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Use the global modal manager instead of local state
  const { showModal } = useModal();

  // Memoized folder tree
  const folderTree = useMemo(() => {
    return buildFolderTree(folders, games);
  }, [folders, games]);

  const fetchFolders = useCallback(async () => {
    if (!userId) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const [foldersData, assignmentsData] = await Promise.all([
        getUserFolders(userId),
        getGameFolderAssignments(userId)
      ]);
      
      setFolders(foldersData);
      setAssignments(assignmentsData);
      
      // Auto-expand first 2 levels
      const autoExpanded = new Set<string>();
      foldersData.forEach(folder => {
        if ((folder.depth || 0) < 2) {
          autoExpanded.add(folder.id);
        }
      });
      setExpandedFolders(autoExpanded);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load folder data';
      setError(errorMessage);
      onShowToast({
        title: 'Error Loading Folders',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, onShowToast]);

  // Fetch folders on component mount
  useEffect(() => {
    if (userId) {
      fetchFolders();
    }
  }, [userId, fetchFolders]);

  // Load game folder assignments when both folders and games are available
  useEffect(() => {
    const loadGameFolderAssignments = async () => {
      if (!userId || folders.length === 0 || games.length === 0) {
        return;
      }

      console.log('📁 Loading game folder assignments...', {
        userId,
        foldersCount: folders.length,
        gamesCount: games.length
      });

      try {
        const assignments = await getGameFolderAssignments(userId);
        console.log('📁 Retrieved assignments:', assignments);

        if (assignments.length === 0) {
          console.log('📁 No folder assignments found');
          return;
        }

        // Create a map of gameId to folder info for efficient lookup
        const gameToFolderMap = new Map();
        assignments.forEach(assignment => {
          const folder = folders.find(f => f.id === assignment.folderId);
          if (folder) {
            gameToFolderMap.set(assignment.gameId, {
              folderId: folder.id,
              folderName: folder.name,
              folderColor: folder.color
            });
          }
        });

        console.log('📁 Game to folder mapping:', gameToFolderMap);

        // Update games with folder information
        const updatedGames = games.map(game => {
          const folderInfo = gameToFolderMap.get(game.id);
          if (folderInfo) {
            return {
              ...game,
              folderId: folderInfo.folderId,
              folderName: folderInfo.folderName,
              folderColor: folderInfo.folderColor
            };
          }
          return game;
        });

        // Only update if there are actual changes
        const hasChanges = updatedGames.some((game, index) => 
          game.folderId !== games[index].folderId ||
          game.folderName !== games[index].folderName ||
          game.folderColor !== games[index].folderColor
        );

        if (hasChanges) {
          console.log('📁 Updating games with folder assignments');
          onGamesUpdate(updatedGames);
        } else {
          console.log('📁 No changes needed - games already have correct folder info');
        }

      } catch (error) {
        console.error('📁 Error loading game folder assignments:', error);
        onShowToast({
          title: 'Error loading folder assignments',
          status: 'error' as const,
          duration: 3000
        });
      }
    };

    loadGameFolderAssignments();
  }, [userId, folders, games, onGamesUpdate, onShowToast]);

  // Folder CRUD operations
  const createNewFolder = useCallback(async (folderData: Omit<GameFolder, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate depth before creating
      if (!validateFolderDepth(folders, folderData.parentId || null)) {
        throw new Error('Cannot create folder: would exceed maximum depth of 4 levels');
      }
      
      const folderId = await createFolder({ ...folderData, userId });
      await fetchFolders(); // Refresh data
      
      onShowToast({
        title: 'Folder Created',
        description: `"${folderData.name}" has been created successfully`,
        status: 'success',
        duration: 3000,
      });
      
      // Auto-select the new folder
      setSelectedFolderId(folderId);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
      setError(errorMessage);
      onShowToast({
        title: 'Error Creating Folder',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, folders, fetchFolders, onShowToast]);

  const updateExistingFolder = useCallback(async (folderId: string, updates: Partial<GameFolder>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await updateFolder(folderId, updates);
      await fetchFolders(); // Refresh data
      
      onShowToast({
        title: 'Folder Updated',
        description: 'Folder has been updated successfully',
        status: 'success',
        duration: 3000,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update folder';
      setError(errorMessage);
      onShowToast({
        title: 'Error Updating Folder',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, folders, fetchFolders, onShowToast]);

  const deleteExistingFolder = useCallback(async (folderId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if folder has children
      const descendants = getAllDescendantIds(folders, folderId);
      if (descendants.length > 0) {
        throw new Error('Cannot delete folder with subfolders. Please delete subfolders first or move them to another location.');
      }
      
      // Check if folder has games
      const gamesInFolder = getGamesInFolder(folderId);
      if (gamesInFolder.length > 0) {
        throw new Error(`Cannot delete folder with ${gamesInFolder.length} game(s). Please move games to another folder first.`);
      }
      
      await deleteFolder(folderId);
      await fetchFolders(); // Refresh data
      
      // Clear selection if deleted folder was selected
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      
      onShowToast({
        title: 'Folder Deleted',
        description: 'Folder has been deleted successfully',
        status: 'success',
        duration: 3000,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete folder';
      setError(errorMessage);
      onShowToast({
        title: 'Error Deleting Folder',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, selectedFolderId, folders, fetchFolders, onShowToast]);

  // Game-Folder operations
  const assignGame = useCallback(async (gameId: string, folderId: string) => {
    if (!userId) return;
    
    try {
      await assignGameToFolder(gameId, folderId, userId);
      await fetchFolders(); // Refresh data
      
      onShowToast({
        title: 'Game Assigned',
        description: 'Game has been assigned to folder successfully',
        status: 'success',
        duration: 3000,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign game to folder';
      onShowToast({
        title: 'Error Assigning Game',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    }
  }, [userId, fetchFolders, onShowToast]);

  const removeGame = useCallback(async (gameId: string) => {
    if (!userId) return;
    
    try {
      await removeGameFromFolder(gameId, userId);
      await fetchFolders(); // Refresh data
      
      onShowToast({
        title: 'Game Removed',
        description: 'Game has been removed from folder successfully',
        status: 'success',
        duration: 3000,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove game from folder';
      onShowToast({
        title: 'Error Removing Game',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    }
  }, [userId, fetchFolders, onShowToast]);

  // Drag and drop operations
  const handleDrop = useCallback(async (dropResult: DropResult) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await handleFolderDrop(folders, dropResult);
      await fetchFolders(); // Refresh data
      
      onShowToast({
        title: 'Item Moved',
        description: 'Item has been moved successfully',
        status: 'success',
        duration: 3000,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move item';
      setError(errorMessage);
      onShowToast({
        title: 'Error Moving Item',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [folders, fetchFolders, onShowToast]);

  // Tree operations
  const expandFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => new Set([...prev, folderId]));
  }, []);

  const collapseFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      newSet.delete(folderId);
      return newSet;
    });
  }, []);

  // Selection and navigation
  const selectFolder = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
  }, []);

  const getFolderBreadcrumbs = useCallback((folderId: string): GameFolder[] => {
    return getFolderPath(folders, folderId);
  }, [folders]);

  // Utility functions
  const getGamesInFolder = useCallback((folderId: string): GameWithFolder[] => {
    return games.filter(game => game.folderId === folderId);
  }, [games]);

  const getGamesInFolderTree = useCallback((folderId: string): GameWithFolder[] => {
    const folderIds = [folderId, ...getAllDescendantIds(folders, folderId)];
    return games.filter(game => game.folderId && folderIds.includes(game.folderId));
  }, [games, folders]);

  const canCreateSubfolderCallback = useCallback((parentId: string | null): boolean => {
    return canCreateSubfolder(folders, parentId);
  }, [folders]);

  const getFolderStatsCallback = useCallback(() => {
    return getFolderStats(folderTree);
  }, [folderTree]);

  const searchFolders = useCallback((searchTerm: string): GameFolder[] => {
    const term = searchTerm.toLowerCase();
    return folders.filter(folder => 
      folder.name.toLowerCase().includes(term) ||
      folder.description.toLowerCase().includes(term)
    );
  }, [folders]);

  const refreshData = useCallback(async () => {
    await fetchFolders();
  }, [fetchFolders]);

  return {
    // State
    folders,
    folderTree,
    assignments,
    selectedFolderId,
    isLoading,
    error,
    
    // Folder operations
    createNewFolder,
    updateExistingFolder,
    deleteExistingFolder,
    
    // Game-Folder operations
    assignGame,
    removeGame,
    
    // Tree operations
    handleDrop,
    expandFolder,
    collapseFolder,
    
    // Selection and navigation
    selectFolder,
    getFolderBreadcrumbs,
    
    // Utility functions
    getGamesInFolder,
    getGamesInFolderTree,
    canCreateSubfolder: canCreateSubfolderCallback,
    getFolderStats: getFolderStatsCallback,
    searchFolders,
    
    // Data refresh
    refreshData
  };
}; 