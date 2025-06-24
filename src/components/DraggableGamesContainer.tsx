import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { DraggableGameItem } from './DraggableGameItem';
import { DragItem, DropResult } from '../types/game';

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

interface DraggableGamesContainerProps {
  games: Game[];
  onPlayGame: (gameId: string) => void;
  onEditGame: (game: Game) => void;
  onAssignGame: (game: Game) => void;
  onDeleteGame: (gameId: string) => void;
  onDrop: (dropResult: DropResult) => void;
}

export const DraggableGamesContainer: React.FC<DraggableGamesContainerProps> = ({
  games,
  onPlayGame,
  onEditGame,
  onAssignGame,
  onDeleteGame,
  onDrop
}) => {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);

  // Debug logging
  console.log('🎮 DraggableGamesContainer received:', {
    gamesCount: games.length,
    games: games.map(g => ({ id: g.id, title: g.title, gameType: g.gameType }))
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
    
    console.log('🚀 Game drag start:', { activeId: active.id, dragData });
    
    if (dragData && dragData.type === 'game') {
      setActiveItem({
        id: active.id as string,
        type: 'game',
        data: dragData.game
      });
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('🎯 Game drag end:', { activeId: active.id, overId: over?.id, overData: over?.data?.current });
    
    if (active && over && active.id !== over.id) {
      const dragData = active.data.current;
      const dropData = over.data.current;
      
      console.log('📦 Game drop data:', { dragData, dropData });
      
      if (dragData && dragData.type === 'game') {
        // Determine the target based on drop zone type
        let targetFolderId: string | null = null;
        let newParentId: string | null | undefined = undefined;
        
        if (over.id === 'unorganized') {
          // Dropping on unorganized zone - remove from folder
          targetFolderId = null;
          newParentId = null;
        } else if (dropData?.type === 'folder') {
          // Dropping on a folder
          targetFolderId = over.id as string;
          newParentId = over.id as string;
        } else {
          // Unknown drop target
          console.log('⚠️ Unknown drop target:', over.id, dropData);
          setActiveItem(null);
          return;
        }
        
        const dropResult: DropResult = {
          draggedItem: {
            id: active.id as string,
            type: 'game',
            data: dragData.game
          },
          targetFolderId,
          newParentId
        };
        
        console.log('📤 Game calling onDrop with:', dropResult);
        onDrop(dropResult);
      }
    }
    
    setActiveItem(null);
  }, [onDrop]);

  if (games.length === 0) {
    console.log('📭 No games to display');
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#718096',
        backgroundColor: '#F7FAFC',
        borderRadius: '12px',
        border: '2px dashed #E2E8F0'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎮</div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
          No games yet
        </h3>
        <p>Create your first game to get started</p>
      </div>
    );
  }

  console.log('🎨 Rendering games grid with', games.length, 'games');

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: '20px',
        width: '100%'
      }}>
        {games.map((game) => (
          <DraggableGameItem
            key={game.id}
            game={game}
            onPlayGame={onPlayGame}
            onEditGame={onEditGame}
            onAssignGame={onAssignGame}
            onDeleteGame={onDeleteGame}
          />
        ))}
      </div>

      {/* Drag Overlay for Games */}
      <DragOverlay>
        {activeItem && activeItem.type === 'game' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '16px',
            border: '2px solid #4299E1',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transform: 'rotate(3deg)',
            zIndex: 1000,
            maxWidth: '300px'
          }}>
            <span style={{ fontSize: '20px' }}>🎮</span>
            <span style={{ 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {(activeItem.data as Game).title}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default DraggableGamesContainer; 