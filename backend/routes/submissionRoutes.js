const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateAdmin, authorizeRole } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/admin/submissions/credit
 * @desc    Mendapatkan semua data pengajuan fasilitas kredit
 * @access  Private (Admin, Superadmin)
 */
router.get('/submissions/credit', authenticateAdmin, async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT id, company_name, contact_person_name, contact_person_email, status, created_at 
             FROM credit_applications 
             ORDER BY created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching credit submissions:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route   PUT /api/admin/submissions/credit/:id/status
 * @desc    Mengubah status pengajuan kredit (pending, approved, rejected)
 * @access  Private (Superadmin)
 */
router.put('/submissions/credit/:id/status', authenticateAdmin, authorizeRole('superadmin'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status tidak valid.' });
    }

    try {
        const { rows } = await db.query(
            'UPDATE credit_applications SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, company_name, status',
            [status, id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Pengajuan tidak ditemukan.' });
        }
        res.json({ message: `Status pengajuan untuk ${rows[0].company_name} berhasil diubah.`, submission: rows[0] });
    } catch (err) {
        console.error('Error updating submission status:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;