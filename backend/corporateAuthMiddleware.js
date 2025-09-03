const jwt = require('jsonwebtoken');
require('dotenv').config();

const corporateAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan atau format salah.' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token tidak valid atau kedaluwarsa.' });
        }

        // Pastikan user hanya bisa mengakses data perusahaannya sendiri
        // Perbaikan: Cek hanya jika ID perusahaan ada di parameter URL.
        const companyIdInParams = req.params.id || req.params.companyId;
        if (companyIdInParams && user.companyId.toString() !== companyIdInParams) {
            return res.status(403).json({ error: 'Akses ditolak. Anda tidak memiliki izin untuk mengakses sumber daya ini.' });
        }

        req.user = user;
        next();
    });
};

module.exports = corporateAuthMiddleware;