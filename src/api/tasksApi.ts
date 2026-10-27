import { NewTask, Task, TaskUpdate, TeamGroup, TeamMember } from '../features/tasks/taskTypes';
import { supabase, supabaseConfigured } from './supabaseClient';

const tasksStorageKey = 'teamflow.demo.tasks';
const membersStorageKey = 'teamflow.demo.members';

const demoMembers: TeamMember[] = [
  { id: 'member-linh', name: 'Nguyễn Khánh Linh', role: 'Trưởng nhóm', color: '#7658e8', isManager: true },
  { id: 'member-minh', name: 'Trần Quang Minh', role: 'Thiết kế', color: '#ec8e50' },
  { id: 'member-ha', name: 'Lê Thu Hà', role: 'Marketing', color: '#df6485' },
  { id: 'member-khoa', name: 'Phạm Đăng Khoa', role: 'Phát triển', color: '#398d83' },
  { id: 'member-an', name: 'Vũ Hoàng An', role: 'Nội dung', color: '#5182c9' },
];

type TaskRow = {
  id: string;
  title: string;
  description: string;
  assignee_id: string;
  status: Task['status'];
  priority: Task['priority'];
  due_date: string;
  created_at: string;
  completion_report: string | null;
  profiles?: { name: string } | { name: string }[] | null;
};

type ProfileRow = {
  id: string;
  name: string;
  role: string;
  color: string;
  email: string | null;
  is_manager: boolean;
};

type GroupMembershipRow = {
  group_id: string;
  role: TeamGroup['role'];
  groups: { id: string; name: string; invite_code: string } | { id: string; name: string; invite_code: string }[];
};

type GroupMemberRow = {
  user_id: string;
  role: TeamGroup['role'];
  profiles: Pick<ProfileRow, 'id' | 'name' | 'email' | 'color'> | Pick<ProfileRow, 'id' | 'name' | 'email' | 'color'>[];
};

function dayFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function localDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const demoTasks: Task[] = [
  {
    id: 'task-brand-guide',
    title: 'Chuẩn bị nội dung họp nhóm hôm nay',
    description: 'Tổng hợp việc cần ưu tiên và gửi cập nhật cho nhóm.',
    assigneeId: 'member-linh',
    assigneeName: 'Nguyễn Khánh Linh',
    status: 'todo',
    priority: 'high',
    dueDate: dayFromNow(0),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-campaign',
    title: 'Lên kế hoạch nội dung tháng 11',
    description: 'Lập lịch đăng bài cho các kênh Facebook và Instagram.',
    assigneeId: 'member-ha',
    assigneeName: 'Lê Thu Hà',
    status: 'todo',
    priority: 'medium',
    dueDate: dayFromNow(3),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-landing',
    title: 'Xây dựng landing page chiến dịch',
    description: 'Hoàn thiện giao diện trang đích theo bản thiết kế đã duyệt.',
    assigneeId: 'member-khoa',
    assigneeName: 'Phạm Đăng Khoa',
    status: 'in_progress',
    priority: 'high',
    dueDate: dayFromNow(4),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-customer-survey',
    title: 'Tổng hợp phản hồi khách hàng',
    description: 'Phân loại khảo sát tháng này và gửi báo cáo cho nhóm.',
    assigneeId: 'member-an',
    assigneeName: 'Vũ Hoàng An',
    status: 'done',
    priority: 'low',
    dueDate: dayFromNow(-1),
    createdAt: new Date().toISOString(),
  },
];

function readDemoData<T>(key: string, initialData: T): T {
  const stored = window.localStorage.getItem(key);
  return stored ? (JSON.parse(stored) as T) : initialData;
}

function saveDemoData<T>(key: string, data: T): void {
  window.localStorage.setItem(key, JSON.stringify(data));
}

function requireSupabase() {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase URL hoặc publishable key.');
  return supabase;
}

function mapTask(row: TaskRow): Task {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assigneeId: row.assignee_id,
    assigneeName: profile?.name || 'Chưa rõ người phụ trách',
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    completionReport: row.completion_report,
  };
}

function mapMember(row: ProfileRow): TeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    color: row.color,
    email: row.email || undefined,
    isManager: row.is_manager,
  };
}

function mapGroup(row: GroupMembershipRow): TeamGroup {
  const group = Array.isArray(row.groups) ? row.groups[0] : row.groups;
  if (!group) throw new Error('Không tìm thấy thông tin nhóm.');
  return { id: group.id, name: group.name, inviteCode: group.invite_code, role: row.role };
}

export async function listGroups(userId: string): Promise<TeamGroup[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await requireSupabase()
    .from('group_members')
    .select('group_id,role,groups(id,name,invite_code)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) {
    throw new Error(`Không thể tải danh sách nhóm: ${error.message}`);
  }
  return (data as GroupMembershipRow[]).map(mapGroup);
}

async function groupRpc(name: 'create_group' | 'join_group', args: Record<string, string>): Promise<TeamGroup> {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id || !row?.name || !row?.invite_code || !row?.role) {
    throw new Error('Supabase không trả về thông tin nhóm hợp lệ.');
  }
  return { id: row.id, name: row.name, inviteCode: row.invite_code, role: row.role };
}

export async function createGroup(name: string): Promise<TeamGroup> {
  if (!supabaseConfigured) throw new Error('Cần cấu hình Supabase để tạo nhóm.');
  return groupRpc('create_group', { p_name: name.trim() });
}

export async function joinGroup(inviteCode: string): Promise<TeamGroup> {
  if (!supabaseConfigured) throw new Error('Cần cấu hình Supabase để tham gia nhóm.');
  return groupRpc('join_group', { p_invite_code: inviteCode.trim().toUpperCase() });
}

export async function listTasks(groupId?: string): Promise<Task[]> {
  if (!supabaseConfigured) return readDemoData(tasksStorageKey, demoTasks);
  if (!groupId) return [];

  const { data, error } = await requireSupabase()
    .from('tasks')
    .select('id,title,description,assignee_id,status,priority,due_date,created_at,completion_report,profiles(name)')
    .eq('group_id', groupId)
    .order('due_date', { ascending: true });
  if (error) throw error;
  return (data as TaskRow[]).map(mapTask);
}

export async function listMembers(groupId?: string): Promise<TeamMember[]> {
  if (!supabaseConfigured) return readDemoData(membersStorageKey, demoMembers);
  if (!groupId) return [];

  const { data, error } = await requireSupabase()
    .from('group_members')
    .select('user_id,role,profiles(id,name,email,color)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as GroupMemberRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile) throw new Error('Không tìm thấy hồ sơ của thành viên trong nhóm.');
    return {
      ...mapMember({ ...profile, role: row.role === 'manager' ? 'Trưởng nhóm' : 'Thành viên', is_manager: row.role === 'manager' }),
      id: row.user_id,
      isManager: row.role === 'manager',
    };
  });
}

export async function createTask(task: NewTask, groupId?: string): Promise<Task> {
  if (!supabaseConfigured) {
    const tasks = readDemoData(tasksStorageKey, demoTasks);
    const member = readDemoData(membersStorageKey, demoMembers).find((item) => item.id === task.assigneeId);
    const created: Task = {
      ...task,
      assigneeName: member?.name ?? task.assigneeName,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    saveDemoData(tasksStorageKey, [created, ...tasks]);
    return created;
  }
  if (!groupId) throw new Error('Hãy chọn một nhóm trước khi giao việc.');

  const { data, error } = await requireSupabase()
    .from('tasks')
    .insert({
      title: task.title,
      description: task.description,
      group_id: groupId,
      assignee_id: task.assigneeId,
      status: task.status,
      priority: task.priority,
      due_date: task.dueDate,
    })
    .select('id,title,description,assignee_id,status,priority,due_date,created_at,completion_report,profiles(name)')
    .single();
  if (error) throw error;
  return mapTask(data as TaskRow);
}

export async function updateTask(id: string, update: TaskUpdate, groupId?: string): Promise<Task> {
  const completionReport = update.status === 'done'
    ? update.completionReport?.trim()
    : null;
  if (update.status === 'done' && !completionReport) {
    throw new Error('Vui lòng nhập chi tiết báo cáo trước khi hoàn thành.');
  }

  if (!supabaseConfigured) {
    const tasks = readDemoData(tasksStorageKey, demoTasks);
    const index = tasks.findIndex((task) => task.id === id);
    if (index < 0) throw new Error('Không tìm thấy công việc cần cập nhật.');
    tasks[index] = { ...tasks[index], status: update.status, completionReport };
    saveDemoData(tasksStorageKey, tasks);
    return tasks[index];
  }
  if (!groupId) throw new Error('Hãy chọn một nhóm trước khi cập nhật công việc.');

  const { data, error } = await requireSupabase()
    .from('tasks')
    .update({
      status: update.status,
      completion_report: completionReport,
    })
    .eq('id', id)
    .eq('group_id', groupId)
    .select('id,title,description,assignee_id,status,priority,due_date,created_at,completion_report,profiles(name)')
    .single();
  if (error) throw error;
  return mapTask(data as TaskRow);
}
