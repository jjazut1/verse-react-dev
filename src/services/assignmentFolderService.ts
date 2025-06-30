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

// Assignment folder structure
export interface AssignmentFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  userId: string;
  parentId?: string | null;
  depth: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Assignment folder assignment (linking assignments to folders)
export interface AssignmentFolderAssignment {
  id: string;
  assignmentId: string;
  folderId: string;
  userId: string;
  assignedAt: Date;
}

// Assignment folder tree node
export interface AssignmentFolderTreeNode extends AssignmentFolder {
  children: AssignmentFolderTreeNode[];
  level: number;
  assignmentCount: number;
  isExpanded: boolean;
}

const ASSIGNMENT_FOLDERS_COLLECTION = 'assignmentFolders';
const ASSIGNMENT_FOLDER_ASSIGNMENTS_COLLECTION = 'assignmentFolderAssignments';
const MAX_DEPTH = 3; // 0, 1, 2, 3 = 4 levels total

// CRUD Operations for Assignment Folders
export const createAssignmentFolder = async (folderData: Omit<AssignmentFolder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, ASSIGNMENT_FOLDERS_COLLECTION), {
      ...folderData,
      createdAt: now,
      updatedAt: now,
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating assignment folder:', error);
    throw error;
  }
};

export const getUserAssignmentFolders = async (userId: string): Promise<AssignmentFolder[]> => {
  try {
    const foldersQuery = query(
      collection(db, ASSIGNMENT_FOLDERS_COLLECTION),
      where('userId', '==', userId),
      orderBy('order', 'asc')
    );
    
    const snapshot = await getDocs(foldersQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as AssignmentFolder));
  } catch (error) {
    console.error('Error fetching user assignment folders:', error);
    throw error;
  }
};

export const updateAssignmentFolder = async (folderId: string, updates: Partial<AssignmentFolder>): Promise<void> => {
  try {
    const docRef = doc(db, ASSIGNMENT_FOLDERS_COLLECTION, folderId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating assignment folder:', error);
    throw error;
  }
};

export const deleteAssignmentFolder = async (folderId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Delete the folder
    const folderRef = doc(db, ASSIGNMENT_FOLDERS_COLLECTION, folderId);
    batch.delete(folderRef);
    
    // Delete all assignment assignments for this folder
    const assignmentsQuery = query(
      collection(db, ASSIGNMENT_FOLDER_ASSIGNMENTS_COLLECTION),
      where('folderId', '==', folderId)
    );
    
    const assignmentsSnapshot = await getDocs(assignmentsQuery);
    assignmentsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting assignment folder:', error);
    throw error;
  }
};

// Assignment-Folder assignment operations
export const assignAssignmentToFolder = async (assignmentId: string, folderId: string, userId: string): Promise<string> => {
  try {
    // First, remove any existing assignment for this assignment
    await removeAssignmentFromFolder(assignmentId, userId);
    
    // Then create new assignment
    const docRef = await addDoc(collection(db, ASSIGNMENT_FOLDER_ASSIGNMENTS_COLLECTION), {
      assignmentId,
      folderId,
      userId,
      assignedAt: Timestamp.now()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error assigning assignment to folder:', error);
    throw error;
  }
};

export const removeAssignmentFromFolder = async (assignmentId: string, userId: string): Promise<void> => {
  try {
    const assignmentsQuery = query(
      collection(db, ASSIGNMENT_FOLDER_ASSIGNMENTS_COLLECTION),
      where('assignmentId', '==', assignmentId),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(assignmentsQuery);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error removing assignment from folder:', error);
    throw error;
  }
};

export const getAssignmentFolderAssignments = async (userId: string): Promise<AssignmentFolderAssignment[]> => {
  try {
    const assignmentsQuery = query(
      collection(db, ASSIGNMENT_FOLDER_ASSIGNMENTS_COLLECTION),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(assignmentsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      assignedAt: doc.data().assignedAt?.toDate() || new Date(),
    } as AssignmentFolderAssignment));
  } catch (error) {
    console.error('Error fetching assignment folder assignments:', error);
    throw error;
  }
};

// Tree building for assignment folders
export const buildAssignmentFolderTree = (
  folders: AssignmentFolder[], 
  assignments: any[] = [],
  parentId: string | null = null, 
  level: number = 0
): AssignmentFolderTreeNode[] => {
  const filteredFolders = folders.filter(folder => {
    // Handle folders that don't have parentId field (treat as root folders)
    const folderParentId = folder.parentId === undefined ? null : folder.parentId;
    return folderParentId === parentId;
  });
  
  return filteredFolders
    .map(folder => {
      const children = buildAssignmentFolderTree(folders, assignments, folder.id, level + 1);
      const directAssignments = assignments.filter(assignment => assignment.folderId === folder.id);
      const totalAssignmentCount = directAssignments.length + children.reduce((sum, child) => sum + (child.assignmentCount || 0), 0);
      
      return {
        ...folder,
        children,
        level,
        assignmentCount: totalAssignmentCount,
        isExpanded: level < 2 // Auto-expand first 2 levels
      };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

// Utility functions
export const getAssignmentsInFolder = async (folderId: string, userId: string): Promise<string[]> => {
  try {
    const assignmentsQuery = query(
      collection(db, ASSIGNMENT_FOLDER_ASSIGNMENTS_COLLECTION),
      where('folderId', '==', folderId),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(assignmentsQuery);
    return snapshot.docs.map(doc => doc.data().assignmentId);
  } catch (error) {
    console.error('Error fetching assignments in folder:', error);
    throw error;
  }
};

export const validateAssignmentFolderDepth = (folders: AssignmentFolder[], parentId: string | null): boolean => {
  if (!parentId) return true; // Root level is always valid
  
  let currentDepth = 0;
  let currentParentId: string | null = parentId;
  
  while (currentParentId && currentDepth <= MAX_DEPTH) {
    const parent = folders.find(f => f.id === currentParentId);
    if (!parent) break;
    
    currentDepth++;
    currentParentId = parent.parentId || null;
  }
  
  return currentDepth < MAX_DEPTH;
};

export const canCreateAssignmentSubfolder = (folders: AssignmentFolder[], parentId: string | null): boolean => {
  return validateAssignmentFolderDepth(folders, parentId);
}; 