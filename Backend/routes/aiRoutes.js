const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const expenseController = require("../controllers/expenseController");

// Expense Tracking Route
router.post("/expense", protect, expenseController.expenses);

module.exports = router;