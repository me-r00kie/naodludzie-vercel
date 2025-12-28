import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'host' | 'guest';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  roles: AppRole[];
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: 'guest' | 'host', name: string, phone?: string) => Promise<void>;
  recoverPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isHost: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRoles = async (userId: string): Promise<AppRole[]> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
    
    return (data || []).map(r => r.role as AppRole);
  };

  const fetchUserProfile = async (userId: string): Promise<{ email: string; name?: string } | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
  };

  const buildAuthUser = async (supabaseUser: User): Promise<AuthUser> => {
    const [roles, profile] = await Promise.all([
      fetchUserRoles(supabaseUser.id),
      fetchUserProfile(supabaseUser.id)
    ]);

    return {
      id: supabaseUser.id,
      email: profile?.email || supabaseUser.email || '',
      name: profile?.name,
      roles
    };
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        
        if (newSession?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(() => {
            buildAuthUser(newSession.user).then(setUser);
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      
      if (existingSession?.user) {
        buildAuthUser(existingSession.user).then((authUser) => {
          setUser(authUser);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      const authUser = await buildAuthUser(data.user);
      setUser(authUser);
    }
  };

  const register = async (email: string, password: string, role: 'guest' | 'host', name: string, phone?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          phone
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('Ten email jest już zarejestrowany. Spróbuj się zalogować.');
      }
      throw new Error(error.message);
    }

    if (data.user) {
      // Add the role to user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role });

      if (roleError) {
        console.error('Error adding role:', roleError);
      }

      // Notify admin about new user registration
      try {
        await supabase.functions.invoke('notify-admin-new-user', {
          body: {
            userId: data.user.id,
            email,
            name,
            phone,
            role
          }
        });
      } catch (notifyError) {
        console.error('Error notifying admin about new user:', notifyError);
        // Don't throw - registration should still succeed
      }

      const authUser = await buildAuthUser(data.user);
      setUser(authUser);
    }
  };

  const recoverPassword = async (email: string) => {
    // Direct the user to the single-page app reset route (hash router)
    const redirectUrl = `${window.location.origin}/#/reset-password`;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const hasRole = (role: AppRole): boolean => {
    return user?.roles.includes(role) ?? false;
  };

  const isAdmin = hasRole('admin');
  const isHost = hasRole('host');

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      login, 
      register, 
      recoverPassword,
      logout, 
      hasRole,
      isAdmin,
      isHost
    }}>
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
