require('dotenv').config();
const express = require('express');
const cors = require('cors');

require('./db'); // initialise la base au démarrage

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const missionRoutes = require('./routes/missions');
const signupRoutes = require('./routes/signups');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/signups', signupRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

app.listen(PORT, () => {
  console.log(`API disponible sur http://localhost:${PORT}`);
});
