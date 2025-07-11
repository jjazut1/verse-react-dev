import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AssignmentFolder, 
  AssignmentFolderTreeNode,
  AssignmentFolderAssignment,
  createAssignmentFolder,
  getUserAssignmentFolders,
  updateAssignmentFolder,
  deleteAssignmentFolder,
  assignAssignmentToFolder,
  removeAssignmentFromFolder,
  getAssignmentFolderAssignments,
  buildAssignmentFolderTree,
  canCreateAssignmentSubfolder
} from '../services/assignmentFolderService';
import { getTeacherAssignmentsWithFolders } from '../services/assignmentService';
import { AssignmentWithFolder, ToastOptions } from '../pages/teacher-dashboard/types';
import { useModal } from '../contexts/ModalContext';

interface UseAssignmentFolderManagerProps {
  userId: string;
  assignments: AssignmentWithFolder[];
  onAssignmentsUpdate: (assignments: AssignmentWithFolder[]) => void;
  onShowToast: (options: ToastOptions) => void;
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

export const useAssignmentFolderManager = ({
  userId,
  assignments,
  onAssignmentsUpdate,
  onShowToast
}: UseAssignmentFolderManagerProps) => {
  // State
  const [folders, setFolders] = useState<AssignmentFolder[]>([]);
  const [folderAssignments, setFolderAssignments] = useState<AssignmentFolderAssignment[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Undo/Redo state (simplified for now)
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  
  // Use the global modal manager
  const { showModal } = useModal();

  // Computed values
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Memoized folder tree
  const folderTree = useMemo(() => {
    return buildAssignmentFolderTree(folders, assignments);
  }, [folders, assignments]);

  // Fetch folders and assignments
  const fetchFolders = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('📋 Loading assignment folders for user:', userId);
      const [foldersData, assignmentsData] = await Promise.all([
        getUserAssignmentFolders(userId),
        getAssignmentFolderAssignments(userId)
      ]);
      
      console.log('📋 Retrieved assignment folders:', foldersData);
      console.log('📋 Retrieved assignment folder assignments:', assignmentsData);
      
      setFolders(foldersData);
      setFolderAssignments(assignmentsData);
      
      // Auto-expand first 2 levels
      const autoExpanded = new Set<string>();
      foldersData.forEach(folder => {
        if ((folder.depth || 0) < 2) {
          autoExpanded.add(folder.id);
        }
      });
      setExpandedFolders(autoExpanded);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assignment folder data';
      console.error('Error loading assignment folders:', err);
      setError(errorMessage);
      onShowToast({
        title: 'Error Loading Assignment Folders',
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

  // Create new folder
  const createNewFolder = useCallback(async (folderData: {
    name: string;
    description: string;
    color: string;
    parentId?: string | null;
  }) => {
    try {
      const newFolderData = {
        ...folderData,
        userId,
        depth: folderData.parentId ? 
          (folders.find(f => f.id === folderData.parentId)?.depth || 0) + 1 : 0,
        order: folders.filter(f => f.parentId === (folderData.parentId || null)).length,
      };

      console.log('📋 Creating assignment folder:', newFolderData);
      const folderId = await createAssignmentFolder(newFolderData);
      
      onShowToast({
        title: 'Assignment Folder Created',
        description: `"${folderData.name}" has been created successfully`,
        status: 'success',
        duration: 3000,
      });
      
      // Refresh folders
      await fetchFolders();
      
      return folderId;
    } catch (error) {
      console.error('Error creating assignment folder:', error);
      onShowToast({
        title: 'Error Creating Assignment Folder',
        description: 'Failed to create assignment folder. Please try again.',
        status: 'error',
        duration: 5000,
      });
      throw error;
    }
  }, [userId, folders, fetchFolders, onShowToast]);

  // Update existing folder
  const updateExistingFolder = useCallback(async (folderId: string, updates: Partial<AssignmentFolder>) => {
    try {
      console.log('📋 Updating assignment folder:', folderId, updates);
      await updateAssignmentFolder(folderId, updates);
      
      onShowToast({
        title: 'Assignment Folder Updated',
        description: 'Assignment folder has been updated successfully',
        status: 'success',
        duration: 3000,
      });
      
      // Refresh folders
      await fetchFolders();
    } catch (error) {
      console.error('Error updating assignment folder:', error);
      onShowToast({
        title: 'Error Updating Assignment Folder',
        description: 'Failed to update assignment folder. Please try again.',
        status: 'error',
        duration: 5000,
      });
      throw error;
    }
  }, [fetchFolders, onShowToast]);

  // Delete existing folder
  const deleteExistingFolder = useCallback(async (folderId: string) => {
    try {
      console.log('📋 Deleting assignment folder:', folderId);
      await deleteAssignmentFolder(folderId);
      
      onShowToast({
        title: 'Assignment Folder Deleted',
        description: 'Assignment folder has been deleted successfully',
        status: 'success',
        duration: 3000,
      });
      
      // Refresh folders
      await fetchFolders();
    } catch (error) {
      console.error('Error deleting assignment folder:', error);
      onShowToast({
        title: 'Error Deleting Assignment Folder',
        description: 'Failed to delete assignment folder. Please try again.',
        status: 'error',
        duration: 5000,
      });
      throw error;
    }
  }, [fetchFolders, onShowToast]);

  // Assignment-to-folder operations
  const assignAssignmentToFolderWrapper = useCallback(async (assignmentId: string, folderId: string) => {
    try {
      console.log('📋 Assigning assignment to folder:', { assignmentId, folderId, userId });
      await assignAssignmentToFolder(assignmentId, folderId, userId);
      
      // Use the enhanced assignment function
      const updatedAssignments = await getTeacherAssignmentsWithFolders(userId);
      onAssignmentsUpdate(updatedAssignments);
      
      // Refresh folder data to get updated counts
      await fetchFolders();
    } catch (error) {
      console.error('Error assigning assignment to folder:', error);
      onShowToast({
        title: 'Error Moving Assignment',
        description: 'Failed to move assignment to folder. Please try again.',
        status: 'error',
        duration: 5000,
      });
      throw error;
    }
  }, [userId, onAssignmentsUpdate, fetchFolders, onShowToast]);

  const removeAssignmentFromFolderWrapper = useCallback(async (assignmentId: string) => {
    try {
      console.log('📋 Removing assignment from folder:', { assignmentId, userId });
      await removeAssignmentFromFolder(assignmentId, userId);
      
      // Use the enhanced assignment function
      const updatedAssignments = await getTeacherAssignmentsWithFolders(userId);
      onAssignmentsUpdate(updatedAssignments);
      
      // Refresh folder data to get updated counts
      await fetchFolders();
    } catch (error) {
      console.error('Error removing assignment from folder:', error);
      onShowToast({
        title: 'Error Removing Assignment',
        description: 'Failed to remove assignment from folder. Please try again.',
        status: 'error',
        duration: 5000,
      });
      throw error;
    }
  }, [userId, onAssignmentsUpdate, fetchFolders, onShowToast]);

  // Get assignments in folder
  const getAssignmentsInFolder = useCallback((folderId: string) => {
    return assignments.filter(assignment => assignment.folderId === folderId);
  }, [assignments]);

  // Get unorganized assignments
  const getUnorganizedAssignments = useCallback(() => {
    return assignments.filter(assignment => !assignment.folderId);
  }, [assignments]);

  // Modal management
  const openCreateFolderModal = useCallback((parentId?: string | null) => {
    console.log('📋 Opening create assignment folder modal, parentId:', parentId);
    
    showModal('assignment-folder-modal', {
      title: 'Create Assignment Folder',
      onSave: async (folderData: { name: string; description: string; color: string }) => {
        console.log('📋 onSave callback triggered with data:', folderData, 'parentId:', parentId);
        try {
          await createNewFolder({
            ...folderData,
            parentId: parentId || null
          });
          console.log('📋 Folder creation completed successfully');
        } catch (error) {
          console.error('📋 Error in onSave callback:', error);
          throw error;
        }
      },
      onCancel: () => {
        console.log('📋 Create assignment folder modal cancelled');
      }
    });
  }, [showModal, createNewFolder]);

  const openEditFolderModal = useCallback((folder: AssignmentFolder) => {
    console.log('📋 Opening edit assignment folder modal:', folder);
    
    showModal('assignment-folder-modal', {
      title: 'Edit Assignment Folder',
      folder: {
        id: folder.id,
        name: folder.name,
        description: folder.description,
        color: folder.color
      },
      onSave: async (folderData: { name: string; description: string; color: string }, folderId?: string) => {
        console.log('📋 Edit onSave callback triggered with data:', folderData, 'folderId:', folderId);
        try {
          if (folderId) {
            await updateExistingFolder(folderId, folderData);
            console.log('📋 Folder update completed successfully');
          }
        } catch (error) {
          console.error('📋 Error in edit onSave callback:', error);
          throw error;
        }
      },
      onCancel: () => {
        console.log('📋 Edit assignment folder modal cancelled');
      }
    });
  }, [showModal, updateExistingFolder]);

  // Undo/Redo (placeholder implementations)
  const undo = useCallback(async () => {
    onShowToast({
      title: 'Undo',
      description: 'Assignment folder undo functionality coming soon',
      status: 'info',
      duration: 3000
    });
  }, [onShowToast]);

  const redo = useCallback(async () => {
    onShowToast({
      title: 'Redo',
      description: 'Assignment folder redo functionality coming soon',
      status: 'info',
      duration: 3000
    });
  }, [onShowToast]);

  // Handler methods for TeacherDashboard integration
  const handleSaveFolder = useCallback(async (folderData: { name: string; description: string; color: string }, folderId?: string) => {
    console.log('📋 handleSaveFolder called with:', folderData, 'folderId:', folderId);
    try {
      if (folderId) {
        // Edit existing folder
        await updateExistingFolder(folderId, folderData);
      } else {
        // Create new folder
        await createNewFolder({
          ...folderData,
          parentId: null // Default to root level for now
        });
      }
    } catch (error) {
      console.error('📋 Error in handleSaveFolder:', error);
      throw error;
    }
  }, [updateExistingFolder, createNewFolder]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    console.log('📋 handleDeleteFolder called with folderId:', folderId);
    try {
      await deleteExistingFolder(folderId);
    } catch (error) {
      console.error('📋 Error in handleDeleteFolder:', error);
      throw error;
    }
  }, [deleteExistingFolder]);

  const handleCancelFolder = useCallback(() => {
    console.log('📋 handleCancelFolder called');
    // No cleanup needed for assignment folders
  }, []);

  return {
    // State
    folders,
    folderTree,
    assignments: folderAssignments,
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
    
    // Selection and navigation
    setSelectedFolderId,
    
    // Utility functions
    getAssignmentsInFolder,
    getUnorganizedAssignments,
    canCreateSubfolder: (parentId: string | null) => canCreateAssignmentSubfolder(folders, parentId),
    
    // Data refresh
    refreshData: fetchFolders,
    refreshFolders: fetchFolders,
    
    // Modal management
    openCreateFolderModal,
    openEditFolderModal,
    
    // Undo/Redo operations
    undo,
    redo,
    
    // Assignment-to-folder operations
    assignAssignmentToFolder: assignAssignmentToFolderWrapper,
    removeAssignmentFromFolder: removeAssignmentFromFolderWrapper,
    
    // Handler methods for TeacherDashboard integration
    handleSaveFolder,
    handleDeleteFolder,
    handleCancelFolder,
  };
}; 