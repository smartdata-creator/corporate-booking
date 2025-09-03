const express = require('express');
const router = express.Router();
const pool = require('../db'); // Asumsi Anda punya file db.js untuk koneksi pool
const bcrypt = require('bcrypt');

// Middleware untuk otentikasi admin (asumsi sudah ada)
const { verifyAdminToken } = require('../middleware/auth');

/**
 * GET /api/admin/companies/:companyId/employees
 * Mengambil semua karyawan untuk satu perusahaan.
 */
router.get('/companies/:companyId/employees', verifyAdminToken, async (req, res) => {
    const { companyId } = req.params;
    try {
        const result = await pool.query(
            'SELECT id, full_name, email, role FROM company_users WHERE company_id = $1 ORDER BY full_name ASC',
            [companyId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching company employees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/admin/employees
 * Membuat karyawan baru.
 */
router.post('/employees', verifyAdminToken, async (req, res) => {
    const { company_id, full_name, email, password, role } = req.body;

    if (!company_id || !full_name || !email || !password || !role) {
        return res.status(400).json({ error: 'Semua field wajib diisi.' });
    }

    try {
        // Hash password sebelum disimpan
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newEmployee = await pool.query(
            'INSERT INTO company_users (company_id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role',
            [company_id, full_name, email, password_hash, role]
        );

        res.status(201).json(newEmployee.rows[0]);
    } catch (error) {
        // Cek jika error karena email duplikat (kode error 23505 untuk unique violation di PostgreSQL)
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Email sudah terdaftar untuk perusahaan ini.' });
        }
        console.error('Error creating employee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/admin/employees/:id
 * Mengupdate data karyawan.
 */
router.put('/employees/:id', verifyAdminToken, async (req, res) => {
    const { id } = req.params;
    const { full_name, email, role, password } = req.body;

    if (!full_name || !email || !role) {
        return res.status(400).json({ error: 'Nama, email, dan role wajib diisi.' });
    }

    try {
        let query;
        let values;

        if (password) {
            // Jika password diubah, hash password baru
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            query = 'UPDATE company_users SET full_name = $1, email = $2, role = $3, password_hash = $4, updated_at = NOW() WHERE id = $5 RETURNING id, full_name, email, role';
            values = [full_name, email, role, password_hash, id];
        } else {
            // Jika password tidak diubah
            query = 'UPDATE company_users SET full_name = $1, email = $2, role = $3, updated_at = NOW() WHERE id = $4 RETURNING id, full_name, email, role';
            values = [full_name, email, role, id];
        }

        const updatedEmployee = await pool.query(query, values);

        if (updatedEmployee.rowCount === 0) {
            return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
        }

        res.json(updatedEmployee.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Email sudah digunakan oleh karyawan lain di perusahaan ini.' });
        }
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/admin/employees/:id
 * Menghapus karyawan.
 */
router.delete('/employees/:id', verifyAdminToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM company_users WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
        }

        res.status(200).json({ message: 'Karyawan berhasil dihapus.' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;