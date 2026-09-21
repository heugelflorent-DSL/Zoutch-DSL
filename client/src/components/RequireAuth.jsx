import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({ children }) {
  const { organizer, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="muted">Chargement…</p>;
  if (!organizer) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}
