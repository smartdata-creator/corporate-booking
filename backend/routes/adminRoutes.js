const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyAdminToken, isSuperAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const { sendSubmissionStatusEmail, sendSubmissionRejectionEmail, sendBookingStatusUpdateEmail } = require('../emailService');
const { sendMessageToUser } = require('../websocket');

/**
 * ===================================
 * AUTHENTICATION
 * ===================================
 * POST /api/admin/auth/login
 * Endpoint untuk login admin.
 */
router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email dan password dibutuhkan.' });
    }

    try {
        const userResult = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Kredensial tidak valid.' });
        }

        const user = userResult.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Kredensial tidak valid.' });
        }

        const tokenPayload = {
            userId: user.id,
            email: user.email,
            name: user.full_name || 'Admin',
            role: user.role
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Semua endpoint di bawah ini dilindungi oleh middleware verifyAdminToken
router.use(verifyAdminToken);

/**
 * ===================================
 * DASHBOARD & GENERAL API
 * ===================================
 */
router.get('/activities', async (req, res) => {
    try {
        const result = await pool.query('SELECT type, description, timestamp FROM activities ORDER BY timestamp DESC LIMIT 10');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/booking-stats', async (req, res) => {
    try {
        const query = `
            SELECT all_days.day::date, COALESCE(COUNT(b.id), 0) AS count
            FROM generate_series(CURRENT_DATE - interval '29 days', CURRENT_DATE, '1 day') AS all_days(day)
            LEFT JOIN bookings b ON all_days.day::date = b.booking_date::date
            GROUP BY all_days.day ORDER BY all_days.day ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * ===================================
 * HOTEL & ROOM MANAGEMENT API
 * ===================================
 */
router.get('/hotels', async (req, res) => {
    try {
        const query = `
            SELECT h.id, h.name, h.image_url, h.description, h.amenities,
                   COALESCE(AVG(hr.rating), 0) as average_rating,
                   COUNT(DISTINCT hr.id) as review_count
            FROM hotels h LEFT JOIN hotel_reviews hr ON h.id = hr.hotel_id
            GROUP BY h.id ORDER BY h.id ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/hotels', async (req, res) => {
    const { name, image_url, description, amenities } = req.body;
    try {
        const amenitiesArray = amenities ? amenities.split(',').map(a => a.trim()).filter(a => a) : [];
        const result = await pool.query(
            'INSERT INTO hotels (name, image_url, description, amenities) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, image_url, description, JSON.stringify(amenitiesArray)]
        );
        logActivity('hotel_added', `Hotel baru "${result.rows[0].name}" ditambahkan.`);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/hotels/:id', async (req, res) => {
    const { id } = req.params;
    const { name, image_url, description, amenities } = req.body;
    try {
        const amenitiesArray = amenities ? amenities.split(',').map(a => a.trim()).filter(a => a) : [];
        const result = await pool.query(
            'UPDATE hotels SET name = $1, image_url = $2, description = $3, amenities = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
            [name, image_url, description, JSON.stringify(amenitiesArray), id]
        );
        logActivity('hotel_updated', `Data hotel "${result.rows[0].name}" diperbarui.`);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/hotels/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const hotelRes = await pool.query('SELECT name FROM hotels WHERE id = $1', [id]);
        const hotelName = hotelRes.rows.length > 0 ? hotelRes.rows[0].name : `ID ${id}`;
        await pool.query('DELETE FROM hotels WHERE id = $1', [id]);
        logActivity('hotel_deleted', `Hotel "${hotelName}" telah dihapus.`);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/hotels/:hotelId/rooms', async (req, res) => {
    const { hotelId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM room_types WHERE hotel_id = $1 ORDER BY id ASC', [hotelId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/rooms', async (req, res) => {
    const { hotel_id, name, description, image_url, facilities, price_options } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO room_types (hotel_id, name, description, image_url, facilities, price_options) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [hotel_id, name, description, image_url, facilities, JSON.stringify(price_options)]
        );
        logActivity('room_added', `Kamar "${result.rows[0].name}" ditambahkan.`);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, image_url, facilities, price_options } = req.body;
    try {
        const result = await pool.query(
            'UPDATE room_types SET name = $1, description = $2, image_url = $3, facilities = $4, price_options = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
            [name, description, image_url, facilities, JSON.stringify(price_options), id]
        );
        logActivity('room_updated', `Kamar "${result.rows[0].name}" diperbarui.`);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/rooms/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const roomRes = await pool.query('SELECT name FROM room_types WHERE id = $1', [id]);
        const roomName = roomRes.rows.length > 0 ? roomRes.rows[0].name : `ID ${id}`;
        await pool.query('DELETE FROM room_types WHERE id = $1', [id]);
        logActivity('room_deleted', `Kamar "${roomName}" telah dihapus.`);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/rooms/:roomId/allotments', async (req, res) => {
    const { roomId } = req.params;
    try {
        // Ambil data untuk 30 hari ke depan sebagai default
        const result = await pool.query(
            `SELECT allotment_date, total_allotment, booked_count 
             FROM room_allotments 
             WHERE room_type_id = $1 AND allotment_date >= CURRENT_DATE AND allotment_date < CURRENT_DATE + INTERVAL '30 day'
             ORDER BY allotment_date ASC`,
            [roomId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching allotments:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/rooms/:roomId/allotments', async (req, res) => {
    const { roomId } = req.params;
    const { startDate, endDate, count } = req.body;

    if (!startDate || !endDate || count === undefined || count < 0) {
        return res.status(400).json({ error: 'Rentang tanggal dan jumlah kamar wajib diisi.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Query untuk melakukan INSERT atau UPDATE jika data sudah ada (UPSERT)
        const upsertQuery = `
            INSERT INTO room_allotments (room_type_id, allotment_date, total_allotment)
            SELECT $1, d::date, $2
            FROM generate_series($3::date, $4::date, '1 day'::interval) d
            ON CONFLICT (room_type_id, allotment_date) DO UPDATE
            SET total_allotment = EXCLUDED.total_allotment;
        `;
        await client.query(upsertQuery, [roomId, count, startDate, endDate]);
        await client.query('COMMIT');
        res.status(200).json({ message: 'Alotment berhasil disimpan.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error saving allotments:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

/**
 * ===================================
 * SUBMISSION MANAGEMENT API
 * ===================================
 */
router.get('/submissions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM submissions ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/submissions/:id', async (req, res) => {
    const { id } = req.params;
    const {
        company_name,
        company_npwp,
        company_address,
        contact_person_name,
        contact_person_email,
        contact_person_phone,
        finance_pic_email,
        credit_estimation,
        service_type
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE submissions SET 
                company_name = $1, 
                company_npwp = $2, 
                company_address = $3, 
                contact_person_name = $4, 
                contact_person_email = $5, 
                contact_person_phone = $6, 
                finance_pic_email = $7, 
                credit_estimation = $8, 
                service_type = $9,
                updated_at = NOW()
             WHERE id = $10 RETURNING *`,
            [
                company_name, company_npwp, company_address,
                contact_person_name, contact_person_email, contact_person_phone,
                finance_pic_email, credit_estimation, service_type, id
            ]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found.' });
        }
        logActivity('submission_updated', `Data pengajuan untuk "${result.rows[0].company_name}" diperbarui.`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating submission:', err.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/submissions/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const result = await pool.query('UPDATE submissions SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
        const submission = result.rows[0];
        logActivity('submission_status_changed', `Status pengajuan untuk "${submission.company}" diubah menjadi ${status}.`);

        if (status === 'verifying') await sendSubmissionStatusEmail(submission.email, submission.company, 'Dalam Proses Verifikasi');
        if (status === 'rejected') await sendSubmissionRejectionEmail(submission.email, submission.company);

        res.json(submission);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/submissions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM submissions WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * ===================================
 * COMPANY & PRICE MANAGEMENT API
 * ===================================
 */
router.get('/companies', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, EXISTS (SELECT 1 FROM company_users cu WHERE cu.company_id = c.id) as has_user
            FROM companies c ORDER BY c.name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/companies', async (req, res) => {
    const { submission_id, credit_limit, hotel_ids } = req.body;

    // Validasi input yang lebih kuat
    if (!submission_id || credit_limit === undefined || !hotel_ids) {
        return res.status(400).json({ error: 'Data tidak lengkap: submission_id, credit_limit, dan hotel_ids dibutuhkan.' });
    }
    if (typeof credit_limit !== 'number' || isNaN(credit_limit) || credit_limit < 0) {
        return res.status(400).json({ error: 'Credit limit harus berupa angka positif.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const subRes = await client.query('SELECT company_name FROM submissions WHERE id = $1', [submission_id]);
        if (subRes.rows.length === 0) throw new Error('Submission not found.');
        const companyName = subRes.rows[0].company_name;

        await client.query('UPDATE submissions SET status = $1 WHERE id = $2', ['approved', submission_id]);
        const result = await client.query(
            'INSERT INTO companies (name, credit_limit, submission_id, accessible_hotel_ids) VALUES ($1, $2, $3, $4) RETURNING *',
            [companyName, credit_limit, submission_id, hotel_ids]
        );
        const newCompany = result.rows[0];

        await client.query('COMMIT');
        logActivity('company_created', `Perusahaan baru "${newCompany.name}" dibuat.`);
        res.status(201).json(newCompany);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error approving submission:', err.stack); // More detailed logging
        if (err.code === '23505') return res.status(409).json({ error: 'Perusahaan ini sudah disetujui.' });
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.put('/companies/:id', async (req, res) => {
    const { id } = req.params;
    const { credit_limit, hotel_ids } = req.body;
    try {
        const result = await pool.query(
            'UPDATE companies SET credit_limit = $1, accessible_hotel_ids = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [parseFloat(credit_limit), hotel_ids, id]
        );
        logActivity('company_updated', `Data perusahaan "${result.rows[0].name}" diperbarui.`);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/companies/:companyId/prices', async (req, res) => {
    const { companyId } = req.params;
    try {
        const companyRes = await pool.query('SELECT accessible_hotel_ids FROM companies WHERE id = $1', [companyId]);
        const accessibleHotelIds = companyRes.rows[0]?.accessible_hotel_ids;
        if (!accessibleHotelIds || accessibleHotelIds.length === 0) return res.json([]);

        const query = `
            SELECT h.name AS "hotelName", rt.id as "roomId", rt.name as "roomName",
                   opt.name as "optionName", opt.price as "defaultPrice", cr.special_price as "specialPrice"
            FROM room_types rt
            JOIN hotels h ON rt.hotel_id = h.id
            CROSS JOIN LATERAL jsonb_to_recordset(rt.price_options) AS opt(name text, description text, price numeric)
            LEFT JOIN corporate_rates cr ON rt.id = cr.room_type_id AND cr.company_id = $1 AND opt.name = cr.price_option_name
            WHERE rt.hotel_id = ANY($2) ORDER BY h.name, rt.name, opt.price;
        `;
        const result = await pool.query(query, [companyId, accessibleHotelIds]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/companies/:companyId/prices', async (req, res) => {
    const { companyId } = req.params;
    const { prices } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const item of prices) {
            if (item.price === null || item.price === '') {
                await client.query('DELETE FROM corporate_rates WHERE company_id = $1 AND room_type_id = $2 AND price_option_name = $3', [companyId, item.room_id, item.option_name]);
            } else {
                await client.query(
                    `INSERT INTO corporate_rates (company_id, room_type_id, price_option_name, special_price) VALUES ($1, $2, $3, $4)
                     ON CONFLICT (company_id, room_type_id, price_option_name) DO UPDATE SET special_price = EXCLUDED.special_price;`,
                    [companyId, item.room_id, item.option_name, item.price]
                );
            }
        }
        await client.query('COMMIT');
        res.status(200).json({ message: 'Harga khusus berhasil diperbarui.' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

/**
 * ===================================
 * TESTIMONIAL MANAGEMENT API
 * ===================================
 */
router.get('/testimonials', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM testimonials ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/testimonials', async (req, res) => {
    const { author, title, quote, image_url } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO testimonials (author, title, quote, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [author, title, quote, image_url]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/testimonials/:id', async (req, res) => {
    const { id } = req.params;
    const { author, title, quote, image_url } = req.body;
    try {
        const result = await pool.query(
            'UPDATE testimonials SET author = $1, title = $2, quote = $3, image_url = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
            [author, title, quote, image_url, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/testimonials/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM testimonials WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * ===================================
 * PROMO MANAGEMENT API
 * ===================================
 */
router.get('/promos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM promos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/promos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM promos WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Promo not found.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/promos', async (req, res) => {
    const { image_url, title, link_url, hotel_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO promos (image_url, title, link_url, hotel_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [image_url, title, link_url, hotel_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/promos/:id', async (req, res) => {
    const { id } = req.params;
    const { image_url, title, link_url, hotel_id } = req.body;
    try {
        const result = await pool.query(
            'UPDATE promos SET image_url = $1, title = $2, link_url = $3, hotel_id = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
            [image_url, title, link_url, hotel_id || null, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/promos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM promos WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * ===================================
 * SITE SETTINGS API
 * ===================================
 */
router.put('/settings/hero-background', async (req, res) => {
    const { url } = req.body;
    try {
        const query = `
            INSERT INTO site_settings (setting_key, setting_value) VALUES ('hero_background_url', $1)
            ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();
        `;
        await pool.query(query, [url]);
        logActivity('setting_updated', `Gambar latar hero diperbarui.`);
        res.json({ message: 'Gambar latar hero berhasil diperbarui.' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/settings/integration', async (req, res) => {
    try {
        const result = await pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'hotel_api_integration'");
        // The value is stored as JSON, so we parse it.
        // If it doesn't exist or is invalid, default to an empty object.
        const settings = result.rows.length > 0 ? JSON.parse(result.rows[0].setting_value) : {};
        res.json({ settings });
    } catch (err) {
        // If JSON is invalid or other errors, return empty object
        console.error('Error fetching integration settings:', err);
        res.json({ settings: {} });
    }
});

router.put('/settings/integration', async (req, res) => {
    const { apiUrl, apiKey, hotelId } = req.body;
    try {
        const settingsJson = JSON.stringify({ apiUrl, apiKey, hotelId });
        const query = `
            INSERT INTO site_settings (setting_key, setting_value) VALUES ('hotel_api_integration', $1)
            ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();
        `;
        await pool.query(query, [settingsJson]);
        res.json({ message: 'Konfigurasi integrasi berhasil disimpan.' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/settings/payment-gateway', async (req, res) => {
    try {
        const result = await pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'payment_gateway_settings'");
        const settings = result.rows.length > 0 ? JSON.parse(result.rows[0].setting_value) : {};
        res.json({ settings });
    } catch (err) {
        console.error('Error fetching payment gateway settings:', err);
        res.json({ settings: {} });
    }
});

router.put('/settings/payment-gateway', async (req, res) => {
    const { isProduction, serverKey, clientKey } = req.body;
    try {
        const settingsJson = JSON.stringify({ isProduction, serverKey, clientKey });
        const query = `
            INSERT INTO site_settings (setting_key, setting_value) VALUES ('payment_gateway_settings', $1)
            ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();
        `;
        await pool.query(query, [settingsJson]);
        res.json({ message: 'Konfigurasi Payment Gateway berhasil disimpan.' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/settings/company-logo - Mengambil URL logo perusahaan
router.get('/settings/company-logo', async (req, res) => {
    try {
        const result = await pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'company_logo_url'");
        // Parsing JSON yang disimpan di database, atau kembalikan default jika tidak ada
        const settings = result.rows.length > 0 ? JSON.parse(result.rows[0].setting_value) : { url: '' };
        res.json(settings);
    } catch (err) {
        console.error('Error fetching company logo setting:', err.stack);
        res.json({ url: '' }); // Fallback jika terjadi error
    }
});

// PUT /api/admin/settings/company-logo - Menyimpan atau memperbarui URL logo
router.put('/settings/company-logo', async (req, res) => {
    const { url } = req.body;
    if (typeof url !== 'string') {
        return res.status(400).json({ error: 'URL tidak valid' });
    }

    try {
        const value = JSON.stringify({ url });
        const query = `
            INSERT INTO site_settings (setting_key, setting_value) VALUES ('company_logo_url', $1)
            ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();
        `;
        await pool.query(query, [value]);
        logActivity('setting_updated', `Logo perusahaan diperbarui.`);
        res.json({ message: 'Pengaturan logo perusahaan berhasil diperbarui' });
    } catch (err) {
        console.error('Error updating company logo setting:', err.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * ===================================
 * REVIEW MANAGEMENT
 * ===================================
 */

// GET all hotel reviews
router.get('/reviews', async (req, res) => {
    try {
        const query = `
            SELECT 
                hr.id, hr.rating, hr.comment, hr.created_at, hr.reviewer_name, hr.is_featured,
                h.name as hotel_name
            FROM 
                hotel_reviews hr
            LEFT JOIN 
                hotels h ON hr.hotel_id = h.id
            ORDER BY 
                hr.created_at DESC;
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching reviews:', err.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE a review
router.delete('/reviews/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM hotel_reviews WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Ulasan tidak ditemukan.' });
        logActivity('review_deleted', `Ulasan dengan ID #${id} dihapus.`);
        res.status(200).json({ message: 'Ulasan berhasil dihapus.' });
    } catch (err) {
        console.error(`Error deleting review ${id}:`, err.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT toggle is_featured status for a review
router.put('/reviews/:id/feature', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('UPDATE hotel_reviews SET is_featured = NOT is_featured WHERE id = $1 RETURNING id, is_featured', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Ulasan tidak ditemukan.' });
        logActivity('review_featured_toggled', `Status "featured" untuk ulasan #${id} diubah menjadi ${result.rows[0].is_featured}.`);
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Error toggling feature for review ${id}:`, err.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * ===================================
 * BOOKING MANAGEMENT API
 * ===================================
 */
router.get('/bookings', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search, status, startDate, endDate } = req.query;

    try {
        const queryParams = [];
        let whereConditions = [];

        if (search) {
            queryParams.push(`%${search}%`);
            whereConditions.push(`(b.guest_name ILIKE $${queryParams.length} OR b.guest_email ILIKE $${queryParams.length} OR h.name ILIKE $${queryParams.length})`);
        }
        if (status) {
            queryParams.push(status);
            whereConditions.push(`b.status = $${queryParams.length}`);
        }
        if (startDate) {
            queryParams.push(startDate);
            whereConditions.push(`b.booking_date::date >= $${queryParams.length}`);
        }
        if (endDate) {
            queryParams.push(endDate);
            whereConditions.push(`b.booking_date::date <= $${queryParams.length}`);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const totalResult = await pool.query(`SELECT COUNT(*) FROM bookings b JOIN room_types rt ON b.room_type_id = rt.id JOIN hotels h ON rt.hotel_id = h.id ${whereClause}`, queryParams);
        const totalItems = parseInt(totalResult.rows[0].count, 10);

        const dataQuery = `
            SELECT b.id, b.guest_name, b.guest_email, b.check_in_date, b.check_out_date,
                   b.total_price, b.status, b.booking_date, rt.name AS room_name, h.name AS hotel_name, b.guest_id_image, b.guarantee_letter,
                   c.name AS company_name
            FROM bookings b
            JOIN room_types rt ON b.room_type_id = rt.id
            JOIN hotels h ON rt.hotel_id = h.id
            LEFT JOIN companies c ON b.company_id = c.id
            ${whereClause} ORDER BY b.booking_date DESC
            LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
        `;
        const dataResult = await pool.query(dataQuery, [...queryParams, limit, offset]);

        res.json({
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            bookings: dataResult.rows
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/bookings/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status: newStatus } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const bookingQuery = `
            SELECT b.user_id, b.company_id, b.total_price, b.status, b.guest_email, b.guest_name, b.room_type_id,
                   b.check_in_date, b.check_out_date, rt.name as room_name, h.name as hotel_name
            FROM bookings b JOIN room_types rt ON b.room_type_id = rt.id JOIN hotels h ON rt.hotel_id = h.id
            WHERE b.id = $1 FOR UPDATE;
        `;
        const bookingRes = await client.query(bookingQuery, [id]);
        if (bookingRes.rows.length === 0) throw { status: 404, message: 'Booking tidak ditemukan.' };

        const booking = bookingRes.rows[0];
        const originalStatus = booking.status;
        const totalPrice = parseFloat(booking.total_price);

        if (originalStatus !== newStatus && booking.company_id) {
            if (newStatus === 'confirmed' && originalStatus !== 'confirmed') {
                await client.query('UPDATE companies SET credit_used = credit_used + $1 WHERE id = $2', [totalPrice, booking.company_id]);
            } else if (originalStatus === 'confirmed' && newStatus !== 'confirmed') {
                await client.query('UPDATE companies SET credit_used = credit_used - $1 WHERE id = $2', [totalPrice, booking.company_id]);
            }
        }

        // Jika booking yang sudah dikonfirmasi dibatalkan, kembalikan alokasi
        if (originalStatus === 'confirmed' && newStatus === 'canceled') {
            await client.query(
                `UPDATE room_allotments SET booked_count = booked_count - 1 
                 WHERE room_type_id = $1 AND allotment_date >= $2 AND allotment_date < $3 AND booked_count > 0`,
                [booking.room_type_id, booking.check_in_date, booking.check_out_date]
            );
        }

        const updateResult = await client.query('UPDATE bookings SET status = $1 WHERE id = $2 RETURNING id, user_id', [newStatus, id]);
        const reviewRes = await client.query('SELECT id FROM hotel_reviews WHERE booking_id = $1', [id]);
        await client.query('COMMIT');

        logActivity('booking_status_changed', `Status booking #${id} diubah menjadi ${newStatus}.`);
        await sendBookingStatusUpdateEmail({ ...booking, toEmail: booking.guest_email, status: newStatus });

        const messagePayload = {
            type: 'booking_status_updated',
            payload: { bookingId: id, newStatus, reviewId: reviewRes.rows[0]?.id || null }
        };
        sendMessageToUser(updateResult.rows[0].user_id, messagePayload);

        res.json({ ...updateResult.rows[0], status: newStatus, review_id: reviewRes.rows[0]?.id || null });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
    } finally {
        client.release();
    }
});

/**
 * ===================================
 * ADMIN USER MANAGEMENT API (SUPERADMIN ONLY)
 * ===================================
 */
router.get('/admin-users', isSuperAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, full_name, email, role FROM admin_users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
});

router.get('/admin-users/:id', isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const userRes = await pool.query('SELECT id, full_name, email, role FROM admin_users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan.' });
        const user = userRes.rows[0];
        const accessRes = await pool.query('SELECT hotel_id FROM admin_hotel_access WHERE admin_id = $1', [id]);
        user.hotel_ids = accessRes.rows.map(row => row.hotel_id);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
});

router.post('/admin-users', isSuperAdmin, async (req, res) => {
    const { full_name, email, password, role, hotel_ids = [] } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUserResult = await client.query(
            'INSERT INTO admin_users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role',
            [full_name, email, hashedPassword, role]
        );
        const newUser = newUserResult.rows[0];
        if (newUser.role === 'admin' && hotel_ids.length > 0) {
            const accessQueries = hotel_ids.map(hotelId => client.query('INSERT INTO admin_hotel_access (admin_id, hotel_id) VALUES ($1, $2)', [newUser.id, hotelId]));
            await Promise.all(accessQueries);
        }
        await client.query('COMMIT');
        res.status(201).json(newUser);
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') return res.status(409).json({ error: 'Email sudah terdaftar.' });
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    } finally {
        client.release();
    }
});

router.put('/admin-users/:id', isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { full_name, email, role, hotel_ids = [], password } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let updatedUserRes;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updatedUserRes = await client.query(
                'UPDATE admin_users SET full_name = $1, email = $2, role = $3, password_hash = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
                [full_name, email, role, hashedPassword, id]
            );
        } else {
            updatedUserRes = await client.query(
                'UPDATE admin_users SET full_name = $1, email = $2, role = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
                [full_name, email, role, id]
            );
        }
        await client.query('DELETE FROM admin_hotel_access WHERE admin_id = $1', [id]);
        if (role === 'admin' && hotel_ids.length > 0) {
            const accessQueries = hotel_ids.map(hotelId => client.query('INSERT INTO admin_hotel_access (admin_id, hotel_id) VALUES ($1, $2)', [id, hotelId]));
            await Promise.all(accessQueries);
        }
        await client.query('COMMIT');
        res.json(updatedUserRes.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    } finally {
        client.release();
    }
});

router.delete('/admin-users/:id', isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM admin_users WHERE id = $1', [id]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
});

/**
 * ===================================
 * LEGACY CORPORATE USER MANAGEMENT API
 * (Main login, not employees)
 * ===================================
 */

/**
 * GET /api/admin/corporate-users
 * Mengambil semua data user korporat (untuk keperluan internal admin panel).
 */
router.get('/corporate-users', async (req, res) => {
    try {
        // Mengambil hanya ID dan company_id untuk efisiensi.
        const result = await pool.query('SELECT id, company_id FROM company_users');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching all corporate users:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/admin/corporate-users
 * Membuat user login utama untuk sebuah perusahaan (bukan karyawan biasa).
 * Ini adalah endpoint yang dipanggil dari tombol "Buat User Login".
 */
router.post('/corporate-users', async (req, res) => {
    const { company_id, full_name, email, password } = req.body;
    if (!company_id || !full_name || !email || !password) {
        return res.status(400).json({ error: 'Nama lengkap, Company ID, email, dan password dibutuhkan.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            'INSERT INTO company_users (company_id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email',
            [company_id, full_name, email, password_hash, 'approver'] // Main user defaults to 'approver'
        );
        const newUser = result.rows[0];
        logActivity('user_created', `User login utama "${newUser.email}" dibuat untuk perusahaan ID ${company_id}.`);
        res.status(201).json(newUser);
    } catch (err) {
        // This log is crucial for debugging. It will show the exact database error in the backend console.
        console.error('Error creating main corporate user:', err);

        if (err.code === '23505') { // Unique constraint violation (e.g., email already exists)
             return res.status(409).json({ error: 'Email ini sudah terdaftar untuk perusahaan ini.' });
        }
        if (err.code === '23503') { // Foreign key violation
             return res.status(400).json({ error: `Perusahaan dengan ID ${company_id} tidak ditemukan.` });
        }
        if (err.code === '23502') { // Not-null violation
             return res.status(400).json({ error: `Data tidak lengkap. Kolom '${err.column}' wajib diisi.` });
        }
        // For development, it's helpful to see the actual database error.
        // In production, you might want to keep this generic.
        const errorMessage = process.env.NODE_ENV === 'production' ? 'Internal server error' : `Database error: ${err.message}`;
        res.status(500).json({ error: errorMessage });
    }
});

router.get('/companies/:companyId/user', async (req, res) => {
    const { companyId } = req.params;
    try {
        // This endpoint should get the *first* user associated, assuming one main login
        const result = await pool.query('SELECT id, email FROM company_users WHERE company_id = $1 LIMIT 1', [companyId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User untuk perusahaan ini tidak ditemukan.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/corporate-users/:userId/password', async (req, res) => {
    const { userId } = req.params;
    const { password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const result = await pool.query('UPDATE company_users SET password_hash = $1 WHERE id = $2', [password_hash, userId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'User tidak ditemukan.' });
        logActivity('user_password_reset', `Password untuk user korporat ID ${userId} direset.`);
        res.status(200).json({ message: 'Password berhasil direset.' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/corporate-users/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query('DELETE FROM company_users WHERE id = $1', [userId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'User tidak ditemukan.' });
        logActivity('user_deleted', `User korporat ID ${userId} telah dihapus.`);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/admin/companies
 * Mengambil semua perusahaan yang disetujui.
 */

module.exports = router;
