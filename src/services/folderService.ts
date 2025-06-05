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
import { GameFolder, GameFolderAssignment } from '../types/game';

// Folder CRUD operations
export const createFolder = async (folderData: Omit<GameFolder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = Timestamp.now();
    const dataToSend = {
      ...folderData,
      createdAt: now,
      updatedAt: now
    };
    
    console.log('Creating folder with data:', dataToSend);
    console.log('User ID:', folderData.userId);
    
    const docRef = await addDoc(collection(db, 'gameFolders'), dataToSend);
    console.log('Folder created successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating folder:', error);
    console.error('Error details:', {
      code: (error as any)?.code,
      message: (error as any)?.message,
      details: (error as any)?.details
    });
    throw error;
  }
};

export const getUserFolders = async (userId: string): Promise<GameFolder[]> => {
  try {
    const foldersQuery = query(
      collection(db, 'gameFolders'),
      where('userId', '==', userId),
      orderBy('order', 'asc')
    );
    
    const snapshot = await getDocs(foldersQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as GameFolder));
  } catch (error) {
    console.error('Error fetching folders:', error);
    throw error;
  }
};

export const updateFolder = async (folderId: string, updates: Partial<GameFolder>): Promise<void> => {
  try {
    const folderRef = doc(db, 'gameFolders', folderId);
    await updateDoc(folderRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating folder:', error);
    throw error;
  }
};

export const deleteFolder = async (folderId: string): Promise<void> => {
  try {
    console.log('Attempting to delete folder:', folderId);
    
    // First, try to remove all game assignments to this folder
    try {
      const assignmentsQuery = query(
        collection(db, 'gameFolderAssignments'),
        where('folderId', '==', folderId)
      );
      
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      console.log(`Found ${assignmentsSnapshot.docs.length} assignments to delete`);
      
      // Delete assignments one by one to avoid batch issues
      for (const assignmentDoc of assignmentsSnapshot.docs) {
        try {
          await deleteDoc(assignmentDoc.ref);
          console.log('Deleted assignment:', assignmentDoc.id);
        } catch (assignmentError) {
          console.warn('Failed to delete assignment:', assignmentDoc.id, assignmentError);
          // Continue with other assignments - this is expected for some permission scenarios
        }
      }
    } catch (assignmentError: any) {
      // Log assignment deletion issues but don't prevent folder deletion
      const isPermissionError = assignmentError?.code === 'permission-denied' || 
                               assignmentError?.message?.includes('Missing or insufficient permissions');
      
      if (isPermissionError) {
        console.log('Assignment deletion skipped due to permissions - this is normal for some folder configurations');
      } else {
        console.warn('Error deleting folder assignments:', assignmentError);
      }
      // Continue with folder deletion regardless
    }
    
    // Then delete the folder itself
    const folderRef = doc(db, 'gameFolders', folderId);
    
    // First, try to get the folder to check its data
    try {
      const folderDoc = await getDoc(folderRef);
      if (folderDoc.exists()) {
        const folderData = folderDoc.data();
        console.log('Folder data before deletion:', folderData);
        
        // Check if folder has invalid data (empty name)
        if (!folderData.name || folderData.name.trim() === '') {
          console.log('Folder has empty name, updating with temporary name for deletion compatibility');
          
          // Try to update the folder with a valid name first, then delete
          try {
            await updateDoc(folderRef, {
              name: 'Temporary Name for Deletion',
              updatedAt: new Date()
            });
            console.log('Updated folder with temporary valid name');
          } catch (updateError) {
            console.warn('Failed to update folder with valid name:', updateError);
            // Continue with deletion attempt anyway
          }
        }
      }
    } catch (getError) {
      console.warn('Failed to get folder data before deletion:', getError);
      // Continue with deletion attempt anyway
    }
    
    // Now attempt to delete the folder
    await deleteDoc(folderRef);
    console.log('Successfully deleted folder:', folderId);
    
  } catch (error) {
    console.error('Error deleting folder:', error);
    console.error('Error details:', {
      code: (error as any)?.code,
      message: (error as any)?.message,
      folderId
    });
    
    // Provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes('Missing or insufficient permissions')) {
        throw new Error('Cannot delete folder: This folder contains invalid data that prevents deletion. The folder may have been created with missing required fields.');
      }
    }
    
    throw error;
  }
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
      const folderRef = doc(db, 'gameFolders', id);
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