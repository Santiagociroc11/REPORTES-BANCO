import * as mongoApi from './mongoApi';
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
    const userData = await mongoApi.login(email, password);

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
    const user = await mongoApi.register(username, email, password);

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