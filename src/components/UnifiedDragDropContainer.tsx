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
import { DragItem, DropResult, GameFolder } from '../types/game';

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

interface UnifiedDragDropContainerProps {
  children: React.ReactNode;
  onDrop: (dropResult: DropResult) => void;
}

export const UnifiedDragDropContainer: React.FC<UnifiedDragDropContainerProps> = ({
  children,
  onDrop
}) => {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);

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
    
    console.log('🚀 Unified drag start:', { activeId: active.id, dragData });
    
    if (dragData && (dragData.type === 'game' || dragData.type === 'folder')) {
      setActiveItem({
        id: active.id as string,
        type: dragData.type,
        data: dragData.game || dragData.folder
      });
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('🎯 Unified drag end:', { activeId: active.id, overId: over?.id });
    
    if (active && over && active.id !== over.id) {
      const dragData = active.data.current;
      const dropData = over.data.current;
      
      console.log('📦 Unified drop data:', { dragData, dropData });
      
      if (dragData && (dragData.type === 'game' || dragData.type === 'folder')) {
        const dropResult: DropResult = {
          draggedItem: {
            id: active.id as string,
            type: dragData.type,
            data: dragData.game || dragData.folder
          },
          targetFolderId: over.id as string,
          newParentId: dropData?.type === 'folder' ? over.id as string : 
                       over.id === 'unorganized' ? null : undefined
        };
        
        console.log('📤 Unified calling onDrop with:', dropResult);
        onDrop(dropResult);
      }
    }
    
    setActiveItem(null);
  }, [onDrop]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Pass activeItem down to children through React.cloneElement */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { activeItem });
        }
        return child;
      })}

      {/* Unified Drag Overlay */}
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
        {activeItem && activeItem.type === 'folder' && (
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
  );
};

export default UnifiedDragDropContainer; 