import React, { useState, useCallback, useMemo } from 'react';
import { Assignment, AssignmentWithFolder, ToastOptions } from './types';
import { useAssignmentFolderManager } from '../../hooks/useAssignmentFolderManager';
import { useDroppable } from '@dnd-kit/core';
import { 
  buildAssignmentFolderTree, 
  AssignmentFolderTreeNode, 
  AssignmentFolder as ServiceAssignmentFolder 
} from '../../services/assignmentFolderService';

interface AssignmentFolderManagementProps {
  currentUser: any;
  assignments: AssignmentWithFolder[];
  onAssignmentsUpdate: (assignments: AssignmentWithFolder[]) => void;
  showToast: (options: ToastOptions) => void;
  assignmentFolderFilter: string;
  setAssignmentFolderFilter: (filter: string) => void;
  onFolderHandlersReady?: (handlers: any) => void;
}

// Droppable Folder Item Component
interface DroppableFolderItemProps {
  folder: AssignmentFolderTreeNode;
  selectedFolderId: string | null;
  onFolderClick: (folderId: string) => void;
  onCreateSubfolder: (parentId: string | null) => void;
  onEditFolder: (folder: ServiceAssignmentFolder) => void;
  onDeleteFolder: (folderId: string) => void;
  getAssignmentsInFolder: (folderId: string) => any[];
  canCreateSubfolder: (parentId: string | null) => boolean;
  maxDepth: number;
  expandedFolders: Set<string>;
  onToggleExpanded: (folderId: string) => void;
}

const DroppableFolderItem: React.FC<DroppableFolderItemProps> = ({
  folder,
  selectedFolderId,
  onFolderClick,
  onCreateSubfolder,
  onEditFolder,
  onDeleteFolder,
  getAssignmentsInFolder,
  canCreateSubfolder,
  maxDepth,
  expandedFolders,
  onToggleExpanded
}) => {
  const assignmentsInFolder = getAssignmentsInFolder(folder.id);
  const assignmentCount = assignmentsInFolder.length;
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;
  const isExpanded = expandedFolders.has(folder.id);
  
  const indentSize = folder.level * 24;
  
  // Helper function to extract first 12 alphanumeric characters
  const getShortTitle = (title: string): string => {
    if (!title) return '';
    // Extract only alphanumeric characters and limit to 12
    const alphanumeric = title.replace(/[^a-zA-Z0-9]/g, '');
    return alphanumeric.slice(0, 12);
  };

  // Get assignment titles for display
  const getAssignmentTitles = () => {
    if (assignmentsInFolder.length === 0) return null;
    
    const titles = assignmentsInFolder.map(assignment => 
      getShortTitle(assignment.gameName || assignment.title || 'Untitled')
    ).filter(title => title.length > 0);
    
    return titles.length > 0 ? titles : ['Untitled'];
  };
  
  // Drag and drop setup
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: 'folder', folderId: folder.id }
  });

  const handleFolderClick = useCallback(() => {
    onFolderClick(folder.id);
  }, [folder.id, onFolderClick]);

  const handleToggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpanded(folder.id);
    }
  }, [folder.id, hasChildren, onToggleExpanded]);

  return (
    <div style={{ marginLeft: `${indentSize}px` }}>
      <div style={{ position: 'relative' }}>
        {/* Drop zone container */}
        <div
          ref={setNodeRef}
          style={{
            backgroundColor: isOver ? '#E2F8FF' : 'transparent',
            border: isOver ? `2px dashed #3182CE` : '2px solid transparent',
            borderRadius: '8px',
            padding: '2px',
            transition: 'all 0.2s ease'
          }}
        >
          {/* Folder button */}
          <div
            onClick={handleFolderClick}
            style={{
              padding: '16px 20px',
              backgroundColor: isSelected ? folder.color || '#4299E1' : 'white',
              color: isSelected ? 'white' : '#4A5568',
              border: `2px solid ${folder.color || '#4299E1'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: isSelected ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px',
              userSelect: 'none',
              transition: 'all 0.2s ease',
              minHeight: '56px',
              transform: isOver ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Expand/Collapse button */}
              {hasChildren && (
                <button
                  onClick={handleToggleExpanded}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    color: isSelected ? 'white' : '#4A5568',
                    fontSize: '12px'
                  }}
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              )}
              
              <span style={{ fontSize: '16px' }}>
                {isExpanded ? '📂' : '📁'}
              </span>
              <span>{folder.name}</span>
              {hasChildren && (
                <span style={{ 
                  fontSize: '12px', 
                  color: isSelected ? 'rgba(255,255,255,0.8)' : '#718096',
                  marginLeft: '4px'
                }}>
                  ({folder.children.length})
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Assignment titles */}
              {assignmentCount > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '2px',
                  maxWidth: '200px'
                }}>
                  {getAssignmentTitles()?.map((title, index) => (
                    <span
                      key={index}
                      style={{
                        fontSize: '10px',
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : '#E2E8F0',
                        color: isSelected ? 'white' : '#4A5568',
                        padding: '1px 4px',
                        borderRadius: '8px',
                        fontWeight: '500',
                        fontFamily: 'monospace'
                      }}
                    >
                      {title}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Button container with pointer events isolation */}
              <div style={{ 
                display: 'flex', 
                gap: '2px', 
                alignItems: 'center',
                pointerEvents: 'auto',
                zIndex: 20,
                position: 'relative'
              }}>
                {/* Add Subfolder button */}
                {folder.level < maxDepth && canCreateSubfolder(folder.id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateSubfolder(folder.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      color: isSelected ? 'white' : '#4299E1',
                      fontSize: '14px',
                      opacity: 1,
                      zIndex: 10,
                      position: 'relative',
                      pointerEvents: 'auto',
                      minWidth: '20px',
                      minHeight: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Add subfolder"
                  >
                    ➕
                  </button>
                )}
                
                {/* Edit Folder button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditFolder(folder);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    color: isSelected ? 'white' : '#805AD5',
                    fontSize: '14px',
                    opacity: 1,
                    zIndex: 10,
                    position: 'relative',
                    pointerEvents: 'auto',
                    minWidth: '20px',
                    minHeight: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Edit folder"
                >
                  ✏️
                </button>
                
                {/* Delete Folder button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    color: isSelected ? 'white' : '#E53E3E',
                    fontSize: '14px',
                    opacity: 1,
                    zIndex: 10,
                    position: 'relative',
                    pointerEvents: 'auto',
                    minWidth: '20px',
                    minHeight: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Delete folder"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div style={{ marginTop: '4px' }}>
            {folder.children.map(child => (
              <DroppableFolderItem
                key={child.id}
                folder={child}
                selectedFolderId={selectedFolderId}
                onFolderClick={onFolderClick}
                onCreateSubfolder={onCreateSubfolder}
                onEditFolder={onEditFolder}
                onDeleteFolder={onDeleteFolder}
                getAssignmentsInFolder={getAssignmentsInFolder}
                canCreateSubfolder={canCreateSubfolder}
                maxDepth={maxDepth}
                expandedFolders={expandedFolders}
                onToggleExpanded={onToggleExpanded}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Droppable Unorganized Zone Component
const DroppableUnorganizedZone: React.FC<{ 
  unorganizedAssignments: any[];
}> = ({ unorganizedAssignments }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'unorganized-zone',
    data: { type: 'unorganized' }
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        padding: '12px',
        backgroundColor: isOver ? '#FFF8E1' : '#FFF8DC',
        border: `2px dashed ${isOver ? '#F59E0B' : '#DDD'}`,
        borderRadius: '8px',
        textAlign: 'center' as const,
        color: '#666',
        transition: 'all 0.2s ease',
        transform: isOver ? 'scale(1.02)' : 'scale(1)'
      }}
    >
      🗂️ Unorganized Assignments ({unorganizedAssignments.length})
      <br />
      <small>Drag assignments here to remove them from folders</small>
    </div>
  );
};

const AssignmentFolderManagement: React.FC<AssignmentFolderManagementProps> = ({
  currentUser,
  assignments,
  onAssignmentsUpdate,
  showToast,
  assignmentFolderFilter,
  setAssignmentFolderFilter,
  onFolderHandlersReady
}) => {
  // Local state for folder tree expansion
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Use the real assignment folder manager hook
  const assignmentFolderManager = useAssignmentFolderManager({
    userId: currentUser?.uid || '',
    assignments,
    onAssignmentsUpdate,
    onShowToast: showToast
  });

  // Build folder tree (similar to game folders)
  const folderTree = useMemo(() => {
    return buildAssignmentFolderTree(
      assignmentFolderManager.folders,
      assignments
    );
  }, [assignmentFolderManager.folders, assignments]);

  // Toggle folder expansion
  const handleToggleExpanded = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }, []);

  // Expand all folders
  const handleExpandAll = useCallback(() => {
    const allFolderIds = new Set<string>();
    const collectIds = (nodes: AssignmentFolderTreeNode[]) => {
      nodes.forEach(node => {
        allFolderIds.add(node.id);
        if (node.children.length > 0) {
          collectIds(node.children);
        }
      });
    };
    collectIds(folderTree);
    setExpandedFolders(allFolderIds);
  }, [folderTree]);

  // Collapse all folders
  const handleCollapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  // Memoize the handlers to prevent infinite loops
  const handlers = useMemo(() => ({
    ...assignmentFolderManager,
    expandAll: handleExpandAll,
    collapseAll: handleCollapseAll,
  }), [
    assignmentFolderManager.handleSaveFolder,
    assignmentFolderManager.handleDeleteFolder,
    assignmentFolderManager.handleCancelFolder,
    assignmentFolderManager.assignAssignmentToFolder,
    assignmentFolderManager.removeAssignmentFromFolder,
    assignmentFolderManager.openCreateFolderModal,
    assignmentFolderManager.openEditFolderModal,
    handleExpandAll,
    handleCollapseAll
  ]);

  // Pass handlers to parent for external use
  React.useEffect(() => {
    if (onFolderHandlersReady) {
      console.log('📋 Calling onFolderHandlersReady with handlers:', Object.keys(handlers));
      onFolderHandlersReady(handlers);
    }
  }, [handlers, onFolderHandlersReady]);

  // Auto-expand first 2 levels when folders change
  React.useEffect(() => {
    const autoExpanded = new Set<string>();
    const addExpanded = (nodes: AssignmentFolderTreeNode[]) => {
      nodes.forEach(node => {
        if (node.level < 2) {
          autoExpanded.add(node.id);
        }
        if (node.children.length > 0) {
          addExpanded(node.children);
        }
      });
    };
    addExpanded(folderTree);
    setExpandedFolders(prev => new Set([...prev, ...autoExpanded]));
  }, [folderTree]);

  // Show loading state
  if (assignmentFolderManager.isLoading) {
    return (
      <div style={{ marginBottom: '12px', padding: '16px', textAlign: 'center' as const }}>
        Loading assignment folders...
      </div>
    );
  }

  // Show error state only if we have a valid currentUser
  // (prevents showing error during initial auth load)
  if (assignmentFolderManager.error && currentUser?.uid) {
    return (
      <div style={{ 
        marginBottom: '12px', 
        padding: '16px', 
        backgroundColor: '#FED7D7', 
        color: '#9B2C2C', 
        borderRadius: '8px',
        textAlign: 'center' as const
      }}>
        Error loading assignment folders: {assignmentFolderManager.error}
      </div>
    );
  }

  return (
    <div style={{ 
      marginBottom: '24px',
      padding: '16px',
      backgroundColor: '#F0F8FF', // Light blue background to distinguish from games
      borderRadius: '8px',
      border: '1px solid #B0E0E6'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2D3748' }}>
            📋 Organize Your Assignments
          </h3>
          
          {/* Undo/Redo Controls */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={assignmentFolderManager.undo}
              disabled={!assignmentFolderManager.canUndo}
              style={{
                padding: '6px 12px',
                backgroundColor: assignmentFolderManager.canUndo ? '#2B6CB0' : '#EDF2F7',
                color: assignmentFolderManager.canUndo ? 'white' : '#A0AEC0',
                border: `2px solid ${assignmentFolderManager.canUndo ? '#2B6CB0' : '#CBD5E0'}`,
                borderRadius: '6px',
                cursor: assignmentFolderManager.canUndo ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                boxShadow: assignmentFolderManager.canUndo ? '0 2px 4px rgba(43, 108, 176, 0.2)' : 'none'
              }}
              title="Undo last action"
            >
              ↶ Undo
            </button>
            
            <button
              onClick={assignmentFolderManager.redo}
              disabled={!assignmentFolderManager.canRedo}
              style={{
                padding: '6px 12px',
                backgroundColor: assignmentFolderManager.canRedo ? '#38A169' : '#EDF2F7',
                color: assignmentFolderManager.canRedo ? 'white' : '#A0AEC0',
                border: `2px solid ${assignmentFolderManager.canRedo ? '#38A169' : '#CBD5E0'}`,
                borderRadius: '6px',
                cursor: assignmentFolderManager.canRedo ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                boxShadow: assignmentFolderManager.canRedo ? '0 2px 4px rgba(56, 161, 105, 0.2)' : 'none'
              }}
              title="Redo last action"
            >
              ↷ Redo
            </button>
          </div>
        </div>
      </div>
      
      {/* All Assignments Button */}
      <div style={{ marginBottom: '8px' }}>
        <button
          onClick={() => {
            assignmentFolderManager.setSelectedFolderId(null);
            setAssignmentFolderFilter('all');
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: assignmentFolderManager.selectedFolderId === null ? '#E2E8F0' : 'white',
            color: assignmentFolderManager.selectedFolderId === null ? '#2D3748' : '#4A5568',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: assignmentFolderManager.selectedFolderId === null ? '600' : '400'
          }}
        >
          📋 All Assignments ({assignments.length})
        </button>
      </div>

      {/* Assignment Folder Tree */}
      {assignmentFolderManager.folders.length > 0 ? (
        <div>
          {/* Tree Controls */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginBottom: '12px',
            alignItems: 'center'
          }}>
            <button
              onClick={handleExpandAll}
              style={{
                padding: '4px 8px',
                backgroundColor: '#E6FFFA',
                color: '#234E52',
                border: '1px solid #4FD1C7',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              📖 Expand All
            </button>
            
            <button
              onClick={handleCollapseAll}
              style={{
                padding: '4px 8px',
                backgroundColor: '#FED7D7',
                color: '#742A2A',
                border: '1px solid #FC8181',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              📕 Collapse All
            </button>
            
            <button
              onClick={() => assignmentFolderManager.openCreateFolderModal()}
              style={{
                padding: '4px 8px',
                backgroundColor: '#4299E1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              ➕ Add Root Folder
            </button>
          </div>
          
          {/* Folder Tree */}
          <div style={{ 
            marginBottom: '12px', 
            padding: '12px', 
            backgroundColor: 'white', 
            borderRadius: '6px', 
            border: '1px solid #E2E8F0',
            minHeight: '100px'
          }}>
            {folderTree.map(folder => (
              <DroppableFolderItem
                key={folder.id}
                folder={folder}
                selectedFolderId={assignmentFolderManager.selectedFolderId}
                onFolderClick={(folderId) => {
                  assignmentFolderManager.setSelectedFolderId(folderId);
                  setAssignmentFolderFilter(folderId);
                }}
                onCreateSubfolder={assignmentFolderManager.openCreateFolderModal}
                onEditFolder={assignmentFolderManager.openEditFolderModal}
                onDeleteFolder={assignmentFolderManager.deleteExistingFolder}
                getAssignmentsInFolder={assignmentFolderManager.getAssignmentsInFolder}
                canCreateSubfolder={assignmentFolderManager.canCreateSubfolder}
                maxDepth={3}
                expandedFolders={expandedFolders}
                onToggleExpanded={handleToggleExpanded}
              />
            ))}
          </div>
          
          {/* Unorganized Assignments Drop Zone */}
          <div style={{ marginTop: '12px' }}>
            <DroppableUnorganizedZone 
              unorganizedAssignments={assignmentFolderManager.getUnorganizedAssignments()}
            />
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
              🚀 Get Started with Assignment Folders
            </h4>
            <p style={{ color: '#4A5568', marginBottom: '12px' }}>
              Organize your assignments into folders to keep track of different classes, subjects, or assignment types.
            </p>
            <button
              onClick={() => assignmentFolderManager.openCreateFolderModal()}
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
              📁 Create Your First Assignment Folder
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentFolderManagement; 