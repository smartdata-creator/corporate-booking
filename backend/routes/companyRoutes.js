const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateAdmin, authorizeRole } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/admin/companies
 * @desc    Mendapatkan semua data perusahaan korporat
 * @access  Private (Admin, Superadmin)
 */
router.get('/companies', authenticateAdmin, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, email, phone, address, status FROM companies ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching companies:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route   PUT /api/admin/companies/:id/status
 * @desc    Mengubah status perusahaan (e.g., active, inactive)
 * @access  Private (Superadmin)
 */
router.put('/companies/:id/status', authenticateAdmin, authorizeRole('superadmin'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Status tidak valid.' });
    }

    try {
        const { rows } = await db.query(
            'UPDATE companies SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, status',
            [status, id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Perusahaan tidak ditemukan.' });
        }
        res.json({ message: `Status perusahaan ${rows[0].name} berhasil diubah menjadi ${rows[0].status}.`, company: rows[0] });
    } catch (err) {
        console.error('Error updating company status:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;