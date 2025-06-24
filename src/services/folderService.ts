import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { GameFolder, GameFolderAssignment, FolderTreeNode, GameWithFolder, DragItem, DropResult } from '../types/game';

const FOLDERS_COLLECTION = 'gameFolders';
const MAX_DEPTH = 3; // 0, 1, 2, 3 = 4 levels total

// Enhanced tree building with level calculation and game counts
export const buildFolderTree = (
  folders: GameFolder[], 
  games: GameWithFolder[] = [],
  parentId: string | null = null, 
  level: number = 0
): FolderTreeNode[] => {
  const filteredFolders = folders.filter(folder => {
    // Handle folders that don't have parentId field (treat as root folders)
    const folderParentId = folder.parentId === undefined ? null : folder.parentId;
    return folderParentId === parentId;
  });
  
  return filteredFolders
    .map(folder => {
      const children = buildFolderTree(folders, games, folder.id, level + 1);
      const directGames = games.filter(game => game.folderId === folder.id);
      const totalGameCount = directGames.length + children.reduce((sum, child) => sum + (child.gameCount || 0), 0);
      
      return {
        ...folder,
        children,
        level,
        gameCount: totalGameCount,
        isExpanded: level < 2 // Auto-expand first 2 levels
      };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

// Validate folder depth for 4-level hierarchy
export const validateFolderDepth = (folders: GameFolder[], parentId: string | null): boolean => {
  if (!parentId) return true; // Root level is always valid
  
  let currentDepth = 0;
  let currentParentId: string | null = parentId;
  
  while (currentParentId && currentDepth <= MAX_DEPTH) {
    const parent = folders.find(f => f.id === currentParentId);
    if (!parent) break;
    
    currentDepth++;
    currentParentId = parent.parentId || null;
  }
  
  return currentDepth <= MAX_DEPTH;
};

// Get all descendant folder IDs (for deletion validation)
export const getAllDescendantIds = (folders: GameFolder[], folderId: string): string[] => {
  const descendants: string[] = [];
  const children = folders.filter(f => f.parentId === folderId);
  
  children.forEach(child => {
    descendants.push(child.id);
    descendants.push(...getAllDescendantIds(folders, child.id));
  });
  
  return descendants;
};

// Get folder path for breadcrumb navigation
export const getFolderPath = (folders: GameFolder[], folderId: string): GameFolder[] => {
  const path: GameFolder[] = [];
  let currentId: string | null = folderId;
  
  while (currentId) {
    const folder = folders.find(f => f.id === currentId);
    if (!folder) break;
    
    path.unshift(folder);
    currentId = folder.parentId || null;
  }
  
  return path;
};

// Check if folder can have subfolders (not at max depth)
export const canCreateSubfolder = (folders: GameFolder[], parentId: string | null): boolean => {
  return validateFolderDepth(folders, parentId);
};

// Prevent circular references when moving folders
export const isValidFolderMove = (
  folders: GameFolder[], 
  folderId: string, 
  newParentId: string | null
): boolean => {
  if (!newParentId) return true; // Moving to root is always valid
  if (folderId === newParentId) return false; // Can't be parent of itself
  
  // Check if newParentId is a descendant of folderId
  const descendants = getAllDescendantIds(folders, folderId);
  return !descendants.includes(newParentId);
};

// Handle drag and drop operations
export const handleFolderDrop = async (
  folders: GameFolder[],
  dropResult: DropResult
): Promise<void> => {
  const { draggedItem, targetFolderId, newParentId } = dropResult;
  
  if (draggedItem.type === 'folder') {
    // Moving a folder
    if (!isValidFolderMove(folders, draggedItem.id, newParentId || null)) {
      throw new Error('Invalid folder move: would create circular reference');
    }
    
    if (!validateFolderDepth(folders, newParentId || null)) {
      throw new Error('Invalid folder move: would exceed maximum depth of 4 levels');
    }
    
    await updateFolder(draggedItem.id, { parentId: newParentId || null });
  } else {
    // Moving a game to a folder
    // This would be handled by the game service
    console.log('Game drop handling would be implemented in game service');
  }
};

// Folder CRUD operations
export const createFolder = async (folderData: Omit<GameFolder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  // Validate depth before creating
  const allFolders = await getUserFolders(folderData.userId);
  if (!validateFolderDepth(allFolders, folderData.parentId || null)) {
    throw new Error('Cannot create folder: would exceed maximum depth of 4 levels');
  }
  
  const now = new Date();
  const docRef = await addDoc(collection(db, FOLDERS_COLLECTION), {
    ...folderData,
    createdAt: now,
    updatedAt: now,
    depth: calculateDepth(allFolders, folderData.parentId || null)
  });
  
  return docRef.id;
};

export const getUserFolders = async (userId: string): Promise<GameFolder[]> => {
  try {
    const foldersQuery = query(
      collection(db, FOLDERS_COLLECTION),
      where('userId', '==', userId),
      orderBy('order', 'asc')
    );
    
    const snapshot = await getDocs(foldersQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as GameFolder[];
  } catch (error) {
    console.error('Error fetching folders:', error);
    throw error;
  }
};

export const updateFolder = async (folderId: string, updates: Partial<GameFolder>): Promise<void> => {
  const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
  await updateDoc(folderRef, {
    ...updates,
    updatedAt: new Date()
  });
};

export const deleteFolder = async (folderId: string): Promise<void> => {
  const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
  await deleteDoc(folderRef);
};

// Game-Folder assignment operations
export const assignGameToFolder = async (gameId: string, folderId: string, userId: string): Promise<string> => {
  try {
    // First, remove any existing assignment for this game
    await removeGameFromFolder(gameId, userId);
    
    // Then create new assignment
    const docRef = await addDoc(collection(db, 'gameFolderAssignments'), {
      gameId,
      folderId,
      userId,
      assignedAt: Timestamp.now()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error assigning game to folder:', error);
    throw error;
  }
};

export const removeGameFromFolder = async (gameId: string, userId: string): Promise<void> => {
  try {
    const assignmentsQuery = query(
      collection(db, 'gameFolderAssignments'),
      where('gameId', '==', gameId),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(assignmentsQuery);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error removing game from folder:', error);
    throw error;
  }
};

export const getGameFolderAssignments = async (userId: string): Promise<GameFolderAssignment[]> => {
  try {
    const assignmentsQuery = query(
      collection(db, 'gameFolderAssignments'),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(assignmentsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as GameFolderAssignment));
  } catch (error) {
    console.error('Error fetching game folder assignments:', error);
    throw error;
  }
};

// Utility functions
export const getGamesInFolder = async (folderId: string, userId: string): Promise<string[]> => {
  try {
    const assignmentsQuery = query(
      collection(db, 'gameFolderAssignments'),
      where('folderId', '==', folderId),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(assignmentsQuery);
    return snapshot.docs.map(doc => doc.data().gameId);
  } catch (error) {
    console.error('Error fetching games in folder:', error);
    throw error;
  }
};

export const reorderFolders = async (folderUpdates: { id: string; order: number }[]): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    folderUpdates.forEach(({ id, order }) => {
      const folderRef = doc(db, FOLDERS_COLLECTION, id);
      batch.update(folderRef, { 
        order,
        updatedAt: Timestamp.now()
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error reordering folders:', error);
    throw error;
  }
};

// Batch operations for better performance
export const batchUpdateFolders = async (updates: Array<{ id: string; data: Partial<GameFolder> }>): Promise<void> => {
  const batch = writeBatch(db);
  
  updates.forEach(({ id, data }) => {
    const folderRef = doc(db, FOLDERS_COLLECTION, id);
    batch.update(folderRef, { ...data, updatedAt: Timestamp.now() });
  });
  
  await batch.commit();
};

// Helper function to calculate depth
const calculateDepth = (folders: GameFolder[], parentId: string | null): number => {
  if (!parentId) return 0;
  
  const parent = folders.find(f => f.id === parentId);
  return parent ? (parent.depth || 0) + 1 : 0;
};

// Search folders by name (for large folder structures)
export const searchFolders = (folders: GameFolder[], searchTerm: string): GameFolder[] => {
  const term = searchTerm.toLowerCase();
  return folders.filter(folder => 
    folder.name.toLowerCase().includes(term) ||
    folder.description.toLowerCase().includes(term)
  );
};

// Get folder statistics
export const getFolderStats = (tree: FolderTreeNode[]): {
  totalFolders: number;
  totalGames: number;
  maxDepth: number;
} => {
  let totalFolders = 0;
  let totalGames = 0;
  let maxDepth = 0;
  
  const traverse = (nodes: FolderTreeNode[], currentDepth: number = 0) => {
    nodes.forEach(node => {
      totalFolders++;
      totalGames += node.gameCount || 0;
      maxDepth = Math.max(maxDepth, currentDepth);
      
      if (node.children.length > 0) {
        traverse(node.children, currentDepth + 1);
      }
    });
  };
  
  traverse(tree);
  
  return { totalFolders, totalGames, maxDepth };
}; 