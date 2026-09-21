import { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import PublicHome from './pages/PublicHome';
import PublicEvent from './pages/PublicEvent';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminEventDetail from './pages/AdminEventDetail';
import AdminOrganizers from './pages/AdminOrganizers';
import CancelSignup from './pages/CancelSignup';
import logo from './assets/logo-dauphins-sl.png';
import './App.css';

function Shell() {
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const [cancelId, setCancelId] = useState(params.get('cancel'));

  if (cancelId) {
    return (
      <CancelSignup
        signupId={cancelId}
        onDone={(eventId) => {
          setCancelId(null);
          window.history.replaceState({}, '', `${location.origin}${location.pathname}`);
          navigate(eventId ? `/evenements/${eventId}` : '/');
        }}
      />
    );
  }

  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/evenements/:id" element={<PublicEvent />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/evenements/:id"
        element={
          <RequireAuth>
            <AdminEventDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/organisateurs"
        element={
          <RequireAuth>
            <AdminOrganizers />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <header className="topbar">
          <Link to="/" className="brand">
            <img src={logo} alt="Dauphins Saint-Louis" />
            <span>Zoutch Dauphins de Saint-Louis</span>
          </Link>
          <Link to="/admin" className="admin-link">Espace organisateurs</Link>
        </header>
        <main className="content">
          <Shell />
        </main>
      </div>
    </AuthProvider>
  );
}
