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
      <div className="hero-header">
        <img src={logo} alt="Dauphins Saint-Louis" />
        <h1>Rejoignez l'équipe des bénévoles</h1>
        <p className="hero-desc">
          Chaque événement du club vit grâce à vous. Choisissez celui qui vous tente, puis
          inscrivez-vous sur les tâches qui vous conviennent, en quelques secondes.
        </p>
      </div>

      <h2 className="section-title">{events.length} événements vous attendent</h2>
      <div className="event-grid">
        {events.map((ev) => (
          <Link to={`/evenements/${ev.id}`} className="event-tile" key={ev.id}>
            {(ev.date_start || ev.date_end) && (
              <span className="date-pill">📅 {formatDateRange(ev.date_start, ev.date_end)}</span>
            )}
            <h3>{ev.name}</h3>
            {ev.description && <p className="event-desc">{ev.description}</p>}
            {ev.mission_count > 0 && (
              <p className="event-stats">
                {ev.open_count > 0
                  ? <><strong>{ev.open_count}</strong> tâche{ev.open_count > 1 ? 's' : ''} encore à pourvoir</>
                  : <>Toutes les tâches sont pourvues — liste d'attente ouverte</>}
                {ev.volunteer_count > 0 && <> · {ev.volunteer_count} bénévole{ev.volunteer_count > 1 ? 's' : ''} déjà inscrit{ev.volunteer_count > 1 ? 's' : ''}</>}
              </p>
            )}
            <span className="event-cta">Voir les tâches et m'inscrire →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
