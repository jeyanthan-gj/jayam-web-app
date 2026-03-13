import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'staff';

interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: AppRole;
  birthday?: string;
  avatar_url?: string;
  email?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signUp: (username: string, password: string, name: string, role: AppRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('jayam_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      // Direct table query for login
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) {
        return { error: 'Invalid username or password' };
      }

      const userProfile: UserProfile = {
        id: data.id,
        username: data.username,
        name: data.name,
        role: data.role,
        birthday: data.birthday,
        avatar_url: data.avatar_url,
        email: data.email
      };

      setUser(userProfile);
      localStorage.setItem('jayam_user', JSON.stringify(userProfile));
      return { error: null };
    } catch (err) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signUp = async (username: string, password: string, name: string, role: AppRole) => {
    const { error } = await supabase
      .from('users')
      .insert({ username, password, name, role });

    return { error: error?.message || null };
  };

  const signOut = async () => {
    localStorage.removeItem('jayam_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin: user?.role === 'admin',
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
