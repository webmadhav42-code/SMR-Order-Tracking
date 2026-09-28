const fs = require("fs");
const path = require("path");
const db = require("./database");

const ordersFile = path.join(__dirname, "data", "orders.json");

const ordersData = fs.readFileSync(ordersFile, "utf-8");
const orders = JSON.parse(ordersData);

const insertOrder = db.prepare(`
    INSERT OR IGNORE INTO orders (
        orderId,
        clientName,
        productType,
        dimensions,
        estimatedDelivery,
        status,
        stage,
        approvalPending
    )
    VALUES (
        @orderId,
        @clientName,
        @productType,
        @dimensions,
        @estimatedDelivery,
        @status,
        @stage,
        @approvalPending
    )
`);

const migrate = db.transaction((orders) => {
    for (const order of orders) {
        insertOrder.run({
            orderId: order.orderId,
            clientName: order.clientName,
            productType: order.productType,
            dimensions: order.dimensions,
            estimatedDelivery: order.estimatedDelivery,
            status: order.status,
            stage: order.stage ?? 0,
            approvalPending: order.approvalPending ? 1 : 0
        });
    }
});

migrate(orders);

console.log(`${orders.length} orders migrated to SQLite! ✅`);