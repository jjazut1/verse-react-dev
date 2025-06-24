import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  useDraggable,
  DragOverlay,
} from '@dnd-kit/core';
import { FolderTreeNode, GameFolder, DragItem, DropResult } from '../types/game';

interface FolderTreeProps {
  folders: FolderTreeNode[];
  selectedFolderId: string | null;
  onFolderClick: (folderId: string) => void;
  onCreateSubfolder: (parentId: string | null) => void;
  onEditFolder: (folder: GameFolder) => void;
  onDeleteFolder: (folderId: string) => void;
  onFolderDrop: (dropResult: DropResult) => void;
  getGamesInFolder: (folderId: string) => any[];
  canCreateSubfolder: (parentId: string | null) => boolean;
  maxDepth?: number;
  showGameCounts?: boolean;
  collapsible?: boolean;
  activeItem?: DragItem | null;
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
  const isSelected = selectedFolderId === folder.id;
  const canAddSubfolder = folder.level < maxDepth && canCreateSubfolder(folder.id);
  const hasChildren = folder.children.length > 0;
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
        {/* Visual hierarchy connector lines */}
        {folder.level > 0 && (
          <div
            style={{
              position: 'absolute',
              left: '-12px',
              top: '0',
              bottom: '0',
              width: '2px',
              backgroundColor: '#E2E8F0',
              content: '""'
            }}
          />
        )}
        
        {/* Main folder button */}
        <div
          ref={(node) => {
            setDropRef(node);
            setDragRef(node);
          }}
          {...attributes}
          {...listeners}
          onClick={handleFolderClick}
          style={{
            padding: '8px 12px',
            backgroundColor: isOver ? '#E6FFFA' : (isSelected ? folder.color || '#4299E1' : 'white'),
            color: isSelected ? 'white' : '#4A5568',
            border: `2px solid ${isOver ? '#38B2AC' : (folder.color || '#4299E1')}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: isSelected ? '600' : '400',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            marginBottom: '4px',
            width: 'calc(100% - 8px)',
            position: 'relative',
            opacity: isDragging ? 0.5 : 1,
            boxShadow: isDragging ? '0 4px 8px rgba(0,0,0,0.2)' : (isOver ? '0 4px 12px rgba(56, 178, 172, 0.3)' : 'none'),
            transform: isDragging ? 'rotate(2deg)' : (isOver ? 'scale(1.02)' : 'none')
          }}
          onMouseEnter={(e) => {
            if (!isDragging && !isOver) {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging && !isOver) {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {/* Drop zone indicator */}
          {isOver && (
            <div style={{
              position: 'absolute',
              top: '-2px',
              left: '-2px',
              right: '-2px',
              bottom: '-2px',
              border: '2px dashed #38B2AC',
              borderRadius: '10px',
              pointerEvents: 'none',
              animation: 'pulse 1s infinite'
            }} />
          )}
          {/* Expand/Collapse button */}
          {collapsible && hasChildren && (
            <button
              onClick={handleToggleExpanded}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '2px',
                color: 'inherit'
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          
          {/* Folder icon */}
          <span style={{ fontSize: '16px' }}>
            {getFolderIcon(folder.level, isExpanded, hasChildren)}
          </span>
          
          {/* Folder name and game count */}
          <span style={{ flex: 1, marginLeft: folder.level > 0 ? '4px' : '0' }}>
            {folder.name}
            {showGameCounts && (
              <span style={{ 
                marginLeft: '8px', 
                fontSize: '12px', 
                opacity: 0.7,
                fontWeight: 'normal'
              }}>
                ({folder.gameCount || 0})
              </span>
            )}
          </span>
          
          {/* Drag handle indicator */}
          <span style={{ 
            fontSize: '12px', 
            opacity: 0.5,
            marginLeft: 'auto'
          }}>
            ⋮⋮
          </span>
        </div>
        
        {/* Folder Actions */}
        {isSelected && (
          <div 
            data-folder-actions
            style={{
              position: 'absolute',
              top: '100%',
              left: '0',
              zIndex: 10,
              backgroundColor: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              padding: '8px',
              marginTop: '4px',
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              minWidth: '200px'
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditFolder(folder);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#F7FAFC',
                color: '#4A5568',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              ✏️ Edit
            </button>
            
            {canAddSubfolder && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateSubfolder(folder.id);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#E6FFFA',
                  color: '#319795',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
              >
                ➕ Add Subfolder
              </button>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFolder(folder.id);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#FED7D7',
                color: '#C53030',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>
      
      {/* Render children */}
      {hasChildren && (!collapsible || isExpanded) && (
        <div style={{ marginTop: '4px' }}>
          {folder.children.map(child => (
            <FolderItem
              key={child.id}
              folder={child}
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
      )}
    </div>
  );
};

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolderId,
  onFolderClick,
  onCreateSubfolder,
  onEditFolder,
  onDeleteFolder,
  onFolderDrop,
  getGamesInFolder,
  canCreateSubfolder,
  maxDepth = 3, // 4 levels: 0, 1, 2, 3
  showGameCounts = true,
  collapsible = true
}) => {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    // Auto-expand first 2 levels by default
    const expanded = new Set<string>();
    const addExpanded = (nodes: FolderTreeNode[]) => {
      nodes.forEach(node => {
        if (node.level < 2) {
          expanded.add(node.id);
        }
        if (node.children.length > 0) {
          addExpanded(node.children);
        }
      });
    };
    addExpanded(folders);
    return expanded;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance to start dragging
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const dragData = active.data.current;
    
    if (dragData) {
      setActiveItem({
        id: active.id as string,
        type: dragData.type,
        data: dragData.folder || dragData.game
      });
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active && over && active.id !== over.id) {
      const dragData = active.data.current;
      const dropData = over.data.current;
      
      if (dragData && dropData) {
        const dropResult: DropResult = {
          draggedItem: {
            id: active.id as string,
            type: dragData.type,
            data: dragData.folder || dragData.game
          },
          targetFolderId: over.id as string,
          newParentId: dropData.type === 'folder' ? over.id as string : null
        };
        
        onFolderDrop(dropResult);
      }
    }
    
    setActiveItem(null);
  }, [onFolderDrop]);

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
        if (node.children.length > 0) {
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
      {/* Tree Controls */}
      {collapsible && folders.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '8px',
          padding: '8px',
          backgroundColor: '#F7FAFC',
          borderRadius: '6px',
          border: '1px solid #E2E8F0'
        }}>
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
          <button
            onClick={() => onCreateSubfolder(null)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#E3F2FD',
              color: '#1976D2',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ➕ Add Root Folder
          </button>
        </div>
      )}

      {/* Folder Tree */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {folders.length > 0 ? (
            folders.map(folder => (
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
            ))
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#718096',
              backgroundColor: '#F7FAFC',
              borderRadius: '8px',
              border: '2px dashed #E2E8F0'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                No folders yet
              </h3>
              <p style={{ marginBottom: '16px' }}>
                Create your first folder to organize your games
              </p>
              <button
                onClick={() => onCreateSubfolder(null)}
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
                ➕ Create First Folder
              </button>
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem && (
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
              zIndex: 1000
            }}>
              <span>📁</span>
              <span>{(activeItem.data as GameFolder).name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}; 