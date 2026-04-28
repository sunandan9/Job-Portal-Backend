const express = require('express');
const { pool } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// GET /api/placements - Get all placement records
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [records] = await pool.execute('SELECT * FROM placements ORDER BY created_at DESC');
        const formatted = records.map(r => ({
            ...r,
            _id: r.id.toString(),
            studentId: r.student_id.toString(),
            studentName: r.student_name,
            jobId: r.job_id.toString(),
            jobTitle: r.job_title,
            companyName: r.company_name,
            salaryOffered: r.salary_offered,
            dateOfPlacement: r.date_of_placement,
            placementOfficerName: r.placement_officer_name,
            createdAt: r.created_at
        }));
        res.json(formatted);
    } catch (error) {
        console.error('Get placements error:', error);
        res.status(500).json({ message: 'Failed to fetch placements' });
    }
});

// POST /api/placements - Create a placement record
router.post('/', authenticateToken, authorizeRoles('employer', 'admin', 'placement_officer'), async (req, res) => {
    try {
        const { studentId, studentName, jobId, jobTitle, companyName, salaryOffered, placementOfficerName } = req.body;

        const [result] = await pool.execute(
            `INSERT INTO placements (student_id, student_name, job_id, job_title, company_name, salary_offered, placement_officer_name) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [studentId, studentName, jobId, jobTitle, companyName || '', salaryOffered || '', placementOfficerName || req.user.name]
        );

        const newRecord = {
            _id: result.insertId.toString(),
            id: result.insertId,
            studentId: studentId.toString(),
            studentName,
            jobId: jobId.toString(),
            jobTitle,
            companyName,
            salaryOffered,
            placementOfficerName: placementOfficerName || req.user.name,
            dateOfPlacement: new Date(),
            createdAt: new Date()
        };

        res.status(201).json(newRecord);
    } catch (error) {
        console.error('Create placement error:', error);
        res.status(500).json({ message: 'Failed to create placement record' });
    }
});

module.exports = router;
