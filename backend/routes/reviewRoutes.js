const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateAdmin, authorizeRole } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/admin/reviews
 * @desc    Mendapatkan semua ulasan dari pelanggan
 * @access  Private (Admin, Superadmin)
 */
router.get('/reviews', authenticateAdmin, async (req, res) => {
    try {
        // Query ini menggabungkan data dari tabel reviews, users, dan hotels
        // untuk mendapatkan informasi yang lengkap.
        const { rows } = await db.query(
            `SELECT r.id, r.comment, r.rating, r.status, r.created_at, u.name as reviewer_name, h.name as hotel_name
             FROM reviews r
             LEFT JOIN users u ON r.user_id = u.id
             LEFT JOIN hotels h ON r.hotel_id = h.id
             ORDER BY r.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching reviews:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route   PUT /api/admin/reviews/:id/status
 * @desc    Mengubah status ulasan (misalnya, 'published', 'hidden')
 * @access  Private (Superadmin)
 */
router.put('/reviews/:id/status', authenticateAdmin, authorizeRole('superadmin'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['published', 'hidden'].includes(status)) {
        return res.status(400).json({ error: 'Status tidak valid. Gunakan "published" atau "hidden".' });
    }

    try {
        const { rows } = await db.query(
            'UPDATE reviews SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status',
            [status, id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Ulasan tidak ditemukan.' });
        }
        res.json({ message: `Status ulasan berhasil diubah menjadi ${rows[0].status}.`, review: rows[0] });
    } catch (err) {
        console.error('Error updating review status:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;