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

interface DragDropLayoutProps {
  children: React.ReactNode;
  onDrop: (dropResult: DropResult) => void;
}

export const DragDropLayout: React.FC<DragDropLayoutProps> = ({
  children,
  onDrop
}) => {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement before drag starts
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
          newParentId: dropData.type === 'folder' ? over.id as string : 
                      dropData.type === 'unorganized' ? null : null
        };
        
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
      {children}

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
            <span>
              {activeItem.type === 'folder' ? '📁' : 
               activeItem.type === 'game' ? '🎮' : '📄'}
            </span>
            <span>
              {activeItem.type === 'folder' 
                ? (activeItem.data as GameFolder).name 
                : (activeItem.data as any).title || 'Game'}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}; 