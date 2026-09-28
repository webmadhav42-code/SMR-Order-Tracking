const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "data", "smr.db");

const db = new Database(dbPath);

db.prepare(`
    CREATE TABLE IF NOT EXISTS orders (
        orderId TEXT PRIMARY KEY,
        clientName TEXT NOT NULL,
        productType TEXT NOT NULL,
        dimensions TEXT NOT NULL,
        estimatedDelivery TEXT NOT NULL,
        status TEXT NOT NULL,
        stage INTEGER DEFAULT 0,
        approvalPending INTEGER DEFAULT 0
    )
`).run();

console.log("SQLite database connected! 🗄️");

module.exports = db;