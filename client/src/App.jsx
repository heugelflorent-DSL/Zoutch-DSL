import { Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import PublicHome from './pages/PublicHome';
import PublicEvent from './pages/PublicEvent';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminEventDetail from './pages/AdminEventDetail';
import AdminOrganizers from './pages/AdminOrganizers';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <header className="topbar">
          <Link to="/" className="brand">Zoutch Bénévoles</Link>
          <Link to="/admin" className="admin-link">Espace organisateurs</Link>
        </header>
        <main className="content">
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
        </main>
      </div>
    </AuthProvider>
  );
}
