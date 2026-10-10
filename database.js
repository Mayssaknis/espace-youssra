const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.RENDER_DISK_PATH || __dirname;
const dbPath = path.join(dataDir, 'spa.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    duration INTEGER,
    category TEXT,
    image TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    service_id INTEGER,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    discount_percent INTEGER,
    valid_until TEXT,
    active INTEGER DEFAULT 1
  )
`);

try { db.exec(`ALTER TABLE appointments ADD COLUMN internal_notes TEXT DEFAULT ''`); } catch (e) {}

const existingServices = db.prepare('SELECT COUNT(*) as count FROM services').get();
if (existingServices.count === 0) {
  const insertService = db.prepare("INSERT INTO services (name, description, price, duration, category) VALUES (?, ?, ?, ?, ?)");
  
  // Cheveux
  insertService.run('Brochage', 'Tissage et extension de cheveux professionnel', 120, 90, 'Cheveux');
  insertService.run('Soin Capillaire', 'Traitement nourrissant et réparateur pour cheveux', 80, 45, 'Cheveux');
  insertService.run('Coloration', 'Coloration professionnelle avec produits de qualité', 150, 120, 'Cheveux');
  
  // Ongles
  insertService.run('Manucure', 'Soin complet des mains avec pose de vernis', 80, 45, 'Ongles');
  insertService.run('Pédicure', 'Soin complet des pieds avec pose de vernis', 90, 45, 'Ongles');
  insertService.run('Gel/Vernis', 'Pose de gel ou vernis semi-permanent', 120, 60, 'Ongles');
  
  // Épilation
  insertService.run('Épilation Visage', 'Épilation précise du visage (sourcils, lèvre, menton)', 40, 30, 'Épilation');
  insertService.run('Épilation Corps', 'Épilation complète du corps (jambes, bras, maillot)', 80, 60, 'Épilation');
  insertService.run('Épilation Zones Spéciales', 'Épilation des zones sensibles', 60, 45, 'Épilation');
  
  // Hammam
  insertService.run('Hammam Seul', 'Accès au hammam avec serviettes et savon noir', 80, 60, 'Hammam');
  insertService.run('Hammam avec Gommage', 'Hammam suivi d\'un gommage corporel complet', 120, 90, 'Hammam');
  
  // Maquillage
  insertService.run('Maquillage Jour', 'Maquillage naturel et léger pour le quotidien', 100, 45, 'Maquillage');
  insertService.run('Maquillage Soirée', 'Maquillage sophistiqué pour vos soirées', 150, 60, 'Maquillage');
  insertService.run('Maquillage Mariée', 'Forfait mariage complet avec essai et retouches', 350, 120, 'Maquillage');
}

const existingOffers = db.prepare('SELECT COUNT(*) as count FROM offers').get();
if (existingOffers.count === 0) {
  const insertOffer = db.prepare("INSERT INTO offers (title, description, discount_percent, valid_until) VALUES (?, ?, ?, ?)");
  insertOffer.run('Cheveux', 'Brochage, Soin, Coloration', 0, null);
  insertOffer.run('Ongles', 'Manucure, Pédicure, Gel/Vernis', 0, null);
  insertOffer.run('Épilation', 'Visage, Corps, Zones spéciales', 0, null);
  insertOffer.run('Hammam', 'Hammam seul ou avec gommage', 0, null);
  insertOffer.run('Maquillage', 'Jour, Soirée, Mariée', 0, null);
}

module.exports = db;
