import React, { FormEvent, useState } from 'react';
import { AppUser, signIn } from '../api/supabaseAuth';

type Props = {
  onSignedIn: (user: AppUser) => void;
};

export function SupabaseAuth({ onSignedIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="auth-simple">
        <img className="auth-logo" src={`${process.env.PUBLIC_URL}/logo.png`} alt="Teamflow" />
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-form-heading">
            <h1>Đăng nhập</h1>
            <p>Đăng nhập để xem công việc của nhóm.</p>
          </div>
          <div className="auth-field">
            <label htmlFor="login-email">Địa chỉ email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="ten@congty.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="login-password">Mật khẩu</label>
            <div className="auth-password-field">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                className="auth-password-toggle"
                type="button"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={submitting}>
            {submitting ? <><span className="auth-spinner" />Đang đăng nhập...</> : <>Đăng nhập<span aria-hidden="true">→</span></>}
          </button>
        </form>
      </div>
    </main>
  );
}
