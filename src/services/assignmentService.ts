import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Assignment, Attempt } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Get all assignments for a specific teacher
export const getTeacherAssignments = async (teacherId: string, teacherEmail?: string): Promise<Assignment[]> => {
  try {
    const assignmentsRef = collection(db, 'assignments');
    const q = query(assignmentsRef, where('teacherId', '==', teacherId));
    
    const querySnapshot = await getDocs(q);
    
    const assignments: Assignment[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      assignments.push({
        id: doc.id,
        ...data,
      } as Assignment);
    });
    
    // Also query by teacherEmail for legacy assignments (created before teacherId field was added)
    if (teacherEmail) {
      const emailQuery = query(assignmentsRef, where('teacherEmail', '==', teacherEmail));
      const emailSnapshot = await getDocs(emailQuery);
      
      // Only add assignments that aren't already in the list (avoid duplicates)
      const existingIds = new Set(assignments.map(a => a.id));
      emailSnapshot.forEach((doc) => {
        if (!existingIds.has(doc.id)) {
          const data = doc.data();
          assignments.push({
            id: doc.id,
            ...data,
          } as Assignment);
        }
      });
    }
    
    return assignments;
  } catch (error) {
    console.error('Error getting teacher assignments:', error);
    throw error;
  }
};

// Mark assignment email as sent
export const markAssignmentEmailAsSent = async (assignmentId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'assignments', assignmentId);
    await updateDoc(docRef, { emailSent: true });
  } catch (error) {
    console.error('Error marking assignment email as sent:', error);
    throw error;
  }
};

// Create a new assignment
export const createAssignment = async (assignmentData: Omit<Assignment, 'id' | 'linkToken' | 'status' | 'completedCount' | 'createdAt'>): Promise<string> => {
  try {
    // Generate a unique link token for the assignment
    const linkToken = uuidv4();
    
    // Prepare complete assignment data
    const completeAssignmentData = {
      ...assignmentData,
      linkToken,
      status: 'assigned',
      completedCount: 0,
      createdAt: Timestamp.now(),
      // Flag to track if email is sent - this will be used by the Cloud Function
      emailSent: false
    };
    
    // Create assignment document in Firestore
    const docRef = await addDoc(collection(db, 'assignments'), completeAssignmentData);
    
    console.log('Assignment created with ID:', docRef.id);
    console.log('Email will be sent automatically via Firebase Cloud Functions');
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
};

// Update an existing assignment
export const updateAssignment = async (assignmentId: string, updatedData: Partial<Assignment>): Promise<void> => {
  try {
    const docRef = doc(db, 'assignments', assignmentId);
    await updateDoc(docRef, updatedData);
  } catch (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }
};

// Delete an assignment
export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'assignments', assignmentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting assignment:', error);
    throw error;
  }
};

// Get all attempts for a specific assignment
export const getAssignmentAttempts = async (assignmentId: string): Promise<Attempt[]> => {
  try {
    const attemptsRef = collection(db, 'attempts');
    const q = query(attemptsRef, where('assignmentId', '==', assignmentId));
    
    const querySnapshot = await getDocs(q);
    
    const attempts: Attempt[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      attempts.push({
        id: doc.id,
        ...data,
      } as Attempt);
    });
    
    return attempts;
  } catch (error) {
    console.error('Error getting assignment attempts:', error);
    throw error;
  }
};

// Create a new attempt
export const createAttempt = async (assignmentId: string, attemptData: {
  duration: number;
  score?: number;
  results?: any;
  studentEmail: string;
  studentName: string;
}): Promise<string> => {
  try {
    // Validate inputs to ensure we don't send invalid data to Firestore
    if (!assignmentId) {
      throw new Error("Missing assignmentId parameter");
    }
    
    // Ensure we have valid values for all fields or provide defaults
    const validatedData = {
      assignmentId,
      studentEmail: attemptData.studentEmail || "unknown@email.com",
      studentName: attemptData.studentName || "Unknown Student",
      duration: typeof attemptData.duration === 'number' ? attemptData.duration : 0,
      // Ensure score is a valid number or null (not undefined)
      score: typeof attemptData.score === 'number' && !isNaN(attemptData.score) ? attemptData.score : null,
      // Ensure results is a valid object (not undefined)
      results: attemptData.results || null,
      timestamp: Timestamp.now(),
    };
    
    console.log("Creating attempt with validated data:", validatedData);
    
    const docRef = await addDoc(collection(db, 'attempts'), validatedData);
    console.log("Successfully created attempt with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating attempt:', error);
    // Rethrow the error for handling upstream
    throw error;
  }
};

// Get assignment by token
export const getAssignmentByToken = async (token: string): Promise<Assignment | null> => {
  if (!token) {
    console.error("getAssignmentByToken: Missing token parameter");
    return null;
  }

  try {
    console.log(`getAssignmentByToken: Searching for assignment with token: ${token}`);
    const assignmentsRef = collection(db, 'assignments');
    const q = query(assignmentsRef, where('linkToken', '==', token));
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.warn(`getAssignmentByToken: No assignment found with token: ${token}`);
      return null;
    }
    
    // There should only be one assignment with this token
    const doc = querySnapshot.docs[0];
    console.log(`getAssignmentByToken: Found assignment with ID: ${doc.id}`);
    
    return {
      id: doc.id,
      ...doc.data(),
    } as Assignment;
  } catch (error) {
    console.error(`getAssignmentByToken: Error searching for token ${token}:`, error);
    throw error;
  }
};

// Create a new assignment with passwordless authentication 
export const createAssignmentWithEmailLink = async (assignmentData: Omit<Assignment, 'id' | 'linkToken' | 'status' | 'completedCount' | 'createdAt'>): Promise<string> => {
  try {
    // Generate a unique link token for the assignment
    const linkToken = uuidv4();
    
    // Prepare complete assignment data
    const completeAssignmentData = {
      ...assignmentData,
      linkToken,
      status: 'assigned',
      completedCount: 0,
      createdAt: Timestamp.now(),
      // Flag to track if email is sent
      emailSent: false,
      // Flag to indicate this assignment should use email link authentication
      useEmailLinkAuth: true
    };
    
    // Create assignment document in Firestore
    const docRef = await addDoc(collection(db, 'assignments'), completeAssignmentData);
    
    console.log('Assignment with email link auth created with ID:', docRef.id);
    console.log('Email will be sent automatically via Firebase Cloud Functions');
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating assignment with email link auth:', error);
    throw error;
  }
};

// Get all assignments for a specific teacher with folder information
export const getTeacherAssignmentsWithFolders = async (teacherId: string, teacherEmail?: string): Promise<Assignment[]> => {
  try {
    // First get all assignments for the teacher
    const assignmentsRef = collection(db, 'assignments');
    const assignmentsQuery = query(assignmentsRef, where('teacherId', '==', teacherId));
    const assignmentsSnapshot = await getDocs(assignmentsQuery);
    
    const assignments: Assignment[] = [];
    assignmentsSnapshot.forEach((doc) => {
      const data = doc.data();
      assignments.push({
        id: doc.id,
        ...data,
      } as Assignment);
    });

    // Also query by teacherEmail for legacy assignments (created before teacherId field was added)
    let emailCount = 0;
    if (teacherEmail) {
      const emailQuery = query(assignmentsRef, where('teacherEmail', '==', teacherEmail));
      const emailSnapshot = await getDocs(emailQuery);
      emailCount = emailSnapshot.size;
      
      // Only add assignments that aren't already in the list (avoid duplicates)
      const existingIds = new Set(assignments.map(a => a.id));
      emailSnapshot.forEach((doc) => {
        if (!existingIds.has(doc.id)) {
          const data = doc.data();
          assignments.push({
            id: doc.id,
            ...data,
          } as Assignment);
        }
      });
    }

    // Then get all folder assignments for this teacher
    const folderAssignmentsRef = collection(db, 'assignmentFolderAssignments');
    const folderAssignmentsQuery = query(folderAssignmentsRef, where('userId', '==', teacherId));
    const folderAssignmentsSnapshot = await getDocs(folderAssignmentsQuery);
    
    // Create a map of assignmentId -> folderId
    const assignmentToFolderMap = new Map<string, string>();
    folderAssignmentsSnapshot.forEach((doc) => {
      const data = doc.data();
      assignmentToFolderMap.set(data.assignmentId, data.folderId);
    });

    // Enrich assignments with folder information
    const enrichedAssignments = assignments.map(assignment => ({
      ...assignment,
      folderId: assignmentToFolderMap.get(assignment.id || '') || undefined
    }));

    console.log('Loaded assignments with folder info:', {
      totalAssignments: enrichedAssignments.length,
      byTeacherId: assignmentsSnapshot.size,
      byTeacherEmail: emailCount,
      assignmentsInFolders: enrichedAssignments.filter(a => a.folderId).length,
      unorganizedAssignments: enrichedAssignments.filter(a => !a.folderId).length
    });

    return enrichedAssignments;
  } catch (error) {
    console.error('Error getting teacher assignments with folders:', error);
    throw error;
  }
}; 