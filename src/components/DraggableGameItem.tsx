import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface Game {
  id: string;
  title: string;
  description?: string;
  gameType?: string;
  thumbnailUrl?: string;
  createdBy: string;
  share: boolean;
  userId: string;
  folderId?: string;
  folderName?: string;
  folderColor?: string;
}

interface DraggableGameItemProps {
  game: Game;
  onPlayGame: (gameId: string) => void;
  onEditGame: (game: Game) => void;
  onAssignGame: (game: Game) => void;
  onDeleteGame: (gameId: string) => void;
}

export const DraggableGameItem: React.FC<DraggableGameItemProps> = ({
  game,
  onPlayGame,
  onEditGame,
  onAssignGame,
  onDeleteGame
}) => {
  // Debug logging
  console.log('🎲 DraggableGameItem rendering:', { 
    id: game.id, 
    title: game.title, 
    gameType: game.gameType 
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: game.id,
    data: {
      type: 'game',
      game: game
    }
  });

  // Debug drag state
  if (isDragging) {
    console.log('🚀 Game is dragging:', game.title);
  }

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${isDragging ? '5deg' : '0deg'}) scale(${isDragging ? '1.05' : '1'})`,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1000 : 1,
    transition: isDragging ? 'none' : 'transform 0.2s ease, opacity 0.2s ease'
  } : {
    transform: 'none',
    opacity: 1,
    zIndex: 1,
    transition: 'transform 0.2s ease, opacity 0.2s ease'
  };

  return (
    <div 
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ 
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #E2E8F0',
        boxShadow: isDragging ? '0 8px 24px rgba(0, 0, 0, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
        cursor: isDragging ? 'grabbing' : 'grab',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {/* Drag Handle Indicator */}
      {isDragging && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          fontSize: '16px',
          color: '#4299E1',
          pointerEvents: 'none'
        }}>
          ✋
        </div>
      )}
      
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ 
          width: '64px', 
          height: '64px', 
          backgroundColor: (game.gameType || '').includes('whack') ? '#C6F6D5' : 
                          (game.gameType || '').includes('spinner') ? '#FED7D7' : 
                          (game.gameType || '').includes('anagram') ? '#BFDBFE' : 
                          (game.gameType || '').includes('sentence') ? '#E0F2FE' : 
                          (game.gameType || '').includes('place') ? '#FFEBE6' : '#E9D8FD',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {game.thumbnailUrl ? (
            <img src={game.thumbnailUrl} alt={game.title} style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              borderRadius: '8px'
            }} />
          ) : (
            <div style={{ fontSize: '24px', color: '#718096' }}>
              {(game.gameType || '').includes('whack') ? '🔨' : 
               (game.gameType || '').includes('spinner') ? '🎡' : 
               (game.gameType || '').includes('anagram') ? '🧩' : 
               (game.gameType || '').includes('sentence') ? '📝' : 
               (game.gameType || '').includes('place') ? '🎯' : '🥚'}
            </div>
          )}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '4px',
            color: '#2D3748',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {game.title}
          </h3>
          
          {/* Folder Badge */}
          {game.folderName && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              backgroundColor: game.folderColor || '#E2E8F0',
              color: 'white',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              📁 {game.folderName}
            </div>
          )}
          
          <p style={{ 
            color: '#718096', 
            fontSize: '14px',
            marginBottom: '16px',
            textTransform: 'capitalize'
          }}>
            {(game.gameType || 'Unknown').replace('-', ' ')}
          </p>
          
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayGame(game.id);
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#E3F2FD',
                color: '#1976D2',
                border: '1px solid #BBDEFB',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.2s',
                minWidth: 'auto',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#BBDEFB';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#E3F2FD';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ▶️ Play
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditGame(game);
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#F3E5F5',
                color: '#7B1FA2',
                border: '1px solid #E1BEE7',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.2s',
                minWidth: 'auto',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E1BEE7';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F3E5F5';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ✏️ Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAssignGame(game);
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#E8F5E8',
                color: '#2E7D32',
                border: '1px solid #C8E6C9',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.2s',
                minWidth: 'auto',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#C8E6C9';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#E8F5E8';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              📋 Assign
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteGame(game.id);
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#FFEBEE',
                color: '#C62828',
                border: '1px solid #FFCDD2',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.2s',
                minWidth: 'auto',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FFCDD2';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFEBEE';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraggableGameItem; 