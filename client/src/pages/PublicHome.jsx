import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatDateRange } from '../utils/dates';

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

  return (
    <div>
      <h1>Événements ouverts aux bénévoles</h1>
      {events.length === 0 && <p className="muted">Aucun événement actif pour le moment.</p>}
      <div className="card-list">
        {events.map((ev) => (
          <Link to={`/evenements/${ev.id}`} className="card" key={ev.id}>
            <h2>{ev.name}</h2>
            {(ev.date_start || ev.date_end) && (
              <p className="muted">{formatDateRange(ev.date_start, ev.date_end)}</p>
            )}
            {ev.description && <p>{ev.description}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
