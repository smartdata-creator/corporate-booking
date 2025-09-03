const express = require('express');
const router = express.Router();
const pool = require('../db');
const { createPaymentTransaction } = require('../services/paymentService');
const { sendNewSubmissionAdminNotification } = require('../emailService');

// == HOTELS API (Public) ==
// GET semua hotel
router.get('/hotels', async (req, res) => {
    try {
        const query = `
            SELECT
                h.id, h.name, h.image_url,
                COALESCE(AVG(hr.rating), 0) as average_rating,
                COUNT(DISTINCT hr.id) as review_count,
                (SELECT MIN((opt->>'price')::numeric) FROM room_types rt_inner LEFT JOIN LATERAL jsonb_array_elements(rt_inner.price_options) opt ON true WHERE rt_inner.hotel_id = h.id) as min_price
            FROM hotels h
            LEFT JOIN hotel_reviews hr ON h.id = hr.hotel_id
            GROUP BY h.id
            ORDER BY h.id ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching public hotels:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET satu hotel by ID
router.get('/hotels/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT
                h.id, h.name, h.image_url, h.description, h.amenities,
                COALESCE(AVG(hr.rating), 0) as average_rating,
                COUNT(hr.id) as review_count
            FROM hotels h
            LEFT JOIN hotel_reviews hr ON h.id = hr.hotel_id
            WHERE h.id = $1
            GROUP BY h.id;
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Hotel not found.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`Error fetching hotel ${id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET reviews for a specific hotel
router.get('/hotels/:id/reviews', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT
                hr.rating, hr.comment, hr.created_at,
                COALESCE(c.name, hr.reviewer_name) as reviewer_name
            FROM hotel_reviews hr
            LEFT JOIN companies c ON hr.company_id = c.id
            WHERE hr.hotel_id = $1
            ORDER BY hr.created_at DESC;
        `;
        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching hotel reviews:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET all rooms for a specific hotel (Public)
router.get('/hotels/:hotelId/rooms', async (req, res) => {
    const { hotelId } = req.params;
    try {
        const query = `
            SELECT
                rt.id, rt.name, rt.description, rt.image_url, rt.facilities, h.name as hotel_name,
                opt.name as option_name, opt.description as option_description, opt.price
            FROM room_types rt
            JOIN hotels h ON rt.hotel_id = h.id
            CROSS JOIN LATERAL jsonb_to_recordset(rt.price_options) AS opt(name text, description text, price numeric)
            WHERE rt.hotel_id = $1
            ORDER BY rt.name, opt.price;
        `;
        const result = await pool.query(query, [hotelId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching public room data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// == OTHER PUBLIC APIs ==
router.get('/testimonials', async (req, res) => {
    try {
        // FIX: The query now correctly uses the 'created_at' column for sorting.
        // First, try to get featured testimonials.
        let query = `
            SELECT
                id, quote, author, title, image_url, created_at
            FROM
                testimonials t
            WHERE t.is_featured = true
            ORDER BY t.created_at DESC LIMIT 5;
        `;
        let result = await pool.query(query);

        // If no featured testimonials are found, get the 5 most recent ones as a fallback.
        if (result.rows.length === 0) {
            console.log('No featured testimonials found. Falling back to latest testimonials.');
            query = `
                SELECT
                    id, quote, author, title, image_url, created_at
                FROM
                    testimonials t
                ORDER BY t.created_at DESC LIMIT 5;
            `;
            result = await pool.query(query);
        }

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching testimonials:', err.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/promos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM promos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching promos:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/settings/hero-background', async (req, res) => {
    try {
        const result = await pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'hero_background_url'");
        res.json(result.rows.length > 0 ? { url: result.rows[0].setting_value } : { url: null });
    } catch (err) {
        console.error('Error fetching hero background URL:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/submissions', async (req, res) => {
    const {
        companyName,
        companyNpwp,
        companyAddress,
        contactPersonName,
        contactPersonEmail,
        contactPersonPhone,
        financePicEmail,
        serviceType,
        creditEstimation,
        termsAgreement
    } = req.body;

    // Validasi yang lebih ketat untuk data baru
    if (!companyName || !companyNpwp || !contactPersonName || !contactPersonEmail || !financePicEmail || !serviceType || creditEstimation === undefined) {
        return res.status(400).json({ message: 'Harap lengkapi semua kolom yang wajib diisi.' });
    }

    if (termsAgreement !== true) {
        return res.status(400).json({ message: 'Anda harus menyetujui Syarat dan Ketentuan.' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            `INSERT INTO submissions (
                company_name, company_npwp, company_address, 
                contact_person_name, contact_person_email, contact_person_phone, 
                finance_pic_email, service_type, credit_estimation, terms_agreement
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                companyName, companyNpwp, companyAddress,
                contactPersonName, contactPersonEmail, contactPersonPhone,
                financePicEmail, serviceType, creditEstimation, termsAgreement
            ]
        );
        const newSubmission = result.rows[0];

        // Kirim notifikasi WebSocket ke admin (jika ada)
        if (typeof sendNotification === 'function') {
            sendNotification({
                type: 'submission_created',
                payload: { id: newSubmission.id, company_name: newSubmission.company_name }
            });
        }

        // Kirim notifikasi email ke admin
        if (process.env.ADMIN_EMAIL) {
            await sendNewSubmissionAdminNotification(process.env.ADMIN_EMAIL, newSubmission);
        }
        res.status(201).json({ message: 'Pengajuan berhasil dikirim.', submission: newSubmission });
    } catch (err) {
        console.error('Error creating submission:', err.stack);
        const errorMessage = err.code ? `Database Error: ${err.message}` : 'Terjadi kesalahan pada server.';
        res.status(500).json({ message: errorMessage });
    } finally {
        client.release();
    }
});

router.post('/bookings', async (req, res) => {
    const { hotel_id, room_type_id, room_name, guest_name, guest_email, check_in_date, check_out_date, total_price } = req.body;
    if (!hotel_id || !room_type_id || !guest_name || !guest_email || !check_in_date || !check_out_date || total_price === undefined) {
        return res.status(400).json({ error: 'Semua field pemesanan wajib diisi.' });
    }

    try {
        // 1. Simpan booking dengan status 'awaiting_payment'
        const bookingRes = await pool.query(
            "INSERT INTO bookings (hotel_id, room_type_id, room_name, guest_name, guest_email, check_in_date, check_out_date, total_price, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'awaiting_payment') RETURNING *",
            [hotel_id, room_type_id, room_name, guest_name, guest_email, check_in_date, check_out_date, total_price]
        );
        const newBooking = bookingRes.rows[0];

        // 2. Buat transaksi di Midtrans
        const hotelRes = await pool.query("SELECT name FROM hotels WHERE id = $1", [hotel_id]);
        const transactionToken = await createPaymentTransaction({ ...newBooking, hotel_name: hotelRes.rows[0].name });

        // 3. Kirim token ke frontend
        res.status(201).json({ message: 'Booking dibuat, menunggu pembayaran.', token: transactionToken });
    } catch (err) {
        console.error('Error creating public booking:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/settings/company-logo - Fetches the company logo URL (Public)
router.get('/settings/company-logo', async (req, res) => {
    try {
        const result = await pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'company_logo_url'");
        if (result.rows.length > 0) {
            // The value is stored as a JSON string like '{"url": "..."}'
            // We need to parse it before sending.
            res.json(JSON.parse(result.rows[0].setting_value));
        } else {
            // If the setting is not found, return a default empty URL object
            res.json({ url: '' });
        }
    } catch (err) {
        console.error('Error fetching public company logo setting:', err.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/reviews/public - Submit a public review
router.post('/reviews/public', async (req, res) => {
    const { hotel_id, rating, comment, reviewer_name } = req.body;

    // Basic validation
    if (!hotel_id || !rating || !comment || !reviewer_name) {
        return res.status(400).json({ error: 'Data tidak lengkap. Harap isi semua kolom.' });
    }

    try {
        const query = `
            INSERT INTO hotel_reviews (hotel_id, rating, comment, reviewer_name)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        const result = await pool.query(query, [hotel_id, rating, comment, reviewer_name]);

        // Optionally, you could log this activity or send a notification
        console.log(`New public review submitted with ID: ${result.rows[0].id}`);

        res.status(201).json({ message: 'Ulasan berhasil dikirim.' });
    } catch (err) {
        console.error('Error submitting public review:', err.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/hotels/reviews/summary - Get summary of hotel reviews (top rated)
router.get('/hotels/reviews/summary', async (req, res) => {
    try {
        const query = `
            SELECT
                h.id,
                h.name,
                h.image_url,
                AVG(hr.rating) as average_rating,
                COUNT(hr.id) as review_count
            FROM
                hotels h
            JOIN
                hotel_reviews hr ON h.id = hr.hotel_id
            GROUP BY
                h.id
            HAVING
                COUNT(hr.id) > 0
            ORDER BY
                average_rating DESC, review_count DESC
            LIMIT 4;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching hotel review summary:', err.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
