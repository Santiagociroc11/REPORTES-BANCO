import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  username: string;
}

export async function login(username: string, password: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', username)
    .eq('password', password)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Usuario o contraseña incorrectos');
  return data;
}

export async function register(username: string, password: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert([{ username, password }])
    .select('id, username')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Error al crear el usuario');
  return data;
}