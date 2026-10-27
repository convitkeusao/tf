import React, { FormEvent, useState } from 'react';
import { AppUser } from '../../api/supabaseAuth';
import { Icon } from '../../components/Icon';
import { NewTask, Task, TaskPriority, TeamGroup, TeamMember } from './taskTypes';
import { initials, localDateString } from './taskUi';

type ModalProps = { onClose: () => void };

export function TaskModal({ members, onClose, onSubmit }: ModalProps & {
  members: TeamMember[];
  onSubmit: (task: NewTask) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState(members[0]?.id ?? '');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState(localDateString(new Date(Date.now() + 86400000 * 3)));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const assignee = members.find((member) => member.id === assigneeId);
    if (!assignee) {
      setFormError('Hãy chọn thành viên phụ trách.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        assigneeId,
        assigneeName: assignee.name,
        status: 'todo',
        priority,
        dueDate,
      });
      onClose();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Không thể giao công việc.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-card" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <div className="modal-heading">
          <div><span className="eyebrow">PHÂN CÔNG CÔNG VIỆC</span><h2 id="task-modal-title">Giao việc cho thành viên</h2></div>
          <button className="icon-button" type="button" aria-label="Đóng" onClick={onClose}>×</button>
        </div>
        <p className="modal-intro">Cho nhóm biết cần làm gì, ai phụ trách và khi nào cần hoàn thành.</p>
        <label htmlFor="task-title">Việc cần làm</label>
        <input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Chuẩn bị báo cáo tuần" maxLength={120} required autoFocus />
        <label htmlFor="task-description">Mô tả kết quả cần đạt <span className="optional-label">Không bắt buộc</span></label>
        <textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ghi rõ yêu cầu hoặc kết quả mong muốn..." rows={3} />
        <div className="form-grid">
          <div>
            <label htmlFor="task-assignee">Giao cho</label>
            <select id="task-assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} required>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="task-priority">Mức độ ưu tiên</label>
            <select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
              <option value="low">Có thể làm sau</option>
              <option value="medium">Bình thường</option>
              <option value="high">Ưu tiên cao</option>
            </select>
          </div>
        </div>
        <label htmlFor="task-due-date">Hạn cần hoàn thành</label>
        <input id="task-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Hủy</button>
          <button className="primary-button" type="submit" disabled={submitting || members.length === 0}>
            {submitting ? 'Đang giao việc...' : 'Giao công việc'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function GroupModal({ mode, onClose, onSubmit }: ModalProps & {
  mode: 'create' | 'join';
  onSubmit: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await onSubmit(value.trim());
      onClose();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Không thể hoàn tất thao tác với nhóm.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-card" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="group-modal-title">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">{mode === 'create' ? 'KHÔNG GIAN LÀM VIỆC' : 'THAM GIA NHÓM'}</span>
            <h2 id="group-modal-title">{mode === 'create' ? 'Tạo nhóm mới' : 'Nhập mã mời'}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Đóng" onClick={onClose}>×</button>
        </div>
        <p className="modal-intro">{mode === 'create'
          ? 'Bạn sẽ trở thành trưởng nhóm và có thể chia sẻ mã mời cho các thành viên.'
          : 'Nhập mã mời do trưởng nhóm chia sẻ để tham gia nhóm.'}</p>
        <label htmlFor="group-value">{mode === 'create' ? 'Tên nhóm' : 'Mã mời'}</label>
        <input
          id="group-value"
          value={value}
          onChange={(event) => setValue(mode === 'join' ? event.target.value.toUpperCase() : event.target.value)}
          placeholder={mode === 'create' ? 'Ví dụ: Nhóm thiết kế' : 'Nhập mã mời'}
          maxLength={mode === 'create' ? 80 : 16}
          minLength={mode === 'create' ? 2 : 1}
          required
          autoFocus
        />
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Hủy</button>
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Đang xử lý...' : mode === 'create' ? 'Tạo nhóm' : 'Tham gia nhóm'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function InviteCodeModal({ group, onClose }: ModalProps & { group: TeamGroup }) {
  const [copyLabel, setCopyLabel] = useState('Sao chép mã');

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopyLabel('Đã sao chép');
    } catch {
      setCopyLabel('Không thể sao chép');
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
        <div className="modal-heading">
          <div><span className="eyebrow">CHIA SẺ VỚI THÀNH VIÊN</span><h2 id="invite-modal-title">Mã mời nhóm</h2></div>
          <button className="icon-button" type="button" aria-label="Đóng" onClick={onClose}>×</button>
        </div>
        <p className="modal-intro">Gửi mã này cho người cần tham gia “{group.name}”. Họ nhập mã sau khi đăng nhập.</p>
        <div className="invite-code">{group.inviteCode}</div>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Đóng</button>
          <button className="primary-button" type="button" onClick={() => void copyCode()}><Icon name="invite" size={18} />{copyLabel}</button>
        </div>
      </section>
    </div>
  );
}

export function MembersModal({ groupName, members, tasks, onClose }: ModalProps & {
  groupName: string;
  members: TeamMember[];
  tasks: Task[];
}) {
  const openTasksByMember = new Map<string, number>();
  tasks.forEach((task) => {
    if (task.status !== 'done') {
      openTasksByMember.set(task.assigneeId, (openTasksByMember.get(task.assigneeId) || 0) + 1);
    }
  });

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card members-modal" role="dialog" aria-modal="true" aria-labelledby="members-modal-title">
        <div className="modal-heading">
          <div><span className="eyebrow">{groupName}</span><h2 id="members-modal-title">Thành viên nhóm</h2></div>
          <button className="icon-button" type="button" aria-label="Đóng" onClick={onClose}>×</button>
        </div>
        {members.length ? (
          <div className="members-modal-list">
            {members.map((member) => (
              <div className="members-modal-row" key={member.id}>
                <span className="avatar avatar-small" style={{ backgroundColor: member.color }}>{initials(member.name)}</span>
                <span className="member-copy"><strong>{member.name}</strong><small>{member.role}</small></span>
                <span className="member-task-count">{openTasksByMember.get(member.id) || 0} việc</span>
              </div>
            ))}
          </div>
        ) : <p className="team-empty">Nhóm chưa có thành viên.</p>}
        <div className="modal-actions">
          <button className="primary-button" type="button" onClick={onClose}>Đóng</button>
        </div>
      </section>
    </div>
  );
}

export function CompletionReportModal({ task, onClose, onSubmit }: ModalProps & {
  task: Task;
  onSubmit: (report: string) => Promise<boolean>;
}) {
  const [report, setReport] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (await onSubmit(report.trim())) onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-card" onSubmit={(event) => void submit(event)} role="dialog" aria-modal="true" aria-labelledby="completion-report-title">
        <div className="modal-heading">
          <div><span className="eyebrow">BÁO CÁO CÔNG VIỆC</span><h2 id="completion-report-title">Chi tiết hoàn thành</h2></div>
          <button className="icon-button" type="button" aria-label="Đóng" onClick={onClose}>×</button>
        </div>
        <p className="modal-intro">Mô tả kết quả hoặc phần việc đã hoàn thành cho “{task.title}”. Báo cáo sẽ hiển thị với cả nhóm.</p>
        <label htmlFor="completion-report">Chi tiết báo cáo</label>
        <textarea
          id="completion-report"
          value={report}
          onChange={(event) => setReport(event.target.value)}
          placeholder="Ví dụ: Đã hoàn thành các hạng mục..., kết quả được lưu tại..."
          rows={5}
          maxLength={2000}
          required
          autoFocus
        />
        <div className="report-character-count">{report.length}/2000</div>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Hủy</button>
          <button className="primary-button" type="submit" disabled={submitting || !report.trim()}>
            {submitting ? 'Đang lưu...' : 'Lưu báo cáo và hoàn thành'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AccountModal({ user, member, onClose }: ModalProps & {
  user: AppUser;
  member?: TeamMember;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
        <div className="modal-heading">
          <div><span className="eyebrow">THÔNG TIN TÀI KHOẢN</span><h2 id="account-modal-title">Tài khoản của bạn</h2></div>
          <button className="icon-button" type="button" aria-label="Đóng" onClick={onClose}>×</button>
        </div>
        <div className="account-details">
          <div><span>Họ và tên</span><strong>{member?.name || user.name}</strong></div>
          <div><span>Email đăng nhập</span><strong>{user.email || 'Chưa cập nhật'}</strong></div>
          <div><span>Vai trò trong nhóm</span><strong>{member?.role || 'Thành viên'}</strong></div>
          <div><span>Mã tài khoản</span><strong>{user.id}</strong></div>
        </div>
        <div className="modal-actions"><button className="primary-button" type="button" onClick={onClose}>Đóng</button></div>
      </section>
    </div>
  );
}
