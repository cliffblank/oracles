let db;

// Load DB
async function loadDatabase() {
    const SQL = await initSqlJs({ locateFile: file => file });
    const response = await fetch("data/oracle.db");
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));

    populateDecks();
    populateCategories();
    filterCategoriesForDeck("any");
}

function query(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

/* Populate Decks */
function populateDecks() {
    const deckSelect = document.getElementById("deckSelect");
    const rows = query("SELECT id, name FROM decks ORDER BY id");

    rows.forEach(row => {
        const opt = document.createElement("option");
        opt.value = row.id;
        opt.textContent = row.name;
        deckSelect.appendChild(opt);
    });
}

/* Populate Categories */
function populateCategories() {
    const catSelect = document.getElementById("categorySelect");
    const rows = query("SELECT id, name FROM categories ORDER BY id");

    rows.forEach(row => {
        const opt = document.createElement("option");
        opt.value = row.id;
        opt.textContent = row.name;
        catSelect.appendChild(opt);
    });
}

/* Filter Categories by Deck */
function filterCategoriesForDeck(deckValue) {
    const catSelect = document.getElementById("categorySelect");

    if (deckValue === "any") {
        for (let option of catSelect.options) {
            option.hidden = false;
            option.classList.add("fade-in");
        }
        return;
    }

    const rows = query(
        "SELECT DISTINCT category_id FROM messages WHERE deck_id = ?",
        [deckValue]
    );

    const allowed = rows.map(r => r.category_id.toString());

    for (let option of catSelect.options) {
        if (option.value === "any") {
            option.hidden = false;
            option.classList.add("fade-in");
            continue;
        }

        const show = allowed.includes(option.value);

        if (show) {
            option.hidden = false;
            option.classList.add("fade-in");
        } else {
            option.hidden = true;
        }
    }

    if (catSelect.selectedOptions[0].hidden) {
        catSelect.value = "any";
    }
}

/* Deck Theme */
function applyTheme(deckValue) {
    document.body.className = "";

    if (deckValue === "1") document.body.classList.add("core-theme");
    if (deckValue === "2") document.body.classList.add("shadow-theme");
    if (deckValue === "3") document.body.classList.add("connection-theme");
    if (deckValue === "4") document.body.classList.add("momentum-theme");
}

/* Reveal Message */
function revealMessage() {
    const deck = document.getElementById("deckSelect").value;
    const cat = document.getElementById("categorySelect").value;

    let sql = "SELECT text FROM messages WHERE 1=1";
    const params = [];

    if (deck !== "any") {
        sql += " AND deck_id = ?";
        params.push(deck);
    }

    if (cat !== "any") {
        sql += " AND category_id = ?";
        params.push(cat);
    }

    sql += " ORDER BY RANDOM() LIMIT 1";

    const rows = query(sql, params);
    const card = document.getElementById("card");
    const msg = document.getElementById("message");

    if (rows.length === 0) {
        msg.textContent = "No messages match this selection.";
    } else {
        msg.textContent = rows[0].text;
    }

    card.classList.remove("visible");
    setTimeout(() => card.classList.add("visible"), 50);
}

/* Event Listeners */
document.getElementById("deckSelect").addEventListener("change", e => {
    applyTheme(e.target.value);
    filterCategoriesForDeck(e.target.value);
});

document.getElementById("revealBtn").addEventListener("click", revealMessage);

loadDatabase();
