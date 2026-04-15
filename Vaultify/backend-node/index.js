const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

app.use(cors());
app.use(express.json());

// Endpoint zdrowia
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Vaultify Node Backend' });
});

// Pobieranie profilu usera
app.get('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json(row);
    });
});

// Aktualizacja profilu usera
app.put('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    const { name, net_income, savings_model, expected_raise, smart_allocation, custom_needs, custom_wants, custom_savings, payday } = req.body;
    
    db.run(
        `UPDATE users SET 
            name = COALESCE(?, name),
            net_income = COALESCE(?, net_income),
            savings_model = COALESCE(?, savings_model),
            expected_raise = COALESCE(?, expected_raise),
            smart_allocation = COALESCE(?, smart_allocation),
            custom_needs = COALESCE(?, custom_needs),
            custom_wants = COALESCE(?, custom_wants),
            custom_savings = COALESCE(?, custom_savings),
            payday = COALESCE(?, payday)
        WHERE id = ?`,
        [name, net_income, savings_model, expected_raise, smart_allocation, custom_needs, custom_wants, custom_savings, payday, userId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
            
            db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(row);
            });
        }
    );
});

// Utworzenie nowej transakcji (np. ręcznie przez przycisk +)
app.post('/api/transactions', async (req, res) => {
    const { user_id, amount, category, type } = req.body;
    const date = new Date().toISOString();
    
    // Jeśli z frontendu z jakiegoś powodu ukryto typ (by oddać to maszynie)
    let finalType = type;
    if (!finalType || finalType === 'auto') {
        try {
            const aiRes = await axios.post(`${AI_SERVICE_URL}/categorize`, {
                description: category
            });
            finalType = aiRes.data.category || 'wants';
        } catch(err) {
            finalType = 'wants';
        }
    }
    
    db.run(
        `INSERT INTO transactions (user_id, amount, category, type, date) VALUES (?, ?, ?, ?, ?)`,
        [user_id, amount, category, finalType, date],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, status: 'success', category_ai_assigned: finalType });
        }
    );
});

// Historia wszystkich transakcji (Dla drugiego ekranu)
app.get('/api/transactions/:userId', (req, res) => {
    const userId = req.params.userId;
    db.all(
        `SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC`,
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Endpoint do synchronizacji budżetu 50/30/20 (Node -> Python)
app.post('/api/budget/refresh/:userId', async (req, res) => {
    const userId = req.params.userId;
    db.get('SELECT net_income FROM users WHERE id = ?', [userId], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/calculate`, {
                net_income: row.net_income
            });
            res.json({ status: 'success', budget: response.data });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to communicate with AI Service' });
        }
    });
});

// --- SMART SUBSCRIPTIONS TRACKER ---

// 1. Zapis nowego rachunku na słowo klucz
app.post('/api/fixed-costs', (req, res) => {
    const { user_id, keyword } = req.body;
    
    // Walidacja - sprawdzamy czy keyword faktycznie istnieje w historii
    db.get(`SELECT id FROM transactions WHERE user_id = ? AND category LIKE ? LIMIT 1`, 
    [user_id, `%${keyword}%`], 
    (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (!row) {
            return res.status(404).json({ error: 'Nie znaleziono takiego wydatku w wyciągach.' });
        }

        // Rekord istnieje, dodajemy koszt stały
        db.run(`INSERT INTO fixed_costs (user_id, keyword) VALUES (?, ?)`, [user_id, keyword], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
    });
});

// 1.5. Usuwanie subskrypcji
app.delete('/api/fixed-costs/:id', (req, res) => {
    db.run('DELETE FROM fixed_costs WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});


// 2. Analityka: Wyciąganie realnych kosztów z historii bankowej
app.get('/api/fixed-costs/:userId', (req, res) => {
    const userId = req.params.userId;
    // Bierzemy słowa kluczowe posiadane przez uzytkownika
    db.all(`SELECT id, keyword FROM fixed_costs WHERE user_id = ?`, [userId], (err, keywords) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let operationsResolved = 0;
        let subscriptions = [];
        
        if (keywords.length === 0) {
            return res.json([]);
        }

        keywords.forEach(kw => {
            db.get(`SELECT amount, category, date FROM transactions 
                    WHERE user_id = ? 
                    AND category LIKE ? 
                    ORDER BY date DESC LIMIT 1`, 
            [userId, `%${kw.keyword}%`], 
            (txErr, txRow) => {
                operationsResolved++;
                
                if (!txErr && txRow) {
                    subscriptions.push({
                        id: kw.id,
                        keyword: kw.keyword,
                        matchedAs: txRow.category,
                        amount: txRow.amount
                    });
                }
                
                if (operationsResolved === keywords.length) {
                    res.json(subscriptions);
                }
            });
        });
    });
});

// Endpoint wyliczający Safe-to-Spend i Daily allowance
app.get('/api/budget/status/:userId', (req, res) => {
    const userId = req.params.userId;
    
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, userRow) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!userRow) return res.status(404).json({ error: 'User not found' });

        try {
            const model = userRow.savings_model || '503020';
            const expectedRaise = userRow.expected_raise || 0;
            const smartAlloc = userRow.smart_allocation || 50;
            const customNeeds = userRow.custom_needs || 50;
            const customWants = userRow.custom_wants || 30;
            const customSavings = userRow.custom_savings || 20;

            // Pobierz podział budżetowy z Python AI
            const aiRes = await axios.post(`${AI_SERVICE_URL}/calculate`, {
                net_income: userRow.net_income,
                model: model,
                expected_raise: expectedRaise,
                smart_allocation: smartAlloc,
                custom_needs: customNeeds,
                custom_wants: customWants,
                custom_savings: customSavings
            });
            const baseWants = aiRes.data.wants;

            // Pobierz sumę wydatków "wants" w obecnym miesiącu
            const currentMonth = new Date().toISOString().slice(0, 7); // yyyy-mm
            db.get(`SELECT SUM(amount) as spent_wants FROM transactions WHERE user_id = ? AND type = 'wants' AND date LIKE ?`, 
                [userId, currentMonth + '%'], 
                (err, sumRow) => {
                if (err) return res.status(500).json({ error: err.message });
                
                const spentWants = sumRow.spent_wants || 0;
                const safeToSpend = baseWants - spentWants;
                
                // Oblicz dni do następnej wypłaty (uwzględniając dzień wypłaty)
                const payday = userRow.payday || 1;
                const now = new Date();
                const today = now.getDate();
                let daysLeft;
                
                if (today < payday) {
                    // Jeszcze nie było wypłaty w tym miesiącu – liczymy do dnia wypłaty
                    daysLeft = payday - today;
                } else {
                    // Wypłata już była – liczymy do następnej wypłaty (w przyszłym miesiącu)
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    daysLeft = (lastDay - today) + payday;
                }
                daysLeft = Math.max(daysLeft, 1);

                const dailyAllowance = daysLeft > 0 ? (safeToSpend / daysLeft) : 0;

                res.json({
                    net_income: userRow.net_income,
                    base_wants: baseWants,
                    spent_wants: spentWants,
                    safe_to_spend: safeToSpend,
                    daily_allowance: dailyAllowance,
                    days_left: daysLeft,
                    payday: payday,
                    savings_model: model,
                    expected_raise: expectedRaise,
                    smart_allocation: smartAlloc,
                    custom_needs: customNeeds,
                    custom_wants: customWants,
                    custom_savings: customSavings,
                    savings: aiRes.data.savings,
                    needs: aiRes.data.needs,
                    user_name: userRow.name
                });
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to communicate with AI Service' });
        }
    });
});

// --- CELE OSZCZĘDNOŚCIOWE ---

// Pobierz cele oszczędnościowe użytkownika
app.get('/api/savings-goals/:userId', (req, res) => {
    db.all('SELECT * FROM savings_goals WHERE user_id = ? ORDER BY id DESC', [req.params.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Dodaj nowy cel
app.post('/api/savings-goals', (req, res) => {
    const { user_id, name, target_amount } = req.body;
    if (!name || !target_amount) return res.status(400).json({ error: 'Podaj nazwę i kwotę celu.' });
    
    db.run('INSERT INTO savings_goals (user_id, name, target_amount, current_amount) VALUES (?, ?, ?, 0)',
        [user_id, name, target_amount],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, success: true });
        }
    );
});

// Aktualizuj postęp celu
app.put('/api/savings-goals/:id', (req, res) => {
    const { current_amount } = req.body;
    db.run('UPDATE savings_goals SET current_amount = ? WHERE id = ?', [current_amount, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Usuń cel
app.delete('/api/savings-goals/:id', (req, res) => {
    db.run('DELETE FROM savings_goals WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Zakończenie routingu i start serwera

// Ręczne uruchomienie synchronizacji
app.post('/api/banking/sync/:userId', (req, res) => {
    const userId = req.params.userId;
    const banking = require('./banking');
    banking.syncUserTransactions(userId);
    res.json({ status: 'success', message: `Rozpoczęto synchronizację bankową dla ${userId}.` });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Node backend running on port ${PORT}`);
    const banking = require('./banking');
    banking.startCronJobs();
});

