import React, { useState, useEffect, useCallback } from 'react';
import { GameFolder, GameWithFolder } from '../types/game';
import { 
  createFolder, 
  getUserFolders, 
  updateFolder, 
  deleteFolder,
  assignGameToFolder,
  removeGameFromFolder,
  getGameFolderAssignments
} from '../services/folderService';
import { ToastOptions } from '../hooks/useCustomToast';
import { useModal } from '../contexts/ModalContext';

interface FolderManagerProps {
  userId: string;
  games: GameWithFolder[];
  onGamesUpdate: (games: GameWithFolder[]) => void;
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

export const useFolderManager = ({
  userId,
  games,
  onGamesUpdate,
  onShowToast
}: FolderManagerProps) => {
  const [folders, setFolders] = useState<GameFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [draggedGameId, setDraggedGameId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the global modal manager instead of local state
  const { showModal } = useModal();

  const fetchFolders = useCallback(async () => {
    if (!userId) {
      return;
    }
    
    setIsLoading(true);
    try {
      const userFolders = await getUserFolders(userId);
      setFolders(userFolders);
    } catch (error) {
      console.error('Error fetching folders:', error);
      onShowToast({
        title: 'Error loading folders',
        status: 'error' as const,
        duration: 3000
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

  const handleCreateFolder = useCallback(async (folderData: Omit<FolderModalData, 'id'>) => {
    try {
      const newFolderId = await createFolder({
        ...folderData,
        userId,
        order: folders.length
      });

      const newFolder: GameFolder = {
        id: newFolderId,
        ...folderData,
        userId,
        order: folders.length,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setFolders([...folders, newFolder]);
      onShowToast({
        title: 'Folder created successfully',
        status: 'success' as const,
        duration: 3000
      });
    } catch (error) {
      console.error('Error creating folder:', error);
      onShowToast({
        title: 'Error creating folder',
        status: 'error' as const,
        duration: 3000
      });
    }
  }, [userId, folders, onShowToast]);

  const handleUpdateFolder = useCallback(async (folderId: string, folderData: Omit<FolderModalData, 'id'>) => {
    try {
      await updateFolder(folderId, folderData);
      
      setFolders(folders.map(folder => 
        folder.id === folderId 
          ? { ...folder, ...folderData }
          : folder
      ));

      // Update games with new folder information
      const updatedGames = games.map(game => 
        game.folderId === folderId
          ? { ...game, folderName: folderData.name, folderColor: folderData.color }
          : game
      );
      onGamesUpdate(updatedGames);

      onShowToast({
        title: 'Folder updated successfully',
        status: 'success' as const,
        duration: 3000
      });
    } catch (error) {
      console.error('Error updating folder:', error);
      onShowToast({
        title: 'Error updating folder',
        status: 'error' as const,
        duration: 3000
      });
    }
  }, [folders, games, onGamesUpdate, onShowToast]);

  const handleDeleteFolder = async (folderId: string) => {
    const startTime = Date.now();
    console.log('🗑️ handleDeleteFolder called with folderId:', folderId, 'at timestamp:', startTime);
    try {
      console.log('🗑️ Starting folder deletion...');
      await deleteFolder(folderId);
      console.log('🗑️ Folder deleted successfully from database, took:', Date.now() - startTime, 'ms');
      
      // Update state immediately after successful deletion
      setFolders(folders.filter(folder => folder.id !== folderId));
      console.log('🗑️ Updated folders state');
      
      // Remove folder information from games
      const updatedGames = games.map(game => 
        game.folderId === folderId
          ? { ...game, folderId: undefined, folderName: undefined, folderColor: undefined }
          : game
      );
      onGamesUpdate(updatedGames);
      console.log('🗑️ Updated games state');
      
      // Clear folder selection if the deleted folder was selected
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
        console.log('🗑️ Cleared selected folder');
      }

      // Show success message
      onShowToast({
        title: 'Folder deleted successfully',
        status: 'success',
        duration: 3000,
      });
      console.log('🗑️ Deletion process completed successfully, total time:', Date.now() - startTime, 'ms');
      
    } catch (error) {
      console.error('🗑️ Error deleting folder:', error);
      
      // Show more specific error message based on the error
      let errorMessage = 'Error deleting folder';
      if (error instanceof Error) {
        if (error.message.includes('Missing or insufficient permissions')) {
          errorMessage = 'Cannot delete folder: This folder may have invalid data. Please contact support.';
        } else {
          errorMessage = `Error deleting folder: ${error.message}`;
        }
      }
      
      onShowToast({
        title: errorMessage,
        status: 'error',
        duration: 5000,
      });
      
      // Keep the modal open on error so user can try again or cancel
    }
  };

  const confirmDeleteFolder = (folderId: string) => {
    console.log('🔵 confirmDeleteFolder called with folderId:', folderId);
    
    // Find the folder to get its details
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      console.warn('🟡 confirmDeleteFolder: Folder not found:', folderId);
      return;
    }
    
    // Count games in this folder
    const gamesInFolder = getGamesInFolder(folderId);
    
    console.log('🔵 confirmDeleteFolder: Showing modal for folder:', {
      folderId,
      folderName: folder.name,
      gamesCount: gamesInFolder.length
    });
    
    // Show the global delete confirmation modal
    showModal('delete-folder', {
      folderId,
      folderName: folder.name,
      gamesCount: gamesInFolder.length
    });
  };

  const handleGameDrop = useCallback(async (gameId: string, folderId: string | null) => {
    try {
      if (folderId) {
        await assignGameToFolder(gameId, folderId, userId);
        const folder = folders.find(f => f.id === folderId);
        
        // Update the specific game with folder information
        const updatedGames = games.map(game => 
          game.id === gameId
            ? { ...game, folderId, folderName: folder?.name, folderColor: folder?.color }
            : game
        );
        onGamesUpdate(updatedGames);
      } else {
        // Remove from folder
        await removeGameFromFolder(gameId, userId);
        
        const updatedGames = games.map(game => 
          game.id === gameId
            ? { ...game, folderId: undefined, folderName: undefined, folderColor: undefined }
            : game
        );
        onGamesUpdate(updatedGames);
      }

      onShowToast({
        title: folderId ? 'Game moved to folder' : 'Game removed from folder',
        status: 'success' as const,
        duration: 2000
      });
    } catch (error) {
      console.error('Error moving game:', error);
      onShowToast({
        title: 'Error moving game',
        status: 'error' as const,
        duration: 3000
      });
    }
  }, [userId, folders, games, onGamesUpdate, onShowToast]);

  const openCreateFolderModal = useCallback(() => {
    console.log('🔵 openCreateFolderModal called');
    showModal('folder-modal', {
      folder: null // null indicates creating a new folder
    });
  }, [showModal]);

  const openEditFolderModal = useCallback((folder: GameFolder) => {
    console.log('🔵 openEditFolderModal called with folder:', folder);
    showModal('folder-modal', {
      folder: {
        id: folder.id,
        name: folder.name,
        description: folder.description || '',
        color: folder.color || DEFAULT_FOLDER_COLORS[0]
      }
    });
  }, [showModal]);

  const handleSaveFolder = useCallback(async (folderData: { name: string; description: string; color: string }, folderId?: string) => {
    console.log('🔵 handleSaveFolder called:', { folderData, folderId });
    
    if (folderId) {
      // Update existing folder
      await handleUpdateFolder(folderId, folderData);
    } else {
      // Create new folder
      await handleCreateFolder(folderData);
    }
  }, [handleCreateFolder, handleUpdateFolder]);

  const handleCancelFolder = useCallback(() => {
    console.log('🔵 handleCancelFolder called');
    // No cleanup needed since we're using global modal
  }, []);

  const getGamesInFolder = useCallback((folderId: string | null) => {
    return games.filter(game => game.folderId === folderId);
  }, [games]);

  const getUnorganizedGames = useCallback(() => {
    return games.filter(game => !game.folderId);
  }, [games]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, gameId: string) => {
    console.log('🐲 Drag started for game:', gameId);
    setDraggedGameId(gameId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Find the game being dragged to get its info
    const draggedGame = games.find(g => g.id === gameId);
    console.log('🐲 Found dragged game:', draggedGame);
    
    if (!draggedGame) {
      console.warn('🐲 Game not found, using default drag image');
      return;
    }
    
    try {
      // Create a simple HTML element as drag image instead of canvas
      const dragElement = document.createElement('div');
      dragElement.style.cssText = `
        width: 120px;
        height: 80px;
        background: white;
        border: 2px solid #4299E1;
        border-radius: 8px;
        padding: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: absolute;
        top: -1000px;
        left: -1000px;
        z-index: 9999;
        pointer-events: none;
      `;
      
      // Get game type icon
      const gameTypeIcon = draggedGame.gameType?.includes('whack') ? '🔨' : 
                          draggedGame.gameType?.includes('spinner') ? '🎡' : '🥚';
      
      // Add content
      dragElement.innerHTML = `
        <div style="
          width: 30px;
          height: 30px;
          background: #EBF8FF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          margin-bottom: 4px;
        ">${gameTypeIcon}</div>
        <div style="
          font-size: 10px;
          font-weight: bold;
          color: #2D3748;
          text-align: center;
          line-height: 1;
          margin-bottom: 2px;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${draggedGame.title || 'Game'}</div>
        <div style="
          font-size: 8px;
          color: #4299E1;
          text-align: center;
        ">Moving...</div>
      `;
      
      // Add to DOM temporarily
      document.body.appendChild(dragElement);
      
      console.log('🐲 Setting custom drag image with HTML element');
      
      // Set the custom drag image
      e.dataTransfer.setDragImage(dragElement, 60, 40);
      
      // Clean up after a short delay
      requestAnimationFrame(() => {
        document.body.removeChild(dragElement);
        console.log('🐲 Custom drag image set and element cleaned up');
      });
      
    } catch (error) {
      console.error('🐲 Error creating custom drag image:', error);
      // Fall back to default behavior
    }
  }, [games]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    if (draggedGameId) {
      handleGameDrop(draggedGameId, folderId);
      setDraggedGameId(null);
    }
  }, [draggedGameId, handleGameDrop]);

  return {
    folders,
    selectedFolderId,
    setSelectedFolderId,
    getGamesInFolder,
    getUnorganizedGames,
    openCreateFolderModal,
    openEditFolderModal,
    handleDeleteFolder,
    confirmDeleteFolder,
    handleSaveFolder,
    handleCancelFolder,
    handleDragStart,
    handleDragOver,
    handleDrop,
    isLoading,
    refreshFolders: fetchFolders
  };
}; 