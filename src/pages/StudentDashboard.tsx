import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, Attempt } from '../types';

// Define Game interface based on TeacherDashboard.tsx
interface Game {
  id: string;
  title: string;
  description?: string;
  gameType?: string;
  type?: string;
  name?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  public?: boolean;
}

// Child-friendly color palette
const colors = {
  primary: '#4299E1', // Bright blue
  secondary: '#9AE6B4', // Mint green
  accent1: '#FEB2B2', // Soft red
  accent2: '#FAF089', // Pale yellow
  accent3: '#B794F4', // Lavender
  background: '#EBF8FF', // Light blue background
  cardBg: '#FFFFFF',
  text: '#2D3748', // Dark gray for text
  textLight: '#718096' // Medium gray for secondary text
};

const StudentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Parse query parameters
  const queryParams = new URLSearchParams(location.search);
  const studentId = queryParams.get('id');
  const isTeacherView = queryParams.get('teacherView') === 'true';
  
  const [studentData, setStudentData] = useState<any>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [freeGames, setFreeGames] = useState<Game[]>([]);
  const [gameConfigs, setGameConfigs] = useState<{[key: string]: any}>({});
  const [highScores, setHighScores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('assignments');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // If we're in teacher view mode and have a studentId
        if (isTeacherView && studentId) {
          // Get the student data
          const studentDocRef = doc(db, 'users', studentId);
          const studentDoc = await getDoc(studentDocRef);
          
          if (studentDoc.exists()) {
            const data = studentDoc.data();
            setStudentData({
              id: studentDoc.id,
              ...data
            });
            
            // Fetch data for the specified student
            await fetchStudentSpecificData(data.email);
          } else {
            console.error("Student not found");
            navigate('/teacher'); // Redirect back if student not found
          }
        } else if (!currentUser) {
          // Not teacher view and no current user
          navigate('/login');
          return;
        } else {
          // Regular student view for the current user
          await fetchStudentData();
        }
      } catch (error) {
        console.error('Error in data fetching:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser, navigate, studentId, isTeacherView]);
  
  // Function to fetch data for a specific student (used in teacher view)
  const fetchStudentSpecificData = async (studentEmail: string) => {
    try {
      // Fetch assignments
      await fetchAssignmentsForEmail(studentEmail);
      
      // Fetch attempts/progress
      await fetchAttemptsForEmail(studentEmail);
      
      // Fetch available free games
      await fetchFreeGames();
      
      // Fetch high scores if available
      if (studentId) {
        await fetchHighScoresForStudent(studentId);
      }
    } catch (error) {
      console.error('Error fetching student specific data:', error);
    }
  };
  
  const fetchStudentData = async () => {
    try {
      // First, fetch the current user's data from the database
      if (currentUser?.uid) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setCurrentUserData({
            id: userDoc.id,
            ...userDoc.data()
          });
        }
      }
      
      // Fetch assignments
      await fetchAssignments();
      
      // Fetch attempts/progress
      await fetchAttempts();
      
      // Fetch available free games
      await fetchFreeGames();
      
      // Fetch high scores
      await fetchHighScores();
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
  };
  
  const fetchAssignmentsForEmail = async (email: string) => {
    try {
      // Query for assignments where the student email matches
      const assignmentsQuery = query(
        collection(db, 'assignments'),
        where('studentEmail', '==', email)
      );
      
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const assignmentsList = assignmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Assignment[];
      
      // Sort by deadline - upcoming first
      assignmentsList.sort((a, b) => {
        const dateA = a.deadline?.toDate() || new Date();
        const dateB = b.deadline?.toDate() || new Date();
        return dateA.getTime() - dateB.getTime();
      });
      
      setAssignments(assignmentsList);
      
      // Fetch game configurations for thumbnails
      await fetchGameConfigs(assignmentsList);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };
  
  const fetchAssignments = async () => {
    if (!currentUser?.email) return;
    await fetchAssignmentsForEmail(currentUser.email);
  };
  
  const fetchAttemptsForEmail = async (email: string) => {
    try {
      // Query for attempts by this student
      const attemptsQuery = query(
        collection(db, 'attempts'),
        where('studentEmail', '==', email)
      );
      
      const attemptsSnapshot = await getDocs(attemptsQuery);
      const attemptsList = attemptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Attempt[];
      
      // Sort by timestamp - most recent first
      attemptsList.sort((a, b) => {
        const timeA = a.timestamp?.toDate().getTime() || 0;
        const timeB = b.timestamp?.toDate().getTime() || 0;
        return timeB - timeA;
      });
      
      setAttempts(attemptsList);
    } catch (error) {
      console.error('Error fetching attempts:', error);
    }
  };
  
  const fetchAttempts = async () => {
    if (!currentUser?.email) return;
    await fetchAttemptsForEmail(currentUser.email);
  };
  
  const fetchHighScoresForStudent = async (uid: string) => {
    try {
      // Fetch high scores from the user document
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setHighScores(userData.highScores || []);
      }
    } catch (error) {
      console.error('Error fetching high scores:', error);
    }
  };
  
  const fetchHighScores = async () => {
    if (!currentUser?.uid) return;
    await fetchHighScoresForStudent(currentUser.uid);
  };
  
  const fetchFreeGames = async () => {
    try {
      // Query for public/free games
      const gamesQuery = query(
        collection(db, 'userGameConfigs'),
        where('share', '==', true) // Only get games marked as shared/public
      );
      
      const gamesSnapshot = await getDocs(gamesQuery);
      const gamesList = gamesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Game[];
      
      setFreeGames(gamesList);
    } catch (error) {
      console.error('Error fetching free games:', error);
    }
  };
  
  // Function to fetch game configurations for assignments
  const fetchGameConfigs = async (assignmentsList: Assignment[]) => {
    try {
      const gameIds = [...new Set(assignmentsList.map(assignment => assignment.gameId).filter(Boolean))];
      
      if (gameIds.length === 0) return;
      
      const configs: {[key: string]: any} = {};
      
      // Fetch each game config
      for (const gameId of gameIds) {
        try {
          const gameConfigRef = doc(db, 'userGameConfigs', gameId);
          const gameConfigDoc = await getDoc(gameConfigRef);
          
          if (gameConfigDoc.exists()) {
            configs[gameId] = {
              id: gameConfigDoc.id,
              ...gameConfigDoc.data()
            };
          }
        } catch (error) {
          console.error(`Error fetching game config for ${gameId}:`, error);
        }
      }
      
      setGameConfigs(configs);
    } catch (error) {
      console.error('Error fetching game configs:', error);
    }
  };
  
  const handlePlayGame = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };
  
  const handlePlayAssignment = (assignment: Assignment) => {
    if (assignment.linkToken) {
      navigate(`/play?token=${assignment.linkToken}`);
    }
  };
  
  const getProgressPercentage = (assignment: Assignment) => {
    if (!assignment.timesRequired) return 0;
    return Math.min(100, Math.round((assignment.completedCount || 0) / assignment.timesRequired * 100));
  };
  
  // Helper function to render a star rating (1-5)
  const renderStars = (score: number, maxScore: number = 100) => {
    // Convert score to 1-5 scale
    const starCount = Math.max(1, Math.min(5, Math.ceil(score / (maxScore / 5))));
    
    return (
      <div style={{ display: 'flex', marginTop: '4px' }}>
        {[...Array(5)].map((_, i) => (
          <div 
            key={i}
            style={{
              fontSize: '24px',
              color: i < starCount ? '#FFD700' : '#E2E8F0',
              marginRight: '2px'
            }}
          >
            ★
          </div>
        ))}
      </div>
    );
  };
  
  // Render a badge based on completion count
  const renderBadge = (count: number) => {
    let badgeColor = colors.accent2; // Default
    let badgeText = 'Beginner';
    
    if (count >= 20) {
      badgeColor = colors.accent3;
      badgeText = 'Master';
    } else if (count >= 10) {
      badgeColor = colors.accent1;
      badgeText = 'Expert';
    } else if (count >= 5) {
      badgeColor = colors.secondary;
      badgeText = 'Skilled';
    }
    
    return (
      <div style={{
        backgroundColor: badgeColor,
        color: colors.text,
        borderRadius: '16px',
        padding: '4px 12px',
        fontSize: '14px',
        fontWeight: 'bold',
        display: 'inline-block'
      }}>
        {badgeText}
      </div>
    );
  };
  
  const renderTabButton = (tabName: string, label: string, emoji: string) => (
    <button
      onClick={() => setActiveTab(tabName)}
      style={{
        padding: '12px',
        backgroundColor: activeTab === tabName ? colors.primary : 'transparent',
        color: activeTab === tabName ? 'white' : colors.text,
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: activeTab === tabName ? '0 4px 6px rgba(66, 153, 225, 0.3)' : 'none',
        transition: 'all 0.2s ease'
      }}
    >
      <span style={{ marginRight: '8px', fontSize: '20px' }}>{emoji}</span>
      {label}
    </button>
  );
  
  const renderAssignmentsTab = () => {
    const today = new Date();
    
    // Categorize assignments
    const overdueAssignments = assignments.filter(assignment => {
      const deadline = assignment.deadline?.toDate();
      return deadline && deadline < today && 
             (assignment.status === 'assigned' || assignment.status === 'started');
    });
    
    const currentAssignments = assignments.filter(assignment => {
      const deadline = assignment.deadline?.toDate();
      return (assignment.status === 'assigned' || assignment.status === 'started') &&
             (!deadline || deadline >= today);
    });
    
    const completedAssignments = assignments.filter(assignment => 
      assignment.status === 'completed'
    );
    
    // Assignment card component with status-based styling
    const AssignmentCard = ({ assignment, sectionType }: { assignment: any, sectionType: 'overdue' | 'current' | 'completed' }) => {
      const getBorderColor = () => {
        switch(sectionType) {
          case 'overdue': return '#F56565'; // Red
          case 'current': return '#4299E1'; // Blue  
          case 'completed': return '#48BB78'; // Green
          default: return '#E2E8F0';
        }
      };
      
      const getBackgroundColor = () => {
        switch(sectionType) {
          case 'overdue': return '#FFF5F5'; // Light red
          case 'current': return colors.cardBg; // White
          case 'completed': return '#F0FFF4'; // Light green
          default: return colors.cardBg;
        }
      };
      
      // Get game config for thumbnail
      const gameConfig = gameConfigs[assignment.gameId];
      
      return (
        <div 
          key={assignment.id}
          style={{
            backgroundColor: getBackgroundColor(),
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            border: `2px solid ${getBorderColor()}`,
            cursor: sectionType !== 'completed' ? 'pointer' : 'default',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            opacity: sectionType === 'completed' ? 0.8 : 1
          }}
          onClick={() => sectionType !== 'completed' && handlePlayAssignment(assignment)}
        >
          {/* Game thumbnail */}
          <div style={{
            height: '120px',
            backgroundColor: '#EDF2F7',
            borderRadius: '12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: `1px solid ${getBorderColor()}20` // 20% opacity of border color
          }}>
            {gameConfig?.thumbnail ? (
              <img 
                src={gameConfig.thumbnail} 
                alt={assignment.gameName}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  borderRadius: '12px'
                }}
              />
            ) : (
              <div style={{
                fontSize: '48px',
                color: getBorderColor(),
                opacity: 0.7
              }}>
                {gameConfig?.type === 'whack-a-mole' ? '🔨' : 
                 gameConfig?.type === 'sort-categories-egg' ? '🥚' : '🎮'}
              </div>
            )}
          </div>
          
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: colors.text }}>
            {assignment.gameName}
          </h3>
          
          <div style={{ marginBottom: '12px', color: colors.textLight, fontSize: '14px' }}>
            Due: {assignment.deadline?.toDate().toLocaleDateString() || 'No deadline'}
            {sectionType === 'overdue' && (
              <span style={{ 
                marginLeft: '8px',
                color: '#E53E3E', 
                fontSize: '12px', 
                fontWeight: 'bold',
                backgroundColor: '#FED7D7',
                padding: '2px 6px',
                borderRadius: '12px'
              }}>
                OVERDUE
              </span>
            )}
          </div>
          
          <div style={{ marginBottom: '8px', fontSize: '14px' }}>
            <span style={{ color: colors.textLight }}>Progress: </span>
            <span style={{ fontWeight: 'bold', color: colors.text }}>
              {assignment.completedCount || 0} / {assignment.timesRequired || 1}
            </span>
          </div>
          
          <div style={{ 
            height: '12px', 
            backgroundColor: '#E2E8F0', 
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              height: '100%', 
              width: `${getProgressPercentage(assignment)}%`,
              backgroundColor: getProgressPercentage(assignment) === 100 ? '#48BB78' : getBorderColor(),
              borderRadius: '6px'
            }} />
          </div>
          
          <div style={{ 
            marginTop: '16px',
            padding: '8px',
            backgroundColor: sectionType === 'completed' ? '#C6F6D5' : colors.background,
            borderRadius: '8px',
            textAlign: 'center',
            fontWeight: 'bold',
            color: sectionType === 'completed' ? '#2F855A' : getBorderColor()
          }}>
            {sectionType === 'completed' ? '✅ Completed!' : 
             sectionType === 'overdue' ? '🚨 Complete Now!' : '▶️ Play Now'}
          </div>
        </div>
      );
    };
    
    return (
      <div style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '24px', color: colors.text }}>
          My Assignments
        </h2>
        
        {assignments.length === 0 ? (
          <div style={{
            backgroundColor: colors.cardBg,
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>📚</span>
            <p style={{ color: colors.textLight, fontSize: '18px' }}>
              You don't have any assignments yet!
            </p>
          </div>
        ) : (
          <>
            {/* Overdue Assignments Section */}
            {overdueAssignments.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '16px',
                  backgroundColor: '#FED7D7',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #F56565'
                }}>
                  <span style={{ fontSize: '24px', marginRight: '12px' }}>🚨</span>
                  <h3 style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: '#C53030',
                    margin: 0 
                  }}>
                    Overdue Assignments ({overdueAssignments.length})
                  </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {overdueAssignments.map(assignment => (
                    <AssignmentCard key={assignment.id} assignment={assignment} sectionType="overdue" />
                  ))}
                </div>
              </div>
            )}
            
            {/* Current Assignments Section */}
            {currentAssignments.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '16px',
                  backgroundColor: '#EBF8FF',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #4299E1'
                }}>
                  <span style={{ fontSize: '24px', marginRight: '12px' }}>📋</span>
                  <h3 style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: '#2B6CB0',
                    margin: 0 
                  }}>
                    Current Assignments ({currentAssignments.length})
                  </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {currentAssignments.map(assignment => (
                    <AssignmentCard key={assignment.id} assignment={assignment} sectionType="current" />
                  ))}
                </div>
              </div>
            )}
            
            {/* Completed Assignments Section */}
            {completedAssignments.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '16px',
                  backgroundColor: '#F0FFF4',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #48BB78'
                }}>
                  <span style={{ fontSize: '24px', marginRight: '12px' }}>✅</span>
                  <h3 style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: '#2F855A',
                    margin: 0 
                  }}>
                    Completed Assignments ({completedAssignments.length})
                  </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {completedAssignments.map(assignment => (
                    <AssignmentCard key={assignment.id} assignment={assignment} sectionType="completed" />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };
  
  const renderProgressTab = () => (
    <div style={{ marginTop: '24px' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '16px', color: colors.text }}>
        My Progress
      </h2>
      
      {attempts.length === 0 ? (
        <div style={{
          backgroundColor: colors.cardBg,
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>🌱</span>
          <p style={{ color: colors.textLight, fontSize: '18px' }}>
            You haven't played any games yet. Try one to see your progress!
          </p>
        </div>
      ) : (
        <div>
          {/* Summary stats section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              backgroundColor: colors.cardBg,
              padding: '16px',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.primary }}>
                {attempts.length}
              </div>
              <div style={{ color: colors.textLight }}>Games Played</div>
              {renderBadge(attempts.length)}
            </div>
            
            <div style={{
              backgroundColor: colors.cardBg,
              padding: '16px',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.primary }}>
                {assignments.filter(a => a.status === 'completed').length}
              </div>
              <div style={{ color: colors.textLight }}>Assignments Completed</div>
            </div>
            
            <div style={{
              backgroundColor: colors.cardBg,
              padding: '16px',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.primary }}>
                {highScores.length}
              </div>
              <div style={{ color: colors.textLight }}>High Scores</div>
            </div>
          </div>
          
          {/* Recent activity */}
          <h3 style={{ fontSize: '18px', marginBottom: '12px', color: colors.text }}>
            Recent Activity
          </h3>
          
          <div style={{
            backgroundColor: colors.cardBg,
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            {attempts.slice(0, 5).map((attempt, index) => (
              <div
                key={attempt.id}
                style={{
                  padding: '12px',
                  borderBottom: index < 4 ? '1px solid #E2E8F0' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', color: colors.text }}>
                    {attempt.assignmentId ? `Assignment #${attempt.assignmentId.substr(0, 5)}...` : 'Free Play'}
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textLight }}>
                    {attempt.timestamp?.toDate().toLocaleString() || 'Unknown date'}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', color: colors.primary }}>
                    {attempt.score !== undefined ? `${attempt.score} points` : 'Completed'}
                  </div>
                  {attempt.score !== undefined && renderStars(attempt.score)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
  
  const renderFreePlayTab = () => {
    // Get unique games from assignments for replay
    const assignedGames = assignments.reduce((acc, assignment) => {
      if (assignment.gameId && gameConfigs[assignment.gameId]) {
        const gameConfig = gameConfigs[assignment.gameId];
        // Use gameId as key to avoid duplicates
        acc[assignment.gameId] = {
          ...gameConfig,
          id: assignment.gameId,
          name: assignment.gameName,
          assignmentCount: (acc[assignment.gameId]?.assignmentCount || 0) + 1
        };
      }
      return acc;
    }, {} as {[key: string]: any});

    const assignedGamesList = Object.values(assignedGames);

    return (
      <div style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '24px', color: colors.text }}>
          Free Play
        </h2>
        
        {/* Previously Assigned Games Section */}
        {assignedGamesList.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '16px',
              backgroundColor: '#E6FFFA',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '2px solid #38B2AC'
            }}>
              <span style={{ fontSize: '24px', marginRight: '12px' }}>🎯</span>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: '#2C7A7B',
                margin: 0 
              }}>
                My Assigned Games ({assignedGamesList.length})
              </h3>
            </div>
            <p style={{ 
              color: colors.textLight, 
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              Practice with games you've been assigned. Perfect your skills anytime!
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {assignedGamesList.map(game => (
                <div 
                  key={game.id}
                  style={{
                    backgroundColor: colors.cardBg,
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                    border: '2px solid #38B2AC',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onClick={() => handlePlayGame(game.id)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  {/* Game thumbnail */}
                  <div style={{
                    height: '160px',
                    backgroundColor: '#E6FFFA',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '1px solid #38B2AC30'
                  }}>
                    {game.thumbnail ? (
                      <img 
                        src={game.thumbnail} 
                        alt={game.name}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          borderRadius: '12px'
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '48px',
                        color: '#38B2AC'
                      }}>
                        {game.type === 'whack-a-mole' ? '🔨' : 
                         game.type === 'sort-categories-egg' ? '🥚' : '🎮'}
                      </div>
                    )}
                  </div>
                  
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: colors.text }}>
                    {game.name || game.title}
                  </h3>
                  
                  <div style={{ fontSize: '14px', color: colors.textLight, marginBottom: '8px' }}>
                    Type: {game.type || game.gameType}
                  </div>
                  
                  <div style={{ fontSize: '14px', color: colors.textLight, marginBottom: '16px' }}>
                    Assigned {game.assignmentCount} time{game.assignmentCount > 1 ? 's' : ''}
                  </div>
                  
                  <div style={{ 
                    padding: '8px',
                    backgroundColor: '#38B2AC',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: 'white'
                  }}>
                    🎯 Practice Game
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Public Games Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '16px',
            backgroundColor: '#F0FFF4',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '2px solid #48BB78'
          }}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>🌟</span>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#2F855A',
              margin: 0 
            }}>
              Public Games ({freeGames.length})
            </h3>
          </div>
          
          {freeGames.length === 0 ? (
            <div style={{
              backgroundColor: colors.cardBg,
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>🎮</span>
              <p style={{ color: colors.textLight, fontSize: '18px' }}>
                No public games available right now. Check back later!
              </p>
            </div>
          ) : (
            <>
              <p style={{ 
                color: colors.textLight, 
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                Explore games shared by teachers for everyone to enjoy!
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {freeGames.map(game => (
                  <div 
                    key={game.id}
                    style={{
                      backgroundColor: colors.cardBg,
                      borderRadius: '16px',
                      padding: '16px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                      border: '2px solid #48BB78',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onClick={() => handlePlayGame(game.id)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                    }}
                  >
                    {/* Game thumbnail */}
                    <div style={{
                      height: '160px',
                      backgroundColor: '#F0FFF4',
                      borderRadius: '12px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '1px solid #48BB7830'
                    }}>
                      {game.thumbnail ? (
                        <img 
                          src={game.thumbnail} 
                          alt={game.name || game.title}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            borderRadius: '12px'
                          }}
                        />
                      ) : (
                        <div style={{
                          fontSize: '48px',
                          color: '#48BB78'
                        }}>
                          {game.type === 'whack-a-mole' ? '🔨' : 
                           game.type === 'sort-categories-egg' ? '🥚' : '🎮'}
                        </div>
                      )}
                    </div>
                    
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: colors.text }}>
                      {game.name || game.title}
                    </h3>
                    
                    <div style={{ fontSize: '14px', color: colors.textLight, marginBottom: '16px' }}>
                      Type: {game.type || game.gameType}
                    </div>
                    
                    <div style={{ 
                      padding: '8px',
                      backgroundColor: '#48BB78',
                      borderRadius: '8px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: 'white'
                    }}>
                      🌟 Play Free Game
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Show message if no games available at all */}
        {assignedGamesList.length === 0 && freeGames.length === 0 && (
          <div style={{
            backgroundColor: colors.cardBg,
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            <span style={{ fontSize: '64px', marginBottom: '16px', display: 'block' }}>🎮</span>
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: colors.text }}>
              No Games Available
            </h3>
            <p style={{ color: colors.textLight, fontSize: '16px' }}>
              You don't have any assigned games yet, and there are no public games available. 
              Check back later or ask your teacher about assignments!
            </p>
          </div>
        )}
      </div>
    );
  };
  
  const renderHighScoresTab = () => (
    <div style={{ marginTop: '24px' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '16px', color: colors.text }}>
        My High Scores
      </h2>
      
      {highScores.length === 0 ? (
        <div style={{
          backgroundColor: colors.cardBg,
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>🏆</span>
          <p style={{ color: colors.textLight, fontSize: '18px' }}>
            You haven't set any high scores yet. Play games to see your best scores here!
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: colors.cardBg,
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Game</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Score</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {highScores.map((score, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px', color: colors.text, fontWeight: 'bold' }}>
                    {score.gameName}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: colors.primary }}>{score.score}</div>
                    {renderStars(score.score)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: colors.textLight }}>
                    {score.date?.toDate?.() 
                      ? score.date.toDate().toLocaleDateString() 
                      : new Date(score.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
  
  // Handle back button for teacher view
  const handleBackToTeacherDashboard = () => {
    navigate('/teacher', { state: { activeTab: 'students' } });
  };
  
  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '32px 16px',
      backgroundColor: colors.background,
      minHeight: '100vh'
    }}>
      {/* Teacher view back button */}
      {isTeacherView && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleBackToTeacherDashboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              backgroundColor: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            <span style={{ marginRight: '8px', fontSize: '18px' }}>←</span>
            Back to Teacher Dashboard
          </button>
        </div>
      )}
      
      {/* Header with welcome message */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div style={{ marginRight: '16px', fontSize: '40px' }}>👋</div>
        <div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            marginBottom: '4px',
            color: colors.text
          }}>
            {isTeacherView 
              ? `Student: ${studentData?.name || 'Unknown Student'}`
              : `Hello, ${currentUserData?.name || currentUser?.displayName || 'Student'}!`
            }
          </h1>
          <p style={{ color: colors.textLight }}>
            {isTeacherView 
              ? `Teacher view of student dashboard${studentData?.grade ? ` - Grade ${studentData.grade}` : ''}`
              : 'Let\'s learn something new today!'
            }
          </p>
        </div>
      </div>
      
      {/* Tab navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '12px',
        overflowX: 'auto',
        padding: '8px 0'
      }}>
        {renderTabButton('assignments', 'My Assignments', '📚')}
        {renderTabButton('progress', 'My Progress', '📈')}
        {renderTabButton('freeplay', 'Free Play', '🎮')}
        {renderTabButton('highscores', 'High Scores', '🏆')}
      </div>
      
      {/* Loading state */}
      {isLoading ? (
        <div style={{ 
          padding: '48px', 
          textAlign: 'center',
          color: colors.textLight
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', display: 'inline-block' }}>
            🔄
          </div>
          <p>Loading your dashboard...</p>
        </div>
      ) : (
        <>
          {activeTab === 'assignments' && renderAssignmentsTab()}
          {activeTab === 'progress' && renderProgressTab()}
          {activeTab === 'freeplay' && renderFreePlayTab()}
          {activeTab === 'highscores' && renderHighScoresTab()}
        </>
      )}
    </div>
  );
};

export default StudentDashboard; 