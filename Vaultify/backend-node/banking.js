const cron = require('node-cron');
const db = require('./db');
const axios = require('axios');
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const mockTransactions = [
    { amount: 15, category: 'Subskrypcja Spotify Premium' },
    { amount: 120, category: 'Sklep Biedronka - Produkty Spożywcze' },
    { amount: 50, category: 'Stacja Paliw Orlen' },
    { amount: 30, category: 'Bilety Kino Helios' },
    { amount: 150, category: 'Dyskont Lidl' },
    { amount: 45, category: 'Kawa Starbucks' },
    { amount: 2500, category: 'Opłata Czynsz za miesiąc' },
    { amount: 39, category: 'Kebab u Prawdziwego Polaka' },
];

function fetchMockBankTransactions(userId) {
    // Losuje 1-2 operacje z naszej sztucznej puli
    const num = Math.floor(Math.random() * 2) + 1;
    const result = [];
    for (let i = 0; i < num; i++) {
        const randomTx = mockTransactions[Math.floor(Math.random() * mockTransactions.length)];
        result.push(randomTx);
    }
    return result;
}

async function syncUserTransactions(userId) {
    console.log(`[Banking] Synchronizacja transakcji dla użytkownika ID: ${userId}...`);
    const newTx = fetchMockBankTransactions(userId);
    const date = new Date().toISOString();

    for (const tx of newTx) {
        let aiType = 'wants'; // Domyślne podejście awaryjne w ramach 50/30/20
        try {
            // Uderzamy do naszego węzła AI, a on odpala chmurę Gemini
            const aiRes = await axios.post(`${AI_SERVICE_URL}/categorize`, {
                description: tx.category
            });
            if (aiRes.data && aiRes.data.error) {
                console.error('[Banking AI] Gemini wewnętrzny błąd (Python):', aiRes.data.error);
            }
            if (aiRes.data && aiRes.data.category) {
                aiType = aiRes.data.category;
            }
        } catch(err) {
            console.error('[Banking AI] Błąd procesowania chmury NLP:', err.message);
        }

        db.run(
            `INSERT INTO transactions (user_id, amount, category, type, date) VALUES (?, ?, ?, ?, ?)`,
            [userId, tx.amount, tx.category, aiType, date],
            function(err) {
                if (err) console.error('[Banking] Błąd zapisu transakcji:', err.message);
                else {
                    console.log(`[Banking] Zapisano transakcję: ${tx.category} - ${tx.amount} PLN (${aiType})`);
                    
                    // Alert behawioralny: sprawdzenie czy wydano 80% dziennego limitu
                    if (aiType === 'wants') {
                        checkDailyAllowanceAlert(userId);
                    }
                }
            }
        );
    }
}

function checkDailyAllowanceAlert(userId) {
    db.get('SELECT daily_allowance FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) return;
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        db.get(
            `SELECT SUM(amount) as total_wants FROM transactions WHERE user_id = ? AND type = 'wants' AND date LIKE ?`,
            [userId, currentMonth + '%'],
            (err, sumRow) => {
                if (err) return;
                
                const spent = sumRow.total_wants || 0;
                // Simplified MVP alert check logic (e.g. today's spending vs daily allowance)
                const today = new Date().toISOString().slice(0, 10);
                db.get(
                    `SELECT SUM(amount) as today_wants FROM transactions WHERE user_id = ? AND type = 'wants' AND date LIKE ?`,
                    [userId, today + '%'],
                    (err, todayRow) => {
                        const todaySpent = todayRow.today_wants || 0;
                        if (todaySpent >= user.daily_allowance * 0.8) {
                            console.log(`🔔 [ALERT] Użytkownik ${userId} wydał już ${todaySpent} PLN z dziennej puli! (Ostrzeżenie behawioralne)`);
                        }
                    }
                )
            }
        )
    });
}

function startCronJobs() {
    // W MVP uruchamiamy sztuczny pobór raz na godzinę
    // Do testów ustawione '0 * * * *' można zmienić by wywoływało z API ręcznie
    cron.schedule('0 * * * *', () => {
        console.log('[Cron] Uruchamianie pobierania danych z banku...');
        db.all('SELECT id FROM users', [], (err, rows) => {
            if (err) return console.error(err);
            rows.forEach(row => {
                syncUserTransactions(row.id);
            });
        });
    });
    console.log('[Banking] Cron jobs zainicjowane.');
}

module.exports = {
    startCronJobs,
    syncUserTransactions
};
