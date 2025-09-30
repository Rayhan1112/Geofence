// backend/server.js
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Reha@123",
  database: "flutter_demo"
});

db.connect(err => {
  if (err) {
    console.error("❌ MySQL connection error: ", err);
    return;
  }
  console.log("✅ MySQL Connected...");
});

// ✅ Create table if not exists
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
  if (err) {
    console.error('❌ Error creating table:', err);
  } else {
    console.log('✅ users table ready');

    // ✅ Insert default user on startup
    const defaultUser = {
      name: "Default User",
      roll_no: "R001",
      phone_no: "1234567890",
      device_id: "device-default"
    };

    const insertSql = `
      INSERT INTO users (name, roll_no, phone_no, device_id, synced_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE synced_at = CURRENT_TIMESTAMP
    `;

    db.query(
      insertSql,
      [defaultUser.name, defaultUser.roll_no, defaultUser.phone_no, defaultUser.device_id],
      (err) => {
        if (err) console.error("❌ Error inserting default user:", err);
        else console.log("✅ Default user inserted/updated");
      }
    );
  }
});

// ✅ Register endpoint (insert user)
app.post('/register', (req, res) => {
  const { name, rollNo, phoneNo, deviceId } = req.body;
  if (!name || !rollNo || !phoneNo || !deviceId) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const sql = `
    INSERT INTO users (name, roll_no, phone_no, device_id, synced_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  db.query(sql, [name, rollNo, phoneNo, deviceId], (err, result) => {
    if (err) {
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

    db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [result.insertId], (qErr, rows) => {
      if (qErr) return res.status(500).json({ message: 'DB error', error: qErr });
      return res.status(200).json(rows[0]);
    });
  });
});

// ✅ Get all users
app.get('/users', (req, res) => {
  db.query('SELECT * FROM users ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
});

// ✅ Get user by deviceId
app.get('/users/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  db.query('SELECT * FROM users WHERE device_id = ? LIMIT 1', [deviceId], (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
