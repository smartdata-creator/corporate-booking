const jwt = require('jsonwebtoken');

/**
 * Middleware untuk mengautentikasi token JWT dari admin.
 * Memverifikasi token dan menempelkan data admin (payload) ke `req.user`.
 */
const authenticateAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Akses ditolak. Token tidak disediakan.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // PENTING: Pastikan Anda memiliki JWT_SECRET di file .env Anda
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_super_secret_key');
        
        // Menempelkan payload token (yang berisi id dan role admin) ke request
        req.user = { id: decoded.id, role: decoded.role };
        next();
    } catch (err) {
        console.error('Kesalahan autentikasi:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token Anda telah kedaluwarsa.' });
        }
        return res.status(401).json({ error: 'Token tidak valid.' });
    }
};

/**
 * Middleware untuk mengotorisasi akses berdasarkan role.
 * @param {...string} roles - Daftar role yang diizinkan (e.g., 'superadmin', 'admin').
 */
const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Akses ditolak. Anda tidak memiliki hak untuk mengakses sumber daya ini.' });
        }
        next();
    };
};

module.exports = {
    authenticateAdmin,
    authorizeRole,
};