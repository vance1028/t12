export interface User {
  id: number;
  username: string;
  email?: string;
  role: 'ADMIN' | 'TESTER';
  testGroups?: TestGroup[];
}

export interface TestGroup {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface Build {
  id: number;
  version: string;
  platform: 'WINDOWS' | 'MACOS' | 'LINUX' | 'ANDROID' | 'IOS';
  changelog: string;
  isForceUpdate: boolean;
  filePath: string;
  fileName: string;
  fileSize: number;
  uploadedBy: number;
  uploadedAt: string;
  testGroups?: { testGroup: TestGroup }[];
  _count?: { downloads: number };
}

export interface Feedback {
  id: number;
  type: 'BUG' | 'BALANCE' | 'SUGGESTION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'NEW' | 'CONFIRMED' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'CLOSED';
  title: string;
  description: string;
  levelScene?: string;
  buildId?: number;
  authorId: number;
  createdAt: string;
  updatedAt: string;
  verifiedBuildId?: number;
  tags: string[];
  author?: { id: number; username: string };
  build?: { id: number; version: string; platform?: string };
  verifiedBuild?: { id: number; version: string };
  attachments?: FeedbackAttachment[];
  statusHistory?: FeedbackStatusHistory[];
}

export interface FeedbackAttachment {
  id: number;
  feedbackId: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface FeedbackStatusHistory {
  id: number;
  feedbackId: number;
  oldStatus?: string;
  newStatus: string;
  changedBy?: number;
  changedAt: string;
  comment?: string;
}

export interface StatsOverview {
  totalFeedbacks: number;
  weeklyNewFeedbacks: number;
  totalBuilds: number;
  totalTesters: number;
  severityDistribution: { severity: string; _count: number }[];
  typeDistribution: { type: string; _count: number }[];
  statusDistribution: { status: string; _count: number }[];
}

export interface BuildStats {
  id: number;
  version: string;
  platform: string;
  feedbackCount: number;
  downloadCount: number;
  feedbackDensity: number;
}

export interface WeeklyTrend {
  date: string;
  newFeedbacks: number;
  closedFeedbacks: number;
  downloads: number;
}
