const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'vaultify.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Błąd połączenia z bazą SQLite', err.message);
    } else {
        console.log('Połączono z bazą SQLite.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                net_income REAL DEFAULT 0,
                daily_allowance REAL DEFAULT 0
            )`);
            
            db.run(`CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                amount REAL,
                category TEXT,
                type TEXT, -- np. "wants", "needs", "savings"
                date TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`);
            
            db.run(`CREATE TABLE IF NOT EXISTS fixed_costs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                keyword TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`);

            // Wstaw przykładowego użytkownika na potrzeby MVP
            db.get(`SELECT count(*) as count FROM users`, (err, row) => {
                if (row.count === 0) {
                    db.run(`INSERT INTO users (name, net_income) VALUES ('Demo User', 5000)`);
                }
            });
        });
    }
});

module.exports = db;
