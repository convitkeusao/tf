import React, { FormEvent, useState } from 'react';
import { AppUser, signIn } from '../api/supabaseAuth';

type Props = {
  onSignedIn: (user: AppUser) => void;
};

export function SupabaseAuth({ onSignedIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      onSignedIn(await signIn(email.trim(), password));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể đăng nhập.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <img className="auth-logo" src={`${process.env.PUBLIC_URL}/logo.png`} alt="Logo Teamflow" />
        <span className="eyebrow">KHÔNG GIAN LÀM VIỆC CỦA NHÓM</span>
        <h1>Chào mừng trở lại</h1>
        <p>Đăng nhập bằng tài khoản Supabase của bạn để xem công việc.</p>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor="login-password">Mật khẩu</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
        <small>Tài khoản thành viên được trưởng nhóm tạo trong Supabase Authentication.</small>
      </form>
    </main>
  );
}
