import React from 'react';
import { Icon } from '../../components/Icon';
import { Task, TaskPriority, TaskStatus, TeamMember } from './taskTypes';
import { formatDueDate, initials, localDateString } from './taskUi';

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Chưa bắt đầu',
  in_progress: 'Đang thực hiện',
  done: 'Đã hoàn thành',
};

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Có thể làm sau',
  medium: 'Bình thường',
  high: 'Ưu tiên cao',
};

type Props = {
  task: Task;
  assignee?: TeamMember;
  isSaving: boolean;
  canUpdateStatus: boolean;
  onStatusChange: (task: Task, status: TaskStatus) => void;
};

export function TaskRow({ task, assignee, isSaving, canUpdateStatus, onStatusChange }: Props) {
  const overdue = task.status !== 'done' && task.dueDate < localDateString(new Date());
  const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';

  return (
    <article className={`task-row ${task.status === 'done' ? 'task-row-done' : ''}`}>
      <button
        className={`task-check ${task.status === 'done' ? 'checked' : ''}`}
        type="button"
        aria-label={task.status === 'done' ? `Đánh dấu chưa hoàn thành: ${task.title}` : `Đánh dấu hoàn thành: ${task.title}`}
        title={task.status === 'done' ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
        disabled={isSaving || !canUpdateStatus}
        onClick={() => onStatusChange(task, nextStatus)}
      >
        {task.status === 'done' ? <Icon name="check" size={15} /> : <Icon name="circle" size={15} />}
      </button>
      <div className="task-info">
        <div className="task-title-copy">
          <strong className={task.status === 'done' ? 'completed-title' : ''}>{task.title}</strong>
          <span className="task-description">{task.description || 'Chưa thêm mô tả'}</span>
          {task.status === 'done' && task.completionReport && (
            <span className="completion-report-copy"><strong>Chi tiết:</strong> {task.completionReport}</span>
          )}
          <span className="task-assignee-mobile">
            <span className="avatar avatar-tiny" style={{ backgroundColor: assignee?.color || '#7658e8' }}>{initials(task.assigneeName)}</span>
            {task.assigneeName}
          </span>
        </div>
      </div>
      <div className="task-priority"><span className={`priority-dot ${task.priority}`} />{priorityLabels[task.priority]}</div>
      <div className={`task-due ${overdue ? 'overdue' : ''}`}>
        <span className="task-date"><Icon name="calendar" size={14} />{formatDueDate(task.dueDate)}</span>
        {overdue && <span>Đã quá hạn</span>}
      </div>
      <div className="task-status-cell">
        <select
          aria-label={`Trạng thái: ${task.title}`}
          className={`status-select ${task.status}`}
          value={task.status}
          disabled={isSaving || !canUpdateStatus}
          onChange={(event) => onStatusChange(task, event.target.value as TaskStatus)}
        >
          {(Object.keys(statusLabels) as TaskStatus[]).map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}
        </select>
      </div>
      <div className="task-assignee" title={task.assigneeName}>
        <span className="avatar avatar-tiny" style={{ backgroundColor: assignee?.color || '#7658e8' }}>{initials(task.assigneeName)}</span>
        <span>{task.assigneeName}</span>
      </div>
    </article>
  );
}
