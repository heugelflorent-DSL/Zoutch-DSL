import { getDatabase } from "@netlify/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = Netlify.env.get("JWT_SECRET") || "dev-secret-change-me";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function err(status, message) {
  return json({ error: message }, status);
}

function signToken(organizer) {
  return jwt.sign({ id: organizer.id, username: organizer.username }, JWT_SECRET, { expiresIn: "7d" });
}

function getAuthOrganizer(req) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

async function ensureDefaultAdmin(db) {
  const [{ n }] = await db.sql`SELECT COUNT(*)::int AS n FROM organizers`;
  if (n > 0) return;
  const username = Netlify.env.get("DEFAULT_ADMIN_USER") || "admin";
  const password = Netlify.env.get("DEFAULT_ADMIN_PASSWORD") || "changeme123";
  const hash = bcrypt.hashSync(password, 10);
  await db.sql`INSERT INTO organizers (username, password_hash) VALUES (${username}, ${hash})`;
}

async function missionsWithCounts(db, eventId) {
  const missions = await db.sql`
    SELECT * FROM missions WHERE event_id = ${eventId}
    ORDER BY date IS NULL, date, start_time IS NULL, start_time
  `;
  const signups = await db.sql`
    SELECT * FROM signups WHERE mission_id IN (SELECT id FROM missions WHERE event_id = ${eventId})
  `;
  return missions.map((m) => {
    const missionSignups = signups.filter((s) => s.mission_id === m.id);
    const confirmed = missionSignups.filter((s) => !s.waitlist);
    const taken = confirmed.reduce((sum, s) => sum + Number(s.quantity || 1), 0);
    const publicSignups = missionSignups.map((s) => ({
      id: s.id, first_name: s.first_name, last_name: s.last_name,
      quantity: s.quantity, waitlist: s.waitlist,
    }));
    const unlimited = m.kind === "presence" && Number(m.slots) === 0;
    return { ...m, taken, unlimited, remaining: unlimited ? 999999 : Math.max(Number(m.slots) - taken, 0), signups: publicSignups };
  });
}

export default async (req, context) => {
  const db = getDatabase();
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\//, "").split("/").filter(Boolean);
  const method = req.method;
  let body = {};
  if (method === "POST" || method === "PUT") {
    try { body = await req.json(); } catch { body = {}; }
  }

  try {
    // ---------- AUTH ----------
    if (parts[0] === "auth") {
      await ensureDefaultAdmin(db);

      if (parts[1] === "login" && method === "POST") {
        const { username, password } = body;
        if (!username || !password) return err(400, "Identifiant et mot de passe requis");
        const [organizer] = await db.sql`SELECT * FROM organizers WHERE username = ${username}`;
        if (!organizer) return err(401, "Identifiants incorrects");
        if (!bcrypt.compareSync(password, organizer.password_hash)) return err(401, "Identifiants incorrects");
        return json({ token: signToken(organizer), organizer: { id: organizer.id, username: organizer.username } });
      }

      const auth = getAuthOrganizer(req);
      if (!auth) return err(401, "Authentification requise");

      if (parts[1] === "me" && method === "GET") {
        return json({ organizer: auth });
      }
      if (parts[1] === "organizers" && method === "GET") {
        const rows = await db.sql`SELECT id, username, created_at FROM organizers`;
        return json(rows);
      }
      if (parts[1] === "organizers" && method === "POST") {
        const { username, password } = body;
        if (!username || !password) return err(400, "Identifiant et mot de passe requis");
        const [existing] = await db.sql`SELECT id FROM organizers WHERE username = ${username}`;
        if (existing) return err(409, "Cet identifiant existe déjà");
        const hash = bcrypt.hashSync(password, 10);
        const [row] = await db.sql`INSERT INTO organizers (username, password_hash) VALUES (${username}, ${hash}) RETURNING id, username`;
        return json(row, 201);
      }
      if (parts[1] === "organizers" && parts[2] && method === "PUT") {
        const id = Number(parts[2]);
        if (!Number.isInteger(id)) return err(400, "Identifiant invalide");
        const username = typeof body.username === "string" ? body.username.trim() : "";
        const password = typeof body.password === "string" ? body.password : "";
        if (!username && !password) return err(400, "Rien à modifier");
        if (password && password.length < 4) return err(400, "Le mot de passe doit faire au moins 4 caractères");
        const [current] = await db.sql`SELECT id, username FROM organizers WHERE id = ${id}`;
        if (!current) return err(404, "Organisateur introuvable");
        if (username && username !== current.username) {
          const [dup] = await db.sql`SELECT id FROM organizers WHERE username = ${username} AND id <> ${id}`;
          if (dup) return err(409, "Cet identifiant existe déjà");
          await db.sql`UPDATE organizers SET username = ${username} WHERE id = ${id}`;
        }
        if (password) {
          const hash = bcrypt.hashSync(password, 10);
          await db.sql`UPDATE organizers SET password_hash = ${hash} WHERE id = ${id}`;
        }
        const [row] = await db.sql`SELECT id, username, created_at FROM organizers WHERE id = ${id}`;
        return json(row);
      }
      if (parts[1] === "organizers" && parts[2] && method === "DELETE") {
        const id = Number(parts[2]);
        if (!Number.isInteger(id)) return err(400, "Identifiant invalide");
        if (id === auth.id) return err(400, "Tu ne peux pas supprimer ton propre compte");
        const [{ n }] = await db.sql`SELECT COUNT(*)::int AS n FROM organizers`;
        if (n <= 1) return err(400, "Impossible de supprimer le dernier organisateur");
        const [row] = await db.sql`DELETE FROM organizers WHERE id = ${id} RETURNING id`;
        if (!row) return err(404, "Organisateur introuvable");
        return json({ ok: true });
      }
      return err(404, "Route introuvable");
    }

    // ---------- EVENTS ----------
    if (parts[0] === "events") {
      if (parts.length === 1 && method === "GET") {
        const status = url.searchParams.get("status");
        let rows;
        if (status === "all") rows = await db.sql`SELECT * FROM events ORDER BY status ASC, date_start IS NULL, date_start DESC`;
        else if (status === "archived") rows = await db.sql`SELECT * FROM events WHERE status = 'archived' ORDER BY date_start DESC`;
        else rows = await db.sql`SELECT * FROM events WHERE status = 'active' ORDER BY date_start IS NULL, date_start ASC`;
        const withStats = [];
        for (const ev of rows) {
          const ms = await missionsWithCounts(db, ev.id);
          withStats.push({
            ...ev,
            mission_count: ms.filter((m) => m.kind !== "presence").length,
            open_count: ms.filter((m) => m.kind !== "presence" && m.remaining > 0).length,
            volunteer_count: new Set(ms.filter((m) => m.kind !== "presence").flatMap((m) => m.signups.filter((x) => !x.waitlist).map((x) => x.id))).size,
          });
        }
        return json(withStats);
      }
      if (parts.length === 2 && method === "GET") {
        const [event] = await db.sql`SELECT * FROM events WHERE id = ${parts[1]}`;
        if (!event) return err(404, "Événement introuvable");
        const missions = await missionsWithCounts(db, event.id);
        return json({ ...event, missions });
      }

      const auth = getAuthOrganizer(req);
      if (!auth) return err(401, "Authentification requise");

      if (parts.length === 1 && method === "POST") {
        const { name, description, date_start, date_end } = body;
        if (!name) return err(400, "Le nom est requis");
        const [row] = await db.sql`
          INSERT INTO events (name, description, date_start, date_end)
          VALUES (${name}, ${description || null}, ${date_start || null}, ${date_end || null})
          RETURNING *
        `;
        return json(row, 201);
      }
      if (parts.length === 2 && method === "PUT") {
        const [event] = await db.sql`SELECT * FROM events WHERE id = ${parts[1]}`;
        if (!event) return err(404, "Événement introuvable");
        const { name, description, date_start, date_end, status } = body;
        const [row] = await db.sql`
          UPDATE events SET
            name = ${name ?? event.name},
            description = ${description ?? event.description},
            date_start = ${date_start ?? event.date_start},
            date_end = ${date_end ?? event.date_end},
            status = ${status ?? event.status}
          WHERE id = ${event.id} RETURNING *
        `;
        return json(row);
      }
      if (parts.length === 3 && parts[2] === "archive" && method === "POST") {
        const [row] = await db.sql`UPDATE events SET status = 'archived' WHERE id = ${parts[1]} RETURNING *`;
        if (!row) return err(404, "Événement introuvable");
        return json(row);
      }
      if (parts.length === 3 && parts[2] === "unarchive" && method === "POST") {
        const [row] = await db.sql`UPDATE events SET status = 'active' WHERE id = ${parts[1]} RETURNING *`;
        if (!row) return err(404, "Événement introuvable");
        return json(row);
      }
      if (parts.length === 2 && method === "DELETE") {
        const [row] = await db.sql`DELETE FROM events WHERE id = ${parts[1]} RETURNING id`;
        if (!row) return err(404, "Événement introuvable");
        return new Response(null, { status: 204 });
      }
      return err(404, "Route introuvable");
    }

    // ---------- MISSIONS ----------
    if (parts[0] === "missions") {
      if (parts.length === 2 && method === "GET") {
        const [row] = await db.sql`SELECT * FROM missions WHERE id = ${parts[1]}`;
        if (!row) return err(404, "Tâche introuvable");
        return json(row);
      }
      const auth = getAuthOrganizer(req);

      if (parts.length === 3 && parts[2] === "signups" && method === "GET") {
        if (!auth) return err(401, "Authentification requise");
        const [mission] = await db.sql`SELECT * FROM missions WHERE id = ${parts[1]}`;
        if (!mission) return err(404, "Tâche introuvable");
        const rows = await db.sql`SELECT * FROM signups WHERE mission_id = ${mission.id} ORDER BY created_at ASC`;
        return json(rows);
      }

      if (!auth) return err(401, "Authentification requise");

      if (parts.length === 1 && method === "POST") {
        const { event_id, title, description, category, date, start_time, end_time, unit } = body;
        const kind = body.kind === "presence" ? "presence" : "task";
        const slots = Number(body.slots) || 0;
        if (!event_id || !title) return err(400, "event_id et title sont requis");
        if (kind === "task" && slots <= 0) return err(400, "Le nombre de places doit être supérieur à 0");
        const [event] = await db.sql`SELECT id FROM events WHERE id = ${event_id}`;
        if (!event) return err(404, "Événement introuvable");
        const [row] = await db.sql`
          INSERT INTO missions (event_id, title, description, category, date, start_time, end_time, slots, unit, kind)
          VALUES (${event_id}, ${title}, ${description || null}, ${category || null}, ${date || null}, ${start_time || null}, ${end_time || null}, ${slots}, ${kind === "presence" ? "personne(s)" : unit || "personne(s)"}, ${kind})
          RETURNING *
        `;
        return json(row, 201);
      }
      if (parts.length === 2 && method === "PUT") {
        const [mission] = await db.sql`SELECT * FROM missions WHERE id = ${parts[1]}`;
        if (!mission) return err(404, "Tâche introuvable");
        const { title, description, category, date, start_time, end_time, slots, unit } = body;
        if (mission.kind === "task" && slots !== undefined && Number(slots) <= 0) return err(400, "Le nombre de places doit être supérieur à 0");
        const [row] = await db.sql`
          UPDATE missions SET
            title = ${title ?? mission.title},
            description = ${description ?? mission.description},
            category = ${category ?? mission.category},
            date = ${date ?? mission.date},
            start_time = ${start_time ?? mission.start_time},
            end_time = ${end_time ?? mission.end_time},
            slots = ${slots ?? mission.slots},
            unit = ${unit ?? mission.unit}
          WHERE id = ${mission.id} RETURNING *
        `;
        return json(row);
      }
      if (parts.length === 2 && method === "DELETE") {
        const [row] = await db.sql`DELETE FROM missions WHERE id = ${parts[1]} RETURNING id`;
        if (!row) return err(404, "Tâche introuvable");
        return new Response(null, { status: 204 });
      }
      return err(404, "Route introuvable");
    }

    // ---------- SIGNUPS ----------
    if (parts[0] === "signups") {
      if (parts.length === 3 && parts[2] === "all" && method === "GET") {
        // Toutes les inscriptions de la même personne (même email + même nom), via un code secret valide.
        if (!UUID_RE.test(parts[1])) return err(404, "Inscription introuvable");
        const [me] = await db.sql`SELECT * FROM signups WHERE cancel_token = ${parts[1]}::uuid`;
        if (!me) return err(404, "Inscription introuvable");
        const rows = await db.sql`
          SELECT s.cancel_token, s.first_name, s.last_name, s.email, s.quantity, s.waitlist, s.created_at,
                 m.id AS mission_id, m.title, m.date, m.start_time, m.end_time, m.unit, m.kind, m.slots,
                 e.id AS event_id, e.name AS event_name
          FROM signups s
          JOIN missions m ON m.id = s.mission_id
          JOIN events e ON e.id = m.event_id
          WHERE lower(s.email) = lower(${me.email})
            AND lower(s.first_name) = lower(${me.first_name})
            AND lower(s.last_name) = lower(${me.last_name})
            AND e.status = 'active'
          ORDER BY (s.cancel_token = ${parts[1]}::uuid) DESC, e.id, m.date NULLS LAST, m.start_time NULLS LAST
        `;
        return json(rows);
      }
      if (parts.length === 2 && method === "GET") {
        // Lecture publique via le code secret d'annulation uniquement (jamais par numéro),
        // et sans renvoyer l'email.
        if (!UUID_RE.test(parts[1])) return err(404, "Inscription introuvable");
        const [row] = await db.sql`SELECT mission_id, first_name, last_name, email, quantity, waitlist FROM signups WHERE cancel_token = ${parts[1]}::uuid`;
        if (!row) return err(404, "Inscription introuvable");
        return json(row);
      }
      if (parts.length === 1 && method === "POST") {
        const { mission_id, first_name, last_name, email, quantity, waitlist } = body;
        if (!mission_id || !first_name || !last_name || !email) return err(400, "Tous les champs sont requis");
        if (!EMAIL_RE.test(email)) return err(400, "Email invalide");
        const [mission] = await db.sql`SELECT * FROM missions WHERE id = ${mission_id}`;
        if (!mission) return err(404, "Créneau introuvable");
        const qty = Number(quantity) || 1;
        if (qty <= 0 || qty > 1000) return err(400, "Quantité invalide");
        const unlimited = mission.kind === "presence" && Number(mission.slots) === 0;
        if (!waitlist && !unlimited) {
          const confirmed = await db.sql`SELECT * FROM signups WHERE mission_id = ${mission_id} AND waitlist = FALSE`;
          const taken = confirmed.reduce((sum, s) => sum + Number(s.quantity || 1), 0);
          if (taken >= Number(mission.slots)) return err(409, "Ce créneau est complet");
        }
        const [already] = await db.sql`SELECT id FROM signups WHERE mission_id = ${mission_id} AND lower(email) = lower(${email})`;
        if (already) return err(409, "Cet email est déjà inscrit sur ce créneau");
        const [row] = await db.sql`
          INSERT INTO signups (mission_id, first_name, last_name, email, quantity, waitlist)
          VALUES (${mission_id}, ${first_name.trim()}, ${last_name.trim()}, ${email.trim()}, ${qty}, ${!!waitlist})
          RETURNING *
        `;
        return json(row, 201);
      }
      if (parts.length === 2 && method === "PUT") {
        // Organisateur connecté : par numéro (ou code). Bénévole : uniquement avec son code secret.
        const key = parts[1];
        const auth = getAuthOrganizer(req);
        let current;
        if (auth && /^\d+$/.test(key)) {
          [current] = await db.sql`SELECT * FROM signups WHERE id = ${Number(key)}`;
        } else if (UUID_RE.test(key)) {
          [current] = await db.sql`SELECT * FROM signups WHERE cancel_token = ${key}::uuid`;
        } else if (!auth) {
          return err(401, "Authentification requise");
        }
        if (!current) return err(404, "Inscription introuvable");
        const isOrganizer = !!auth;
        const [mission] = await db.sql`SELECT * FROM missions WHERE id = ${current.mission_id}`;

        const first_name = typeof body.first_name === "string" ? body.first_name.trim() : current.first_name;
        const last_name = typeof body.last_name === "string" ? body.last_name.trim() : current.last_name;
        const email = typeof body.email === "string" ? body.email.trim() : current.email;
        const qty = body.quantity !== undefined ? Number(body.quantity) : Number(current.quantity);
        let waitlist = current.waitlist;
        if (isOrganizer && body.waitlist !== undefined) waitlist = !!body.waitlist;

        if (!first_name || !last_name) return err(400, "Prénom et nom requis");
        if (!EMAIL_RE.test(email)) return err(400, "Email invalide");
        if (!(qty > 0) || qty > 1000) return err(400, "Quantité invalide");

        if (email.toLowerCase() !== String(current.email).toLowerCase()) {
          const [dup] = await db.sql`SELECT id FROM signups WHERE mission_id = ${current.mission_id} AND lower(email) = lower(${email}) AND id <> ${current.id}`;
          if (dup) return err(409, "Cet email est déjà inscrit sur ce créneau");
        }
        const unlimited = mission.kind === "presence" && Number(mission.slots) === 0;
        if (!waitlist && !unlimited && (qty !== Number(current.quantity) || waitlist !== current.waitlist)) {
          const others = await db.sql`SELECT quantity FROM signups WHERE mission_id = ${current.mission_id} AND waitlist = FALSE AND id <> ${current.id}`;
          const taken = others.reduce((sum, x) => sum + Number(x.quantity || 1), 0);
          if (taken + qty > Number(mission.slots)) {
            return err(409, "Pas assez de places restantes pour cette quantité");
          }
        }
        const [row] = await db.sql`
          UPDATE signups SET first_name = ${first_name}, last_name = ${last_name}, email = ${email},
            quantity = ${qty}, waitlist = ${waitlist}
          WHERE id = ${current.id} RETURNING *
        `;
        return json(isOrganizer ? row : { first_name: row.first_name, last_name: row.last_name, email: row.email, quantity: row.quantity, waitlist: row.waitlist });
      }
      if (parts.length === 2 && method === "DELETE") {
        // Organisateur connecté : suppression par numéro. Public : uniquement avec le code secret du lien d'annulation.
        const key = parts[1];
        let row;
        if (getAuthOrganizer(req) && /^\d+$/.test(key)) {
          [row] = await db.sql`DELETE FROM signups WHERE id = ${Number(key)} RETURNING id`;
        } else if (UUID_RE.test(key)) {
          [row] = await db.sql`DELETE FROM signups WHERE cancel_token = ${key}::uuid RETURNING id`;
        }
        if (!row) return err(404, "Inscription introuvable");
        return new Response(null, { status: 204 });
      }
      return err(404, "Route introuvable");
    }

    if (parts[0] === "health") return json({ ok: true });

    return err(404, "Route introuvable");
  } catch (e) {
    console.error(e);
    return err(500, "Erreur serveur");
  }
};

export const config = {
  path: "/api/*",
};
