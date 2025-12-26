let db;

/* ---------------------------------------------
   DATABASE LOADING
--------------------------------------------- */
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

/* ---------------------------------------------
   DROPDOWN SYSTEM (SMART OPENING)
--------------------------------------------- */
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

/* ---------------------------------------------
   POPULATE DECK DROPDOWN
--------------------------------------------- */
function populateDeckDropdown() {
    const dropdown = document.getElementById("deckDropdown");
    const list = dropdown.querySelector(".dropdown-list");

    addDropdownOption(list, "Any Deck", "any");

    const rows = query("SELECT id, name FROM decks ORDER BY id");
    rows.forEach(row => addDropdownOption(list, row.name, row.id));

    list.addEventListener("click", e => {
        if (!e.target.classList.contains("dropdown-option")) return;

        dropdown.querySelector(".dropdown-selected").textContent = e.target.textContent;
        dropdown.dataset.value = e.target.dataset.value;
        list.style.display = "none";

        filterCategories(dropdown.dataset.value);
    });

    setupDropdown(dropdown);
}

/* ---------------------------------------------
   POPULATE CATEGORY DROPDOWN
--------------------------------------------- */
function populateCategoryDropdown() {
    const dropdown = document.getElementById("categoryDropdown");
    const list = dropdown.querySelector(".dropdown-list");

    addDropdownOption(list, "Any Category", "any");

    const rows = query("SELECT id, name FROM categories ORDER BY id");
    rows.forEach(row => {
        addDropdownOption(list, row.name, row.id, row.id);
    });

    list.addEventListener("click", e => {
        if (!e.target.classList.contains("dropdown-option")) return;

        dropdown.querySelector(".dropdown-selected").textContent = e.target.textContent;
        dropdown.dataset.value = e.target.dataset.value;
        list.style.display = "none";
    });

    setupDropdown(dropdown);
}

/* Helper to create dropdown options */
function addDropdownOption(list, label, value, iconId = null) {
    const opt = document.createElement("div");
    opt.className = "dropdown-option";
    opt.textContent = label;
    opt.dataset.value = value;

    if (iconId) opt.dataset.icon = iconId;

    list.appendChild(opt);
}

/* ---------------------------------------------
   FILTER CATEGORIES BASED ON DECK
--------------------------------------------- */
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

    const current = dropdown.dataset.value;
    if (current && dropdown.querySelector(`[data-value="${current}"]`)?.classList.contains("hidden")) {
        dropdown.dataset.value = "any";
        dropdown.querySelector(".dropdown-selected").textContent = "Any Category";
    }
}

/* ---------------------------------------------
   ICON MAP
--------------------------------------------- */
function getIconFilename(id) {
    const map = {
        "1": "intuition.svg",
        "2": "timing.svg",
        "3": "energy.svg",
        "4": "clarity.svg",
        "5": "shadow.svg",
        "6": "patterns.svg",
        "7": "healing.svg",
        "8": "connection.svg",
        "9": "attraction.svg",
        "10": "momentum.svg",
        "11": "courage.svg",
        "12": "breakthrough.svg"
    };
    return map[id];
}

/* ---------------------------------------------
   REVEAL MESSAGE
--------------------------------------------- */
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
    const icon = document.getElementById("messageIcon");

    msg.textContent = rows.length ? rows[0].text : "No messages match this selection.";

    if (cat !== "any") {
        icon.style.backgroundImage = `url('icons/${getIconFilename(cat)}')`;
        icon.style.display = "block";
    } else {
        icon.style.display = "none";
    }

    card.classList.remove("visible");
    setTimeout(() => card.classList.add("visible"), 50);
}

/* ---------------------------------------------
   EVENT LISTENERS
--------------------------------------------- */
document.getElementById("revealBtn").addEventListener("click", revealMessage);

/* Start */
loadDatabase();
