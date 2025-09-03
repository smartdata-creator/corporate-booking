const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * POST /api/auth/login
 * Endpoint untuk login karyawan perusahaan.
 */
router.post('/login', async (req, res) => {
    const { companyId, email, password } = req.body;
    if (!companyId || !email || !password) {
        return res.status(400).json({ error: 'ID Perusahaan, email, dan password dibutuhkan.' });
    }

    try {
        const userResult = await pool.query('SELECT * FROM company_users WHERE email = $1 AND company_id = $2', [email, companyId]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Kredensial tidak valid untuk perusahaan ini.' });
        }

        const user = userResult.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Kredensial tidak valid.' });
        }

        const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [user.company_id]);
        const companyName = companyResult.rows[0]?.name || 'Perusahaan';

        const tokenPayload = { userId: user.id, companyId: user.company_id, companyName, email: user.email, role: user.role };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.json({ token });
    } catch (err) {
        console.error('Corporate login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;