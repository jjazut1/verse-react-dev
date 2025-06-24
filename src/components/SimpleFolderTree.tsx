import React, { useState, useCallback } from 'react';
import {
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { FolderTreeNode, GameFolder } from '../types/game';

interface SimpleFolderTreeProps {
  folders: FolderTreeNode[];
  selectedFolderId: string | null;
  onFolderClick: (folderId: string) => void;
  onCreateSubfolder: (parentId: string | null) => void;
  onEditFolder: (folder: GameFolder) => void;
  onDeleteFolder: (folderId: string) => void;
  getGamesInFolder: (folderId: string) => any[];
  canCreateSubfolder: (parentId: string | null) => boolean;
  maxDepth?: number;
  showGameCounts?: boolean;
  collapsible?: boolean;
}

interface FolderItemProps {
  folder: FolderTreeNode;
  selectedFolderId: string | null;
  onFolderClick: (folderId: string) => void;
  onCreateSubfolder: (parentId: string | null) => void;
  onEditFolder: (folder: GameFolder) => void;
  onDeleteFolder: (folderId: string) => void;
  getGamesInFolder: (folderId: string) => any[];
  canCreateSubfolder: (parentId: string | null) => boolean;
  maxDepth: number;
  showGameCounts: boolean;
  collapsible: boolean;
  expandedFolders: Set<string>;
  onToggleExpanded: (folderId: string) => void;
}

const getFolderIcon = (level: number, isExpanded: boolean, hasChildren: boolean): string => {
  if (level === 0) return hasChildren && isExpanded ? '📂' : '📁'; // Root folder
  if (level === 1) return hasChildren && isExpanded ? '├── 📂' : '├── 📁'; // Level 1
  if (level === 2) return hasChildren && isExpanded ? '├─── 📂' : '├─── 📁'; // Level 2
  return hasChildren && isExpanded ? '└──── 📄' : '└──── 📄'; // Level 3
};

const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  selectedFolderId,
  onFolderClick,
  onCreateSubfolder,
  onEditFolder,
  onDeleteFolder,
  getGamesInFolder,
  canCreateSubfolder,
  maxDepth,
  showGameCounts,
  collapsible,
  expandedFolders,
  onToggleExpanded
}) => {
  const gamesInFolder = getGamesInFolder(folder.id);
  const gameCount = gamesInFolder.length;
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;
  const isExpanded = expandedFolders.has(folder.id);
  
  const indentSize = folder.level * 24;
  
  // Drag and drop setup
  const { setNodeRef: setDropRef, isOver } = useDroppable({ 
    id: folder.id,
    data: { type: 'folder', folder }
  });
  
  const { 
    attributes, 
    listeners, 
    setNodeRef: setDragRef, 
    isDragging 
  } = useDraggable({ 
    id: folder.id,
    data: { type: 'folder', folder }
  });

  const handleFolderClick = useCallback(() => {
    onFolderClick(folder.id);
  }, [folder.id, onFolderClick]);

  const handleToggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren && collapsible) {
      onToggleExpanded(folder.id);
    }
  }, [folder.id, hasChildren, collapsible, onToggleExpanded]);

  return (
    <div style={{ marginLeft: `${indentSize}px` }}>
      <div style={{ position: 'relative' }}>
        {/* Drop zone container - droppable only */}
        <div
          ref={setDropRef}
          style={{
            backgroundColor: isOver ? '#E6FFFA' : 'transparent',
            border: isOver ? `2px dashed #38B2AC` : '2px solid transparent',
            borderRadius: '8px',
            padding: '2px',
            transition: 'all 0.2s ease'
          }}
        >
          {/* Folder button - draggable only */}
          <div
            ref={setDragRef}
            {...attributes}
            {...listeners}
            onClick={handleFolderClick}
            style={{
              padding: '16px 20px',
              backgroundColor: isSelected ? folder.color || '#4299E1' : 'white',
              color: isSelected ? 'white' : '#4A5568',
              border: `2px solid ${folder.color || '#4299E1'}`,
              borderRadius: '6px',
              cursor: isDragging ? 'grabbing' : 'grab',
              fontSize: '14px',
              fontWeight: isSelected ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px',
              userSelect: 'none',
              opacity: isDragging ? 0.5 : 1,
              transform: isDragging ? 'rotate(2deg)' : 'none',
              transition: 'all 0.2s ease',
              minHeight: '56px'
            }}
          >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            {/* Game count */}
            {showGameCounts && gameCount > 0 && (
              <span style={{
                fontSize: '11px',
                backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#E2E8F0',
                color: isSelected ? 'white' : '#4A5568',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: '500'
              }}>
                {gameCount} game{gameCount !== 1 ? 's' : ''}
              </span>
            )}
            
            {/* Add Subfolder button - shows when selected or on hover */}
            {(isSelected || folder.level < maxDepth) && canCreateSubfolder(folder.id) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateSubfolder(folder.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  color: isSelected ? 'white' : '#4299E1',
                  fontSize: '12px',
                  opacity: isSelected ? 1 : 0.7
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
                padding: '2px',
                color: isSelected ? 'white' : '#805AD5',
                fontSize: '12px',
                opacity: isSelected ? 1 : 0.7
              }}
              title="Edit folder"
            >
              ✏️
            </button>
            
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
            
            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete folder "${folder.name}"?`)) {
                  onDeleteFolder(folder.id);
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: isSelected ? 'white' : '#E53E3E',
                fontSize: '12px',
                opacity: 0.7
              }}
              title="Delete folder"
            >
              🗑️
            </button>
          </div>
          </div>
        </div>
      </div>
      
      {/* Render child folders */}
      {isExpanded && hasChildren && folder.children.map((childFolder) => (
        <FolderItem
          key={childFolder.id}
          folder={childFolder}
          selectedFolderId={selectedFolderId}
          onFolderClick={onFolderClick}
          onCreateSubfolder={onCreateSubfolder}
          onEditFolder={onEditFolder}
          onDeleteFolder={onDeleteFolder}
          getGamesInFolder={getGamesInFolder}
          canCreateSubfolder={canCreateSubfolder}
          maxDepth={maxDepth}
          showGameCounts={showGameCounts}
          collapsible={collapsible}
          expandedFolders={expandedFolders}
          onToggleExpanded={onToggleExpanded}
        />
      ))}
    </div>
  );
};

export const SimpleFolderTree: React.FC<SimpleFolderTreeProps> = ({
  folders,
  selectedFolderId,
  onFolderClick,
  onCreateSubfolder,
  onEditFolder,
  onDeleteFolder,
  getGamesInFolder,
  canCreateSubfolder,
  maxDepth = 3,
  showGameCounts = true,
  collapsible = true
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    // Auto-expand first 2 levels by default
    const expanded = new Set<string>();
    const addExpanded = (nodes: FolderTreeNode[]) => {
      nodes.forEach(node => {
        if (node.level < 2) {
          expanded.add(node.id);
        }
        if (node.children && node.children.length > 0) {
          addExpanded(node.children);
        }
      });
    };
    addExpanded(folders);
    return expanded;
  });

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

  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (nodes: FolderTreeNode[]) => {
      nodes.forEach(node => {
        allIds.add(node.id);
        if (node.children && node.children.length > 0) {
          collectIds(node.children);
        }
      });
    };
    collectIds(folders);
    setExpandedFolders(allIds);
  }, [folders]);

  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Tree Controls - Always visible */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '8px',
        padding: '8px',
        backgroundColor: '#F7FAFC',
        borderRadius: '6px',
        border: '1px solid #E2E8F0'
      }}>
        {folders.length > 0 && collapsible && (
          <>
            <button
              onClick={expandAll}
              style={{
                padding: '4px 8px',
                backgroundColor: '#E6FFFA',
                color: '#319795',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              📂 Expand All
            </button>
            <button
              onClick={collapseAll}
              style={{
                padding: '4px 8px',
                backgroundColor: '#FED7D7',
                color: '#C53030',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              📁 Collapse All
            </button>
          </>
        )}
        <button
          onClick={() => onCreateSubfolder(null)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#4299E1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          ➕ Add Root Folder
        </button>
        {folders.length === 0 && (
          <span style={{ 
            fontSize: '12px', 
            color: '#718096',
            alignSelf: 'center',
            marginLeft: '8px'
          }}>
            Create folders to organize your games
          </span>
        )}
      </div>

      {/* Folder Tree */}
      {folders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              selectedFolderId={selectedFolderId}
              onFolderClick={onFolderClick}
              onCreateSubfolder={onCreateSubfolder}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
              getGamesInFolder={getGamesInFolder}
              canCreateSubfolder={canCreateSubfolder}
              maxDepth={maxDepth}
              showGameCounts={showGameCounts}
              collapsible={collapsible}
              expandedFolders={expandedFolders}
              onToggleExpanded={handleToggleExpanded}
            />
          ))}
        </div>
      )}

      {/* No folders message - simplified since Add Root Folder is always visible now */}
      {folders.length === 0 && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#718096',
          backgroundColor: '#F7FAFC',
          borderRadius: '8px',
          border: '2px dashed #CBD5E0'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
          <p style={{ margin: '0', fontWeight: '500' }}>No folders yet</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>Use the "Add Root Folder" button above to get started</p>
        </div>
      )}
    </div>
  );
}; 