
export type UserRole = 'customer' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  joinedAt?: string;
  bookCount?: number;
  isApproved?: boolean; // New field for account approval status
}

export interface Comment {
  id: string;
  pageId: string;
  userId: string;
  userName: string;
  text: string;
  audioUrl?: string; // URL to the recorded audio blob
  selectedText?: string; // Text highlighted when comment was made
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface Page {
  id: string;
  chapterId: string;
  number: string; // e.g., "1.1"
  title: string;
  content: string;
  comments: Comment[];
}

export interface Chapter {
  id: string;
  bookId: string;
  number: number;
  title: string;
  pages: Page[];
}

export type BookStatus = 'draft' | 'pending_approval' | 'published' | 'rejected';

export interface ActivityEntry {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  userId: string;
}

export interface Book {
  id: string;
  userId: string;
  authorName: string;
  title: string;
  description: string;
  coverUrl?: string;
  status: BookStatus;
  chapters: Chapter[];
  updatedAt: string;
  timeSpentSeconds: number; // Total time spent editing in seconds
  activityLog: ActivityEntry[]; // History of changes
}

export interface AISessionResponse {
  text: string;
  usage?: number;
}