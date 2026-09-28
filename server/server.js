require("dotenv").config();
const express = require("express");

const path = require("path");
const session = require("express-session");
const db = require("./database");

const app = express();

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true
        }
    })
);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/client", express.static(path.join(__dirname, "..", "client")));
//app.use("/admin", express.static(path.join(__dirname, "..", "admin")));
app.get("/admin/login.html", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "admin", "login.html")
    );
});
app.get("/admin", (req, res) => {
    if (!req.session.isAdmin) {
        return res.redirect("/admin/login.html");
    }

    res.sendFile(
        path.join(__dirname, "..", "admin", "index.html")
    );
});

// Orders file ka path

// Home route
app.get("/", (req, res) => {
    res.send("SMR Order Tracking Backend is running! 🚀");
});

app.post("/api/admin/login", (req, res) => {

    const { username, password } = req.body;

    if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
    ) {

        req.session.isAdmin = true;

        return res.json({
            message: "Login successful"
        });
    }

    res.status(401).json({
        message: "Invalid username or password"
    });
});

function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        return next();
    }

    res.status(401).json({
        message: "Unauthorized. Please login first."
    });
}   


// Saare orders fetch karna
app.get("/api/orders", requireAdmin, (req, res) => {
    const orders = db.prepare(`
        SELECT
            orderId,
            clientName,
            productType,
            dimensions,
            estimatedDelivery,
            status,
            stage,
            approvalPending
        FROM orders
        ORDER BY rowid DESC
    `).all();

    const formattedOrders = orders.map((order) => ({
        ...order,
        approvalPending: Boolean(order.approvalPending)
    }));

    res.json(formattedOrders);
});
app.get("/api/orders/:orderId", (req, res) => {
    const orderId = req.params.orderId;

    const order = db.prepare(`
        SELECT
            orderId,
            clientName,
            productType,
            dimensions,
            estimatedDelivery,
            status,
            stage,
            approvalPending
        FROM orders
        WHERE orderId = ?
    `).get(orderId);

    if (!order) {
        return res.status(404).json({
            message: "Order not found"
        });
    }

    res.json({
        ...order,
        approvalPending: Boolean(order.approvalPending)
    });
});
app.post("/api/orders", requireAdmin, (req, res) => {

    const newOrder = req.body;

    const existingOrder = db.prepare(`
        SELECT orderId
        FROM orders
        WHERE orderId = ?
    `).get(newOrder.orderId);

    if (existingOrder) {
        return res.status(400).json({
            message: "Order ID already exists"
        });
    }

    const insertOrder = db.prepare(`
        INSERT INTO orders (
            orderId,
            clientName,
            productType,
            dimensions,
            estimatedDelivery,
            status,
            stage,
            approvalPending
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertOrder.run(
        newOrder.orderId,
        newOrder.clientName,
        newOrder.productType,
        newOrder.dimensions,
        newOrder.estimatedDelivery,
        newOrder.status,
        newOrder.stage ?? 0,
        newOrder.approvalPending ? 1 : 0
    );

    res.status(201).json({
        message: "Order created successfully",
        order: newOrder
    });
});
app.patch("/api/orders/:orderId", requireAdmin, (req, res) => {

    const orderId = req.params.orderId;
    const { status, stage } = req.body;

    const order = db.prepare(`
        SELECT *
        FROM orders
        WHERE orderId = ?
    `).get(orderId);

    if (!order) {
        return res.status(404).json({
            message: "Order not found"
        });
    }

    if (status !== undefined) {
        db.prepare(`
            UPDATE orders
            SET status = ?
            WHERE orderId = ?
        `).run(status, orderId);
    }

    if (stage !== undefined) {
        db.prepare(`
            UPDATE orders
            SET stage = ?
            WHERE orderId = ?
        `).run(stage, orderId);
    }

    const updatedOrder = db.prepare(`
        SELECT *
        FROM orders
        WHERE orderId = ?
    `).get(orderId);

    res.json({
        message: "Order updated successfully",
        order: {
            ...updatedOrder,
            approvalPending: Boolean(updatedOrder.approvalPending)
        }
    });
});
app.delete("/api/orders/:orderId", requireAdmin, (req, res) => {

    const orderId = req.params.orderId;

    const order = db.prepare(`
        SELECT *
        FROM orders
        WHERE orderId = ?
    `).get(orderId);

    if (!order) {
        return res.status(404).json({
            message: "Order not found"
        });
    }

    db.prepare(`
        DELETE FROM orders
        WHERE orderId = ?
    `).run(orderId);

    res.json({
        message: "Order deleted successfully",
        order: {
            ...order,
            approvalPending: Boolean(order.approvalPending)
        }
    });
});


app.listen(PORT, () => {
    console.log(`SMR server running at http://localhost:${PORT}`);
});