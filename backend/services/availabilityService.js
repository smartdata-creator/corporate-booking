const pool = require('../db');

/**
 * Memeriksa ketersediaan kamar. Fungsi ini akan mencoba API eksternal terlebih dahulu,
 * jika gagal atau tidak dikonfigurasi, ia akan kembali ke tabel alokasi lokal.
 * @param {number} roomTypeId - ID tipe kamar di sistem Anda.
 * @param {string} checkIn - Tanggal check-in (YYYY-MM-DD).
 * @param {string} checkOut - Tanggal check-out (YYYY-MM-DD).
 * @returns {Promise<number>} Jumlah kamar yang tersedia.
 */
async function checkRoomAvailability(roomTypeId, checkIn, checkOut) {
    // 1. Coba periksa apakah ada konfigurasi API eksternal
    // (Dalam implementasi nyata, Anda akan mengambil ini per hotel)
    const settingsRes = await pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'hotel_api_integration'");
    const settings = settingsRes.rows[0]?.setting_value;

    if (settings && settings.apiUrl && settings.apiKey) {
        try {
            // 2. Jika ada, panggil API eksternal
            console.log(`Mengecek ketersediaan via API eksternal: ${settings.apiUrl}`);
            
            // Logika ini SANGAT bergantung pada dokumentasi API VHP/Sindata.
            // Ini HANYA CONTOH.
            const response = await fetch(settings.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': settings.apiKey
                },
                body: JSON.stringify({
                    hotel_id: settings.hotelId, // ID hotel di sistem mereka
                    room_type_id: roomTypeId, // Anda mungkin perlu memetakan ID ini
                    start_date: checkIn,
                    end_date: checkOut
                })
            });

            if (!response.ok) {
                throw new Error('Respons API eksternal tidak valid.');
            }

            const data = await response.json();
            // Asumsikan API mengembalikan { "available_rooms": 5 }
            return data.available_rooms || 0;

        } catch (error) {
            console.error("Gagal menghubungi API eksternal, menggunakan alokasi lokal sebagai fallback.", error.message);
            // Jika API gagal, lanjutkan ke alokasi lokal
        }
    }

    // 3. Fallback: Jika tidak ada API atau API gagal, gunakan tabel alokasi lokal
    console.log("Mengecek ketersediaan via alokasi lokal.");
    const query = `
        SELECT MIN(total_allotment - booked_count) as available_rooms
        FROM room_allotments
        WHERE room_type_id = $1 AND allotment_date >= $2 AND allotment_date < $3;
    `;
    const result = await pool.query(query, [roomTypeId, checkIn, checkOut]);
    return result.rows[0]?.available_rooms || 0;
}

module.exports = { checkRoomAvailability };