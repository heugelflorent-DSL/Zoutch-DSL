const TOKEN_KEY = 'zoutch_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = (data && data.error) || `Erreur ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me', { auth: true }),
  listOrganizers: () => request('/auth/organizers', { auth: true }),
  createOrganizer: (username, password) =>
    request('/auth/organizers', { method: 'POST', body: { username, password }, auth: true }),
  updateOrganizer: (id, data) =>
    request(`/auth/organizers/${id}`, { method: 'PUT', body: data, auth: true }),
  deleteOrganizer: (id) => request(`/auth/organizers/${id}`, { method: 'DELETE', auth: true }),

  listEvents: (status) => request(`/events${status ? `?status=${status}` : ''}`),
  getEvent: (id) => request(`/events/${id}`),
  createEvent: (payload) => request('/events', { method: 'POST', body: payload, auth: true }),
  updateEvent: (id, payload) => request(`/events/${id}`, { method: 'PUT', body: payload, auth: true }),
  archiveEvent: (id) => request(`/events/${id}/archive`, { method: 'POST', auth: true }),
  unarchiveEvent: (id) => request(`/events/${id}/unarchive`, { method: 'POST', auth: true }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE', auth: true }),

  createMission: (payload) => request('/missions', { method: 'POST', body: payload, auth: true }),
  getMission: (id) => request(`/missions/${id}`),
  updateMission: (id, payload) => request(`/missions/${id}`, { method: 'PUT', body: payload, auth: true }),
  deleteMission: (id) => request(`/missions/${id}`, { method: 'DELETE', auth: true }),
  missionSignups: (id) => request(`/missions/${id}/signups`, { auth: true }),

  signup: (payload) => request('/signups', { method: 'POST', body: payload }),
  getSignup: (id) => request(`/signups/${id}`),
  deleteSignup: (id) => request(`/signups/${id}`, { method: 'DELETE', auth: true }),
  cancelSignupPublic: (id) => request(`/signups/${id}`, { method: 'DELETE' }),
  updateSignupPublic: (token, data) => request(`/signups/${token}`, { method: 'PUT', body: data }),
  updateSignup: (id, data) => request(`/signups/${id}`, { method: 'PUT', body: data, auth: true }),
  promoteSignup: (id) => request(`/signups/${id}`, { method: 'PUT', body: { waitlist: false }, auth: true }),
};
