import React, { useState, useEffect } from 'react';
import { useModal } from '../contexts/ModalContext';
import { Timestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

// Common interfaces
interface DeleteModalProps {
  title: string;
  itemName: string;
  itemType: string;
  warningMessage?: string;
  onDelete: () => void;
  onCancel: () => void;
}

interface FolderModalProps {
  folder?: {
    id?: string;
    name: string;
    description: string;
    color: string;
  };
  onSave: (folderData: { name: string; description: string; color: string }, folderId?: string) => void;
  onCancel: () => void;
}

interface StudentModalProps {
  student?: {
    id: string;
    name: string;
    email: string;
    grade?: string;
    age?: number;
    notes?: string;
  };
  onSave: (studentData: { 
    name: string; 
    email: string; 
    grade: string; 
    age: number; 
    notes: string;
  }, studentId?: string) => void;
  onCancel: () => void;
}

interface AssignmentDetailsModalProps {
  assignment: any;
  attempts: any[];
  isLoadingAttempts: boolean;
  onClose: () => void;
}

interface EditChoiceModalProps {
  gameName: string;
  onUpdate: () => void;
  onCopy: () => void;
  onCancel: () => void;
}

interface Student {
  id: string;
  name: string;
  email: string;
  grade?: string;
  age?: number;
  notes?: string;
  createdAt: Timestamp;
}

interface Game {
  id: string;
  title: string;
  gameType?: string;
}

interface AssignmentCreationModalProps {
  game: any;
  onAssign: (game: any, studentEmails: string[], deadline: Date, timesRequired: number, usePasswordAuth: boolean) => Promise<void>;
  onCancel: () => void;
  showToast: (options: { title: string; description?: string; status: 'success' | 'error' | 'info' | 'warning'; duration: number }) => void;
}

const DEFAULT_FOLDER_COLORS = [
  '#3182CE', // Blue
  '#38A169', // Green
  '#805AD5', // Purple
  '#D69E2E', // Yellow
  '#E53E3E', // Red
  '#DD6B20', // Orange
  '#319795', // Teal
  '#ED64A6', // Pink
];

// Universal Delete Confirmation Modal
const DeleteConfirmationModal: React.FC<DeleteModalProps> = ({
  title,
  itemName,
  itemType,
  warningMessage,
  onDelete,
  onCancel
}) => {
  const { hideModal, isModalReady } = useModal();

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isModalReady) {
      console.warn('🟡 DeleteConfirmationModal: Modal not ready, ignoring click');
      return;
    }
    
    console.log('🔴 DeleteConfirmationModal: Executing delete');
    onDelete();
    hideModal();
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCancel();
    hideModal();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancelClick(e);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={handleBackdropClick}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          opacity: isModalReady ? 1 : 0.7,
          transition: 'opacity 0.1s ease-in-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
          {title}
        </h3>
        <p style={{ marginBottom: '8px', color: '#4A5568' }}>
          Are you sure you want to delete <strong>{itemName}</strong>?
        </p>
        {warningMessage && (
          <p style={{ marginBottom: '16px', color: '#E53E3E', fontSize: '14px' }}>
            {warningMessage}
          </p>
        )}
        <p style={{ marginBottom: '24px', color: '#4A5568', fontSize: '14px' }}>
          This action cannot be undone.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={handleCancelClick}
            disabled={!isModalReady}
            style={{
              padding: '8px 16px',
              backgroundColor: '#E2E8F0',
              color: '#4A5568',
              border: 'none',
              borderRadius: '4px',
              cursor: isModalReady ? 'pointer' : 'not-allowed',
              opacity: isModalReady ? 1 : 0.6
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteClick}
            disabled={!isModalReady}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F56565',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isModalReady ? 'pointer' : 'not-allowed',
              opacity: isModalReady ? 1 : 0.6
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Folder Modal (existing)
const FolderModal: React.FC<FolderModalProps> = ({
  folder,
  onSave,
  onCancel
}) => {
  const { hideModal, isModalReady } = useModal();
  
  // Local state for the form inputs
  const [localName, setLocalName] = useState(folder?.name || '');
  const [localDescription, setLocalDescription] = useState(folder?.description || '');
  const [localColor, setLocalColor] = useState(folder?.color || DEFAULT_FOLDER_COLORS[0]);
  
  // Ref for the name input to handle focus
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  // Update local state when folder changes (when modal opens)
  useEffect(() => {
    if (folder) {
      setLocalName(folder.name || '');
      setLocalDescription(folder.description || '');
      setLocalColor(folder.color || DEFAULT_FOLDER_COLORS[0]);
    } else {
      // Reset for new folder
      setLocalName('');
      setLocalDescription('');
      setLocalColor(DEFAULT_FOLDER_COLORS[0]);
    }
  }, [folder?.id]); // Only update when the folder ID changes

  // Auto-focus when modal is ready
  useEffect(() => {
    if (isModalReady && !folder?.id && nameInputRef.current) {
      // Only auto-focus for new folders, with a small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModalReady, folder?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate folder name
    const trimmedName = localName.trim();
    if (!trimmedName) {
      return;
    }
    
    // Create the folder data with validated values
    const folderData = {
      name: trimmedName,
      description: localDescription.trim(),
      color: localColor
    };
    
    console.log('🔵 FolderModal: Submitting folder data:', folderData, 'folderId:', folder?.id);
    onSave(folderData, folder?.id);
    hideModal();
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    console.log('🔵 FolderModal: Cancel button clicked');
    e.preventDefault();
    e.stopPropagation();
    onCancel();
    hideModal();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancelClick(e);
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={handleBackdropClick}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          opacity: isModalReady ? 1 : 0.7,
          transition: 'opacity 0.1s ease-in-out'
        }}
        onClick={handleContentClick}
      >
        <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>
          {folder?.id ? 'Edit Folder' : 'Create New Folder'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Folder Name *
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Enter folder name"
              required
              disabled={!isModalReady}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                fontSize: '16px',
                opacity: isModalReady ? 1 : 0.6
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Description
            </label>
            <textarea
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Enter folder description (optional)"
              rows={3}
              disabled={!isModalReady}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                fontSize: '16px',
                resize: 'vertical',
                opacity: isModalReady ? 1 : 0.6
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Color
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {DEFAULT_FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setLocalColor(color)}
                  disabled={!isModalReady}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: localColor === color ? '3px solid #000' : '2px solid #E2E8F0',
                    cursor: isModalReady ? 'pointer' : 'not-allowed',
                    transition: 'border-color 0.2s',
                    opacity: isModalReady ? 1 : 0.6
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={!isModalReady}
              style={{
                padding: '10px 20px',
                backgroundColor: 'white',
                color: '#4A5568',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                cursor: isModalReady ? 'pointer' : 'not-allowed',
                fontSize: '16px',
                opacity: isModalReady ? 1 : 0.6
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isModalReady}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3182CE',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isModalReady ? 'pointer' : 'not-allowed',
                fontSize: '16px',
                opacity: isModalReady ? 1 : 0.6
              }}
            >
              {folder?.id ? 'Update Folder' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Student Management Modal
const StudentModal: React.FC<StudentModalProps> = ({
  student,
  onSave,
  onCancel
}) => {
  const { hideModal, isModalReady } = useModal();
  
  const [name, setName] = useState(student?.name || '');
  const [email, setEmail] = useState(student?.email || '');
  const [grade, setGrade] = useState(student?.grade || '');
  const [age, setAge] = useState(student?.age || 0);
  const [notes, setNotes] = useState(student?.notes || '');

  // Check if this is a new student (no ID)
  const isNewStudent = !student?.id;

  useEffect(() => {
    if (student) {
      setName(student.name || '');
      setEmail(student.email || '');
      setGrade(student.grade || '');
      setAge(student.age || 0);
      setNotes(student.notes || '');
    } else {
      setName('');
      setEmail('');
      setGrade('');
      setAge(0);
      setNotes('');
    }
  }, [student?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const studentData = {
      name: name.trim(),
      email: email.trim(),
      grade: grade.trim(),
      age,
      notes: notes.trim()
    };
    
    onSave(studentData, student?.id);
    hideModal();
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCancel();
    hideModal();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancelClick(e);
        }
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          opacity: isModalReady ? 1 : 0.7,
          transition: 'opacity 0.1s ease-in-out',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '16px', fontSize: '20px' }}>
          {student ? 'Edit Student' : 'Add New Student'}
        </h3>
        
        {isNewStudent && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#EBF8FF',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#1E40AF'
          }}>
            📧 After adding this student, they will receive an email to set up their password.
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={!isModalReady}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                backgroundColor: '#F8FAFC'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!isModalReady}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                backgroundColor: '#F8FAFC'
              }}
            />
            {isNewStudent && (
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                A password setup email will be sent to this address
              </p>
            )}
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Grade/Class
            </label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              disabled={!isModalReady}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                backgroundColor: '#F8FAFC'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Age
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              min="0"
              max="100"
              disabled={!isModalReady}
              style={{
                width: '120px',
                padding: '8px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                backgroundColor: '#F8FAFC'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!isModalReady}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                backgroundColor: '#F8FAFC',
                minHeight: '100px',
                resize: 'vertical'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={!isModalReady}
              style={{
                padding: '8px 16px',
                backgroundColor: '#E2E8F0',
                color: '#4A5568',
                border: 'none',
                borderRadius: '4px',
                cursor: isModalReady ? 'pointer' : 'not-allowed',
                opacity: isModalReady ? 1 : 0.6
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isModalReady}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4299E1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isModalReady ? 'pointer' : 'not-allowed',
                opacity: isModalReady ? 1 : 0.6
              }}
            >
              {student ? 'Update Student' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Choice Modal
const EditChoiceModal: React.FC<EditChoiceModalProps> = ({
  gameName,
  onUpdate,
  onCopy,
  onCancel
}) => {
  const { hideModal, isModalReady } = useModal();

  const handleUpdateClick = () => {
    onUpdate();
    hideModal();
  };

  const handleCopyClick = () => {
    onCopy();
    hideModal();
  };

  const handleCancelClick = () => {
    onCancel();
    hideModal();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancelClick();
        }
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          opacity: isModalReady ? 1 : 0.7,
          transition: 'opacity 0.1s ease-in-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 'bold' }}>
          Edit Game Configuration
        </h3>
        <p style={{ marginBottom: '8px', color: '#4A5568' }}>
          You're about to edit <strong>{gameName}</strong>. Choose how you'd like to proceed:
        </p>
        <p style={{ marginBottom: '24px', color: '#4A5568', fontSize: '14px' }}>
          Update will modify the existing game, while Create Copy will make a new version.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <button
            onClick={handleCancelClick}
            disabled={!isModalReady}
            style={{
              padding: '8px 16px',
              backgroundColor: '#E2E8F0',
              color: '#4A5568',
              border: 'none',
              borderRadius: '4px',
              cursor: isModalReady ? 'pointer' : 'not-allowed',
              flex: 1,
              opacity: isModalReady ? 1 : 0.6
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCopyClick}
            disabled={!isModalReady}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4299E1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isModalReady ? 'pointer' : 'not-allowed',
              flex: 1,
              opacity: isModalReady ? 1 : 0.6
            }}
          >
            Create Copy
          </button>
          <button
            onClick={handleUpdateClick}
            disabled={!isModalReady}
            style={{
              padding: '8px 16px',
              backgroundColor: '#38A169',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isModalReady ? 'pointer' : 'not-allowed',
              flex: 1,
              opacity: isModalReady ? 1 : 0.6
            }}
          >
            Update Game
          </button>
        </div>
      </div>
    </div>
  );
};

// Assignment Details Modal
const AssignmentDetailsModal: React.FC<AssignmentDetailsModalProps> = ({
  assignment,
  attempts,
  isLoadingAttempts,
  onClose
}) => {
  const { hideModal } = useModal();

  // Format duration in seconds to a readable format
  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} sec`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} min ${remainingSeconds} sec`;
  };

  const handleClose = () => {
    onClose();
    hideModal();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '700px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '24px', margin: 0 }}>Assignment Details</h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#718096'
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>Title:</div>
            <div>{assignment.gameName}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>Game Type:</div>
            <div>{assignment.gameType}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>Student Email:</div>
            <div>{assignment.studentEmail}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>Due Date:</div>
            <div>{assignment.deadline?.toDate().toLocaleDateString()}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>Status:</div>
            <div>{assignment.status}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>Times Required:</div>
            <div>{assignment.timesRequired}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>Times Completed:</div>
            <div>{assignment.completedCount}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>Created At:</div>
            <div>{assignment.createdAt?.toDate().toLocaleString()}</div>
          </div>
          
          {assignment.lastCompletedAt && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>Last Completed At:</div>
              <div>{assignment.lastCompletedAt.toDate().toLocaleString()}</div>
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>Assignment Link:</div>
            <div>{`${window.location.origin}/assignment/${assignment.linkToken}`}</div>
          </div>
        </div>
        
        {/* Attempt History Section */}
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Attempt History</h3>
          
          {isLoadingAttempts ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Loading attempts...</div>
          ) : attempts.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Date & Time</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Duration</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {attempts
                  .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)
                  .map((attempt) => (
                    <tr key={attempt.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '12px', textAlign: 'left' }}>
                        {attempt.timestamp.toDate().toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {formatDuration(attempt.duration)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {attempt.score !== undefined ? attempt.score : 'N/A'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
              No attempts yet
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={handleClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3182CE',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Assignment Creation Modal
const AssignmentCreationModal: React.FC<AssignmentCreationModalProps> = ({
  game,
  onAssign,
  onCancel,
  showToast
}) => {
  const { hideModal, isModalReady } = useModal();
  const { currentUser } = useAuth();
  
  // State for the form - update for multiple student selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [studentEmail, setStudentEmail] = useState('');
  const [deadline, setDeadline] = useState('');
  const [timesRequired, setTimesRequired] = useState(1);
  const [usePasswordAuth, setUsePasswordAuth] = useState(true);
  const [assignmentStudents, setAssignmentStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Fetch students when modal opens
  useEffect(() => {
    if (currentUser) {
      fetchAssignmentStudents();
    }
  }, [currentUser]);
  
  // Function to fetch students for assignment
  const fetchAssignmentStudents = async () => {
    if (!currentUser) return;
    
    setLoadingStudents(true);
    try {
      // Fetch from users collection where role is student and teacherId matches current user
      const usersCollection = collection(db, 'users');
      const q = query(
        usersCollection, 
        where('role', '==', 'student'), 
        where('teacherId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const studentsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          grade: data.grade || '',
          age: data.age || 0,
          notes: data.notes || '',
          createdAt: data.createdAt || Timestamp.now()
        } as Student;
      });
      
      setAssignmentStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students for assignment:', error);
      showToast({
        title: 'Error fetching students',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoadingStudents(false);
    }
  };
  
  // Handle student selection - updated for multi-select
  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedStudentIds(selectedOptions);
    
    // Find the selected students
    const students = assignmentStudents.filter(student => 
      selectedOptions.includes(student.id)
    );
    setSelectedStudents(students);
  };
  
  // Function to remove a student from selection
  const removeStudent = (studentId: string) => {
    setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    setSelectedStudents(selectedStudents.filter(student => student.id !== studentId));
  };
  
  // Handle assignment creation for multiple students
  const handleAssignToMultipleStudents = async () => {
    if (selectedStudents.length === 0 || !deadline) {
      showToast({
        title: 'Missing required fields',
        description: 'Please select at least one student and set a deadline',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    try {
      // Get the student emails for assignment
      const studentEmails = selectedStudents.map(student => student.email);
      
      // Call the onAssign function with the required parameters
      await onAssign(game, studentEmails, new Date(deadline), timesRequired, usePasswordAuth);
      
      showToast({
        title: 'Assignments created',
        description: `Created assignments for ${selectedStudents.length} student(s)`,
        status: 'success',
        duration: 3000,
      });
      hideModal();
    } catch (error) {
      console.error('Error creating assignments:', error);
      showToast({
        title: 'Error creating assignments',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleCancelClick = () => {
    onCancel();
    hideModal();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancelClick();
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={handleBackdropClick}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          opacity: isModalReady ? 1 : 0.7,
          transition: 'opacity 0.1s ease-in-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '16px', fontSize: '24px', textAlign: 'center' }}>
          Assign Game to Student
        </h2>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Game: {game.title}</div>
          <div style={{ color: '#666' }}>Type: {game.gameType}</div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Student Email *
          </label>
          {loadingStudents ? (
            <div style={{ padding: '8px 0' }}>Loading students...</div>
          ) : assignmentStudents.length > 0 ? (
            <>
              <select 
                multiple
                value={selectedStudentIds}
                onChange={handleStudentChange}
                disabled={!isModalReady}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '4px',
                  backgroundColor: '#F7FAFC',
                  minHeight: '120px',
                  opacity: isModalReady ? 1 : 0.6
                }}
                required
              >
                {assignmentStudents.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.email}) {student.grade ? `- ${student.grade}` : ''} {student.age ? `- Age ${student.age}` : ''}
                  </option>
                ))}
              </select>
              
              {/* Selected Students - Always visible section */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  Selected Students ({selectedStudents.length}):
                </div>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px',
                  minHeight: '40px',
                  maxHeight: '100px',
                  overflowY: 'auto',
                  padding: '8px',
                  backgroundColor: '#EDF2F7',
                  borderRadius: '4px'
                }}>
                  {selectedStudents.length > 0 ? (
                    selectedStudents.map(student => (
                      <div key={student.id} style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#E2E8F0',
                        padding: '4px 8px',
                        borderRadius: '16px',
                        fontSize: '14px'
                      }}>
                        {student.name}
                        <button 
                          onClick={() => removeStudent(student.id)}
                          disabled={!isModalReady}
                          style={{
                            marginLeft: '4px',
                            background: 'none',
                            border: 'none',
                            cursor: isModalReady ? 'pointer' : 'not-allowed',
                            fontSize: '14px',
                            color: '#4A5568',
                            opacity: isModalReady ? 1 : 0.6
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      color: '#718096', 
                      fontSize: '14px', 
                      width: '100%', 
                      textAlign: 'center',
                      padding: '6px 0'
                    }}>
                      No students selected
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ 
                fontSize: '14px', 
                color: '#666', 
                marginTop: '4px',
                fontStyle: 'italic'
              }}>
                Hold Ctrl/Cmd key to select multiple students
              </div>
            </>
          ) : (
            <div>
              <div style={{ marginBottom: '8px', color: '#E53E3E' }}>
                No students found. Please add students in the My Students tab first.
              </div>
              <input 
                type="email" 
                placeholder="student@example.com"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '4px',
                  backgroundColor: '#F7FAFC',
                  opacity: isModalReady ? 1 : 0.6
                }}
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                disabled={!isModalReady}
                required
              />
            </div>
          )}
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            An email notification with assignment details will be sent to each selected student.
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Deadline *
          </label>
          <input 
            type="date" 
            style={{
              width: '200px',
              padding: '8px 12px',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              backgroundColor: '#F7FAFC',
              opacity: isModalReady ? 1 : 0.6
            }}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={!isModalReady}
            required
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Number of Times to Complete
          </label>
          <select 
            style={{
              width: '120px',
              padding: '8px 12px',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              backgroundColor: '#F7FAFC',
              opacity: isModalReady ? 1 : 0.6
            }}
            value={timesRequired}
            onChange={(e) => setTimesRequired(Number(e.target.value))}
            disabled={!isModalReady}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </div>
        
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="usePasswordAuth"
              checked={usePasswordAuth}
              onChange={(e) => setUsePasswordAuth(e.target.checked)}
              style={{ marginRight: 'var(--spacing-2)' }}
            />
            <span style={{ opacity: isModalReady ? 1 : 0.6 }}>
              🔒 Password Required: Students must sign in with email/password to access the assignment (recommended for tests)
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px', fontStyle: 'italic' }}>
            Uncheck the box for quick access to the assignment.
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={handleCancelClick}
            disabled={!isModalReady}
            style={{
              padding: '8px 16px',
              backgroundColor: 'white',
              color: '#4A5568',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              cursor: isModalReady ? 'pointer' : 'not-allowed',
              opacity: isModalReady ? 1 : 0.6
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAssignToMultipleStudents}
            disabled={!isModalReady}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3182CE',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isModalReady ? 'pointer' : 'not-allowed',
              opacity: isModalReady ? 1 : 0.6
            }}
          >
            Assign Game
          </button>
        </div>
      </div>
    </div>
  );
};

export const GlobalModals: React.FC<{ 
  // Folder management
  onDeleteFolder?: (folderId: string) => void;
  onSaveFolder?: (folderData: { name: string; description: string; color: string }, folderId?: string) => void;
  onCancelFolder?: () => void;
  
  // Student management
  onSaveStudent?: (studentData: { name: string; email: string; grade: string; age: number; notes: string }, studentId?: string) => void;
  onCancelStudent?: () => void;
  
  // Delete confirmations
  onDelete?: () => void;
  onCancelDelete?: () => void;
  
  // Edit choice
  onUpdateGame?: () => void;
  onCopyGame?: () => void;
  onCancelEdit?: () => void;
  
  // Assignment details
  onCloseAssignmentDetails?: () => void;
  
  // Assignment creation
  onAssignGame?: (game: any, studentEmails: string[], deadline: Date, timesRequired: number, usePasswordAuth: boolean) => Promise<void>;
  onCancelAssignment?: () => void;
  showToast?: (options: { title: string; description?: string; status: 'success' | 'error' | 'info' | 'warning'; duration: number }) => void;
}> = ({ 
  onDeleteFolder, 
  onSaveFolder, 
  onCancelFolder,
  onSaveStudent,
  onCancelStudent,
  onDelete,
  onCancelDelete,
  onUpdateGame,
  onCopyGame,
  onCancelEdit,
  onCloseAssignmentDetails,
  onAssignGame,
  onCancelAssignment,
  showToast
}) => {
  const { modalId, modalProps } = useModal();

  console.log('🔵 GlobalModals: Rendering with modalId:', modalId, 'props:', modalProps);

  // Delete folder modal
  if (modalId === 'delete-folder') {
    const { folderId, folderName, gamesCount } = modalProps;
    
    if (!folderId || !onDeleteFolder) {
      console.warn('🟡 GlobalModals: Missing folderId or onDeleteFolder for delete-folder modal');
      return null;
    }
    
    return (
      <DeleteConfirmationModal
        title="Delete Folder?"
        itemName={folderName || '(Unnamed Folder)'}
        itemType="folder"
        warningMessage={gamesCount > 0 ? `This folder contains ${gamesCount} game(s). They will be moved to "All Games".` : undefined}
        onDelete={() => onDeleteFolder(folderId)}
        onCancel={onCancelFolder || (() => {})}
      />
    );
  }

  // Folder modal (create/edit)
  if (modalId === 'folder-modal') {
    const { folder } = modalProps;
    
    if (!onSaveFolder) {
      console.warn('🟡 GlobalModals: Missing onSaveFolder for folder-modal');
      return null;
    }
    
    return (
      <FolderModal
        folder={folder}
        onSave={onSaveFolder}
        onCancel={onCancelFolder || (() => {})}
      />
    );
  }

  // Student modal (create/edit)
  if (modalId === 'student-modal') {
    const { student } = modalProps;
    
    if (!onSaveStudent) {
      console.warn('🟡 GlobalModals: Missing onSaveStudent for student-modal');
      return null;
    }
    
    return (
      <StudentModal
        student={student}
        onSave={onSaveStudent}
        onCancel={onCancelStudent || (() => {})}
      />
    );
  }

  // Generic delete confirmation modal
  if (modalId === 'delete-confirmation') {
    const { title, itemName, itemType, warningMessage, onDelete: modalOnDelete } = modalProps;
    
    if (!modalOnDelete || typeof modalOnDelete !== 'function') {
      console.warn('🟡 GlobalModals: Missing onDelete function in modalProps for delete-confirmation modal');
      return null;
    }
    
    return (
      <DeleteConfirmationModal
        title={title}
        itemName={itemName}
        itemType={itemType}
        warningMessage={warningMessage}
        onDelete={modalOnDelete}
        onCancel={onCancelDelete || (() => {})}
      />
    );
  }

  // Edit choice modal
  if (modalId === 'edit-choice') {
    const { gameName } = modalProps;
    
    if (!onUpdateGame || !onCopyGame) {
      console.warn('🟡 GlobalModals: Missing edit handlers for edit-choice modal');
      return null;
    }
    
    return (
      <EditChoiceModal
        gameName={gameName}
        onUpdate={onUpdateGame}
        onCopy={onCopyGame}
        onCancel={onCancelEdit || (() => {})}
      />
    );
  }

  // Assignment details modal
  if (modalId === 'assignment-details') {
    const { assignment, attempts, isLoadingAttempts } = modalProps;
    
    if (!onCloseAssignmentDetails) {
      console.warn('🟡 GlobalModals: Missing onCloseAssignmentDetails for assignment-details modal');
      return null;
    }
    
    return (
      <AssignmentDetailsModal
        assignment={assignment}
        attempts={attempts || []}
        isLoadingAttempts={isLoadingAttempts || false}
        onClose={onCloseAssignmentDetails}
      />
    );
  }

  // Assignment creation modal
  if (modalId === 'assignment-creation') {
    const { game } = modalProps;
    
    if (!onAssignGame || !onCancelAssignment || !showToast) {
      console.warn('🟡 GlobalModals: Missing handlers for assignment-creation modal');
      return null;
    }
    
    return (
      <AssignmentCreationModal
        game={game}
        onAssign={onAssignGame}
        onCancel={onCancelAssignment}
        showToast={showToast}
      />
    );
  }

  return null;
}; 