import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { api } from '../api/client';
import { formatDateRange, formatMissionWhen } from '../utils/dates';
import { badgeLabel, missionUnit, formatQty, missionCategory } from '../utils/missions';
import MissionForm from '../components/MissionForm';

function MissionSignups({ mission, onChanged }) {
  const confirmed = (mission.signupsFull || []).filter((s) => !s.waitlist);
  const waitlist = (mission.signupsFull || []).filter((s) => s.waitlist);
  const unit = missionUnit(mission);
  const hasRoom = mission.remaining > 0;
  const [error, setError] = useState('');

  async function remove(id) {
    try { await api.deleteSignup(id); onChanged(); } catch (e) { setError(e.message); }
  }
  async function promote(id) {
    try { await api.promoteSignup(id); onChanged(); } catch (e) { setError(e.message); }
  }

  return (
    <div className="signups-list">
      {error && <p className="error">{error}</p>}
      {confirmed.length === 0 && <p className="empty">Aucun inscrit pour l'instant.</p>}
      {confirmed.map((s) => (
        <div className="signup-row" key={s.id}>
          <span>{s.first_name} {s.last_name} — {s.email}{unit !== 'personne(s)' ? ` · ${formatQty(s.quantity || 1)} ${unit}` : ''}</span>
          <button className="danger" onClick={() => remove(s.id)}>Retirer</button>
        </div>
      ))}
      {waitlist.length > 0 && (
        <>
          <p className="muted" style={{ fontWeight: 600, marginTop: '0.6rem' }}>Liste d'attente</p>
          {waitlist.map((s) => (
            <div className="signup-row" key={s.id}>
              <span>{s.first_name} {s.last_name} — {s.email}</span>
              <span style={{ display: 'flex', gap: '0.4rem' }}>
                {hasRoom && <button onClick={() => promote(s.id)}>Promouvoir</button>}
                <button className="danger" onClick={() => remove(s.id)}>Retirer</button>
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function PrintPlanning({ event, missions, onClose }) {
  return (
    <div style={{ padding: '1rem' }}>
      <div className="no-print actions" style={{ marginBottom: '1rem' }}>
        <button onClick={onClose}>← Fermer</button>
        <button onClick={() => window.print()}>🖨️ Imprimer</button>
      </div>
      <h1>{event.name} — Planning</h1>
      <p>{formatDateRange(event.date_start, event.date_end)}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr>
            {['Quand', 'Tâche', 'Catégorie', 'Quantité', 'Bénévoles'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {missions.map((m) => (
            <tr key={m.id}>
              <td style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border)' }}>{formatMissionWhen(m)}</td>
              <td style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border)' }}>{m.title}</td>
              <td style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border)' }}>{missionCategory(m)}</td>
              <td style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border)' }}>{formatQty(m.taken)}/{formatQty(m.slots)} {missionUnit(m)}</td>
              <td style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border)' }}>
                {(m.signupsFull || []).filter((s) => !s.waitlist).map((s) => `${s.first_name} ${s.last_name}`).join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminEventDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [showMissionForm, setShowMissionForm] = useState(Boolean(location.state?.openTaskForm));
  const [expandedMissionId, setExpandedMissionId] = useState(null);
  const [editingMissionId, setEditingMissionId] = useState(null);
  const [printMode, setPrintMode] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  function reload() {
    api.getEvent(id).then((ev) => {
      Promise.all((ev.missions || []).map((m) => api.missionSignups(m.id).catch(() => [])))
        .then((allSignups) => {
          const missions = ev.missions.map((m, i) => ({ ...m, signupsFull: allSignups[i] }));
          setEvent({ ...ev, missions });
        });
    }).catch((e) => setError(e.message));
  }

  useEffect(reload, [id]);

  async function removeMission(missionId) {
    if (!confirm("Supprimer cette tâche et ses inscriptions ?")) return;
    try {
      await api.deleteMission(missionId);
      reload();
    } catch (e) { setError(e.message); }
  }

  function exportExcel() {
    const rows = [];
    (event.missions || []).forEach((m) => {
      const signups = m.signupsFull || [];
      const base = {
        'Tâche': m.title,
        'Date': m.date ? formatMissionWhen({ date: m.date }) : '',
        'Début': m.start_time || '',
        'Fin': m.end_time || '',
        'Quantité visée': m.slots,
        'Unité': missionUnit(m),
      };
      if (signups.length === 0) {
        rows.push({ ...base, 'Prénom': '', 'Nom': '', 'Email': '', 'Quantité apportée': '', "Liste d'attente": '' });
      } else {
        signups.forEach((s) => {
          rows.push({ ...base, 'Prénom': s.first_name, 'Nom': s.last_name, 'Email': s.email, 'Quantité apportée': s.quantity || 1, "Liste d'attente": s.waitlist ? 'Oui' : '' });
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tâches');
    const safeName = event.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    XLSX.writeFile(wb, `${safeName}-taches.xlsx`);
    setExportStatus('Fichier téléchargé.');
  }

  if (error) return <p className="error">{error}</p>;
  if (!event) return <p className="muted">Chargement…</p>;

  if (printMode) {
    return <PrintPlanning event={event} missions={event.missions} onClose={() => setPrintMode(false)} />;
  }

  const openCount = event.missions.filter((m) => m.remaining > 0).length;
  const peopleCount = event.missions.reduce((sum, m) => sum + (m.signupsFull || []).filter((s) => !s.waitlist).length, 0);

  return (
    <div>
      <Link to="/admin" className="back-link">← Retour au tableau de bord</Link>
      <h1>{event.name}</h1>
      {(event.date_start || event.date_end) && <p className="muted">{formatDateRange(event.date_start, event.date_end)}</p>}
      {event.description && <p>{event.description}</p>}
      {event.missions.length > 0 && (
        <p className="muted">{peopleCount} bénévole(s) inscrit(s) · {openCount} tâche(s) encore ouverte(s) sur {event.missions.length}</p>
      )}

      <div className="actions">
        <button onClick={() => setShowMissionForm((s) => !s)}>
          {showMissionForm ? 'Annuler' : '+ Ajouter une tâche'}
        </button>
        <button className="secondary" onClick={exportExcel}>📊 Exporter en Excel</button>
        <button className="secondary" onClick={() => setPrintMode(true)}>🖨️ Planning imprimable</button>
      </div>
      {exportStatus && <p className="muted">{exportStatus}</p>}

      {showMissionForm && (
        <MissionForm
          event={event}
          submitLabel="Ajouter la tâche"
          onSubmit={async (payload) => {
            await api.createMission({ event_id: Number(id), ...payload });
            setShowMissionForm(false);
            reload();
          }}
          onCancel={() => setShowMissionForm(false)}
        />
      )}

      <h2>Tâches</h2>
      {event.missions.length === 0 && <p className="empty">Aucune tâche pour l'instant.</p>}
      <div className="mission-list">
        {event.missions.map((m) => (
          <div className="mission-card" key={m.id}>
            {editingMissionId === m.id ? (
              <MissionForm
                event={event}
                mission={m}
                submitLabel="Enregistrer"
                onSubmit={async (payload) => {
                  await api.updateMission(m.id, payload);
                  setEditingMissionId(null);
                  reload();
                }}
                onCancel={() => setEditingMissionId(null)}
              />
            ) : (
              <>
                <div className="mission-header">
                  <h3>{m.title}</h3>
                  <span className={m.remaining > 0 ? 'badge' : 'badge badge-full'}>{badgeLabel(m)}</span>
                </div>
                {formatMissionWhen(m) && <p className="muted">{formatMissionWhen(m)}</p>}
                {m.description && <p>{m.description}</p>}
                <div className="row-actions">
                  <button className="secondary" onClick={() => setEditingMissionId(m.id)}>Modifier</button>
                  <button className="secondary" onClick={() => setExpandedMissionId(expandedMissionId === m.id ? null : m.id)}>
                    {expandedMissionId === m.id ? 'Masquer les inscrits' : 'Voir les inscrits'}
                  </button>
                  <button className="danger" onClick={() => removeMission(m.id)}>Supprimer la tâche</button>
                </div>
                {expandedMissionId === m.id && <MissionSignups mission={m} onChanged={reload} />}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
