const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/services', (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM services').all();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/services/:id', (req, res) => {
  try {
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service non trouvé' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/offers', (req, res) => {
  try {
    const offers = db.prepare('SELECT * FROM offers WHERE active = 1').all();
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments', (req, res) => {
  const { client_name, client_email, client_phone, service_id, appointment_date, appointment_time, notes } = req.body;

  if (!client_name || !client_email || !appointment_date || !appointment_time) {
    return res.status(400).json({ error: 'Nom, email, date et heure sont requis' });
  }

  try {
    const existing = db.prepare(
      `SELECT id FROM appointments WHERE appointment_date = ? AND appointment_time = ? AND status NOT IN ('cancelled')`
    ).get(appointment_date, appointment_time);

    if (existing) {
      return res.status(409).json({ error: 'Ce créneau est déjà réservé. Veuillez choisir un autre horaire.' });
    }

    const stmt = db.prepare(`INSERT INTO appointments (client_name, client_email, client_phone, service_id, appointment_date, appointment_time, notes, status)
                             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`);
    const result = stmt.run(client_name, client_email, client_phone, service_id, appointment_date, appointment_time, notes);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Votre demande a été envoyée ! Nous vous contacterons pour confirmer le rendez-vous.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/appointments/booked', (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date requise' });
    const times = db.prepare(
      `SELECT appointment_time FROM appointments WHERE appointment_date = ? AND status NOT IN ('cancelled')`
    ).all(date);
    res.json(times.map(t => t.appointment_time));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/appointments', (req, res) => {
  try {
    const { date, status, search } = req.query;
    let sql = `SELECT a.*, s.name as service_name FROM appointments a LEFT JOIN services s ON a.service_id = s.id WHERE 1=1`;
    let params = [];

    if (date) { sql += ` AND a.appointment_date = ?`; params.push(date); }
    if (status) { sql += ` AND a.status = ?`; params.push(status); }
    if (search) { sql += ` AND (a.client_name LIKE ? OR a.client_phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`); }

    sql += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC`;
    const appointments = db.prepare(sql).all(...params);
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/appointments', (req, res) => {
  const { client_name, client_email, client_phone, service_id, appointment_date, appointment_time, notes } = req.body;

  if (!client_name || !client_email || !appointment_date || !appointment_time) {
    return res.status(400).json({ error: 'Nom, email, date et heure sont requis' });
  }

  try {
    const existing = db.prepare(
      `SELECT id FROM appointments WHERE appointment_date = ? AND appointment_time = ? AND status NOT IN ('cancelled')`
    ).get(appointment_date, appointment_time);

    if (existing) {
      return res.status(409).json({ error: 'Ce créneau est déjà réservé.' });
    }

    const stmt = db.prepare(`INSERT INTO appointments (client_name, client_email, client_phone, service_id, appointment_date, appointment_time, notes, status)
                             VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`);
    const result = stmt.run(client_name, client_email, client_phone, service_id, appointment_date, appointment_time, notes);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Rendez-vous ajouté avec succès !' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/stats', (req, res) => {
  try {
    const today = db.prepare(`SELECT COUNT(*) as count FROM appointments WHERE appointment_date = date('now')`).get();
    const week = db.prepare(`SELECT COUNT(*) as count FROM appointments WHERE appointment_date >= date('now', '-7 days')`).get();
    const total = db.prepare(`SELECT COUNT(*) as count FROM appointments`).get();
    const pending = db.prepare(`SELECT COUNT(*) as count FROM appointments WHERE status = 'pending'`).get();
    res.json({ today: today.count, week: week.count, total: total.count, pending: pending.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/appointments/:id/status', (req, res) => {
  try {
    const { status, internal_notes } = req.body;
    if (internal_notes !== undefined) {
      db.prepare('UPDATE appointments SET internal_notes = ? WHERE id = ?').run(internal_notes, req.params.id);
      return res.json({ message: 'Notes mises à jour' });
    }
    const valid = ['pending', 'confirmed', 'arrived', 'completed', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
    db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/appointments/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
    res.json({ message: 'Rendez-vous supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
