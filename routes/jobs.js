const express = require('express');
const { pool } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// GET /api/jobs - Get all jobs
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [jobs] = await pool.execute(
            'SELECT * FROM jobs ORDER BY created_at DESC'
        );
        // Convert requirements from JSON string back to array
        const formatted = jobs.map(j => ({
            ...j,
            _id: j.id.toString(),
            companyId: j.company_id.toString(),
            companyName: j.company_name,
            requirements: j.requirements ? JSON.parse(j.requirements) : [],
            createdAt: j.created_at
        }));
        res.json(formatted);
    } catch (error) {
        console.error('Get jobs error:', error);
        res.status(500).json({ message: 'Failed to fetch jobs' });
    }
});

// POST /api/jobs - Create a job (employer/admin only)
router.post('/', authenticateToken, authorizeRoles('employer', 'admin'), async (req, res) => {
    try {
        const { title, description, location, salary, requirements } = req.body;
        const companyId = req.user.id;
        const companyName = req.user.name;

        const reqJson = JSON.stringify(requirements || []);

        const [result] = await pool.execute(
            'INSERT INTO jobs (title, description, location, salary, requirements, company_id, company_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description || '', location || '', salary || '', reqJson, companyId, companyName, 'open']
        );

        const newJob = {
            _id: result.insertId.toString(),
            id: result.insertId,
            title,
            description,
            location,
            salary,
            requirements: requirements || [],
            companyId: companyId.toString(),
            companyName,
            status: 'open',
            createdAt: new Date()
        };

        res.status(201).json(newJob);
    } catch (error) {
        console.error('Create job error:', error);
        res.status(500).json({ message: 'Failed to create job' });
    }
});

module.exports = router;
