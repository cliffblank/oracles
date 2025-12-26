let db;
let deckMap = {}; // id -> name

async function loadDatabase() {
    const SQL = await initSqlJs({
        locateFile: file => `lib/sqljs/${file}`
    });

    const response = await fetch('data/oracle.db');
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));

    populateDecks();
    populateCategories();

    // Set an initial theme
    applyThemeForDeckValue(document.getElementById("deckSelect").value);
}

function query(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function populateDecks() {
    const decks = query("SELECT id, name FROM decks ORDER BY name;");
    const select = document.getElementById("deckSelect");

    decks.forEach(deck => {
        const opt = document.createElement("option");
        opt.value = deck.id;
        opt.textContent = deck.name;
        select.appendChild(opt);

        deckMap[deck.id] = deck.name;
    });

    // When deck changes, update theme
    select.addEventListener("change", () => {
        applyThemeForDeckValue(select.value);
    });
}

function populateCategories() {
    const cats = query("SELECT id, name FROM categories ORDER BY name;");
    const select = document.getElementById("categorySelect");

    cats.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        select.appendChild(opt);
    });
}

function applyThemeForDeckValue(deckValue) {
    const body = document.body;

    // Clear all theme classes
    body.classList.remove("core-theme", "shadow-theme", "connection-theme", "momentum-theme");

    // "Any Deck" → default to Core theme
    if (deckValue === "any") {
        body.classList.add("core-theme");
        return;
    }

    const deckName = deckMap[deckValue];
    if (!deckName) {
        body.classList.add("core-theme");
        return;
    }

    const normalized = deckName.toLowerCase();

    if (normalized.includes("shadow")) {
        body.classList.add("shadow-theme");
    } else if (normalized.includes("connection")) {
        body.classList.add("connection-theme");
    } else if (normalized.includes("momentum")) {
        body.classList.add("momentum-theme");
    } else {
        body.classList.add("core-theme");
    }
}

function drawMessage() {
    const deck = document.getElementById("deckSelect").value;
    const category = document.getElementById("categorySelect").value;
    const messageEl = document.getElementById("message");

    // Start shuffle animation
    messageEl.classList.remove("revealed");
    messageEl.classList.add("shuffle");

    // Small delay to let the shuffle animation play before showing new text
    setTimeout(() => {
        let sql = "SELECT text FROM messages WHERE 1=1";
        const params = [];

        if (deck !== "any") {
            sql += " AND deck_id = ?";
            params.push(deck);
        }

        if (category !== "any") {
            sql += " AND category_id = ?";
            params.push(category);
        }

        sql += " ORDER BY RANDOM() LIMIT 1;";

        const result = query(sql, params);

        if (result.length > 0) {
            messageEl.textContent = result[0].text;
        } else {
            messageEl.textContent = "No messages match this selection.";
        }

        // End shuffle, reveal card
        messageEl.classList.remove("shuffle");
        // Force reflow so the reveal animation always triggers
        void messageEl.offsetWidth;
        messageEl.classList.add("revealed");
    }, 250); // you can tweak this delay to taste
}

document.getElementById("draw").addEventListener("click", drawMessage);

loadDatabase();
