const express = require('express');
const { pool } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// GET /api/applications - Get applications based on user role
router.get('/', authenticateToken, async (req, res) => {
    try {
        let query, params;

        if (req.user.role === 'student') {
            query = 'SELECT * FROM applications WHERE student_id = ? ORDER BY created_at DESC';
            params = [req.user.id];
        } else if (req.user.role === 'employer') {
            // Get applications for jobs posted by this employer
            query = `SELECT a.* FROM applications a 
                     JOIN jobs j ON a.job_id = j.id 
                     WHERE j.company_id = ? 
                     ORDER BY a.created_at DESC`;
            params = [req.user.id];
        } else {
            // Admin and placement_officer see all
            query = 'SELECT * FROM applications ORDER BY created_at DESC';
            params = [];
        }

        const [apps] = await pool.execute(query, params);

        const formatted = apps.map(a => ({
            ...a,
            _id: a.id.toString(),
            jobId: a.job_id.toString(),
            studentId: a.student_id.toString(),
            studentName: a.student_name,
            createdAt: a.created_at
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ message: 'Failed to fetch applications' });
    }
});

// POST /api/applications - Apply for a job (students only)
router.post('/', authenticateToken, authorizeRoles('student'), async (req, res) => {
    try {
        const { jobId } = req.body;
        const studentId = req.user.id;
        const studentName = req.user.name;

        // Check if already applied
        const [existing] = await pool.execute(
            'SELECT id FROM applications WHERE job_id = ? AND student_id = ?',
            [jobId, studentId]
        );
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Already applied for this job' });
        }

        const [result] = await pool.execute(
            'INSERT INTO applications (job_id, student_id, student_name, status) VALUES (?, ?, ?, ?)',
            [jobId, studentId, studentName, 'applied']
        );

        const newApp = {
            _id: result.insertId.toString(),
            id: result.insertId,
            jobId: jobId.toString(),
            studentId: studentId.toString(),
            studentName,
            status: 'applied',
            createdAt: new Date()
        };

        res.status(201).json(newApp);
    } catch (error) {
        console.error('Apply error:', error);
        res.status(500).json({ message: 'Failed to submit application' });
    }
});

// PUT /api/applications/:id/status - Update application status
router.put('/:id/status', authenticateToken, authorizeRoles('employer', 'admin', 'placement_officer'), async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['applied', 'shortlisted', 'accepted', 'rejected'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        await pool.execute('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Status updated', status });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ message: 'Failed to update status' });
    }
});

module.exports = router;
