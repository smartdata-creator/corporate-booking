const jwt = require('jsonwebtoken');

/**
 * Middleware untuk memverifikasi token admin (admin & superadmin).
 */
const verifyAdminToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan atau format salah.' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token tidak valid atau sesi telah berakhir.' });
        }
        const allowedRoles = ['admin', 'superadmin'];
        if (!user.role || !allowedRoles.includes(user.role)) {
            return res.status(403).json({ error: 'Akses ditolak. Memerlukan hak akses admin.' });
        }
        req.user = user;
        next();
    });
};

/**
 * Middleware untuk memeriksa apakah user memiliki role 'superadmin'.
 * Harus digunakan SETELAH verifyAdminToken.
 */
const isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'superadmin') {
        next();
    } else {
        res.status(403).json({ error: 'Akses ditolak. Memerlukan hak akses Super Admin.' });
    }
};

/**
 * Middleware untuk memeriksa apakah user memiliki role 'approver'.
 * Harus digunakan SETELAH verifyCorporateToken.
 */
const isApprover = (req, res, next) => {
    if (req.user && req.user.role === 'approver') {
        next();
    } else {
        res.status(403).json({ error: 'Akses ditolak. Memerlukan hak akses Approver.' });
    }
};

/**
 * Middleware untuk memverifikasi token pengguna korporat.
 */
const verifyCorporateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan atau format salah.' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token tidak valid atau sesi telah berakhir.' });
        }
        // Pastikan token ini adalah token korporat (memiliki companyId)
        if (!user.companyId) {
            return res.status(403).json({ error: 'Akses ditolak. Token tidak valid untuk portal korporat.' });
        }
        req.user = user;
        next();
    });
};

module.exports = { verifyAdminToken, isSuperAdmin, verifyCorporateToken, isApprover };