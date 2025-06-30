import { Timestamp } from 'firebase/firestore';
import { GameWithFolder } from '../../types/game';
import { Assignment as AssignmentType } from '../../types';

// Re-export GameWithFolder for use in this module
export type { GameWithFolder };

// Extended Assignment interface with folder properties
export interface AssignmentWithFolder extends AssignmentType {
  folderId?: string;
  folderName?: string;
  folderColor?: string;
}

// Assignment folder structure (similar to GameFolder)
export interface AssignmentFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  userId: string;
  parentId?: string | null;
  depth: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Game extends GameWithFolder {
  id: string;
  title: string;
  description?: string;
  gameType?: string;
  thumbnailUrl?: string;
  createdBy: string;
  share: boolean;
  userId: string;
  // Folder properties from GameWithFolder
  folderId?: string;
  folderName?: string;
  folderColor?: string;
}

export interface GameTemplate {
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

export interface Student {
  id: string;
  name: string;
  email: string;
  grade?: string;
  age?: number;
  notes?: string;
  createdAt: Timestamp;
  passwordSetupSent?: boolean;
}

export type TabType = 'assignments' | 'create' | 'students';

export type Assignment = AssignmentType;

export interface ToastOptions {
  title: string;
  description?: string;
  status: 'success' | 'error' | 'info' | 'warning';
  duration: number;
} 