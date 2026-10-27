import React, { useEffect, useState } from 'react';
import { supabaseConfigured } from './api/supabaseClient';
import { AppUser, getCurrentUser, signOut } from './api/supabaseAuth';
import { SupabaseAuth } from './components/SupabaseAuth';
import { TasksPage } from './pages/TasksPage';

function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'ready'>(
    supabaseConfigured ? 'loading' : 'ready',
  );
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!supabaseConfigured) return;
    getCurrentUser()
      .then(setUser)
      .catch((caught: unknown) => {
        setAuthError(caught instanceof Error ? caught.message : 'Không thể kiểm tra phiên đăng nhập.');
      })
      .finally(() => setAuthStatus('ready'));
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
      setUser(null);
    } catch (caught) {
      setAuthError(caught instanceof Error ? caught.message : 'Không thể đăng xuất.');
    }
  }

  if (authStatus === 'loading') {
    return <main className="auth-page"><p role="status">Đang kiểm tra phiên đăng nhập...</p></main>;
  }
  if (authError) {
    return <main className="auth-page"><p className="form-error" role="alert">{authError}</p><button className="secondary-button" onClick={() => window.location.reload()}>Thử lại</button></main>;
  }
  if (supabaseConfigured && !user) return <SupabaseAuth onSignedIn={setUser} />;
  return (
    <TasksPage
      user={user}
      onSignOut={supabaseConfigured ? handleSignOut : undefined}
    />
  );
}

export default App;
