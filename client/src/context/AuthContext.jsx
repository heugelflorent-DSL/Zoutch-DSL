import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [organizer, setOrganizer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => setOrganizer(res.organizer))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const res = await api.login(username, password);
    setToken(res.token);
    setOrganizer(res.organizer);
    return res.organizer;
  }

  async function refresh() {
    const res = await api.me();
    setOrganizer(res.organizer);
    return res.organizer;
  }

  function logout() {
    setToken(null);
    setOrganizer(null);
  }

  return (
    <AuthContext.Provider value={{ organizer, loading, login, logout, refresh, isSuperAdmin: organizer?.role === 'superadmin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
