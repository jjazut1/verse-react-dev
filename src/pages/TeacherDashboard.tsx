import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, deleteDoc, doc, query, where, getDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCustomToast, ToastComponent } from '../hooks/useCustomToast';
import { getTeacherAssignments, deleteAssignment, getAssignmentAttempts, createAssignmentWithEmailLink } from '../services/assignmentService';
import { Assignment as AssignmentType, Attempt } from '../types';
import { generateAndUploadThumbnail } from '../utils/thumbnailGenerator';
import { useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';

interface Game {
  id: string;
  title: string;
  description?: string;
  gameType?: string;
  thumbnailUrl?: string;
  createdBy: string;
  share: boolean;
  userId: string;
}

interface GameTemplate {
  id: string;
  title: string;
  type: string;
  categories?: any[];
  eggQty?: number;
  thumbnail?: string;
  gameTime?: number;
  speed?: number;
  userId?: string;
  createdBy?: string;
}

// Student interface
interface Student {
  id: string;
  name: string;
  email: string;
  grade?: string;
  notes?: string;
  createdAt: Timestamp;
}

type TabType = 'games' | 'assignments' | 'create' | 'students';

// Use the proper Assignment type from types
type Assignment = AssignmentType;

const TeacherDashboard = () => {
  const { currentUser } = useAuth();
  const { toastMessage, showToast } = useCustomToast();
  const navigate = useNavigate();
  const [myGames, setMyGames] = useState<Game[]>([]);
  const [publicGames, setPublicGames] = useState<Game[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [pendingDeleteAssignment, setPendingDeleteAssignment] = useState<string | null>(null);
  const [pendingDeleteGame, setPendingDeleteGame] = useState<string | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  const [assignmentAttempts, setAssignmentAttempts] = useState<Attempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [assigningGame, setAssigningGame] = useState<Game | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  
  // Game template state
  const [blankTemplates, setBlankTemplates] = useState<GameTemplate[]>([]);
  const [categoryTemplates, setCategoryTemplates] = useState<GameTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState<string | null>(null);

  // Student management state
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [pendingDeleteStudent, setPendingDeleteStudent] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  
  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    console.log('Fetching games from userGameConfigs collection...');
    
    try {
      // Fetch from userGameConfigs collection instead of games
      const userGameConfigsCollection = collection(db, 'userGameConfigs');
      console.log('Querying userGameConfigs collection');
      
      const gameSnapshot = await getDocs(userGameConfigsCollection);
      console.log(`Found ${gameSnapshot.docs.length} game configs`);
      
      if (gameSnapshot.empty) {
        console.log('No game configs found in the collection');
        setMyGames([]);
        setPublicGames([]);
        setIsLoading(false);
        return;
      }
      
      // Convert all games to our Game interface
      const allGames = gameSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Game config data:', data);
        
        // Adapt the userGameConfigs data structure to our Game interface
        return {
          id: doc.id,
          title: data.title || 'Untitled Game',
          description: data.description || '',
          gameType: data.type || 'Unknown',
          thumbnailUrl: data.thumbnail || null,
          createdBy: data.email || '',
          share: data.share || false,
          userId: data.userId || ''
        };
      });
      
      console.log('Processed games:', allGames);
      
      // Filter games into my games and public games
      // My games: games created by current user (based on email)
      const myGamesList = allGames.filter(game => 
        game.createdBy === currentUser?.email || game.userId === currentUser?.uid
      );
      
      // Public games: games shared by others
      const publicGamesList = allGames.filter(game => 
        game.share === true && 
        game.createdBy !== currentUser?.email && 
        game.userId !== currentUser?.uid
      );
      
      console.log('My games:', myGamesList);
      console.log('Public games:', publicGamesList);
      
      setMyGames(myGamesList);
      setPublicGames(publicGamesList);
      
    } catch (error) {
      console.error('Error fetching games:', error);
      showToast({
        title: 'Error fetching games',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.email, currentUser?.uid, showToast]);

  const fetchAssignments = useCallback(async () => {
    try {
      if (currentUser?.uid) {
        const teacherAssignments = await getTeacherAssignments(currentUser.uid);
        setAssignments(teacherAssignments);
      }
    } catch {
      showToast({
        title: 'Error fetching assignments',
        status: 'error',
        duration: 3000,
      });
    }
  }, [currentUser?.uid, showToast]);

  // Function to fetch game templates
  const fetchGameTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    console.log('Fetching game templates...');
    
    try {
      // Fetch blank game templates
      const blankTemplatesCollection = collection(db, 'blankGameTemplates');
      const blankTemplatesSnapshot = await getDocs(blankTemplatesCollection);
      
      const blankTemplatesList = blankTemplatesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          userId: data.userId || '',
          createdBy: data.createdBy || data.email || ''
        };
      }) as GameTemplate[];
      
      // Fetch category/modifiable templates
      const categoryTemplatesCollection = collection(db, 'categoryTemplates');
      const categoryTemplatesSnapshot = await getDocs(categoryTemplatesCollection);
      
      const categoryTemplatesList = categoryTemplatesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          userId: data.userId || '',
          createdBy: data.createdBy || data.email || ''
        };
      }) as GameTemplate[];
      
      console.log('Blank templates:', blankTemplatesList);
      console.log('Category templates:', categoryTemplatesList);
      
      setBlankTemplates(blankTemplatesList);
      setCategoryTemplates(categoryTemplatesList);
    } catch (error) {
      console.error('Error fetching game templates:', error);
      showToast({
        title: 'Error fetching templates',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [showToast]);
  
  // Load templates when the Create Games tab is selected
  useEffect(() => {
    if (activeTab === 'create') {
      fetchGameTemplates();
    }
  }, [activeTab, fetchGameTemplates]);

  // Fetch students when the Students tab is selected
  useEffect(() => {
    if (activeTab === 'students' && currentUser) {
      fetchStudents();
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchGames();
      fetchAssignments();
    }
  }, [currentUser, fetchGames, fetchAssignments]);

  const handleDeleteGame = async (gameId: string) => {
    try {
      await deleteDoc(doc(db, 'userGameConfigs', gameId));
      setMyGames(myGames.filter(game => game.id !== gameId));
      showToast({
        title: 'Game deleted',
        status: 'success',
        duration: 3000,
      });
      setPendingDeleteGame(null);
    } catch (error) {
      console.error('Error deleting game:', error);
      showToast({
        title: 'Error deleting game',
        status: 'error',
        duration: 3000,
      });
      setPendingDeleteGame(null);
    }
  };

  const confirmDeleteGame = (gameId: string) => {
    setPendingDeleteGame(gameId);
  };

  const cancelDeleteGame = () => {
    setPendingDeleteGame(null);
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await deleteAssignment(assignmentId);
      setAssignments(assignments.filter(assignment => assignment.id !== assignmentId));
      showToast({
        title: 'Assignment deleted',
        status: 'success',
        duration: 3000,
      });
      setPendingDeleteAssignment(null);
    } catch {
      showToast({
        title: 'Error deleting assignment',
        status: 'error',
        duration: 3000,
      });
      setPendingDeleteAssignment(null);
    }
  };

  const confirmDeleteAssignment = (assignmentId: string) => {
    setPendingDeleteAssignment(assignmentId);
  };

  const cancelDeleteAssignment = () => {
    setPendingDeleteAssignment(null);
  };

  const handleViewAssignment = async (assignment: Assignment) => {
    setViewingAssignment(assignment);
    setLoadingAttempts(true);
    
    try {
      if (assignment.id) {
        const attempts = await getAssignmentAttempts(assignment.id);
        setAssignmentAttempts(attempts);
      }
    } catch (error) {
      console.error('Error fetching attempts:', error);
      showToast({
        title: 'Error fetching attempts',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoadingAttempts(false);
    }
  };

  const closeViewAssignment = () => {
    setViewingAssignment(null);
    setAssignmentAttempts([]);
  };

  // Filter assignments based on search query
  const filteredAssignments = assignments.filter(assignment => {
    const query = searchQuery.toLowerCase();
    return (
      assignment.gameName.toLowerCase().includes(query) || 
      assignment.studentEmail.toLowerCase().includes(query)
    );
  });

  const handleCreateAssignment = (game: Game) => {
    // Set the game to be assigned and show the assignment modal
    setAssigningGame(game);
    setShowAssignmentModal(true);
    console.log(`Opening assignment modal for ${game.title}`);
  };

  const handleCancelAssignment = () => {
    setAssigningGame(null);
    setShowAssignmentModal(false);
  };

  const handleAssignGame = async (studentEmail: string, deadline: Date, timesRequired: number) => {
    if (!assigningGame) return;
    
    console.log(`Assigning ${assigningGame.title} to ${studentEmail}`);
    console.log(`Deadline: ${deadline}, Times to complete: ${timesRequired}`);
    
    try {
      // Create assignment data
      const assignmentData = {
        gameName: assigningGame.title,
        gameId: assigningGame.id,
        gameType: assigningGame.gameType || 'Unknown',
        studentEmail: studentEmail,
        teacherId: currentUser?.uid || '',
        teacherEmail: currentUser?.email || '',
        timesRequired: timesRequired,
        deadline: Timestamp.fromDate(deadline),
        usePasswordless: true,
      };
      
      // Create the assignment with email link authentication
      const assignmentId = await createAssignmentWithEmailLink(assignmentData);
      
      console.log('Successfully created assignment with ID:', assignmentId);
      
      showToast({
        title: 'Assignment created',
        status: 'success',
        duration: 3000,
      });
      
      // Refresh assignments list
      fetchAssignments();
    } catch (error) {
      console.error('Error creating assignment:', error);
      showToast({
        title: 'Error creating assignment',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setShowAssignmentModal(false);
      setAssigningGame(null);
    }
  };

  // Handle template click to navigate to game configuration page
  const handleTemplateClick = (template: GameTemplate) => {
    // Store the template ID in sessionStorage for auto-selection
    if (template.id) {
      sessionStorage.setItem('selectedTemplateId', template.id);
    }
    
    // Navigate to the correct configuration page based on the template type
    if (template.type === 'whack-a-mole') {
      // If there's a template ID for editing, include it in the path
      if (template.id) {
        navigate(`/configure/whack-a-mole/${template.id}`);
      } else {
        navigate('/configure/whack-a-mole');
      }
    } else if (template.type === 'sort-categories-egg') {
      // If there's a template ID for editing, include it in the path
      if (template.id) {
        navigate(`/configure/sort-categories-egg/${template.id}`);
      } else {
        navigate('/configure/sort-categories-egg');
      }
    } else {
      // Default to the configuration router for unknown types
      navigate('/configure');
    }
  };

  // Confirmation modal component
  const DeleteConfirmationModal = () => {
    if (!pendingDeleteAssignment) return null;

    return (
      <div style={{
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
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Delete Assignment?</h3>
          <p style={{ marginBottom: '24px', color: '#4A5568' }}>
            Are you sure you want to delete this assignment? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={cancelDeleteAssignment}
              style={{
                padding: '8px 16px',
                backgroundColor: '#E2E8F0',
                color: '#4A5568',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteAssignment(pendingDeleteAssignment)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#F56565',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Game delete confirmation modal component
  const DeleteGameConfirmationModal = () => {
    if (!pendingDeleteGame) return null;
    
    // Find the game info to display in the confirmation
    const gameToDelete = myGames.find(game => game.id === pendingDeleteGame);
    
    if (!gameToDelete) return null;

    return (
      <div style={{
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
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Delete Game?</h3>
          <p style={{ marginBottom: '8px', color: '#4A5568' }}>
            Are you sure you want to delete <strong>{gameToDelete.title}</strong>?
          </p>
          <p style={{ marginBottom: '24px', color: '#4A5568' }}>
            This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={cancelDeleteGame}
              style={{
                padding: '8px 16px',
                backgroundColor: '#E2E8F0',
                color: '#4A5568',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteGame(pendingDeleteGame)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#F56565',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Assignment details modal component
  const AssignmentDetailsModal = () => {
    if (!viewingAssignment) return null;

    // Format duration in seconds to a readable format
    const formatDuration = (seconds: number) => {
      if (seconds < 60) {
        return `${seconds} sec`;
      }
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes} min ${remainingSeconds} sec`;
    };

    return (
      <div style={{
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
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '700px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '24px', margin: 0 }}>Assignment Details</h2>
            <button
              onClick={closeViewAssignment}
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
              <div>{viewingAssignment.gameName}</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>Game Type:</div>
              <div>{viewingAssignment.gameType}</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>Student Email:</div>
              <div>{viewingAssignment.studentEmail}</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>Due Date:</div>
              <div>{viewingAssignment.deadline?.toDate().toLocaleDateString()}</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>Status:</div>
              <div>{viewingAssignment.status}</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>Times Required:</div>
              <div>{viewingAssignment.timesRequired}</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>Times Completed:</div>
              <div>{viewingAssignment.completedCount}</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>Created At:</div>
              <div>{viewingAssignment.createdAt?.toDate().toLocaleString()}</div>
            </div>
            
            {viewingAssignment.lastCompletedAt && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold' }}>Last Completed At:</div>
                <div>{viewingAssignment.lastCompletedAt.toDate().toLocaleString()}</div>
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>Assignment Link:</div>
              <div>{`${window.location.origin}/assignment/${viewingAssignment.linkToken}`}</div>
            </div>
          </div>
          
          {/* Attempt History Section */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Attempt History</h3>
            
            {loadingAttempts ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>Loading attempts...</div>
            ) : assignmentAttempts.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Date & Time</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Duration</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Sort attempts by timestamp (newest first) */}
                  {assignmentAttempts
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
              onClick={closeViewAssignment}
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

  // Assignment creation modal component
  const AssignmentCreationModal = () => {
    if (!assigningGame || !showAssignmentModal) return null;
    
    // State for the form - update for multiple student selection
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
    const [studentEmail, setStudentEmail] = useState('');
    const [deadline, setDeadline] = useState('');
    const [timesRequired, setTimesRequired] = useState(1);
    const [usePasswordless, setUsePasswordless] = useState(true);
    const [assignmentStudents, setAssignmentStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    
    // Fetch students when modal opens
    useEffect(() => {
      if (showAssignmentModal && currentUser) {
        fetchAssignmentStudents();
      }
    }, [showAssignmentModal, currentUser]);
    
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
    const handleAssignToMultipleStudents = () => {
      if (selectedStudents.length === 0 || !deadline) {
        showToast({
          title: 'Missing required fields',
          description: 'Please select at least one student and set a deadline',
          status: 'error',
          duration: 3000,
        });
        return;
      }
      
      // Create assignments for each selected student
      const assignmentPromises = selectedStudents.map(student => 
        handleAssignGame(student.email, new Date(deadline), timesRequired)
      );
      
      Promise.all(assignmentPromises)
        .then(() => {
          showToast({
            title: 'Assignments created',
            description: `Created assignments for ${selectedStudents.length} student(s)`,
            status: 'success',
            duration: 3000,
          });
          setShowAssignmentModal(false);
        })
        .catch(error => {
          console.error('Error creating assignments:', error);
          showToast({
            title: 'Error creating assignments',
            status: 'error',
            duration: 3000,
          });
        });
    };
    
    return (
      <div style={{
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
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginBottom: '16px', fontSize: '24px', textAlign: 'center' }}>Assign Game to Student</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Game: {assigningGame.title}</div>
            <div style={{ color: '#666' }}>Type: {assigningGame.gameType}</div>
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
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '4px',
                    backgroundColor: '#F7FAFC',
                    minHeight: '120px' // Taller for multiple selection
                  }}
                  required
                >
                  {assignmentStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.email}) {student.grade ? `- ${student.grade}` : ''}
                    </option>
                  ))}
                </select>
                
                {/* Display selected students */}
                {selectedStudents.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      Selected Students ({selectedStudents.length}):
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '8px',
                      maxHeight: '100px',
                      overflowY: 'auto',
                      padding: '8px',
                      backgroundColor: '#EDF2F7',
                      borderRadius: '4px'
                    }}>
                      {selectedStudents.map(student => (
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
                            style={{
                              marginLeft: '4px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#4A5568'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
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
                    backgroundColor: '#F7FAFC'
                  }}
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
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
                backgroundColor: '#F7FAFC'
              }}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
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
                backgroundColor: '#F7FAFC'
              }}
              value={timesRequired}
              onChange={(e) => setTimesRequired(Number(e.target.value))}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Authentication Method
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                checked={usePasswordless}
                onChange={() => setUsePasswordless(!usePasswordless)}
                style={{ marginRight: '8px' }}
              />
              <span>Use passwordless authentication (recommended for young students)</span>
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              Students will receive an email with a single-click link to access the assignment without needing a password.
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={handleCancelAssignment}
              style={{
                padding: '8px 16px',
                backgroundColor: 'white',
                color: '#4A5568',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAssignToMultipleStudents}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3182CE',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Assign Game
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Template item component
  const TemplateItem = ({ template, onClick }: { template: GameTemplate, onClick: () => void }) => {
    const bgColor = template.type === 'whack-a-mole' ? '#e6fff0' : '#f0e6ff';
    const icon = template.type === 'whack-a-mole' ? '🔨' : '🥚';
    
    // Check if this template is in the categoryTemplates array (modifiable template)
    const isModifiableTemplate = categoryTemplates.some(t => t.id === template.id);
    
    // Check if the current user is the template owner
    const isTemplateOwner = 
      (template.userId && template.userId === currentUser?.uid) ||
      (template.createdBy && template.createdBy === currentUser?.email);
    
    // Only show delete button for modifiable templates that user owns
    const showDeleteButton = isModifiableTemplate && isTemplateOwner;
    
    const handleDeleteClick = (e: React.MouseEvent) => {
      // Stop propagation to prevent template click handler from firing
      e.stopPropagation();
      
      // Confirm deletion
      confirmDeleteTemplate(template.id);
    };
    
    return (
      <div 
        style={{ 
          display: 'flex',
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '12px',
          cursor: 'pointer',
          border: '1px solid #E2E8F0',
          justifyContent: 'space-between'
        }}
        onClick={onClick}
      >
        <div style={{ display: 'flex' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '8px',
            backgroundColor: bgColor,
            marginRight: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            {template.thumbnail ? (
              <img 
                src={template.thumbnail} 
                alt={template.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
              />
            ) : icon}
          </div>
          <div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '4px' }}>{template.title}</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Type: {template.type}</p>
          </div>
        </div>
        
        {showDeleteButton && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={handleDeleteClick}
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
        )}
      </div>
    );
  };

  // Handler for deleting a template
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      // First check if it's in the categoryTemplates collection
      await deleteDoc(doc(db, 'categoryTemplates', templateId));
      
      // Update the templates list
      setCategoryTemplates(categoryTemplates.filter(template => template.id !== templateId));
      
      showToast({
        title: 'Template deleted',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      showToast({
        title: 'Error deleting template',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setPendingDeleteTemplate(null);
    }
  };

  // Function to confirm template deletion
  const confirmDeleteTemplate = (templateId: string) => {
    setPendingDeleteTemplate(templateId);
  };

  // Function to cancel template deletion
  const cancelDeleteTemplate = () => {
    setPendingDeleteTemplate(null);
  };

  // Template delete confirmation modal component
  const TemplateDeleteConfirmationModal = () => {
    if (!pendingDeleteTemplate) return null;
    
    // Find the template info to display in the confirmation
    const templateToDelete = categoryTemplates.find(template => template.id === pendingDeleteTemplate);
    
    if (!templateToDelete) return null;

    return (
      <div style={{
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
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Delete Template?</h3>
          <p style={{ marginBottom: '8px', color: '#4A5568' }}>
            Are you sure you want to delete <strong>{templateToDelete.title}</strong>?
          </p>
          <p style={{ marginBottom: '24px', color: '#4A5568' }}>
            This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={cancelDeleteTemplate}
              style={{
                padding: '8px 16px',
                backgroundColor: '#E2E8F0',
                color: '#4A5568',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteTemplate(pendingDeleteTemplate)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#F56565',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Function to fetch students for the current teacher
  const fetchStudents = async () => {
    if (!currentUser) return;
    
    setIsLoadingStudents(true);
    try {
      // Use the users collection instead of students
      const usersCollection = collection(db, 'users');
      // Query for users with role 'student' and associated with the current teacher
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
          notes: data.notes || '',
          createdAt: data.createdAt || Timestamp.now()
        } as Student;
      });
      
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
  
  // Function to add a new student
  const handleAddStudent = async (studentData: Omit<Student, 'id' | 'createdAt'>) => {
    if (!currentUser) return;
    
    try {
      const newStudentData = {
        ...studentData,
        role: 'student', // Explicitly set role as student
        teacherId: currentUser.uid,
        teacherEmail: currentUser.email,
        createdAt: serverTimestamp()
      };
      
      // Add to users collection instead of students
      const docRef = await addDoc(collection(db, 'users'), newStudentData);
      
      // Add the new student to the local state
      const newStudent = {
        id: docRef.id,
        ...studentData,
        createdAt: Timestamp.now()
      } as Student;
      
      setStudents([...students, newStudent]);
      
      showToast({
        title: 'Student added successfully',
        status: 'success',
        duration: 3000,
      });
      
      setShowStudentModal(false);
    } catch (error) {
      console.error('Error adding student:', error);
      showToast({
        title: 'Error adding student',
        status: 'error',
        duration: 3000,
      });
    }
  };
  
  // Function to update an existing student
  const handleUpdateStudent = async (studentId: string, studentData: Partial<Student>) => {
    try {
      // Update in users collection
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, studentData);
      
      // Update the student in the local state
      setStudents(students.map(student => 
        student.id === studentId ? { ...student, ...studentData } : student
      ));
      
      showToast({
        title: 'Student updated successfully',
        status: 'success',
        duration: 3000,
      });
      
      setEditingStudent(null);
      setShowStudentModal(false);
    } catch (error) {
      console.error('Error updating student:', error);
      showToast({
        title: 'Error updating student',
        status: 'error',
        duration: 3000,
      });
    }
  };
  
  // Function to delete a student
  const handleDeleteStudent = async (studentId: string) => {
    try {
      // Delete from users collection
      await deleteDoc(doc(db, 'users', studentId));
      
      // Remove the student from the local state
      setStudents(students.filter(student => student.id !== studentId));
      
      showToast({
        title: 'Student deleted',
        status: 'success',
        duration: 3000,
      });
      
      setPendingDeleteStudent(null);
    } catch (error) {
      console.error('Error deleting student:', error);
      showToast({
        title: 'Error deleting student',
        status: 'error',
        duration: 3000,
      });
      setPendingDeleteStudent(null);
    }
  };
  
  // Function to confirm student deletion
  const confirmDeleteStudent = (studentId: string) => {
    setPendingDeleteStudent(studentId);
  };
  
  // Function to cancel student deletion
  const cancelDeleteStudent = () => {
    setPendingDeleteStudent(null);
  };
  
  // Function to open the add student modal
  const openAddStudentModal = () => {
    setEditingStudent(null);
    setShowStudentModal(true);
  };
  
  // Function to open the edit student modal
  const openEditStudentModal = (student: Student) => {
    setEditingStudent(student);
    setShowStudentModal(true);
  };

  // Student Modal Component for adding/editing students
  const StudentModal = () => {
    if (!showStudentModal) return null;
    
    // State for the form
    const [name, setName] = useState(editingStudent?.name || '');
    const [email, setEmail] = useState(editingStudent?.email || '');
    const [grade, setGrade] = useState(editingStudent?.grade || '');
    const [notes, setNotes] = useState(editingStudent?.notes || '');
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const studentData = {
        name,
        email,
        grade,
        notes
      };
      
      if (editingStudent) {
        handleUpdateStudent(editingStudent.id, studentData);
      } else {
        handleAddStudent(studentData);
      }
    };
    
    return (
      <div style={{
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
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ marginBottom: '16px', fontSize: '20px' }}>
            {editingStudent ? 'Edit Student' : 'Add New Student'}
          </h3>
          
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
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '4px'
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
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '4px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Grade/Class
              </label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '4px'
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
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '4px',
                  minHeight: '100px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#E2E8F0',
                  color: '#4A5568',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4299E1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {editingStudent ? 'Update Student' : 'Add Student'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  // Student delete confirmation modal
  const StudentDeleteConfirmationModal = () => {
    if (!pendingDeleteStudent) return null;
    
    // Find the student info to display in the confirmation
    const studentToDelete = students.find(student => student.id === pendingDeleteStudent);
    
    if (!studentToDelete) return null;

    return (
      <div style={{
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
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Delete Student?</h3>
          <p style={{ marginBottom: '8px', color: '#4A5568' }}>
            Are you sure you want to delete <strong>{studentToDelete.name}</strong>?
          </p>
          <p style={{ marginBottom: '24px', color: '#4A5568' }}>
            This action cannot be undone. All associated assignments will remain but will no longer be linked to this student.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={cancelDeleteStudent}
              style={{
                padding: '8px 16px',
                backgroundColor: '#E2E8F0',
                color: '#4A5568',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteStudent(pendingDeleteStudent)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#F56565',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
      <ToastComponent toastMessage={toastMessage} />
      <DeleteConfirmationModal />
      <DeleteGameConfirmationModal />
      <AssignmentDetailsModal />
      <AssignmentCreationModal />
      <TemplateDeleteConfirmationModal />
      <StudentModal />
      <StudentDeleteConfirmationModal />
      
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '32px' }}>
        Create
      </h1>

      <div>
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #E2E8F0', 
          marginBottom: '24px'
        }}>
          <div
            onClick={() => setActiveTab('create')}
            style={{
              padding: '12px 24px',
              position: 'relative',
              cursor: 'pointer',
              color: activeTab === 'create' ? '#4299E1' : '#718096',
              fontWeight: activeTab === 'create' ? 'bold' : 'normal',
              borderBottom: activeTab === 'create' ? '2px solid #4299E1' : 'none',
              marginBottom: activeTab === 'create' ? '-1px' : '0',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
              backgroundColor: activeTab === 'create' ? '#EBF8FF' : 'transparent',
              borderRadius: '4px 4px 0 0'
            }}
          >
            Create Games
          </div>
          <div
            onClick={() => setActiveTab('games')}
            style={{
              padding: '12px 24px',
              position: 'relative',
              cursor: 'pointer',
              color: activeTab === 'games' ? '#4299E1' : '#718096',
              fontWeight: activeTab === 'games' ? 'bold' : 'normal',
              borderBottom: activeTab === 'games' ? '2px solid #4299E1' : 'none',
              marginBottom: activeTab === 'games' ? '-1px' : '0',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
              backgroundColor: activeTab === 'games' ? '#EBF8FF' : 'transparent',
              borderRadius: '4px 4px 0 0'
            }}
          >
            Create Assignments
          </div>
          <div
            onClick={() => setActiveTab('assignments')}
            style={{
              padding: '12px 24px',
              position: 'relative',
              cursor: 'pointer',
              color: activeTab === 'assignments' ? '#4299E1' : '#718096',
              fontWeight: activeTab === 'assignments' ? 'bold' : 'normal',
              borderBottom: activeTab === 'assignments' ? '2px solid #4299E1' : 'none',
              marginBottom: activeTab === 'assignments' ? '-1px' : '0',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
              backgroundColor: activeTab === 'assignments' ? '#EBF8FF' : 'transparent',
              borderRadius: '4px 4px 0 0'
            }}
          >
            Track Assignments
          </div>
          <div
            onClick={() => setActiveTab('students')}
            style={{
              padding: '12px 24px',
              position: 'relative',
              cursor: 'pointer',
              color: activeTab === 'students' ? '#4299E1' : '#718096',
              fontWeight: activeTab === 'students' ? 'bold' : 'normal',
              borderBottom: activeTab === 'students' ? '2px solid #4299E1' : 'none',
              marginBottom: activeTab === 'students' ? '-1px' : '0',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
              backgroundColor: activeTab === 'students' ? '#EBF8FF' : 'transparent',
              borderRadius: '4px 4px 0 0'
            }}
          >
            My Students
          </div>
        </div>

        {activeTab === 'games' && (
          <div>
            {/* Available Games Section */}
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Available Games</h2>
            
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>Loading games...</div>
            ) : myGames.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
                {myGames.map((game) => (
                  <div key={game.id} style={{ 
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                          width: '80px', 
                          height: '80px', 
                          backgroundColor: (game.gameType || '').includes('whack') ? '#c6f6d5' : '#e9d8fd',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}>
                          {game.thumbnailUrl ? (
                            <img src={game.thumbnailUrl} alt={game.title} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                          ) : (
                            <div style={{ fontSize: '32px', color: '#718096' }}>🎮</div>
                          )}
                        </div>
                        
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{game.title}</h3>
                          <p style={{ color: '#718096', fontSize: '14px' }}>Type: {game.gameType || 'Unknown'}</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px' }}>
            <button
                          onClick={() => handleCreateAssignment(game)}
              style={{
                            padding: '6px 12px',
                            backgroundColor: '#38A169',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                            fontSize: '14px'
              }}
            >
                          New Assignment
            </button>
                      <button
                          onClick={() => confirmDeleteGame(game.id)}
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
                    </div>
                  </div>
                ))}
          </div>
        ) : (
              <p style={{ marginBottom: '40px', color: '#718096' }}>You haven't created any games yet.</p>
            )}

            {/* Public Games Section */}
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Public Games</h2>
            
            {publicGames.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {publicGames.map((game) => (
                  <div key={game.id} style={{ 
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                          width: '80px', 
                          height: '80px', 
                          backgroundColor: (game.gameType || '').includes('whack') ? '#c6f6d5' : '#e9d8fd',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}>
                          {game.thumbnailUrl ? (
                            <img src={game.thumbnailUrl} alt={game.title} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                          ) : (
                            <div style={{ fontSize: '32px', color: '#718096' }}>🎮</div>
                          )}
                        </div>
                        
          <div>
                          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{game.title}</h3>
                          <p style={{ color: '#718096', fontSize: '14px' }}>Type: {game.gameType || 'Unknown'}</p>
                        </div>
                      </div>
                      
            <button
                        onClick={() => handleCreateAssignment(game)}
              style={{
                          padding: '6px 12px',
                          backgroundColor: '#38A169',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                          fontSize: '14px'
              }}
            >
                        New Assignment
            </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#718096' }}>No public games available.</p>
            )}
          </div>
        )}

        {activeTab === 'assignments' && (
          <div>
            {/* Search input */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search by title or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
            
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Title</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Game</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Due Date</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Student</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((assignment) => (
                  <tr key={assignment.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px' }}>{assignment.gameName}</td>
                    <td style={{ padding: '12px' }}>{assignment.gameType}</td>
                    <td style={{ padding: '12px' }}>{assignment.deadline?.toDate().toLocaleDateString()}</td>
                    <td style={{ padding: '12px' }}>{assignment.studentEmail}</td>
                    <td style={{ padding: '12px' }}>{assignment.status}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'create' && (
          <div>
            {isLoadingTemplates ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>Loading templates...</div>
            ) : (
              <>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Blank Game Templates</h2>
                {blankTemplates.length > 0 ? (
                  <div style={{ marginBottom: '32px' }}>
                    {blankTemplates.map((template) => (
                      <TemplateItem 
                        key={template.id} 
                        template={template} 
                        onClick={() => handleTemplateClick(template)}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{ marginBottom: '32px', color: '#718096' }}>No blank templates available.</p>
                )}

                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Modifiable Game Templates</h2>
                {categoryTemplates.length > 0 ? (
                  <div style={{ marginBottom: '32px' }}>
                    {categoryTemplates.map((template) => (
                      <TemplateItem 
                        key={template.id} 
                        template={template} 
                        onClick={() => handleTemplateClick(template)}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#718096' }}>No modifiable templates available.</p>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'students' && (
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
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Grade/Class</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter(student => {
                      if (!studentSearchQuery) return true;
                      const query = studentSearchQuery.toLowerCase();
                      return (
                        student.name.toLowerCase().includes(query) ||
                        student.email.toLowerCase().includes(query) ||
                        (student.grade && student.grade.toLowerCase().includes(query))
                      );
                    })
                    .map((student) => (
                      <tr key={student.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '12px' }}>{student.name}</td>
                        <td style={{ padding: '12px' }}>{student.email}</td>
                        <td style={{ padding: '12px' }}>{student.grade || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
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
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard; 