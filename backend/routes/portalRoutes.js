const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { verifyCorporateToken, isApprover } = require('../middleware/auth');
const { broadcastToAdmins } = require('../websocket');
const { sendBookingApprovalNotification } = require('../emailService');
const path = require('path');
const { checkRoomAvailability } = require('../services/availabilityService');
const fs = require('fs');

// Semua rute di file ini dilindungi dan memerlukan token pengguna korporat yang valid.
router.use(verifyCorporateToken);

/**
 * GET /api/portal/companies/:companyId
 * Mengambil detail perusahaan (terutama info kredit) untuk ditampilkan di portal.
 */
router.get('/companies/:companyId', async (req, res) => {
    // Pemeriksaan keamanan: pastikan pengguna hanya mengakses data perusahaannya sendiri.
    if (req.user.companyId.toString() !== req.params.companyId) {
        return res.status(403).json({ error: 'Akses ditolak.' });
    }
    try {
        const result = await pool.query('SELECT name, credit_limit, credit_used FROM companies WHERE id = $1', [req.params.companyId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Perusahaan tidak ditemukan.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching company details for portal:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/portal/hotels
 * Mengambil daftar hotel yang diizinkan untuk diakses oleh perusahaan pengguna.
 */
router.get('/hotels', async (req, res) => {
    const { companyId } = req.user;
    try {
        const companyRes = await pool.query('SELECT accessible_hotel_ids FROM companies WHERE id = $1', [companyId]);
        if (companyRes.rows.length === 0) {
            return res.status(404).json({ error: 'Perusahaan tidak ditemukan.' });
        }
        const accessibleHotelIds = companyRes.rows[0].accessible_hotel_ids;

        let hotelQuery = `
            SELECT h.id, h.name, h.image_url, 
                   COALESCE(AVG(hr.rating), 0) as average_rating, 
                   COUNT(DISTINCT hr.id) as review_count
            FROM hotels h
            LEFT JOIN hotel_reviews hr ON h.id = hr.hotel_id
        `;
        const queryParams = [];

        if (accessibleHotelIds && accessibleHotelIds.length > 0) {
            hotelQuery += ' WHERE h.id = ANY($1)';
            queryParams.push(accessibleHotelIds);
        }

        hotelQuery += ' GROUP BY h.id ORDER BY h.id ASC;';
        const hotelsRes = await pool.query(hotelQuery, queryParams);
        res.json(hotelsRes.rows);
    } catch (err) {
        console.error('Error fetching portal hotels:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/portal/hotels/:hotelId/rooms
 * Mengambil daftar kamar untuk hotel tertentu, dengan harga khusus korporat jika ada.
 */
router.get('/hotels/:hotelId/rooms', async (req, res) => {
    const { companyId } = req.user;
    const { hotelId } = req.params;
    try {
        const companyRes = await pool.query('SELECT accessible_hotel_ids FROM companies WHERE id = $1', [companyId]);
        const accessibleHotelIds = companyRes.rows[0]?.accessible_hotel_ids;

        if (accessibleHotelIds && accessibleHotelIds.length > 0 && !accessibleHotelIds.includes(parseInt(hotelId))) {
            return res.status(403).json({ error: 'Akses ke hotel ini tidak diizinkan untuk perusahaan Anda.' });
        }

        const query = `
            SELECT
                rt.id, rt.name, rt.description, rt.image_url, rt.facilities, h.name as hotel_name,
                opt.name as option_name, opt.description as option_description,
                COALESCE(cr.special_price, opt.price) as price
            FROM room_types rt
            JOIN hotels h ON rt.hotel_id = h.id
            CROSS JOIN LATERAL jsonb_to_recordset(rt.price_options) AS opt(name text, description text, price numeric)
            LEFT JOIN corporate_rates cr ON rt.id = cr.room_type_id AND cr.company_id = $1 AND opt.name = cr.price_option_name
            WHERE rt.hotel_id = $2
            ORDER BY rt.name, opt.price;
        `;
        const result = await pool.query(query, [companyId, hotelId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching portal rooms with special rates:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/portal/rooms/:roomTypeId/availability
 * Memeriksa ketersediaan kamar untuk rentang tanggal tertentu.
 */
router.get('/rooms/:roomTypeId/availability', async (req, res) => {
    const { roomTypeId } = req.params;
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
        return res.status(400).json({ error: 'Tanggal check-in dan check-out wajib diisi.' });
    }

    try {
        // Panggil service ketersediaan yang baru
        const availableCount = await checkRoomAvailability(roomTypeId, checkIn, checkOut);

        res.json({ available: Math.max(0, availableCount) }); // Pastikan tidak mengembalikan angka negatif
    } catch (err) {
        console.error('Error di dalam route /availability:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/portal/bookings
 * Mengambil riwayat booking untuk perusahaan pengguna.
 */
router.get('/bookings', async (req, res) => {
    const { companyId } = req.user;
    try {
        const query = `
            SELECT
                b.id, b.guest_name, b.check_in_date, b.check_out_date, b.total_price, b.status, b.booking_date,
                rt.name AS room_name, h.id AS hotel_id, h.name AS hotel_name, hr.id AS review_id
            FROM bookings b
            JOIN room_types rt ON b.room_type_id = rt.id
            JOIN hotels h ON rt.hotel_id = h.id
            LEFT JOIN hotel_reviews hr ON b.id = hr.booking_id
            WHERE b.company_id = $1
            ORDER BY b.booking_date DESC;
        `;
        const result = await pool.query(query, [companyId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching company booking history:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Konfigurasi Multer untuk menyimpan file unggahan
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = 'uploads/';
        // Pastikan direktori 'uploads' ada
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // Cek berdasarkan nama field di form
    if (file.fieldname === "guest_id_image") {
        // Izinkan hanya file gambar
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
            cb(null, true);
        } else {
            cb(new Error('Hanya file gambar (JPEG, PNG, GIF) yang diizinkan untuk ID Card!'), false);
        }
    } else if (file.fieldname === "guarantee_letter") {
        // Izinkan hanya file PDF
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Hanya file PDF yang diizinkan untuk Surat Jaminan!'), false);
        }
    } else {
        // Tolak file lain yang tidak terduga
        cb(null, false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // Batas 5MB per file

/**
 * POST /api/portal/bookings
 * Membuat booking baru atas nama perusahaan.
 */
router.post('/bookings', upload.fields([{ name: 'guest_id_image', maxCount: 1 }, { name: 'guarantee_letter', maxCount: 1 }]), async (req, res) => {
    const { userId, companyId, companyName } = req.user;
    const { hotel_id, room_type_id, room_name, guest_name, guest_email, check_in_date, check_out_date, total_price } = req.body;
    const guest_id_image = req.files && req.files['guest_id_image'] ? req.files['guest_id_image'][0].path : null;
    const guarantee_letter = req.files && req.files['guarantee_letter'] ? req.files['guarantee_letter'][0].path : null;

    if (!hotel_id || !room_type_id || !guest_name || !guest_email || !check_in_date || !check_out_date || total_price === undefined || !guest_id_image || !guarantee_letter) {
        return res.status(400).json({ error: 'Semua field pemesanan wajib diisi.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const companyRes = await client.query('SELECT credit_limit, credit_used FROM companies WHERE id = $1 FOR UPDATE', [companyId]);
        const company = companyRes.rows[0];
        const availableCredit = parseFloat(company.credit_limit) - parseFloat(company.credit_used);

        if (parseFloat(total_price) > availableCredit) {
            throw { status: 400, message: `Kredit tidak mencukupi. Total harga (${total_price}) melebihi kredit tersedia (${availableCredit}).` };
        }

        // --- Pengecekan Alokasi Kamar ---
        const checkAllotmentQuery = `
            SELECT allotment_date, total_allotment, booked_count
            FROM room_allotments
            WHERE room_type_id = $1 AND allotment_date >= $2 AND allotment_date < $3
            FOR UPDATE; 
        `; // FOR UPDATE untuk mengunci baris selama transaksi
        const allotmentResult = await client.query(checkAllotmentQuery, [room_type_id, check_in_date, check_out_date]);

        const dateDiff = (new Date(check_out_date) - new Date(check_in_date)) / (1000 * 3600 * 24);
        if (allotmentResult.rows.length < dateDiff) {
            throw { status: 400, message: 'Kamar tidak tersedia untuk seluruh rentang tanggal yang dipilih karena alokasi belum diatur.' };
        }

        for (const allotment of allotmentResult.rows) {
            if (allotment.booked_count >= allotment.total_allotment) {
                const formattedDate = new Date(allotment.allotment_date).toLocaleDateString('id-ID');
                throw { status: 400, message: `Kamar penuh pada tanggal ${formattedDate}.` };
            }
        }
        // --- Akhir Pengecekan Alokasi ---

        const query = `
            INSERT INTO bookings (user_id, company_id, hotel_id, room_type_id, room_name, guest_name, guest_email, check_in_date, check_out_date, total_price, status, guest_id_image, guarantee_letter)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_approval',$11,$12)
            RETURNING *;
        `;
        const values = [userId, companyId, hotel_id, room_type_id, room_name, guest_name, guest_email, check_in_date, check_out_date, total_price, guest_id_image, guarantee_letter];
        const result = await client.query(query, values);
        const newBooking = result.rows[0];

        // Update booked_count setelah booking berhasil dibuat
        await client.query(`UPDATE room_allotments SET booked_count = booked_count + 1 WHERE room_type_id = $1 AND allotment_date >= $2 AND allotment_date < $3`, [room_type_id, check_in_date, check_out_date]);

        await client.query('COMMIT');

        // --- Kirim Notifikasi ---
        broadcastToAdmins({ type: 'new_booking_received', payload: newBooking });

        // Cari approver dan kirim notifikasi email
        try {
            const approversRes = await pool.query("SELECT email FROM company_users WHERE company_id = $1 AND role = 'approver'", [companyId]);
            const approverEmails = approversRes.rows.map(row => row.email);

            if (approverEmails.length > 0) {
                // Kita butuh nama hotel untuk email, jadi kita ambil dari database
                const hotelRes = await pool.query("SELECT name FROM hotels WHERE id = $1", [newBooking.hotel_id]);
                const bookingDetailsForEmail = { ...newBooking, hotel_name: hotelRes.rows[0]?.name || 'Nama Hotel Tidak Ditemukan' };
                await sendBookingApprovalNotification(approverEmails, bookingDetailsForEmail, companyName);
            }
        } catch (emailError) {
            // Log error email tapi jangan sampai membuat request utama gagal
            console.error("Gagal mengirim email notifikasi ke approver:", emailError);
        }

        res.status(201).json({ message: 'Pemesanan Anda berhasil dan sedang menunggu persetujuan dari perusahaan Anda.', bookingId: newBooking.id });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating corporate booking:', err);
        res.status(err.status || 500).json({ error: err.message || 'Terjadi kesalahan pada server.' });
    } finally {
        client.release();
    }
});

// Middleware penanganan error khusus untuk Multer.
// Ini harus ditempatkan SETELAH rute yang menggunakan multer.
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Error dari Multer (misalnya, file terlalu besar)
        return res.status(400).json({ error: `Upload Error: ${err.message}` });
    } else if (err) {
        // Error dari fileFilter kita (misalnya, tipe file salah)
        return res.status(400).json({ error: err.message });
    }
    // Jika bukan error dari multer, lanjutkan ke handler error berikutnya
    next();
};


/**
 * PUT /api/portal/bookings/:bookingId/status
 * Endpoint untuk approver menyetujui atau menolak booking.
 */
router.put('/bookings/:bookingId/status', isApprover, async (req, res) => {
    const { bookingId } = req.params;
    const { action } = req.body; // 'approve' atau 'reject'
    const { companyId } = req.user;

    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Aksi tidak valid.' });
    }

    const newStatus = action === 'approve' ? 'pending' : 'rejected_by_company';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verifikasi bahwa booking ini milik perusahaan si approver dan statusnya 'pending_approval'
        const bookingRes = await client.query(
            'SELECT id, room_type_id, check_in_date, check_out_date FROM bookings WHERE id = $1 AND company_id = $2 AND status = $3 FOR UPDATE',
            [bookingId, companyId, 'pending_approval']
        );

        if (bookingRes.rows.length === 0) {
            throw { status: 404, message: 'Booking tidak ditemukan atau tidak dapat diubah statusnya.' };
        }

        const booking = bookingRes.rows[0];

        // Jika booking ditolak, kembalikan alokasi yang sudah diambil saat booking dibuat
        if (action === 'reject') {
            await client.query(
                `UPDATE room_allotments SET booked_count = booked_count - 1 
                 WHERE room_type_id = $1 AND allotment_date >= $2 AND allotment_date < $3 AND booked_count > 0`,
                [booking.room_type_id, booking.check_in_date, booking.check_out_date]
            );
        }

        // Update status booking
        const result = await client.query(
            'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
            [newStatus, bookingId]
        );

        res.json({ message: `Booking berhasil di-${action === 'approve' ? 'setujui' : 'tolak'}.`, booking: result.rows[0] });
    } catch (err) {
        console.error('Error updating booking status by approver:', err);
        await client.query('ROLLBACK');
        res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
    } finally {
        client.release();
    }
});

// Terapkan middleware penanganan error multer setelah semua rute yang menggunakannya.
router.use(handleMulterError);

/**
 * POST /api/portal/reviews
 * Mengirim ulasan untuk booking yang sudah selesai.
 */
router.post('/reviews', async (req, res) => {
    const { companyId } = req.user;
    const { booking_id, hotel_id, rating, comment } = req.body;

    if (!booking_id || !hotel_id || !rating) {
        return res.status(400).json({ error: 'Booking ID, Hotel ID, dan Rating wajib diisi.' });
    }

    try {
        const bookingCheck = await pool.query('SELECT id FROM bookings WHERE id = $1 AND company_id = $2 AND status = \'confirmed\'', [booking_id, companyId]);
        if (bookingCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Anda tidak bisa memberi ulasan untuk booking ini.' });
        }

        const result = await pool.query('INSERT INTO hotel_reviews (booking_id, company_id, hotel_id, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *', [booking_id, companyId, hotel_id, rating, comment]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating review:', err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Booking ini sudah pernah diberi ulasan.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/portal/users/password
 * Mengizinkan pengguna korporat untuk mengubah password mereka sendiri.
 */
router.put('/users/password', async (req, res) => {
    // This route was missing the bcrypt require statement
    const { userId } = req.user;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Password lama dan baru wajib diisi.' });
    }

    try {
        const userRes = await pool.query('SELECT password_hash FROM company_users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan.' });
        }
        const currentHash = userRes.rows[0].password_hash;

        const isMatch = await bcrypt.compare(oldPassword, currentHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Password lama tidak sesuai.' });
        }

        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE company_users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);
        res.json({ message: 'Password berhasil diperbarui.' });
    } catch (err) {
        console.error('Error changing corporate user password:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;