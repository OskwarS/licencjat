const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const iconv = require('iconv-lite');
const db = require('./db');
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

async function processTransactionsFromCSV(filePath, userId) {
    if (!fs.existsSync(filePath)) {
        console.error(`[CSV Parser] Plik nie istnieje: ${filePath}`);
        return;
    }

    console.log(`[CSV Parser] Przetwarzanie wyciągu z pliku: ${path.basename(filePath)}...`);

    const results = [];

    // Odkodowanie pliku CSV z CP1250 (polskie znaki) do UTF-8 na żywo używając readStream
    fs.createReadStream(filePath)
        .pipe(iconv.decodeStream('win1250'))
        .pipe(csv({
            separator: ',',
            // PKO CSV posiada nagłówki w 1 wierszu, ale dla pewności zignorujemy puste
            mapHeaders: ({ header, index }) => index.toString()
        }))
        .on('data', (data) => {
            // Kolumny dla PKO BP po indexach:
            // 0: Data operacji
            // 2: Typ transakcji
            // 3: Kwota
            // 6, 7, 8: Tytul / Odbiorca / Lokalizacja

            const amountStr = data['3'] ? data['3'].trim() : "";
            const isNegative = amountStr.startsWith('-');
            const kwotaPLN = parseFloat(amountStr.replace(',', '.').replace('-', ''));

            // Reagujemy tylko na PRAWNINE wydatki
            if (isNegative && kwotaPLN > 0) {
                const pureDate = data['0'] ? data['0'].replace(/"/g, '') : new Date().toISOString().slice(0, 10);
                const typOperacji = data['2'] ? data['2'].replace(/"/g, '') : '';

                let descFull = '';

                // Logika wyciągania sensownych nazw
                if (typOperacji.includes('Płatność kartą') || typOperacji.includes('Apple Pay') || typOperacji.includes('BLIK')) {
                    // Dla płatności kartą szukamy "Lokalizacja: Adres: [NAZWA] Miasto:" w data[7] lub data[8]
                    const locData = [data['6'], data['7'], data['8'], data['9']].find(d => d && d.includes('Lokalizacja: Adres:'));
                    if (locData) {
                        const match = locData.match(/Adres:\s*(.*?)\s*Miasto:/);
                        if (match && match[1]) {
                            descFull = match[1].trim();
                        } else {
                            descFull = locData.replace('Lokalizacja: Adres:', '').trim();
                        }
                    } else {
                        // Fallback jeśli nie ma lokalizacji, bierzemy pierwszy nie-liczbowy tytuł
                        descFull = [data['6'], data['7']].join(' ').replace(/Tytuł:\s*[\d\s]+/, '').trim();
                    }
                } else if (typOperacji.includes('telefon')) {
                    // Przelew na telefon - szukamy Nazwy Odbiorcy
                    const nameData = [data['6'], data['7'], data['8']].find(d => d && d.includes('Nazwa odbiorcy:'));
                    descFull = nameData ? nameData.replace('Nazwa odbiorcy:', '').trim() : 'Przelew na telefon';
                } else {
                    // Zwykłe przelewy - wycinamy śmieci "Rachunek odbiorcy"
                    descFull = [data['6'], data['7'], data['8']]
                        .filter(str => str && str.trim().length > 0)
                        .filter(str => !str.includes('Rachunek odbiorcy:'))
                        .join(" | ")
                        .replace(/"/g, "")
                        .replace(/Nazwa odbiorcy:/g, "")
                        .replace(/Tytuł:/g, "")
                        .trim();
                }

                // Dodatkowe czyszczenie pod AI by brzmiało naturalnie
                descFull = descFull.replace(/\s+/g, ' ').substring(0, 50);

                results.push({
                    amount: kwotaPLN,
                    category: descFull || "Niezidentyfikowany wydatek",
                    date: pureDate + 'T12:00:00.000Z'
                });
            }
        })
        .on('end', async () => {
            console.log(`[CSV Parser] Rozpoznano ${results.length} operacji wydatkowych do oceny przez Gemini AI!`);

            const aiCache = new Map();
            const delay = ms => new Promise(res => setTimeout(res, ms));

            // HYBRYDOWY SŁOWNIK LOKALNY - pozwala zignorować AI dla 90% powtarzalnych w Polsce transakcji (Ekstremalne przyspieszenie skryptu)
            const localNeeds = ['BIEDRONKA', 'KAUFLAND', 'LIDL', 'ZABKA', 'STOKROTKA', 'DEALZ', 'NETTO', 'APTEKA', 'PIEKARNIA', 'CUKIERNIA', 'ORLEN', 'BP', 'SHELL', 'CIRCLE', 'CARREFOUR', 'AUCHAN', 'ALDI', 'ROSSMANN'];
            const localWants = ['SPOTIFY', 'NETFLIX', 'ENDORFINA', 'MCDONALD', 'KFC', 'KEBAB', 'VAPE', 'LODOLANDIA', 'KINO', 'MULTIPLEX', 'MAX BURGER', 'BURGER KING', 'ZALANDO', 'HBO', 'DISNEY', 'APPLE.COM'];

            for (const tx of results) {
                let aiType = 'needs';
                const descUpper = tx.category.toUpperCase();

                // 1. Sprawdzamy lokalne filtry (natychmiastowe 0.0s)
                if (localNeeds.some(keyword => descUpper.includes(keyword))) {
                    aiType = 'needs';
                }
                else if (localWants.some(keyword => descUpper.includes(keyword))) {
                    aiType = 'wants';
                }
                // 2. Jeśli nie ma w słowniku, sprawdzamy pamięć z tego importu 
                else if (aiCache.has(tx.category)) {
                    aiType = aiCache.get(tx.category);
                }
                // 3. Jeśli nie znamy tego miejsca, puszczamy do Gemini
                else {
                    let retries = 3;
                    let success = false;
                    while (retries > 0 && !success) {
                        try {
                            const aiRes = await axios.post(`${AI_SERVICE_URL}/categorize`, {
                                description: tx.category
                            });

                            // Jeśli Python złapał np. 503 UNAVAILABLE lub 429 RESOURCE_EXHAUSTED, zwróci HTTP 200, lecz z polem error
                            if (aiRes.data && aiRes.data.error) {
                                throw new Error(aiRes.data.error);
                            }

                            if (aiRes.data && aiRes.data.category) {
                                aiType = aiRes.data.category;
                                aiCache.set(tx.category, aiType); // Zapamiętujemy na przyszłość
                                success = true;
                            }

                            // Omijamy darmowe limity Gemini
                            await delay(4200);

                        } catch (err) {
                            retries--;
                            const errMsg = err.message || (err.response && err.response.statusText) || "Unknown Error";

                            if (errMsg.includes('429') || errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || (err.response && (err.response.status === 429 || err.response.status === 503))) {
                                console.warn(`[API] Gemini Zajęte (503/429) dla: ${tx.category}. Odczekuję 3s... (Pozostało prób: ${retries})`);
                                await delay(3000);
                            } else {
                                console.error(`[API AI] Błąd wywoływania dla ${tx.category}: ${errMsg}`);
                                break; // Niestandardowy błąd (np brak sieci), przerywamy pętlę retryów i przyjmujemy 'needs'
                            }
                        }
                    }
                }
                // Wrzucamy do formatu bazy Vaultify!
                db.run(
                    `INSERT INTO transactions (user_id, amount, category, type, date) VALUES (?, ?, ?, ?, ?)`,
                    [userId, tx.amount, tx.category, aiType, tx.date],
                    function (err) {
                        if (err) console.error('[Bank CSV] Błąd bazy:', err.message);
                        else {
                            let coloredType = aiType === 'wants' ? '\x1b[31mwants\x1b[0m' : '\x1b[34mneeds\x1b[0m';
                            console.log(`[CSV->Vaultify] 💰 ${tx.amount.toFixed(2)} PLN | ${tx.category.slice(0, 35)}... => [${coloredType}]`);
                        }
                    }
                );
            }
            console.log("=========================================");
            console.log("[CSV Pipeline] Proces synchronizacji AI został zakończony pomyślnie.");
            console.log("=========================================");
        });
}

module.exports = {
    processTransactionsFromCSV
};
