// server.js
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,       // e.g., 'your-db-host'
  user: process.env.DB_USER,       // e.g., 'root'
  password: process.env.DB_PASS,   // e.g., 'yourpassword'
  database: process.env.DB_NAME,   // e.g., 'flutter_demo'
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper function for queries
async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Create users table if not exists
(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        roll_no VARCHAR(50),
        phone_no VARCHAR(20),
        device_id VARCHAR(255) UNIQUE,
        synced_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table ready');
  } catch (err) {
    console.error('❌ Error creating table:', err);
  }
})();

// ---------------- ROUTES ----------------

// Register user
app.post('/register', async (req, res) => {
  const { name, rollNo, phoneNo, deviceId } = req.body;

  if (!name || !rollNo || !phoneNo || !deviceId) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    // Insert user
    const result = await query(
      'INSERT INTO users (name, roll_no, phone_no, device_id, synced_at) VALUES (?, ?, ?, ?, NOW())',
      [name, rollNo, phoneNo, deviceId]
    );

    // Fetch the inserted user
    const [user] = await query('SELECT * FROM users WHERE id = ?', [result.insertId]);

    res.status(200).json(user);
  } catch (err) {
    // Handle duplicate device_id
    if (err.code === 'ER_DUP_ENTRY') {
      const [existingUser] = await query('SELECT * FROM users WHERE device_id = ? LIMIT 1', [deviceId]);
      return res.status(200).json(existingUser);
    }
    console.error('❌ Insert error:', err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// Get all users
app.get('/users', async (req, res) => {
  try {
    const users = await query('SELECT * FROM users ORDER BY id DESC');
    res.json(users);
  } catch (err) {
    console.error('❌ Fetch users error:', err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// Get user by deviceId
app.get('/users/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  try {
    const users = await query('SELECT * FROM users WHERE device_id = ? LIMIT 1', [deviceId]);
    if (!users.length) return res.status(404).json({ message: 'User not found' });
    res.json(users[0]);
  } catch (err) {
    console.error('❌ Fetch user error:', err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, '', () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
