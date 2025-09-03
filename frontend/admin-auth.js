// File: admin-auth.js
// Deskripsi: Skrip ini memeriksa token otentikasi admin di localStorage.
// Jika token tidak ditemukan, pengguna akan dialihkan ke halaman login.
// Skrip ini harus dimuat SEBELUM admin.js di admin.html.

(function() {
    const token = localStorage.getItem('adminAuthToken'); // FIX: Menggunakan kunci yang konsisten

    // Jika tidak ada token, atau token kosong
    if (!token) {
        // Segera alihkan ke halaman login.
        // Pengguna tidak akan sempat melihat konten panel admin.
        window.location.href = 'admin-login.html';
    }
})();