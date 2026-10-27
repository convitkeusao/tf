import { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type AppUser = {
  id: string;
  name: string;
  email: string;
};

function requireSupabase() {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase URL hoặc publishable key.');
  return supabase;
}

function mapUser(user: User): AppUser {
  return {
    id: user.id,
    name: user.user_metadata.name || user.email?.split('@')[0] || 'Thành viên',
    email: user.email || '',
  };
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user ? mapUser(data.user) : null;
}

export async function signIn(email: string, password: string): Promise<AppUser> {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Supabase không trả về thông tin tài khoản.');
  return mapUser(data.user);
}

export async function signOut(): Promise<void> {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}
