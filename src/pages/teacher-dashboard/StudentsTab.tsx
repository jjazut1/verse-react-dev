import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Student, ToastOptions } from './types';
import { useModal } from '../../contexts/ModalContext';
import { useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';

interface StudentsTabProps {
  currentUser: any;
  showToast: (options: ToastOptions) => void;
  setLastTabBeforeStudentView: (tab: 'assignments' | 'create' | 'students') => void;
  activeTab: 'assignments' | 'create' | 'students';
  onStudentHandlersReady: (handlers: {
    handleAddStudent: (studentData: { name: string; email: string; grade: string; age: number; notes: string; }) => Promise<void>;
    handleUpdateStudent: (studentId: string, studentData: Partial<Student>) => Promise<void>;
    handleSaveStudentNotes: (studentId: string, notes: string) => Promise<void>;
  }) => void;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  currentUser,
  showToast,
  setLastTabBeforeStudentView,
  activeTab,
  onStudentHandlersReady
}) => {
  console.log('🔍 DEBUG: StudentsTab component rendered, activeTab:', activeTab, 'currentUser:', currentUser?.uid);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const { showModal } = useModal();
  const navigate = useNavigate();

  // Function to fetch students for the current teacher
  const fetchStudents = async () => {
    if (!currentUser) return;
    
    setIsLoadingStudents(true);
    try {
      console.log('🔍 DEBUG: Fetching students for teacher UID:', currentUser.uid);
      console.log('🔍 DEBUG: Teacher email:', currentUser.email);
      
      // Use the users collection instead of students
      const usersCollection = collection(db, 'users');
      // Query for users with role 'student' and associated with the current teacher
      const q = query(
        usersCollection, 
        where('role', '==', 'student'), 
        where('teacherId', '==', currentUser.uid)
      );
      console.log('🔍 DEBUG: Executing query with teacherId:', currentUser.uid);
      const querySnapshot = await getDocs(q);
      console.log('🔍 DEBUG: Query returned', querySnapshot.docs.length, 'documents');
      
      const studentsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('🔍 DEBUG: Found student document:', {
          id: doc.id,
          email: data.email,
          name: data.name,
          teacherId: data.teacherId,
          role: data.role
        });
        return {
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          grade: data.grade || '',
          age: data.age || 0,
          notes: data.notes || '',
          createdAt: data.createdAt || Timestamp.now(),
          passwordSetupSent: data.passwordSetupSent || false
        } as Student;
      });
      
      console.log('🔍 DEBUG: Final students list:', studentsList.map(s => ({id: s.id, email: s.email, name: s.name})));
      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast({
        title: 'Error fetching students',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Function to add a new student with email-based password setup
  const handleAddStudent = async (studentData: {
    name: string;
    email: string;
    grade: string;
    age: number;
    notes: string;
  }) => {
    if (!currentUser) return;
    
    try {
      console.log('Creating student record for:', studentData.email);
      
      const newStudentData = {
        name: studentData.name,
        email: studentData.email,
        grade: studentData.grade,
        age: studentData.age,
        notes: studentData.notes,
        role: 'student',
        teacherId: currentUser.uid,
        teacherEmail: currentUser.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Authentication and account linking fields
        displayName: studentData.name,
        hasTemporaryPassword: true, // Enables automatic Google Sign-In linking
        linkedToAuth: false, // Will be set to true after Firebase Auth user is created
        authUid: '', // Will be set by Firebase Function with the Auth UID
        emailVerified: false,
        passwordSetupSent: false, // Will be updated by the trigger
        passwordSetupComplete: false,
        lastLogin: null,
        // Additional metadata
        createdBy: 'teacher',
        source: 'teacher_dashboard'
      };
      
      // Add to users collection
      const docRef = await addDoc(collection(db, 'users'), newStudentData);
      
      // Add the new student to the local state
      const newStudent = {
        id: docRef.id,
        name: studentData.name,
        email: studentData.email,
        grade: studentData.grade,
        age: studentData.age,
        notes: studentData.notes,
        createdAt: Timestamp.now(),
        passwordSetupSent: false
      } as Student;
      
      setStudents([...students, newStudent]);
      
      showToast({
        title: 'Student added successfully',
        description: `Password setup email will be sent automatically to ${studentData.email}`,
        status: 'success',
        duration: 5000,
      });
      
    } catch (error) {
      console.error('Error adding student:', error);
      showToast({
        title: 'Error adding student',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Function to update student data
  const handleUpdateStudent = async (studentId: string, studentData: Partial<Student>) => {
    try {
      console.log('Updating student:', studentId, studentData);
      
      // Update in users collection
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, { 
        ...studentData,
        updatedAt: serverTimestamp()
      });
      
      // Update the student in the local state
      setStudents(students.map(s => 
        s.id === studentId ? { ...s, ...studentData } : s
      ));
      
      showToast({
        title: 'Student updated successfully',
        status: 'success',
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Error updating student:', error);
      showToast({
        title: 'Error updating student',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Function to delete student
  const handleDeleteStudent = async (studentId: string) => {
    try {
      console.log('Deleting student:', studentId);
      
      // Delete from users collection
      await deleteDoc(doc(db, 'users', studentId));
      
      // Remove from local state
      setStudents(students.filter(s => s.id !== studentId));
      
      showToast({
        title: 'Student deleted successfully',
        status: 'success',
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Error deleting student:', error);
      showToast({
        title: 'Error deleting student',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Function to save student notes
  const handleSaveStudentNotes = async (studentId: string, notes: string) => {
    try {
      console.log('Saving student notes:', studentId, notes);
      
      // Update in users collection
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, { 
        notes: notes,
        updatedAt: serverTimestamp()
      });
      
      // Update the student in the local state
      setStudents(students.map(s => 
        s.id === studentId ? { ...s, notes: notes } : s
      ));
      
      showToast({
        title: 'Notes saved successfully',
        status: 'success',
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Error saving student notes:', error);
      showToast({
        title: 'Error saving notes',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Pass handlers up to parent on mount
  useEffect(() => {
    onStudentHandlersReady({
      handleAddStudent,
      handleUpdateStudent,
      handleSaveStudentNotes
    });
  }, [students]); // Re-run when students change to capture updated state

  // Function to confirm student deletion
  const confirmDeleteStudent = (studentId: string) => {
    console.log('🔵 confirmDeleteStudent called with studentId:', studentId);
    
    // Find the student to get its details
    const student = students.find(s => s.id === studentId);
    if (!student) {
      console.warn('🟡 confirmDeleteStudent: Student not found:', studentId);
      return;
    }
    
    console.log('🔵 confirmDeleteStudent: Showing modal for student:', {
      studentId,
      studentName: student.name
    });
    
    // Show the global delete confirmation modal
    showModal('delete-confirmation', {
      title: 'Delete Student?',
      itemName: student.name,
      itemType: 'student',
      warningMessage: 'All associated assignments will remain but will no longer be linked to this student.',
      onDelete: () => handleDeleteStudent(studentId)
    });
  };

  // Function to open the add student modal
  const openAddStudentModal = () => {
    console.log('🔵 openAddStudentModal called');
    showModal('student-modal', {
      student: null // null indicates creating a new student
    });
  };

  // Function to open the edit student modal
  const openEditStudentModal = (student: Student) => {
    console.log('🔵 openEditStudentModal called with student:', student);
    showModal('student-modal', {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        grade: student.grade || '',
        age: student.age || 0,
        notes: student.notes || ''
      }
    });
  };

  // Function to open the student notes modal
  const openStudentNotesModal = (student: Student) => {
    console.log('🔵 openStudentNotesModal called with student:', student);
    showModal('student-notes', {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        notes: student.notes || ''
      }
    });
  };

  // Function to handle viewing a student's dashboard
  const handleViewStudentDashboard = (student: Student) => {
    // Remember which tab we're coming from for navigation back
    setLastTabBeforeStudentView(activeTab);
    // Navigate to student dashboard with studentId parameter
    navigate(`/student?id=${student.id}&teacherView=true`);
  };

  // Load students when component mounts or currentUser changes
  useEffect(() => {
    console.log('🔍 DEBUG: StudentsTab useEffect triggered, currentUser:', currentUser?.uid, currentUser?.email);
    if (currentUser) {
      console.log('🔍 DEBUG: currentUser exists, calling fetchStudents');
      fetchStudents();
    } else {
      console.log('🔍 DEBUG: currentUser is null/undefined, not fetching students');
    }
  }, [currentUser]);

  // Filter students based on search query
  const filteredStudents = students.filter(student => {
    if (!studentSearchQuery) return true;
    const query = studentSearchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      (student.grade && student.grade.toLowerCase().includes(query))
    );
  });

  return (
    <div>
      {/* Header with Add Student button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Student Management</h2>
        <button
          onClick={openAddStudentModal}
          style={{
            padding: '8px 16px',
            backgroundColor: '#38A169',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>+ Add Student</span>
        </button>
      </div>
      
      {/* Search input */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={studentSearchQuery}
          onChange={(e) => setStudentSearchQuery(e.target.value)}
          style={{
            padding: '12px 16px',
            border: '1px solid #E2E8F0',
            borderRadius: '4px',
            width: '100%',
            fontSize: '16px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}
        />
      </div>
      
      {isLoadingStudents ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          Loading students...
        </div>
      ) : students.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#F7FAFC', borderBottom: '2px solid #E2E8F0' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Grade</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Password Status</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '12px' }}>{student.name}</td>
                <td style={{ padding: '12px' }}>{student.email}</td>
                <td style={{ padding: '12px' }}>{student.grade || '-'}</td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {student.passwordSetupSent ? (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'medium',
                        backgroundColor: '#FEF3C7',
                        color: '#92400E'
                      }}>
                        🔐 Password Setup Sent
                      </span>
                    ) : (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'medium',
                        backgroundColor: '#E5E7EB',
                        color: '#374151'
                      }}>
                        📧 Email Only
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleViewStudentDashboard(student)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#38B2AC', // Teal color for View button
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
                      onClick={() => openStudentNotesModal(student)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#805AD5', // Purple color for Notes button
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Notes
                    </button>
                    <button
                      onClick={() => openEditStudentModal(student)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#4299E1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => confirmDeleteStudent(student.id)}
                      style={{
                        padding: '6px 12px',
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
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 0',
          color: '#718096',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px dashed #E2E8F0',
          marginTop: '24px'
        }}>
          <p style={{ marginBottom: '16px' }}>You haven't added any students yet.</p>
          <button
            onClick={openAddStudentModal}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4299E1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Add Your First Student
          </button>
        </div>
      )}
    </div>
  );
}; 