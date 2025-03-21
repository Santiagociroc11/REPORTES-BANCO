import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, getStoredUser, login as authLogin, register as authRegister, logout as authLogout } from '../lib/auth';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSession = () => {
      try {
        const storedUser = getStoredUser();
        setUser(storedUser);

        // If we have a user and we're on the login page, redirect to home
        if (storedUser && location.pathname === '/login') {
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Error checking session:', error);
        authLogout(); // Clean up any invalid session data
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [navigate, location.pathname]);

  const signIn = async (email: string, password: string) => {
    try {
      const user = await authLogin(email, password);
      setUser(user);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error en signIn:', error);
      throw error;
    }
  };

  const signUp = async (username: string, email: string, password: string) => {
    try {
      const user = await authRegister(username, email, password);
      setUser(user);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error en signUp:', error);
      throw error;
    }
  };

  const signOut = () => {
    authLogout();
    setUser(null);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}