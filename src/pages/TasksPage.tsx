import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppUser } from '../api/supabaseAuth';
import { supabaseConfigured } from '../api/supabaseClient';
import { createGroup, createTask, joinGroup, listGroups, listMembers, listTasks, updateTask } from '../api/tasksApi';
import { Icon } from '../components/Icon';
import {
  AccountModal,
  CompletionReportModal,
  GroupModal,
  InviteCodeModal,
  MembersModal,
  TaskModal,
} from '../features/tasks/TaskDialogs';
import { TaskRow } from '../features/tasks/TaskRow';
import { NewTask, Task, TaskStatus, TeamGroup, TeamMember } from '../features/tasks/taskTypes';
import './TasksPage.css';

type Props = {
  user: AppUser | null;
  onSignOut?: () => void;
};

type ViewFilter = 'all' | TaskStatus;

const taskFilters: Array<[ViewFilter, string]> = [
  ['all', 'Tất cả'],
  ['todo', 'Chưa bắt đầu'],
  ['in_progress', 'Đang thực hiện'],
  ['done', 'Đã hoàn thành'],
];

export function TasksPage({ user, onSignOut }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [filter, setFilter] = useState<ViewFilter>('all');
  const [search, setSearch] = useState('');
  const [sortAscending, setSortAscending] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState<'create' | 'join' | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [completionTask, setCompletionTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const currentGroup = groups.find((group) => group.id === selectedGroupId);
  const currentMember = members.find((member) => user
    ? member.id === user.id
    : member.role === 'Trưởng nhóm');
  const isManager = supabaseConfigured ? currentGroup?.role === 'manager' : true;

  useEffect(() => {
    if (!user || !supabaseConfigured) return;
    let active = true;
    listGroups(user.id)
      .then((nextGroups) => {
        if (!active) return;
        setGroups(nextGroups);
        const savedGroupId = window.localStorage.getItem(`teamflow.active-group.${user.id}`);
        setSelectedGroupId((current) => {
          if (nextGroups.some((group) => group.id === current)) return current;
          if (savedGroupId && nextGroups.some((group) => group.id === savedGroupId)) return savedGroupId;
          return nextGroups[0]?.id || '';
        });
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Không thể tải danh sách nhóm.');
      });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (user && selectedGroupId) {
      window.localStorage.setItem(`teamflow.active-group.${user.id}`, selectedGroupId);
    }
  }, [selectedGroupId, user]);

  const loadData = useCallback(async () => {
    if (supabaseConfigured && !selectedGroupId) {
      setTasks([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [nextTasks, nextMembers] = await Promise.all([
        listTasks(selectedGroupId || undefined),
        listMembers(selectedGroupId || undefined),
      ]);
      setTasks(nextTasks);
      setMembers(nextMembers);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải dữ liệu nhóm.');
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return tasks
      .filter((task) => filter === 'all' || task.status === filter)
      .filter((task) => !query || `${task.title} ${task.description} ${task.assigneeName}`.toLocaleLowerCase('vi').includes(query))
      .sort((a, b) => {
        const completionOrder = Number(a.status === 'done') - Number(b.status === 'done');
        return completionOrder || (sortAscending ? 1 : -1) * a.dueDate.localeCompare(b.dueDate);
      });
  }, [filter, search, sortAscending, tasks]);

  const myTasks = useMemo(() => tasks
    .filter((task) => task.assigneeId === currentMember?.id)
    .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || a.title.localeCompare(b.title, 'vi')),
  [currentMember, tasks]);

  const taskCounts = useMemo(() => {
    const counts: Record<ViewFilter, number> = {
      all: tasks.length,
      todo: 0,
      in_progress: 0,
      done: 0,
    };
    tasks.forEach((task) => { counts[task.status] += 1; });
    return counts;
  }, [tasks]);

  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  async function handleCreateTask(task: NewTask) {
    try {
      const created = await createTask(task, selectedGroupId || undefined);
      setTasks((current) => [created, ...current]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể giao công việc.');
      throw caught;
    }
  }

  async function handleUpdateStatus(task: Task, status: TaskStatus, completionReport?: string): Promise<boolean> {
    setSavingTaskId(task.id);
    setError('');
    try {
      const updated = await updateTask(task.id, { status, completionReport }, selectedGroupId || undefined);
      setTasks((current) => current.map((item) => item.id === task.id ? updated : item));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật trạng thái.');
      return false;
    } finally {
      setSavingTaskId(null);
    }
  }

  function requestStatusChange(task: Task, status: TaskStatus) {
    if (status === 'done' && task.status !== 'done') {
      setCompletionTask(task);
      setError('');
      return;
    }
    void handleUpdateStatus(task, status);
  }

  async function handleCompletionReport(report: string): Promise<boolean> {
    if (!completionTask) return false;
    const saved = await handleUpdateStatus(completionTask, 'done', report);
    if (saved) setCompletionTask(null);
    return saved;
  }

  async function handleGroupAction(value: string) {
    const group = groupModalMode === 'create'
      ? await createGroup(value)
      : await joinGroup(value);
    setGroups((current) => [group, ...current.filter((item) => item.id !== group.id)]);
    setSelectedGroupId(group.id);
    setTasks([]);
    setMembers([]);
    setFilter('all');
  }

  const canUpdateTask = (task: Task) => !supabaseConfigured
    || Boolean(user && (user.id === task.assigneeId || currentMember?.isManager));

  return (
    <div className="app-shell">
      <main className="main-content">
        <div className="page-content">
          <section className="welcome-row">
            {user && supabaseConfigured && (
              <div className="welcome-actions group-switcher">
                <div className="header-action-row group-management-row" aria-label="Thao tác tài khoản và nhóm">
                  <button className="outline-button header-action" onClick={() => setGroupModalMode('create')}><Icon name="plus" />Tạo nhóm</button>
                  <button className="outline-button header-action" onClick={() => setGroupModalMode('join')}><Icon name="key" />Tham gia nhóm</button>
                  {onSignOut && <button className="header-signout header-action" onClick={() => setShowAccountModal(true)}><Icon name="user" />QLTK</button>}
                  {onSignOut && <button className="header-signout header-action" onClick={onSignOut}><Icon name="logout" />Đăng xuất</button>}
                </div>
                <div className="header-action-row group-actions-row" aria-label="Thao tác trong nhóm">
                  {groups.length > 0 && (
                    <label className="group-select-label">
                      <select
                        className="header-action"
                        aria-label="Danh sách nhóm"
                        value={selectedGroupId}
                        onChange={(event) => {
                          setSelectedGroupId(event.target.value);
                          setTasks([]);
                          setMembers([]);
                          setFilter('all');
                        }}
                      >
                        {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                      </select>
                    </label>
                  )}
                  {currentGroup && <button className="outline-button header-action" onClick={() => setShowInviteModal(true)}><Icon name="invite" />Mã mời</button>}
                  {currentGroup && <button className="outline-button header-action" onClick={() => setShowMembersModal(true)}><Icon name="team" />Thành viên</button>}
                  {isManager && currentGroup && <button className="primary-button create-button header-action" onClick={() => setShowTaskModal(true)} disabled={!members.length}>
                    <Icon name="plus" />Giao việc mới
                  </button>}
                </div>
              </div>
            )}
          </section>

          {supabaseConfigured && !groups.length && (
            <div className="demo-banner"><span className="demo-dot" /><span><strong>Bạn chưa có nhóm</strong> · Tạo nhóm mới hoặc nhập mã mời để bắt đầu.</span></div>
          )}
          {!supabaseConfigured && (
            <div className="demo-banner"><span className="demo-dot" /><span><strong>Đang dùng dữ liệu mẫu</strong> · Thông tin chỉ lưu trên trình duyệt này, chưa chia sẻ với nhóm.</span></div>
          )}
          {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => void loadData()}>Thử lại</button><button onClick={() => setError('')} aria-label="Đóng thông báo">×</button></div>}

          <section className="today-section today-card" aria-label="Việc của tôi">
            <h2>Việc của tôi</h2>
            <div className="today-list">
              {loading ? (
                <div className="today-empty" role="status"><span className="loading-spinner" />Đang tải công việc...</div>
              ) : myTasks.length ? myTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  assignee={membersById.get(task.assigneeId)}
                  isSaving={savingTaskId === task.id}
                  canUpdateStatus={canUpdateTask(task)}
                  onStatusChange={requestStatusChange}
                />
              )) : <div className="today-empty">Chưa có công việc</div>}
            </div>
          </section>

          <section className="tasks-section">
            <div className="section-heading">
              <h2>Danh sách công việc</h2>
              <label className="search-box">
                <Icon name="search" size={20} />
                <input aria-label="Tìm công việc" placeholder="Tìm tên việc hoặc người phụ trách" value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
            </div>
            <div className="task-toolbar">
              <div className="filter-tabs" role="tablist" aria-label="Lọc danh sách công việc">
                {taskFilters.map(([key, label]) => (
                  <button key={key} role="tab" aria-selected={filter === key} className={filter === key ? 'selected' : ''} onClick={() => setFilter(key)}>
                    {label}<span>{taskCounts[key]}</span>
                  </button>
                ))}
              </div>
              <button className="sort-button" onClick={() => setSortAscending((current) => !current)}><Icon name="calendar" size={18} /><span>{sortAscending ? 'Hạn gần trước' : 'Hạn xa trước'}</span></button>
            </div>
            <div className="task-list">
              <div className="task-list-header"><span>TÊN CÔNG VIỆC</span><span>ƯU TIÊN</span><span>HẠN HOÀN THÀNH</span><span>CẬP NHẬT TRẠNG THÁI</span><span>NGƯỜI PHỤ TRÁCH</span></div>
              {loading ? (
                <div className="task-empty" role="status"><span className="loading-spinner" />Đang tải công việc...</div>
              ) : filteredTasks.length ? filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  assignee={membersById.get(task.assigneeId)}
                  isSaving={savingTaskId === task.id}
                  canUpdateStatus={canUpdateTask(task)}
                  onStatusChange={requestStatusChange}
                />
              )) : (
                <div className="task-empty"><span className="empty-illustration"><Icon name="tasks" size={28} /></span><strong>Chưa có công việc phù hợp</strong><span>Hãy đổi mục lọc hoặc bấm “Giao việc mới” để tạo việc.</span></div>
              )}
            </div>
            <div className="list-footer">
              <span>Đang hiển thị <strong>{filteredTasks.length}</strong> / <strong>{tasks.length}</strong> công việc</span>
              <span className="live-indicator"><i />{supabaseConfigured ? 'Đã đồng bộ' : 'Chỉ lưu trên thiết bị này'}</span>
            </div>
          </section>
          <footer className="page-footer"><span>© 2026 Teamflow</span><span>Dùng bộ lọc phía trên để tìm công việc.</span></footer>
        </div>
      </main>
      {showTaskModal && <TaskModal members={members} onClose={() => setShowTaskModal(false)} onSubmit={handleCreateTask} />}
      {groupModalMode && <GroupModal mode={groupModalMode} onClose={() => setGroupModalMode(null)} onSubmit={handleGroupAction} />}
      {showInviteModal && currentGroup && <InviteCodeModal group={currentGroup} onClose={() => setShowInviteModal(false)} />}
      {showMembersModal && currentGroup && <MembersModal groupName={currentGroup.name} members={members} tasks={tasks} onClose={() => setShowMembersModal(false)} />}
      {showAccountModal && user && <AccountModal user={user} member={currentMember} onClose={() => setShowAccountModal(false)} />}
      {completionTask && <CompletionReportModal task={completionTask} onClose={() => setCompletionTask(null)} onSubmit={handleCompletionReport} />}
    </div>
  );
}
