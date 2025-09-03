const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan atau format salah.' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token tidak valid atau kedaluwarsa.' });
        }

        // Perbaikan: Izinkan 'admin' dan 'superadmin'
        const allowedRoles = ['admin', 'superadmin'];
        if (!user.role || !allowedRoles.includes(user.role)) {
            return res.status(403).json({ error: 'Akses ditolak. Membutuhkan hak akses admin.' });
        }

        req.user = user;
        next();
    });
};

module.exports = authMiddleware;