// backend/server.js

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();

// Enable CORS so Flutter app can call this API
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",          // change to your DB host
  user: "root",               // your DB user
  password: "Reha@123",       // your DB password
  database: "flutter_demo"    // your DB name
});

db.connect(err => {
  if (err) {
    console.error("❌ MySQL connection error: ", err);
    return;
  }
  console.log("✅ MySQL Connected...");
});

// Create users table if not exists
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  roll_no VARCHAR(50),
  phone_no VARCHAR(20),
  device_id VARCHAR(255) UNIQUE,
  synced_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

db.query(createUsersTable, (err) => {
  if (err) console.error('❌ Error creating table:', err);
  else console.log('✅ Users table ready');
});

// ----------------- API Endpoints ------------------

// Register user
app.post('/register', (req, res) => {
  const { name, rollNo, phoneNo, deviceId } = req.body;

  if (!name || !rollNo || !phoneNo || !deviceId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const sql = `
    INSERT INTO users (name, roll_no, phone_no, device_id, synced_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  db.query(sql, [name, rollNo, phoneNo, deviceId], (err, result) => {
    if (err) {
      // Handle duplicate device_id
      if (err.code === 'ER_DUP_ENTRY') {
        return db.query(
          'SELECT * FROM users WHERE device_id = ? LIMIT 1',
          [deviceId],
          (qErr, rows) => {
            if (qErr) return res.status(500).json({ message: 'DB error', error: qErr });
            return res.status(200).json(rows[0]);
          }
        );
      }
      console.error('❌ Insert error:', err);
      return res.status(500).json({ message: 'Database error', error: err });
    }

    // Fetch inserted user
    db.query(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [result.insertId],
      (qErr, rows) => {
        if (qErr) return res.status(500).json({ message: 'DB error', error: qErr });
        return res.status(200).json(rows[0]);
      }
    );
  });
});

// Get all users
app.get('/users', (req, res) => {
  db.query('SELECT * FROM users ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err });
    res.json(rows);
  });
});

// Get user by deviceId
app.get('/users/:deviceId', (req, res) => {
  const { deviceId } = req.params;

  db.query('SELECT * FROM users WHERE device_id = ? LIMIT 1', [deviceId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err });
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  });
});

// ----------------- Start server ------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
});
