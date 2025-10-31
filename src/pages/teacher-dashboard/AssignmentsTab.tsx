import React, { useState, useEffect } from 'react';
import { getTeacherAssignmentsWithFolders, deleteAssignment, getAssignmentAttempts } from '../../services/assignmentService';
import { Assignment, AssignmentWithFolder, Student, ToastOptions } from './types';
import { Attempt } from '../../types';
import { useModal } from '../../contexts/ModalContext';
import AssignmentFolderManagement from './AssignmentFolderManagement';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useDraggable } from '@dnd-kit/core';

interface AssignmentsTabProps {
  currentUser: any;
  showToast: (options: ToastOptions) => void;
  students: Student[];
  onAssignmentHandlersReady: (handlers: {
    handleDeleteAssignment: (assignmentId: string) => Promise<void>;
    handleViewAssignment: (assignment: Assignment) => Promise<void>;
    closeViewAssignment: () => void;
  }) => void;
}

// Draggable Assignment Row Component
interface DraggableAssignmentRowProps {
  assignment: AssignmentWithFolder;
  getStudentDisplayName: (email: string) => string;
  handleViewAssignment: (assignment: Assignment) => void;
  confirmDeleteAssignment: (assignmentId: string) => void;
}

const DraggableAssignmentRow: React.FC<DraggableAssignmentRowProps> = ({
  assignment,
  getStudentDisplayName,
  handleViewAssignment,
  confirmDeleteAssignment
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: assignment.id || 'unknown',
    data: { type: 'assignment', assignment }
  });

  const today = new Date();
  const isOverdue = assignment.deadline?.toDate() < today && 
    (assignment.status === 'assigned' || assignment.status === 'started');
  const isCompleted = assignment.status === 'completed';

  return (
    <tr 
      key={assignment.id} 
      style={{ 
        borderBottom: '1px solid #E2E8F0',
        backgroundColor: isCompleted ? '#F0FFF4' : isOverdue ? '#FFF5F5' : 'transparent',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'rotate(1deg)' : 'none',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Drag Handle Column */}
      <td style={{ padding: '12px', width: '40px' }}>
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#F7FAFC',
            border: '2px solid #E2E8F0',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            fontSize: '12px',
            color: '#718096',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.backgroundColor = '#EDF2F7';
              e.currentTarget.style.borderColor = '#CBD5E0';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.backgroundColor = '#F7FAFC';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }
          }}
          title="Drag to move assignment to folder"
        >
          ⋮⋮
        </div>
      </td>
      <td style={{ padding: '12px' }}>{assignment.gameName}</td>
      <td style={{ padding: '12px' }}>{assignment.gameType}</td>
      <td style={{ padding: '12px' }}>
        {assignment.createdAt?.toDate().toLocaleDateString()}
      </td>
      <td style={{ padding: '12px' }}>
        {assignment.deadline?.toDate().toLocaleDateString()}
        {isOverdue && 
          <span style={{ 
            color: '#E53E3E', 
            fontSize: '12px', 
            fontWeight: 'bold',
            display: 'block' 
          }}>
            Overdue
          </span>
        }
      </td>
      <td style={{ padding: '12px' }}>{getStudentDisplayName(assignment.studentEmail)}</td>
      <td style={{ padding: '12px' }}>
        <span style={{
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'medium',
          backgroundColor: isCompleted ? '#C6F6D5' : isOverdue ? '#FED7D7' : '#E2E8F0',
          color: isCompleted ? '#2F855A' : isOverdue ? '#C53030' : '#4A5568'
        }}>
          {isCompleted ? 'Completed' : (isOverdue ? 'Overdue' : 'Assigned')}
        </span>
      </td>
      <td style={{ padding: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleViewAssignment(assignment)}
            style={{
              padding: '6px 16px',
              backgroundColor: '#3182CE',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            View
          </button>
          <button
            onClick={() => confirmDeleteAssignment(assignment.id || '')}
            style={{
              padding: '6px 16px',
              backgroundColor: '#F56565',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
};

export const AssignmentsTab: React.FC<AssignmentsTabProps> = ({
  currentUser,
  showToast,
  students,
  onAssignmentHandlersReady
}) => {
  const [assignments, setAssignments] = useState<AssignmentWithFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [assignmentFolderFilter, setAssignmentFolderFilter] = useState('all');
  const [assignmentFolderHandlers, setAssignmentFolderHandlers] = useState<any>(null);
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  const [assignmentAttempts, setAssignmentAttempts] = useState<Attempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [activeItem, setActiveItem] = useState<AssignmentWithFolder | null>(null);
  const { showModal } = useModal();

  // Handle drag start for debugging and visual feedback
  const handleDragStart = (event: DragStartEvent) => {
    console.log('🚀 handleDragStart called:', {
      activeId: event.active.id,
      activeData: event.active.data.current
    });
    
    // Set the active item for the DragOverlay
    const draggedAssignment = event.active.data.current?.assignment;
    if (draggedAssignment && event.active.data.current?.type === 'assignment') {
      setActiveItem(draggedAssignment);
    }
  };

  // Handle drag end for assignment folder organization
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('🎯 handleDragEnd called:', { 
      activeId: active.id, 
      overId: over?.id, 
      activeData: active.data.current,
      overData: over?.data.current,
      hasHandlers: !!assignmentFolderHandlers
    });
    
    // Clear the active item
    setActiveItem(null);
    
    if (!over || !assignmentFolderHandlers) {
      console.log('🚫 Early return - missing over or handlers:', { over: !!over, handlers: !!assignmentFolderHandlers });
      return;
    }
    
    const draggedAssignment = active.data.current?.assignment;
    if (!draggedAssignment || active.data.current?.type !== 'assignment') {
      console.log('🚫 Early return - invalid drag data:', { 
        draggedAssignment: !!draggedAssignment, 
        type: active.data.current?.type 
      });
      return;
    }
    
    const droppedOnFolderId = over.data.current?.folderId;
    const droppedOnType = over.data.current?.type;
    
    console.log('📁 Processing drop:', { 
      droppedOnType, 
      droppedOnFolderId, 
      assignmentId: draggedAssignment.id,
      assignmentName: draggedAssignment.gameName
    });
    
    try {
      if (droppedOnType === 'folder' && droppedOnFolderId) {
        console.log('📋 Assigning to folder:', droppedOnFolderId);
        // Assign to folder
        await assignmentFolderHandlers.assignAssignmentToFolder(draggedAssignment.id, droppedOnFolderId);
        showToast({
          title: 'Assignment Moved',
          description: `"${draggedAssignment.gameName}" moved to folder`,
          status: 'success',
          duration: 3000
        });
      } else if (droppedOnType === 'unorganized') {
        console.log('📋 Removing from folder');
        // Remove from folder
        await assignmentFolderHandlers.removeAssignmentFromFolder(draggedAssignment.id);
        showToast({
          title: 'Assignment Unorganized',
          description: `"${draggedAssignment.gameName}" removed from folder`,
          status: 'success',
          duration: 3000
        });
      } else {
        console.log('🚫 No valid drop target found');
      }
    } catch (error) {
      console.error('❌ Error in drag and drop:', error);
      showToast({
        title: 'Error',
        description: 'Failed to move assignment',
        status: 'error',
        duration: 3000
      });
    }
  };

  // Function to get student display name from email
  const getStudentDisplayName = (studentEmail: string): string => {
    const student = students.find(s => s.email === studentEmail);
    return student?.name || studentEmail.split('@')[0]; // Fallback to email prefix if name not found
  };

  // Fetch assignments on component mount
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!currentUser) return;
      
      try {
        const fetchedAssignments = await getTeacherAssignmentsWithFolders(currentUser.uid, currentUser.email);
        setAssignments(fetchedAssignments);
      } catch (error) {
        console.error('Error fetching assignments:', error);
        showToast({
          title: 'Error fetching assignments',
          status: 'error',
          duration: 3000,
        });
      }
    };

    fetchAssignments();
  }, [currentUser]);

  // Delete assignment function
  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      console.log('Deleting assignment:', assignmentId);
      await deleteAssignment(assignmentId);
      
      // Remove from local state
      setAssignments(assignments.filter(a => a.id !== assignmentId));
      
      showToast({
        title: 'Assignment deleted successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      showToast({
        title: 'Error deleting assignment',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // View assignment function
  const handleViewAssignment = async (assignment: Assignment) => {
    console.log('Viewing assignment:', assignment);
    setViewingAssignment(assignment);
    setLoadingAttempts(true);
    
    try {
      let attempts: Attempt[] = [];
      if (assignment.id) {
        attempts = await getAssignmentAttempts(assignment.id);
        console.log('Assignment attempts:', attempts);
      }
      setAssignmentAttempts(attempts);
      
      // Show assignment details modal
      showModal('assignment-details', {
        assignment,
        attempts,
        onClose: closeViewAssignment
      });
    } catch (error) {
      console.error('Error fetching assignment attempts:', error);
      showToast({
        title: 'Error loading assignment details',
        status: 'error',
        duration: 3000,
      });
      setAssignmentAttempts([]);
    } finally {
      setLoadingAttempts(false);
    }
  };

  // Close view assignment function
  const closeViewAssignment = () => {
    console.log('Closing assignment view');
    setViewingAssignment(null);
    setAssignmentAttempts([]);
  };

  // Confirm assignment deletion
  const confirmDeleteAssignment = (assignmentId: string) => {
    console.log('🔵 confirmDeleteAssignment called with assignmentId:', assignmentId);
    
    // Find the assignment to get its details
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      console.warn('🟡 confirmDeleteAssignment: Assignment not found:', assignmentId);
      return;
    }
    
    console.log('🔵 confirmDeleteAssignment: Showing modal for assignment:', {
      assignmentId,
      assignmentTitle: assignment.gameName
    });
    
    // Show the global delete confirmation modal
    showModal('delete-confirmation', {
      title: 'Delete Assignment?',
      itemName: assignment.gameName,
      itemType: 'assignment',
      warningMessage: 'This action cannot be undone. All student progress on this assignment will be lost.',
      onDelete: () => handleDeleteAssignment(assignmentId)
    });
  };

  // Pass handlers up to parent on mount
  useEffect(() => {
    onAssignmentHandlersReady({
      handleDeleteAssignment,
      handleViewAssignment,
      closeViewAssignment
    });
  }, [assignments]); // Re-run when assignments change to capture updated state

  // Filter assignments based on search query and selected folder
  const filteredAssignments = assignments.filter(assignment => {
    // First apply search query filter
    const matchesSearch = !searchQuery || (() => {
      const query = searchQuery.toLowerCase();
      return (
        assignment.gameName?.toLowerCase().includes(query) ||
        assignment.studentEmail?.toLowerCase().includes(query) ||
        assignment.gameType?.toLowerCase().includes(query)
      );
    })();
    
    // Then apply folder filter
    const matchesFolder = (() => {
      if (assignmentFolderFilter === 'all') {
        return true; // Show all assignments
      } else if (assignmentFolderFilter === 'unorganized') {
        return !assignment.folderId; // Show only assignments not in any folder
      } else {
        return assignment.folderId === assignmentFolderFilter; // Show only assignments in the selected folder
      }
    })();
    
    return matchesSearch && matchesFolder;
  });

  // Filter assignments based on status
  const getStatusFilteredAssignments = () => {
    if (activeStatusFilter === 'all') return filteredAssignments;
    
    // Calculate today's date for overdue assignments
    const today = new Date();
    
    return filteredAssignments.filter(assignment => {
      const deadlineDate = assignment.deadline?.toDate();
      
      switch(activeStatusFilter) {
        case 'assigned':
          return assignment.status === 'assigned' || assignment.status === 'started';
        case 'overdue':
          return (assignment.status === 'assigned' || assignment.status === 'started') && 
                 deadlineDate && deadlineDate < today;
        case 'completed':
          return assignment.status === 'completed';
        default:
          return true;
      }
    });
  };

  // Render status tabs
  const renderStatusTabs = () => {
    const today = new Date();
    const assignedCount = filteredAssignments.filter(a => 
      a.status === 'assigned' || a.status === 'started'
    ).length;
    const overdueCount = filteredAssignments.filter(a => 
      (a.status === 'assigned' || a.status === 'started') && 
      a.deadline?.toDate() && a.deadline.toDate() < today
    ).length;
    const completedCount = filteredAssignments.filter(a => 
      a.status === 'completed'
    ).length;
    
    const tabStyle = (isActive: boolean) => ({
      padding: '8px 16px',
      margin: '0 4px',
      border: 'none',
      borderRadius: '20px',
      backgroundColor: isActive ? '#4299E1' : '#F7FAFC',
      color: isActive ? 'white' : '#4A5568',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: isActive ? 'bold' : 'normal',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    });

    return (
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveStatusFilter('all')}
          style={tabStyle(activeStatusFilter === 'all')}
        >
          All ({filteredAssignments.length})
        </button>
        <button
          onClick={() => setActiveStatusFilter('assigned')}
          style={tabStyle(activeStatusFilter === 'assigned')}
        >
          Active ({assignedCount})
        </button>
        <button
          onClick={() => setActiveStatusFilter('overdue')}
          style={tabStyle(activeStatusFilter === 'overdue')}
        >
          Overdue ({overdueCount})
        </button>
        <button
          onClick={() => setActiveStatusFilter('completed')}
          style={tabStyle(activeStatusFilter === 'completed')}
        >
          Completed ({completedCount})
        </button>
      </div>
    );
  };

  return (
    <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <div>
        {/* Search and Filter Section */}
        <div style={{ 
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#FAFAFA',
          borderRadius: '8px',
          border: '1px solid #E2E8F0'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2D3748' }}>
              🔍 Search & Filter Assignments
            </h3>
            {(searchQuery || activeStatusFilter !== 'all' || assignmentFolderFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveStatusFilter('all');
                  setAssignmentFolderFilter('all');
                }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#F7FAFC',
                  color: '#4A5568',
                  border: '1px solid #CBD5E0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
          
          {/* Search Input */}
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Search by title, game type, or student email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #CBD5E0',
                borderRadius: '6px',
                width: '100%',
                fontSize: '14px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#4299E1';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CBD5E0';
              }}
            />
          </div>
          
          {/* Filter Row */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            flexWrap: 'wrap',
            alignItems: 'center' 
          }}>
            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '14px', color: '#4A5568', fontWeight: '500' }}>
                Status:
              </label>
              <select
                value={activeStatusFilter}
                onChange={(e) => setActiveStatusFilter(e.target.value)}
                style={{
                  padding: '6px 8px',
                  border: '1px solid #CBD5E0',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Status</option>
                <option value="assigned">🔴 Active</option>
                <option value="overdue">⏰ Overdue</option>
                <option value="completed">✅ Completed</option>
              </select>
            </div>
            
            {/* Organization Filter (if assignment folders exist) */}
            {assignmentFolderHandlers && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '14px', color: '#4A5568', fontWeight: '500' }}>
                  Organization:
                </label>
                <select
                  value={assignmentFolderFilter}
                  onChange={(e) => setAssignmentFolderFilter(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    border: '1px solid #CBD5E0',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Assignments</option>
                  <option value="unorganized">📋 Unorganized</option>
                </select>
              </div>
            )}
            
            {/* Results Count */}
            <div style={{ 
              marginLeft: 'auto',
              fontSize: '14px',
              color: '#718096',
              fontWeight: '500'
            }}>
              {(() => {
                const statusFilteredCount = getStatusFilteredAssignments().length;
                const totalCount = assignments.length;
                
                if (searchQuery || activeStatusFilter !== 'all' || assignmentFolderFilter !== 'all') {
                  return `${statusFilteredCount} of ${totalCount} assignments`;
                }
                return `${totalCount} assignments`;
              })()}
            </div>
          </div>
        </div>
        
        {/* Assignment Folder Management */}
        <AssignmentFolderManagement
          currentUser={currentUser}
          assignments={assignments}
          onAssignmentsUpdate={setAssignments}
          showToast={showToast}
          assignmentFolderFilter={assignmentFolderFilter}
          setAssignmentFolderFilter={setAssignmentFolderFilter}
          onFolderHandlersReady={(handlers) => {
            // Store handlers for drag and drop functionality
            console.log('📋 Assignment folder handlers ready - methods available:', {
              assignAssignmentToFolder: typeof handlers.assignAssignmentToFolder,
              removeAssignmentFromFolder: typeof handlers.removeAssignmentFromFolder,
              totalMethods: Object.keys(handlers).length
            });
            setAssignmentFolderHandlers(handlers);
          }}
        />
        
        {/* Assignment status tabs */}
        {renderStatusTabs()}
        
        {getStatusFilteredAssignments().length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px', textAlign: 'left', width: '40px' }}>⋮⋮</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Title</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Game</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Created Date</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Due Date</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Student</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getStatusFilteredAssignments().map((assignment) => (
                <DraggableAssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  getStudentDisplayName={getStudentDisplayName}
                  handleViewAssignment={handleViewAssignment}
                  confirmDeleteAssignment={confirmDeleteAssignment}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ 
            padding: '24px', 
            textAlign: 'center',
            backgroundColor: '#EBF8FF',
            borderRadius: '8px',
            marginTop: '16px'
          }}>
            <p style={{ color: '#4A5568', fontSize: '16px' }}>
              No {activeStatusFilter !== 'all' ? activeStatusFilter : ''} assignments found.
            </p>
          </div>
        )}
      </div>
      
      {/* Drag Overlay for visual feedback */}
      <DragOverlay>
        {activeItem ? (
          <div style={{
            padding: '6px 20px',
            backgroundColor: '#4299E1',
            color: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            opacity: 0.9,
            transform: 'rotate(2deg)',
            minWidth: '250px',
            maxWidth: '400px',
            cursor: 'grabbing',
            whiteSpace: 'nowrap'
          }}>
            📋 
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeItem.gameName}
            </span>
            <span style={{
              fontSize: '11px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              padding: '2px 8px',
              borderRadius: '12px',
              flexShrink: 0
            }}>
              Assignment
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
 