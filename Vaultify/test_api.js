const axios = require('axios');

async function runTests() {
    try {
        console.log("Dodawanie transakcji 'wants' o wartości 150...");
        await axios.post('http://localhost:3000/api/transactions', {
            user_id: 1,
            amount: 150,
            category: 'Kino',
            type: 'wants'
        });

        console.log("Pobieranie statusu budżetu...");
        const response = await axios.get('http://localhost:3000/api/budget/status/1');
        console.log("Wynik:");
        console.log(response.data);
    } catch (err) {
        console.error("Test failed:", err.message);
    }
}

setTimeout(runTests, 2000);
