import React from 'react';
import { useFolderManager } from '../../components/FolderManager';
import { UnorganizedDropZone } from '../../components/UnorganizedDropZone';
import { SimpleFolderTree } from '../../components/SimpleFolderTree';
import { Game, ToastOptions } from './types';

interface FolderManagementProps {
  currentUser: any;
  games: Game[];
  onGamesUpdate: (games: Game[]) => void;
  showToast: (options: ToastOptions) => void;
  gameFolderFilter: string;
  setGameFolderFilter: (filter: string) => void;
  onFolderHandlersReady?: (handlers: any) => void;
}

const FolderManagement: React.FC<FolderManagementProps> = ({
  currentUser,
  games,
  onGamesUpdate,
  showToast,
  gameFolderFilter,
  setGameFolderFilter,
  onFolderHandlersReady
}) => {
  // Initialize folder manager hook
  const folderManager = useFolderManager({
    userId: currentUser?.uid || '',
    games: games as any[],
    onGamesUpdate: onGamesUpdate as any,
    onShowToast: showToast
  });

  // Pass handlers to parent for external use
  React.useEffect(() => {
    if (onFolderHandlersReady) {
      onFolderHandlersReady({
        ...folderManager,
        // Add any additional handlers here if needed
      });
    }
  }, [folderManager, onFolderHandlersReady]);

  return (
    <div style={{ 
      marginBottom: '24px',
      padding: '16px',
      backgroundColor: '#F8FAFC',
      borderRadius: '8px',
      border: '1px solid #E2E8F0'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2D3748' }}>
            📁 Organize Your Games
          </h3>
          
          {/* Undo/Redo Controls */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={folderManager.undo}
              disabled={!folderManager.canUndo}
              style={{
                padding: '6px 12px',
                backgroundColor: folderManager.canUndo ? '#2B6CB0' : '#EDF2F7',
                color: folderManager.canUndo ? 'white' : '#A0AEC0',
                border: `2px solid ${folderManager.canUndo ? '#2B6CB0' : '#CBD5E0'}`,
                borderRadius: '6px',
                cursor: folderManager.canUndo ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                boxShadow: folderManager.canUndo ? '0 2px 4px rgba(43, 108, 176, 0.2)' : 'none'
              }}
              title={folderManager.canUndo ? `Undo: ${folderManager.undoStack[folderManager.undoStack.length - 1]?.description || 'Last action'}` : 'Nothing to undo'}
              onMouseEnter={(e) => {
                if (folderManager.canUndo) {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#2C5282';
                  target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (folderManager.canUndo) {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#2B6CB0';
                  target.style.transform = 'translateY(0)';
                }
              }}
            >
              ↶ Undo
            </button>
            
            <button
              onClick={folderManager.redo}
              disabled={!folderManager.canRedo}
              style={{
                padding: '6px 12px',
                backgroundColor: folderManager.canRedo ? '#38A169' : '#EDF2F7',
                color: folderManager.canRedo ? 'white' : '#A0AEC0',
                border: `2px solid ${folderManager.canRedo ? '#38A169' : '#CBD5E0'}`,
                borderRadius: '6px',
                cursor: folderManager.canRedo ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                boxShadow: folderManager.canRedo ? '0 2px 4px rgba(56, 161, 105, 0.2)' : 'none'
              }}
              title={folderManager.canRedo ? `Redo: ${folderManager.redoStack[folderManager.redoStack.length - 1]?.description || 'Last undone action'}` : 'Nothing to redo'}
              onMouseEnter={(e) => {
                if (folderManager.canRedo) {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#2F855A';
                  target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (folderManager.canRedo) {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#38A169';
                  target.style.transform = 'translateY(0)';
                }
              }}
            >
              ↷ Redo
            </button>
          </div>
        </div>
      </div>
      
      {/* New 4-Level Folder Tree */}
      {folderManager.folderTree.length > 0 ? (
        <div style={{ marginBottom: '12px' }}>
          {/* All Games Button */}
          <div style={{ marginBottom: '8px' }}>
            <button
              onClick={() => {
                folderManager.setSelectedFolderId(null);
                setGameFolderFilter('all');
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: folderManager.selectedFolderId === null ? '#E2E8F0' : 'white',
                color: folderManager.selectedFolderId === null ? '#2D3748' : '#4A5568',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: folderManager.selectedFolderId === null ? '600' : '400'
              }}
            >
              📋 All Games ({games.length})
            </button>
          </div>
          
          {/* Use SimpleFolderTree component (already inside unified DndContext) */}
          <SimpleFolderTree 
            folders={folderManager.folderTree}
            selectedFolderId={folderManager.selectedFolderId}
            onFolderClick={(folderId: string) => {
              folderManager.setSelectedFolderId(folderId);
              setGameFolderFilter('all');
            }}
            onCreateSubfolder={folderManager.openCreateFolderModal}
            onEditFolder={folderManager.openEditFolderModal}
            onDeleteFolder={(folderId: string) => folderManager.deleteExistingFolder(folderId)}
            getGamesInFolder={folderManager.getGamesInFolder}
            canCreateSubfolder={folderManager.canCreateSubfolder}
            maxDepth={3}
            showGameCounts={true}
            collapsible={true}
          />
          
          {/* Unorganized Games Drop Zone (inside unified DndContext) */}
          <div style={{ marginTop: '12px' }}>
            <UnorganizedDropZone unorganizedGamesCount={folderManager.getUnorganizedGames().length} />
          </div>
        </div>
      ) : (
        /* Temporary fallback: show flat folder list if tree is empty */
        <div style={{ marginBottom: '12px' }}>
          <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#FFF3CD', borderRadius: '6px', border: '1px solid #FFC107' }}>
            <strong>Debug:</strong> FolderTree is empty (length: {folderManager.folderTree.length}), showing fallback. 
            Folders array has {folderManager.folders.length} items.
          </div>
          
          {folderManager.folders.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {folderManager.folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => folderManager.setSelectedFolderId(folder.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'white',
                    color: '#4A5568',
                    border: `2px solid ${folder.color || '#4299E1'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📁 {folder.name} (level: {folder.depth || 0})
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FolderManagement; 