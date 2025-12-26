let db;

/* Load DB */
async function loadDatabase() {
    const SQL = await initSqlJs({
        locateFile: file => `js/${file}`
    });

    const response = await fetch("js/oracle.db?v=" + Date.now());
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));

    populateDeckDropdown();
    populateCategoryDropdown();
    filterCategories("any");
}

/* Query Helper */
function query(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

/* Dropdown Helpers */
function setupDropdown(dropdown) {
    const selected = dropdown.querySelector(".dropdown-selected");
    const list = dropdown.querySelector(".dropdown-list");

    selected.addEventListener("click", () => {
        const rect = dropdown.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        dropdown.classList.remove("open-up");

        if (spaceBelow < 200 && spaceAbove > spaceBelow) {
            dropdown.classList.add("open-up");
        }

        list.style.display = list.style.display === "flex" ? "none" : "flex";
    });

    document.addEventListener("click", e => {
        if (!dropdown.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

/* Populate Deck Dropdown */
function populateDeckDropdown() {
    const dropdown = document.getElementById("deckDropdown");
    const list = dropdown.querySelector(".dropdown-list");

    const any = document.createElement("div");
    any.className = "dropdown-option";
    any.textContent = "Any Deck";
    any.dataset.value = "any";
    list.appendChild(any);

    const rows = query("SELECT id, name FROM decks ORDER BY id");

    rows.forEach(row => {
        const opt = document.createElement("div");
        opt.className = "dropdown-option";
        opt.textContent = row.name;
        opt.dataset.value = row.id;
        list.appendChild(opt);
    });

    list.addEventListener("click", e => {
        if (!e.target.classList.contains("dropdown-option")) return;
        dropdown.querySelector(".dropdown-selected").textContent = e.target.textContent;
        dropdown.dataset.value = e.target.dataset.value;
        list.style.display = "none";

        filterCategories(dropdown.dataset.value);
    });

    setupDropdown(dropdown);
}

/* Populate Category Dropdown */
function populateCategoryDropdown() {
    const dropdown = document.getElementById("categoryDropdown");
    const list = dropdown.querySelector(".dropdown-list");

    const any = document.createElement("div");
    any.className = "dropdown-option";
    any.textContent = "Any Category";
    any.dataset.value = "any";
    list.appendChild(any);

    const rows = query("SELECT id, name FROM categories ORDER BY id");

    rows.forEach(row => {
        const opt = document.createElement("div");
        opt.className = "dropdown-option";
        opt.textContent = row.name;
        opt.dataset.value = row.id;
        opt.dataset.icon = row.id;
        list.appendChild(opt);
    });

    list.addEventListener("click", e => {
        if (!e.target.classList.contains("dropdown-option")) return;
        dropdown.querySelector(".dropdown-selected").textContent = e.target.textContent;
        dropdown.dataset.value = e.target.dataset.value;
        list.style.display = "none";
    });

    setupDropdown(dropdown);
}

/* Filter Categories */
function filterCategories(deckValue) {
    const dropdown = document.getElementById("categoryDropdown");
    const options = dropdown.querySelectorAll(".dropdown-option");

    if (deckValue === "any") {
        options.forEach(opt => opt.classList.remove("hidden"));
        return;
    }

    const rows = query(
        "SELECT DISTINCT category_id FROM messages WHERE deck_id = ?",
        [deckValue]
    );

    const allowed = rows.map(r => r.category_id.toString());

    options.forEach(opt => {
        if (opt.dataset.value === "any") {
            opt.classList.remove("hidden");
            return;
        }
        opt.classList.toggle("hidden", !allowed.includes(opt.dataset.value));
    });

    if (dropdown.dataset.value && dropdown.querySelector(`[data-value="${dropdown.dataset.value}"]`).classList.contains("hidden")) {
        dropdown.dataset.value = "any";
        dropdown.querySelector(".dropdown-selected").textContent = "Any Category";
    }
}

/* Reveal Message */
function revealMessage() {
    const deck = document.getElementById("deckDropdown").dataset.value || "any";
    const cat = document.getElementById("categoryDropdown").dataset.value || "any";

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

    msg.textContent = rows.length ? rows[0].text : "No messages match this selection.";

    card.classList.remove("visible");
    setTimeout(() => card.classList.add("visible"), 50);
}

document.getElementById("revealBtn").addEventListener("click", revealMessage);

loadDatabase();
