import { supabase } from './supabase';
import { diagnostics } from './diagnostics';

export interface User {
  id: string;
  email: string | null;
  username: string;
  bank_notification_email: string | null;
  active: boolean;
  role: string;
}

export function getStoredUser(): User | null {
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData && userData.id && userData.email) {
        diagnostics.info('Auth', 'Restored user from localStorage', { userId: userData.id });
        return userData;
      } else {
        diagnostics.warn('Auth', 'Invalid stored user data, clearing');
        localStorage.removeItem('user');
      }
    } else {
      diagnostics.info('Auth', 'No stored user found');
    }
    return null;
  } catch (error) {
    diagnostics.error('Auth', 'Error loading stored user', error);
    localStorage.removeItem('user');
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
    diagnostics.info('Auth', 'User stored in localStorage', { userId: user.id });
  } else {
    localStorage.removeItem('user');
    diagnostics.info('Auth', 'User removed from localStorage');
  }
}

export async function login(email: string, password: string): Promise<User> {
  diagnostics.info('Auth', 'Attempting login', { email });
  try {
    // First check if the user exists and get their credentials
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);

    if (searchError) {
      diagnostics.error('Auth', 'Login search error', searchError);
      throw new Error('Error al buscar usuario');
    }

    if (!users || users.length === 0) {
      diagnostics.warn('Auth', 'No user found with email', { email });
      throw new Error('Usuario no encontrado');
    }

    const user = users[0];

    // In a real app, we would hash the password and compare with the stored hash
    if (user.password !== password) {
      diagnostics.warn('Auth', 'Invalid password attempt', { userId: user.id });
      throw new Error('Contraseña incorrecta');
    }

    if (!user.active) {
      diagnostics.warn('Auth', 'Inactive user attempted login', { userId: user.id });
      throw new Error('Usuario inactivo');
    }

    const userData: User = {
      id: user.id,
      email: user.email,
      username: user.username,
      bank_notification_email: user.bank_notification_email,
      active: user.active,
      role: user.role || 'user'
    };

    diagnostics.info('Auth', 'Login successful', { userId: userData.id });
    setStoredUser(userData);
    return userData;
  } catch (error) {
    diagnostics.error('Auth', 'Login process failed', error);
    throw error;
  }
}

export async function register(username: string, email: string, password: string): Promise<User> {
  diagnostics.info('Auth', 'Attempting registration', { email });
  try {
    // Check if email already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);

    if (checkError) {
      throw new Error('Error al verificar el correo');
    }

    if (existingUsers && existingUsers.length > 0) {
      diagnostics.warn('Auth', 'Registration attempted with existing email', { email });
      throw new Error('El correo ya está registrado');
    }

    // Generate UUID for the new user
    const userId = crypto.randomUUID();

    const { error: insertError } = await supabase
      .from('users')
      .insert([{
        id: userId,
        username,
        email,
        password, // In production, this would be hashed
        active: true,
        role: 'user'
      }]);

    if (insertError) {
      diagnostics.error('Auth', 'Error creating user', insertError);
      throw new Error(`Error al crear el usuario: ${insertError.message}`);
    }

    // Fetch the newly created user
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !userData) {
      diagnostics.error('Auth', 'Error fetching new user', fetchError);
      throw new Error('Error al crear el usuario');
    }

    const user: User = {
      id: userData.id,
      email: userData.email,
      username: userData.username,
      bank_notification_email: userData.bank_notification_email,
      active: userData.active,
      role: userData.role
    };

    diagnostics.info('Auth', 'Registration successful', { userId: user.id });
    setStoredUser(user);
    return user;
  } catch (error) {
    diagnostics.error('Auth', 'Registration process failed', error);
    throw error;
  }
}

export function logout(): void {
  diagnostics.info('Auth', 'Logging out');
  setStoredUser(null);
}