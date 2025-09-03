const pool = require('../db');

/**
 * Mencatat aktivitas ke dalam database.
 * @param {string} type - Tipe aktivitas (e.g., 'booking_created', 'hotel_added').
 * @param {string} description - Deskripsi detail dari aktivitas.
 */
const logActivity = (type, description) => {
    // Fungsi ini tidak perlu 'async' karena kita tidak menggunakan 'await'.
    // Kita tetap memanggil query, tapi kita tambahkan .catch() untuk menangani
    // potensi error dari database secara diam-diam tanpa memblokir alur utama.
    pool.query(
        'INSERT INTO activities (type, description) VALUES ($1, $2)',
        [type, description]
    ).catch(error => {
        // Log error ke konsol tanpa mengganggu alur utama atau menyebabkan unhandled rejection.
        console.error('Gagal mencatat aktivitas (background process):', error);
    });
};

module.exports = { logActivity };