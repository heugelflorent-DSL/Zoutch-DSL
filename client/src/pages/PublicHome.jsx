import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatDateRange } from '../utils/dates';
import EventHero from '../components/EventHero';
import logo from '../assets/logo-dauphins-sl.png';

export default function PublicHome() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listEvents('active')
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Chargement…</p>;
  if (error) return <p className="error">{error}</p>;

  if (events.length === 1) {
    return <EventHero eventId={events[0].id} showBack={false} />;
  }

  if (events.length === 0) {
    return (
      <div className="hero-header">
        <img src={logo} alt="Dauphins Saint-Louis" />
        <h1>Bénévoles</h1>
        <p className="empty">Aucun événement actif pour le moment.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="section-title">Événements ouverts aux bénévoles</h1>
      <div className="card-list">
        {events.map((ev) => (
          <Link to={`/evenements/${ev.id}`} className="card" key={ev.id}>
            <h2>{ev.name}</h2>
            {(ev.date_start || ev.date_end) && <p className="muted">{formatDateRange(ev.date_start, ev.date_end)}</p>}
            {ev.description && <p>{ev.description}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
