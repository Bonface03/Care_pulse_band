// sqlite3 required dynamically later if not using Postgres
const { Pool } = require('pg');
const path = require('path');

const isPostgres = !!process.env.DATABASE_URL;

let db;
let pool;

// A simple wrapper to unify sqlite3 and pg
const dbWrapper = {
  run: async (sql, params = []) => {
    if (isPostgres) {
      // Very basic ? to $1, $2 converter for our simple queries
      let i = 1;
      const pgSql = sql.replace(/\?/g, () => `$${i++}`);
      const res = await pool.query(pgSql, params);
      return { lastID: res.rows[0]?.id || null };
    } else {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        });
      });
    }
  },
  get: async (sql, params = []) => {
    if (isPostgres) {
      let i = 1;
      const pgSql = sql.replace(/\?/g, () => `$${i++}`);
      const res = await pool.query(pgSql, params);
      return res.rows[0];
    } else {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }
  },
  all: async (sql, params = []) => {
    if (isPostgres) {
      let i = 1;
      const pgSql = sql.replace(/\?/g, () => `$${i++}`);
      const res = await pool.query(pgSql, params);
      return res.rows;
    } else {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  }
};

if (isPostgres) {
  console.log('Connecting to PostgreSQL database...');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Create tables for Postgres
  pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sensor_data (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      spo2 REAL,
      heart_rate REAL,
      blood_glucose REAL,
      fall_status VARCHAR(50),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `).then(() => {
      console.log('PostgreSQL tables verified');
      // Attempt to add column if it doesn't exist
      return pool.query('ALTER TABLE sensor_data ADD COLUMN fall_status VARCHAR(50);').catch(() => {});
  }).catch(err => console.error('Error creating PG tables', err));

} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(__dirname, 'carepulse.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database', err.message);
    } else {
      console.log('Connected to the SQLite database.');
      // Create Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create SensorData table
      db.run(`CREATE TABLE IF NOT EXISTS sensor_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        spo2 REAL,
        heart_rate REAL,
        blood_glucose REAL,
        fall_status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`, () => {
        // Attempt to add column if it doesn't exist
        db.run('ALTER TABLE sensor_data ADD COLUMN fall_status TEXT', (err) => {
          // Ignore error if column already exists
        });
      });
    }
  });
}

module.exports = dbWrapper;
