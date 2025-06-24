import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface Game {
  id: string;
  title: string;
  gameType?: string;
  thumbnailUrl?: string;
  folderName?: string;
  folderColor?: string;
}

interface DraggableGameCardProps {
  game: Game;
  onPlay: (gameId: string) => void;
  onEdit: (game: Game) => void;
  onAssign: (game: Game) => void;
  onDelete: (gameId: string) => void;
}

export const DraggableGameCard: React.FC<DraggableGameCardProps> = ({
  game,
  onPlay,
  onEdit,
  onAssign,
  onDelete
}) => {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    isDragging 
  } = useDraggable({ 
    id: game.id,
    data: { type: 'game', game }
  });

  // Debug logging
  console.log('🎮 DraggableGameCard setup:', {
    gameId: game.id,
    gameTitle: game.title,
    isDragging,
    hasAttributes: !!attributes,
    hasListeners: !!listeners,
    hasSetNodeRef: !!setNodeRef
  });
  
  return (
    <div 
      style={{ 
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '14px',
        border: '1px solid #E2E8F0',
        boxShadow: isDragging ? '0 8px 24px rgba(0, 0, 0, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s ease',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'rotate(2deg)' : 'none',
        position: 'relative'
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
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Thumbnail as Drag Handle */}
        <div 
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          style={{ 
            width: '48px', 
            height: '48px', 
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
            flexShrink: 0,
            cursor: isDragging ? 'grabbing' : 'grab',
            border: isDragging ? '2px solid #4299E1' : '2px solid transparent',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.border = '2px solid #CBD5E0';
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.border = '2px solid transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          title="Drag to move game to folder"
        >
          {game.thumbnailUrl ? (
            <img src={game.thumbnailUrl} alt={game.title} style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              borderRadius: '6px',
              pointerEvents: 'none'
            }} />
          ) : (
            <div style={{ fontSize: '20px', color: '#718096', pointerEvents: 'none' }}>
              {(game.gameType || '').includes('whack') ? '🔨' : 
               (game.gameType || '').includes('spinner') ? '🎡' : 
               (game.gameType || '').includes('anagram') ? '🧩' : 
               (game.gameType || '').includes('sentence') ? '📝' : 
               (game.gameType || '').includes('place') ? '🎯' : '🥚'}
            </div>
          )}
          
          {/* Small drag indicator overlay */}
          <div style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: '10px',
            height: '10px',
            backgroundColor: isDragging ? '#4299E1' : 'rgba(0, 0, 0, 0.2)',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '6px',
            color: 'white',
            opacity: isDragging ? 1 : 0.7,
            transition: 'all 0.2s ease',
            pointerEvents: 'none'
          }}>
            ⋮⋮
          </div>
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            marginBottom: '3px',
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
              gap: '3px',
              padding: '1px 5px',
              backgroundColor: game.folderColor || '#E2E8F0',
              color: 'white',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '500',
              marginBottom: '6px'
            }}>
              📁 {game.folderName}
            </div>
          )}
          
          <p style={{ 
            color: '#718096', 
            fontSize: '13px',
            marginBottom: '12px',
            textTransform: 'capitalize'
          }}>
            {(game.gameType || 'Unknown').replace('-', ' ')}
          </p>
          
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'nowrap' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(game.id);
              }}
              style={{
                padding: '3px 6px',
                backgroundColor: '#E3F2FD',
                color: '#1976D2',
                border: '1px solid #BBDEFB',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
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
                onEdit(game);
              }}
              style={{
                padding: '3px 6px',
                backgroundColor: '#F3E5F5',
                color: '#7B1FA2',
                border: '1px solid #E1BEE7',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
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
                onAssign(game);
              }}
              style={{
                padding: '3px 6px',
                backgroundColor: '#E8F5E8',
                color: '#2E7D32',
                border: '1px solid #C8E6C9',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
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
              📧 Assign
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(game.id);
              }}
              style={{
                padding: '3px 6px',
                backgroundColor: '#FFEBEE',
                color: '#C62828',
                border: '1px solid #FFCDD2',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
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
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 