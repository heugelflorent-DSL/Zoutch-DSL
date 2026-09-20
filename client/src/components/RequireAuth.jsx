import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({ children }) {
  const { organizer, loading } = useAuth();
  if (loading) return <p className="muted">Chargement…</p>;
  if (!organizer) return <Navigate to="/admin/login" replace />;
  return children;
}
