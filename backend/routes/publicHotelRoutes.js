const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * @route   GET /api/hotels
 * @desc    Mendapatkan daftar semua hotel yang tersedia untuk publik
 * @access  Public
 */
router.get('/hotels', async (req, res) => {
    try {
        // Hanya ambil kolom yang relevan untuk tampilan publik
        const { rows } = await db.query(
            `SELECT id, name, location, description, image_url 
             FROM hotels 
             WHERE status = 'active' 
             ORDER BY name ASC`
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching public hotels:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route   GET /api/hotels/:id
 * @desc    Mendapatkan detail satu hotel berdasarkan ID
 * @access  Public
 */
router.get('/hotels/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query(
            `SELECT id, name, location, description, image_url, amenities 
             FROM hotels 
             WHERE id = $1 AND status = 'active'`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Hotel tidak ditemukan.' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(`Error fetching hotel with id ${id}:`, err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;