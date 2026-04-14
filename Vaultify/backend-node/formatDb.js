const db = require('./db');
const csvPipeline = require('./importCSV');
const path = require('path');

db.serialize(() => {
    // 1. Opróźniamy bazę ze starych 'zapamiętanych' danych z filiżanką
    db.run("DELETE FROM transactions", (err) => {
        if (err) {
            console.error("Blad czyszczenia:", err);
            return;
        }
        console.log("--> Usunięto zapisy historii do zera.");
        
        // 2. Synchronizujemy prawdziwy rurociąg ETL w parze z Gemini AI
        const csvPath = path.resolve(__dirname, '../wyciągi.csv');
        csvPipeline.processTransactionsFromCSV(csvPath, 1);
    });
});
