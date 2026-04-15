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

            // Migracja: dodaj nowe kolumny profilu (bezpieczne - ignoruje błąd jeśli kolumna istnieje)
            db.run(`ALTER TABLE users ADD COLUMN savings_model TEXT DEFAULT '503020'`, () => {});
            db.run(`ALTER TABLE users ADD COLUMN expected_raise REAL DEFAULT 0`, () => {});
            db.run(`ALTER TABLE users ADD COLUMN smart_allocation INTEGER DEFAULT 50`, () => {});
            db.run(`ALTER TABLE users ADD COLUMN custom_needs INTEGER DEFAULT 50`, () => {});
            db.run(`ALTER TABLE users ADD COLUMN custom_wants INTEGER DEFAULT 30`, () => {});
            db.run(`ALTER TABLE users ADD COLUMN custom_savings INTEGER DEFAULT 20`, () => {});
            db.run(`ALTER TABLE users ADD COLUMN payday INTEGER DEFAULT 1`, () => {});

            // Tabela celów oszczędnościowych
            db.run(`CREATE TABLE IF NOT EXISTS savings_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT,
                target_amount REAL DEFAULT 0,
                current_amount REAL DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`);

            // Wstaw przykładowego użytkownika na potrzeby MVP
            db.get(`SELECT count(*) as count FROM users`, (err, row) => {
                if (row.count === 0) {
                    db.run(`INSERT INTO users (name, net_income, savings_model) VALUES ('Demo User', 5000, '503020')`);
                }
            });
        });
    }
});

module.exports = db;
