import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface UnorganizedDropZoneProps {
  unorganizedGamesCount: number;
}

export const UnorganizedDropZone: React.FC<UnorganizedDropZoneProps> = ({ 
  unorganizedGamesCount 
}) => {
  const { setNodeRef, isOver } = useDroppable({ 
    id: 'unorganized',
    data: { type: 'unorganized' }
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        padding: '16px',
        backgroundColor: isOver ? '#F0FFF4' : '#F7FAFC',
        border: isOver ? '2px solid #38A169' : '2px dashed #CBD5E0',
        borderRadius: '12px',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: isOver ? 'copy' : 'default',
        transform: isOver ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isOver ? '0 4px 12px rgba(56, 161, 105, 0.2)' : 'none'
      }}
    >
      {isOver && (
        <div style={{
          position: 'absolute',
          top: '-2px',
          left: '-2px',
          right: '-2px',
          bottom: '-2px',
          border: '2px dashed #38A169',
          borderRadius: '14px',
          pointerEvents: 'none',
          animation: 'pulse 1s infinite'
        }} />
      )}
      
      <span style={{ fontSize: '24px' }}>📚</span>
      <div>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          margin: '0',
          color: isOver ? '#2F855A' : '#4A5568'
        }}>
          Unorganized Games
        </h3>
        <p style={{ 
          fontSize: '14px', 
          color: isOver ? '#38A169' : '#718096', 
          margin: '4px 0 0 0' 
        }}>
          {isOver 
            ? 'Drop here to remove from folders' 
            : `${unorganizedGamesCount} games without folders`
          }
        </p>
      </div>
    </div>
  );
};

export default UnorganizedDropZone; 