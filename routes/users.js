const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - Get all users (for dashboard stats)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
        const formatted = users.map(u => ({
            ...u,
            id: u.id.toString(),
            username: u.name,
            createdAt: u.created_at
        }));
        res.json(formatted);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

module.exports = router;
