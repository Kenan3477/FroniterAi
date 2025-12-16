const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'kennex.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
        this.initializeTables();
      }
    });
  }

  initializeTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE,
        firstName TEXT,
        lastName TEXT,
        role TEXT DEFAULT 'user',
        isActive BOOLEAN DEFAULT 1,
        lastLogin DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.run(createUsersTable, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
      } else {
        console.log('Users table created successfully');
        this.createDefaultUser();
      }
    });
  }

  async createDefaultUser() {
    const hashedPassword = await bcrypt.hash('3477', 10);
    
    const insertUser = `
      INSERT OR IGNORE INTO users (username, password, email, firstName, lastName, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    this.db.run(insertUser, [
      'Albert',
      hashedPassword,
      'albert@kennex.ai',
      'Albert',
      'AI',
      'admin'
    ], function(err) {
      if (err) {
        console.error('Error creating default user:', err);
      } else if (this.changes > 0) {
        console.log('Default user Albert created successfully');
      } else {
        console.log('Default user Albert already exists');
      }
    });
  }

  getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE username = ? AND isActive = 1';
      this.db.get(query, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  updateLastLogin(userId) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?';
      this.db.run(query, [userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = new Database();