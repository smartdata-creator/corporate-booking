const express = require('express');
const router = express.Router();
const db = require('../db'); // Asumsi koneksi database diekspor dari sini
const { authenticateAdmin } = require('../middleware/authMiddleware'); // Asumsi middleware otentikasi admin

/**
 * @route   GET /api/admin/dashboard/allotment-summary
 * @desc    Mengambil ringkasan alotment kamar untuk hari ini di semua hotel yang dapat diakses oleh admin.
 * @access  Private (Admin, Superadmin)
 */
router.get('/dashboard/allotment-summary', authenticateAdmin, async (req, res) => {
    const { role, id: adminId } = req.user;

    try {
        // Tentukan hotel mana yang bisa diakses oleh admin yang sedang login
        let accessibleHotelsSubquery;
        let queryParams = [];

        if (role === 'superadmin') {
            // Superadmin bisa mengakses semua hotel
            accessibleHotelsSubquery = 'SELECT id FROM hotels';
        } else {
            // Admin biasa hanya bisa mengakses hotel yang ditugaskan padanya
            accessibleHotelsSubquery = 'SELECT hotel_id as id FROM admin_hotel_access WHERE admin_user_id = $1';
            queryParams.push(adminId);
        }

        // Query utama untuk mengambil semua data yang dibutuhkan dalam satu kali jalan
        const summaryQuery = `
            WITH accessible_hotels AS (${accessibleHotelsSubquery}),
            rooms_with_hotels AS (
                SELECT
                    r.id as room_id,
                    r.name as room_name,
                    h.id as hotel_id,
                    h.name as hotel_name
                FROM room_types r
                JOIN hotels h ON r.hotel_id = h.id
                WHERE h.id IN (SELECT id FROM accessible_hotels)
            ),
            todays_allotments AS (
                SELECT
                    room_type_id as room_id,
                    quantity as total_allotment
                FROM room_allotments
                WHERE allotment_date = CURRENT_DATE
            ),
            todays_bookings AS (
                SELECT
                    room_type_id as room_id,
                    COUNT(*) as booked_count
                FROM bookings
                WHERE
                    status = 'confirmed' AND
                    CURRENT_DATE >= check_in_date AND
                    CURRENT_DATE < check_out_date
                GROUP BY room_type_id
            )
            SELECT
                rwh.hotel_id,
                rwh.hotel_name,
                rwh.room_id,
                rwh.room_name,
                COALESCE(ta.total_allotment, 0)::int as total_allotment,
                COALESCE(tb.booked_count, 0)::int as booked_count
            FROM rooms_with_hotels rwh
            LEFT JOIN todays_allotments ta ON rwh.room_id = ta.room_id
            LEFT JOIN todays_bookings tb ON rwh.room_id = tb.room_id
            ORDER BY rwh.hotel_name, rwh.room_name;
        `;

        const { rows } = await db.query(summaryQuery, queryParams);

        // Ubah data flat menjadi struktur JSON bertingkat yang diinginkan frontend
        const hotelSummary = rows.reduce((acc, row) => {
            acc[row.hotel_id] = acc[row.hotel_id] || { hotel_id: row.hotel_id, hotel_name: row.hotel_name, rooms: [] };
            acc[row.hotel_id].rooms.push({
                room_id: row.room_id,
                room_name: row.room_name,
                total_allotment: row.total_allotment,
                booked_count: row.booked_count,
                remaining: row.total_allotment - row.booked_count
            });
            return acc;
        }, {});

        res.json(Object.values(hotelSummary));

    } catch (error) {
        console.error('Error fetching allotment summary:', error);
        // Send a more descriptive error for easier debugging
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

module.exports = router;