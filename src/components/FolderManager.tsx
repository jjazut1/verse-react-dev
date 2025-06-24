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

// Undo/Redo Action Types
interface UndoRedoAction {
  type: 'CREATE_FOLDER' | 'DELETE_FOLDER' | 'UPDATE_FOLDER' | 'MOVE_GAME' | 'MOVE_FOLDER';
  description: string;
  undoAction: () => Promise<void>;
  redoAction: () => Promise<void>;
  timestamp: number;
}

interface FolderManagerReturn {
  // State
  folders: GameFolder[];
  folderTree: FolderTreeNode[];
  assignments: GameFolderAssignment[];
  selectedFolderId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Undo/Redo state
  canUndo: boolean;
  canRedo: boolean;
  undoStack: UndoRedoAction[];
  redoStack: UndoRedoAction[];
  
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
  
  // Undo/Redo operations
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clearHistory: () => void;
  
  // Selection and navigation
  selectFolder: (folderId: string | null) => void;
  setSelectedFolderId: (folderId: string | null) => void;
  getFolderBreadcrumbs: (folderId: string) => GameFolder[];
  
  // Utility functions
  getGamesInFolder: (folderId: string) => GameWithFolder[];
  getGamesInFolderTree: (folderId: string) => GameWithFolder[];
  getUnorganizedGames: () => GameWithFolderAndId[];
  canCreateSubfolder: (parentId: string | null) => boolean;
  getFolderStats: () => { totalFolders: number; totalGames: number; maxDepth: number };
  searchFolders: (searchTerm: string) => GameFolder[];

  // Data refresh
  refreshData: () => Promise<void>;
  refreshFolders: () => Promise<void>;
  
  // Modal management (for backward compatibility)
  openCreateFolderModal: (parentId?: string | null) => void;
  openEditFolderModal: (folder: GameFolder) => void;
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
  
  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<UndoRedoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRedoAction[]>([]);
  
  // Use the global modal manager instead of local state
  const { showModal } = useModal();

  // Computed values for undo/redo
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Undo/Redo helper function (must be defined early for use in other functions)
  const addToUndoStack = useCallback((action: UndoRedoAction) => {
    setUndoStack(prev => [...prev, action]);
    setRedoStack([]); // Clear redo stack when new action is performed
  }, []);

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
      console.error('Error loading folders:', err);
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
      
      // Create undo action
      const undoAction: UndoRedoAction = {
        type: 'CREATE_FOLDER',
        description: `Create folder "${folderData.name}"`,
        undoAction: async () => {
          await deleteFolder(folderId);
          await fetchFolders();
          if (selectedFolderId === folderId) {
            setSelectedFolderId(null);
          }
        },
        redoAction: async () => {
          await createFolder({ ...folderData, userId });
          await fetchFolders();
        },
        timestamp: Date.now()
      };
      
      addToUndoStack(undoAction);
      
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
  }, [userId, folders, fetchFolders, onShowToast, addToUndoStack, selectedFolderId]);

  const updateExistingFolder = useCallback(async (folderId: string, updates: Partial<GameFolder>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Store original folder data for undo
      const originalFolder = folders.find(f => f.id === folderId);
      if (!originalFolder) {
        throw new Error('Folder not found');
      }
      
      await updateFolder(folderId, updates);
      await fetchFolders(); // Refresh data

      // Create undo action
      const undoAction: UndoRedoAction = {
        type: 'UPDATE_FOLDER',
        description: `Update folder "${updates.name || originalFolder.name}"`,
        undoAction: async () => {
          await updateFolder(folderId, {
            name: originalFolder.name,
            description: originalFolder.description,
            color: originalFolder.color
          });
          await fetchFolders();
        },
        redoAction: async () => {
          await updateFolder(folderId, updates);
          await fetchFolders();
        },
        timestamp: Date.now()
      };
      
      addToUndoStack(undoAction);

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
  }, [userId, folders, fetchFolders, onShowToast, addToUndoStack]);

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
      
      // Store original folder data for undo
      const originalFolder = folders.find(f => f.id === folderId);
      if (!originalFolder) {
        throw new Error('Folder not found');
      }
      
      await deleteFolder(folderId);
      await fetchFolders(); // Refresh data
      
      // Create undo action
      const undoAction: UndoRedoAction = {
        type: 'DELETE_FOLDER',
        description: `Delete folder "${originalFolder.name}"`,
        undoAction: async () => {
          await createFolder({
            name: originalFolder.name,
            description: originalFolder.description,
            color: originalFolder.color,
            parentId: originalFolder.parentId,
            order: originalFolder.order,
            userId: originalFolder.userId
          });
          await fetchFolders();
        },
        redoAction: async () => {
          await deleteFolder(folderId);
          await fetchFolders();
          if (selectedFolderId === folderId) {
            setSelectedFolderId(null);
          }
        },
        timestamp: Date.now()
      };
      
      addToUndoStack(undoAction);
      
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
  }, [userId, selectedFolderId, folders, fetchFolders, onShowToast, addToUndoStack]);

  // Game-Folder operations
  const assignGame = useCallback(async (gameId: string, folderId: string) => {
    if (!userId) return;
    
    try {
      // Store original game data for undo
      const originalGame = games.find(g => g.id === gameId);
      const targetFolder = folders.find(f => f.id === folderId);
      
      await assignGameToFolder(gameId, folderId, userId);
      await fetchFolders(); // Refresh folder data
      
      // Update the games to add folder assignments
      const updatedGames = games.map(game => 
        game.id === gameId 
          ? { 
              ...game, 
              folderId: folderId,
              folderName: targetFolder?.name || 'Unknown Folder',
              folderColor: targetFolder?.color || '#3182CE'
            }
          : game
      );
      onGamesUpdate(updatedGames);
      
      // Create undo action
      const undoAction: UndoRedoAction = {
        type: 'MOVE_GAME',
        description: `Move "${originalGame?.title || 'game'}" to "${targetFolder?.name || 'folder'}"`,
        undoAction: async () => {
          if (originalGame?.folderId) {
            await assignGameToFolder(gameId, originalGame.folderId, userId);
          } else {
            await removeGameFromFolder(gameId, userId);
          }
          await fetchFolders();
          
          // Update games back to original state
          const revertedGames = games.map(game => 
            game.id === gameId 
              ? { 
                  ...game, 
                  folderId: originalGame?.folderId,
                  folderName: originalGame?.folderName,
                  folderColor: originalGame?.folderColor
                }
              : game
          );
          onGamesUpdate(revertedGames);
        },
        redoAction: async () => {
          await assignGameToFolder(gameId, folderId, userId);
          await fetchFolders();
          
          const redoGames = games.map(game => 
            game.id === gameId 
              ? { 
                  ...game, 
                  folderId: folderId,
                  folderName: targetFolder?.name || 'Unknown Folder',
                  folderColor: targetFolder?.color || '#3182CE'
                }
              : game
          );
          onGamesUpdate(redoGames);
        },
        timestamp: Date.now()
      };
      
      addToUndoStack(undoAction);
      
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
  }, [userId, games, folders, fetchFolders, onGamesUpdate, onShowToast, addToUndoStack]);

  const removeGame = useCallback(async (gameId: string) => {
    if (!userId) return;
    
    try {
      // Store original game data for undo
      const originalGame = games.find(g => g.id === gameId);
      
      await removeGameFromFolder(gameId, userId);
      await fetchFolders(); // Refresh folder data
      
      // Update the games to remove folder assignments
      const updatedGames = games.map(game => 
        game.id === gameId 
          ? { ...game, folderId: undefined, folderName: undefined, folderColor: undefined }
          : game
      );
      onGamesUpdate(updatedGames);
      
      // Create undo action (only if game was actually in a folder)
      if (originalGame?.folderId) {
        const undoAction: UndoRedoAction = {
          type: 'MOVE_GAME',
          description: `Remove "${originalGame.title || 'game'}" from "${originalGame.folderName || 'folder'}"`,
          undoAction: async () => {
            await assignGameToFolder(gameId, originalGame.folderId!, userId);
            await fetchFolders();
            
            const revertedGames = games.map(game => 
              game.id === gameId 
                ? { 
                    ...game, 
                    folderId: originalGame.folderId,
                    folderName: originalGame.folderName,
                    folderColor: originalGame.folderColor
                  }
                : game
            );
            onGamesUpdate(revertedGames);
          },
          redoAction: async () => {
            await removeGameFromFolder(gameId, userId);
            await fetchFolders();
            
            const redoGames = games.map(game => 
              game.id === gameId 
                ? { ...game, folderId: undefined, folderName: undefined, folderColor: undefined }
                : game
            );
            onGamesUpdate(redoGames);
          },
          timestamp: Date.now()
        };
        
        addToUndoStack(undoAction);
      }
      
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
  }, [userId, games, fetchFolders, onGamesUpdate, onShowToast, addToUndoStack]);

  // Drag and drop operations
  const handleDrop = useCallback(async (dropResult: DropResult) => {
    console.log('🎯 Handling drop operation:', dropResult);
    const { draggedItem, targetFolderId, newParentId } = dropResult;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (draggedItem.type === 'folder') {
        // Moving a folder
        const draggedFolder = draggedItem.data as GameFolder;
        console.log('📁 Moving folder:', draggedFolder.name, 'to parent:', newParentId || 'root');
        
        // Validate the move
        if (!isValidFolderMove(folders, draggedFolder.id, newParentId || null)) {
          throw new Error('Invalid folder move: would create circular reference');
        }
        
        if (!validateFolderDepth(folders, newParentId || null)) {
          throw new Error('Invalid folder move: would exceed maximum depth of 4 levels');
        }
        
        // Calculate new depth
        const newDepth = newParentId ? 
          (folders.find(f => f.id === newParentId)?.depth || 0) + 1 : 0;
        
        // Update folder in database
        await updateFolder(draggedFolder.id, { 
          parentId: newParentId || null,
          depth: newDepth 
        });
        
        // Refresh folder data
        await fetchFolders();
        
        onShowToast({
          title: 'Folder Moved',
          description: `"${draggedFolder.name}" has been moved successfully`,
          status: 'success',
          duration: 3000,
        });
        
      } else if (draggedItem.type === 'game') {
        // Moving a game to a folder or unorganized zone
        const draggedGame = draggedItem.data as GameWithFolderAndId;
        console.log('🎮 Moving game:', draggedGame.title, 'to target:', targetFolderId);
        
        if (targetFolderId === 'unorganized') {
          // Remove from folder (move to unorganized)
          await removeGame(draggedGame.id);
          
          onShowToast({
            title: 'Game Unorganized',
            description: `"${draggedGame.title}" has been removed from folder`,
            status: 'success',
            duration: 3000,
          });
        } else if (targetFolderId) {
          // Assign game to folder
          await assignGame(draggedGame.id, targetFolderId);
          
          onShowToast({
            title: 'Game Organized',
            description: `"${draggedGame.title}" has been moved to folder`,
            status: 'success',
            duration: 3000,
          });
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move item';
      console.error('🎯 Drop operation failed:', err);
      setError(errorMessage);
      onShowToast({
        title: 'Move Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [folders, fetchFolders, assignGame, removeGame, onShowToast]);

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

  const getUnorganizedGames = useCallback((): GameWithFolderAndId[] => {
    return games.filter(game => !game.folderId);
  }, [games]);

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

  // Alias for backward compatibility
  const refreshFolders = refreshData;

  // Modal management functions for backward compatibility
  const openCreateFolderModal = useCallback((parentId?: string | null) => {
    // Use provided parentId, fallback to selectedFolderId if not provided
    const actualParentId = parentId !== undefined ? parentId : selectedFolderId;
    
    showModal('createFolder', {
      onSave: async (folderData: FolderModalData) => {
        await createNewFolder({
          ...folderData,
          parentId: actualParentId,
          order: folders.length,
          userId
        });
      }
    });
  }, [showModal, createNewFolder, selectedFolderId, folders.length, userId]);

  const openEditFolderModal = useCallback((folder: GameFolder) => {
    showModal('editFolder', {
      folder,
      onSave: async (folderData: FolderModalData) => {
        await updateExistingFolder(folder.id, folderData);
      }
    });
  }, [showModal, updateExistingFolder]);

  // Undo/Redo functions

  const undo = useCallback(async () => {
    if (undoStack.length === 0) return;
    
    const lastAction = undoStack[undoStack.length - 1];
    
    try {
      await lastAction.undoAction();
      
      // Move action from undo to redo stack
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, lastAction]);
      
      onShowToast({
        title: 'Action Undone',
        description: `Undid: ${lastAction.description}`,
        status: 'info',
        duration: 3000,
      });
    } catch (error) {
      onShowToast({
        title: 'Undo Failed',
        description: 'Could not undo the last action',
        status: 'error',
        duration: 3000,
      });
    }
  }, [undoStack, onShowToast]);

  const redo = useCallback(async () => {
    if (redoStack.length === 0) return;
    
    const lastAction = redoStack[redoStack.length - 1];
    
    try {
      await lastAction.redoAction();
      
      // Move action from redo to undo stack
      setRedoStack(prev => prev.slice(0, -1));
      setUndoStack(prev => [...prev, lastAction]);
      
      onShowToast({
        title: 'Action Redone',
        description: `Redid: ${lastAction.description}`,
        status: 'info',
        duration: 3000,
      });
    } catch (error) {
      onShowToast({
        title: 'Redo Failed',
        description: 'Could not redo the action',
        status: 'error',
        duration: 3000,
      });
    }
  }, [redoStack, onShowToast]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    onShowToast({
      title: 'History Cleared',
      description: 'Undo/redo history has been cleared',
      status: 'info',
      duration: 2000,
    });
  }, [onShowToast]);

  return {
    // State
    folders,
    folderTree,
    assignments,
    selectedFolderId,
    isLoading,
    error,
    
    // Undo/Redo state
    canUndo,
    canRedo,
    undoStack,
    redoStack,
    
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
    
    // Undo/Redo operations
    undo,
    redo,
    clearHistory,
    
    // Selection and navigation
    selectFolder,
    setSelectedFolderId,
    getFolderBreadcrumbs,
    
    // Utility functions
    getGamesInFolder,
    getGamesInFolderTree,
    getUnorganizedGames,
    canCreateSubfolder: canCreateSubfolderCallback,
    getFolderStats: getFolderStatsCallback,
    searchFolders,
    
    // Data refresh
    refreshData,
    refreshFolders,
    
    // Modal management (for backward compatibility)
    openCreateFolderModal,
    openEditFolderModal
  };
}; 