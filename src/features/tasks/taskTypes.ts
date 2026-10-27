export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  color: string;
  email?: string;
  isManager?: boolean;
};

export type TeamGroup = {
  id: string;
  name: string;
  inviteCode: string;
  role: 'manager' | 'member';
};

export type Task = {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  createdAt: string;
  completionReport?: string | null;
};

export type NewTask = Omit<Task, 'id' | 'createdAt'>;
export type TaskUpdate = Pick<Task, 'status'> & { completionReport?: string | null };
