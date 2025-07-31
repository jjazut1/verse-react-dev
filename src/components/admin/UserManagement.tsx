import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Select,
  IconButton,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  Text,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Badge,
  Tooltip,
} from '@chakra-ui/react';
import { DeleteIcon, EditIcon, AddIcon, InfoIcon } from '@chakra-ui/icons';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  setDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string | null;
  authUid?: string;
  linkedToAuth?: boolean;
  status?: string;
}

const UserManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newName, setNewName] = useState('');
  const toast = useToast();

  // Reset form when modal closes
  const resetAddUserForm = () => {
    setNewEmail('');
    setNewRole('user');
    setNewName('');
    setIsAddModalOpen(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersCollection = collection(db, 'users');
      const userSnapshot = await getDocs(usersCollection);
      const usersList = userSnapshot.docs.map(doc => {
        const data = doc.data();
        // Determine account status
        let status = 'Pending';
        if (data.authUid || data.linkedToAuth || data.lastLogin) {
          status = 'Active';
        }
        
        return {
          id: doc.id,
          ...data,
          role: data.role || 'user',
          status
        };
      }) as User[];
      
      setUsers(usersList);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role || 'user');
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const saveUserEdit = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      
      setUsers(users.map(user => 
        user.id === selectedUser.id ? { ...user, role: newRole } : user
      ));
      
      toast({
        title: 'User updated',
        description: `${selectedUser.email}'s role has been changed to ${newRole}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error updating user:', err);
      toast({
        title: 'Error',
        description: 'Failed to update user. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      setIsEditModalOpen(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await deleteDoc(userRef);
      
      setUsers(users.filter(user => user.id !== selectedUser.id));
      
      toast({
        title: 'User deleted',
        description: `${selectedUser.email} has been removed`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error deleting user:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete user. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleAddUser = async () => {
    if (!newEmail || !newRole) {
      toast({
        title: 'Missing information',
        description: 'Please provide email and role',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    // Require name for students to ensure proper password setup emails
    if (newRole === 'student' && !newName.trim()) {
      toast({
        title: 'Student name required',
        description: 'Please provide a name for the student',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if user already exists with this email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', newEmail));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        toast({
          title: 'User already exists',
          description: 'A user with this email already exists',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setIsLoading(false);
        return;
      }
      
      // Generate a document ID that will be used as the uid field
      // This will mimic a Firebase Auth UID
      const newId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Create new user document with proper fields that match auth structure
      const newUser = {
        email: newEmail,
        role: newRole,
        userId: newId, // Include userId field that matches the document ID
        // For students, use the provided name; for others, generate from email
        name: newRole === 'student' && newName.trim() ? newName.trim() : undefined,
        displayName: newRole === 'student' && newName.trim() ? newName.trim() : newEmail.split('@')[0],
        // For students, assign to the admin (assuming admin is also a teacher)
        ...(newRole === 'student' && currentUser ? { 
          teacherId: currentUser.uid,
          teacherEmail: currentUser.email 
        } : {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null,
        // These fields help make it compatible with the auth system's expectations
        emailVerified: false,
        disabled: false,
        status: 'Pending'
      };
      
      // Add to users collection using the generated ID
      await setDoc(doc(db, 'users', newId), newUser);
      
      // Add to our local state
      setUsers([...users, { id: newId, ...newUser }]);
      
      const successMessage = newRole === 'student' 
        ? `${newName} (${newEmail}) has been added as a student. They will receive a password setup email automatically.`
        : `${newEmail} has been added with role: ${newRole}. They will need to sign in to activate their account.`;
      
      toast({
        title: 'User added successfully',
        description: successMessage,
        status: 'success',
        duration: 7000,
        isClosable: true,
      });
      
      // Reset form and close modal
      resetAddUserForm();
    } catch (err) {
      console.error('Error adding user:', err);
      toast({
        title: 'Error',
        description: 'Failed to add user. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      setIsAddModalOpen(false);
    }
  };

  const refreshUsers = () => {
    fetchUsers();
    toast({
      title: 'Refreshed',
      description: 'User list has been refreshed',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: { bg: '#FED7D7', color: '#C53030', text: 'ADMIN' },
      teacher: { bg: '#C6F6D5', color: '#2F855A', text: 'TEACHER' },
      student: { bg: '#BEE3F8', color: '#2C5282', text: 'STUDENT' },
    };
    
    const config = colors[role as keyof typeof colors] || { bg: '#F7FAFC', color: '#4A5568', text: role.toUpperCase() };
    
    return (
      <span style={{
        backgroundColor: config.bg,
        color: config.color,
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {config.text}
      </span>
    );
  };
  
  const getStatusBadge = (status: string) => {
    const colors = {
      active: { bg: '#C6F6D5', color: '#2F855A' },
      pending: { bg: '#FEEBC8', color: '#C05621' },
      disabled: { bg: '#FED7D7', color: '#C53030' },
    };
    
    const config = colors[status as keyof typeof colors] || { bg: '#F7FAFC', color: '#4A5568' };
    
    return (
      <span style={{
        backgroundColor: config.bg,
        color: config.color,
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {status.toUpperCase()}
      </span>
    );
  };

  // Add function to format dates safely
  const formatDate = (dateValue: any): string => {
    // Handle null, undefined, and empty values first
    if (dateValue === null || dateValue === undefined) {
      return 'N/A';
    }
    
    // Handle empty strings
    if (typeof dateValue === 'string' && dateValue.trim() === '') {
      return 'N/A';
    }
    
    try {
      let date: Date;
      
      // Handle Firestore Timestamp objects
      if (dateValue && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
      }
      // Handle ISO string dates
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      }
      // Handle Date objects
      else if (dateValue instanceof Date) {
        date = dateValue;
      }
      // Handle epoch timestamps
      else if (typeof dateValue === 'number') {
        date = new Date(dateValue);
      }
      else {
        console.log('Unhandled date value type:', typeof dateValue, dateValue);
        return 'Invalid Date';
      }
      
      // Check if the resulting date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error, dateValue);
      return 'Invalid Date';
    }
  };

  // Add function to fix user dates
  const fixUserDates = async () => {
    try {
      setIsLoading(true);
      
      let fixedCount = 0;
      
      for (const user of users) {
        const dateStatus = formatDate(user.createdAt);
        
        // More comprehensive check for invalid dates
        const needsFix = !user.createdAt || 
                        user.createdAt === null || 
                        user.createdAt === undefined ||
                        (typeof user.createdAt === 'string' && user.createdAt.trim() === '') ||
                        dateStatus === 'Invalid Date' || 
                        dateStatus === 'N/A';
        
        if (needsFix) {
          // Set a reasonable created date - use current date if we have no other info
          const now = new Date().toISOString();
          
          await updateDoc(doc(db, 'users', user.id), {
            createdAt: now,
            updatedAt: now
          });
          
          fixedCount++;
        }
      }
      
      // Refresh the user list
      await fetchUsers();
      
      if (fixedCount > 0) {
        toast({
          title: 'Dates fixed',
          description: `Fixed creation dates for ${fixedCount} user(s)`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'No fixes needed',
          description: 'All users already have valid creation dates',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error fixing user dates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix user dates',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to fix a specific user's date
  const fixSingleUserDate = async (user: User) => {
    try {
      const now = new Date().toISOString();
      
      await updateDoc(doc(db, 'users', user.id), {
        createdAt: now,
        updatedAt: now
      });
      
      // Refresh the user list
      await fetchUsers();
      
      toast({
        title: 'User date fixed',
        description: `Fixed creation date for ${user.email}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error fixing single user date:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix user date',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box>
      <HStack justifyContent="space-between" mb={4}>
        <Heading size="md">User Management</Heading>
        <HStack>
          <Button 
            leftIcon={<AddIcon />} 
            colorScheme="green" 
            size="sm" 
            onClick={() => setIsAddModalOpen(true)}
          >
            Add User
          </Button>
          <Button 
            colorScheme="blue" 
            size="sm" 
            onClick={refreshUsers} 
            isDisabled={isLoading}
          >
            Refresh
          </Button>
          <Button 
            colorScheme="orange" 
            size="sm" 
            onClick={fixUserDates} 
            isDisabled={isLoading}
          >
            Fix Dates
          </Button>
        </HStack>
      </HStack>
      
      <Box mb={4} p={4} borderWidth="1px" borderRadius="md" bg="blue.50">
        <HStack>
          <InfoIcon color="blue.500" />
          <Text fontSize="sm">
            Users added through this admin interface need to sign in to fully activate their accounts. 
            Their account status will change from "Pending" to "Active" after they sign in for the first time.
          </Text>
        </HStack>
      </Box>

      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      {isLoading ? (
        <Box textAlign="center" py={10}>
          <Spinner size="xl" />
          <Text mt={4}>Loading users...</Text>
        </Box>
      ) : (
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.length === 0 ? (
              <Tr>
                <Td colSpan={5} textAlign="center">No users found</Td>
              </Tr>
            ) : (
              users.map(user => (
                <Tr key={user.id}>
                  <Td>{user.email}</Td>
                  <Td>{getRoleBadge(user.role || 'user')}</Td>
                  <Td>
                    <Tooltip 
                      label={user.status === 'Pending' 
                        ? "User needs to sign in to activate their account" 
                        : "User has signed in and account is active"}
                    >
                      {getStatusBadge(user.status || 'active')}
                    </Tooltip>
                  </Td>
                  <Td>{formatDate(user.createdAt)}</Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="Edit user"
                        icon={<EditIcon />}
                        size="sm"
                        colorScheme="blue"
                        onClick={() => handleEditUser(user)}
                      />
                      <IconButton
                        aria-label="Delete user"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDeleteUser(user)}
                      />
                      {(formatDate(user.createdAt) === 'Invalid Date' || formatDate(user.createdAt) === 'N/A') && (
                        <IconButton
                          aria-label="Fix date"
                          icon={<Text fontSize="xs">📅</Text>}
                          size="sm"
                          colorScheme="orange"
                          onClick={() => fixSingleUserDate(user)}
                          title="Fix creation date"
                        />
                      )}
                    </HStack>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      )}

      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Email</FormLabel>
              <Input value={selectedUser?.email || ''} isReadOnly />
            </FormControl>
            <FormControl>
              <FormLabel>Role</FormLabel>
              <Select 
                value={newRole} 
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="teacher">Teacher (can create assignments)</option>
                <option value="admin">Admin (includes teacher privileges)</option>
              </Select>
              <Text fontSize="sm" color="gray.600" mt={2}>
                Roles are hierarchical: admins have all teacher privileges, plus admin capabilities.
              </Text>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={saveUserEdit} isLoading={isLoading}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={resetAddUserForm}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="info" mb={4}>
              <AlertIcon />
              <Box fontSize="sm">
                <Text>Users added here must sign in to activate their account.</Text>
                <Text mt={1}>If using Google Auth, they should use the same email address.</Text>
              </Box>
            </Alert>
            
            <FormControl mb={4}>
              <FormLabel>Email</FormLabel>
              <Input 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Role</FormLabel>
              <Select 
                value={newRole} 
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher (can create assignments)</option>
                <option value="admin">Admin (includes teacher privileges)</option>
              </Select>
              <Text fontSize="sm" color="gray.600" mt={2}>
                Roles are hierarchical: admins have all teacher privileges, plus admin capabilities.
              </Text>
            </FormControl>
            
            {newRole === 'student' && (
              <FormControl mb={4}>
                <FormLabel>Student Name <Text as="span" color="red.500">*</Text></FormLabel>
                <Input 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter student's full name"
                />
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Required for students to receive proper welcome emails with their name.
                </Text>
              </FormControl>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={resetAddUserForm}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleAddUser} isLoading={isLoading}>
              Add User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Delete</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            Are you sure you want to delete user <strong>{selectedUser?.email}</strong>?
            This action cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={confirmDeleteUser} isLoading={isLoading}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default UserManagement; 