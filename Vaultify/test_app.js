async function runDemo() {
    console.log("=== SYMULACJA Open Banking (Instancja Cron) ===\n");
    try {
        console.log("1. Sprawdzanie statusu budżetu przed wpłatą...");
        let statusRes = await fetch('http://localhost:3000/api/budget/status/1');
        let status = await statusRes.json();
        console.log(`Przed symulacją -> Dniówka: ${status.daily_allowance.toFixed(2)} PLN (Wydane: ${status.spent_wants} PLN)\n`);

        console.log("2. Wymuszanie synchronizacji z mockowanym API bankowym (GoCardless/Nordigen)...");
        let syncRes = await fetch('http://localhost:3000/api/banking/sync/1', { method: 'POST' });
        let syncData = await syncRes.json();
        console.log("Wynik:", syncData.message, "\n");

        // Czekamy 1s by baza zdążyła zapisać potencjalnie pare transakcji
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log("3. Weryfikacja zmiany w systemie na żywo...");
        statusRes = await fetch('http://localhost:3000/api/budget/status/1');
        status = await statusRes.json();
        
        console.log(`Po symulacji -> ZAKTUALIZOWANA DNIÓWKA: ${status.daily_allowance.toFixed(2)} PLN`);
        console.log(`Ogólnie wydano (wliczając nowe operacje z banku): ${status.spent_wants} PLN`);
        console.log(`Pozostało do końca miesiąca Safe-to-Spend: ${status.safe_to_spend} PLN\n`);

    } catch (err) {
        console.error("Błąd połączenia. Upewnij się, że serwer działa.", err.message);
    }
}
runDemo();
