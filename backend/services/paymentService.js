const midtransClient = require('midtrans-client');
const pool = require('../db');

async function getMidtransSnap() {
    const settingsRes = await pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'payment_gateway_settings'");
    if (settingsRes.rows.length === 0) {
        throw new Error('Pengaturan payment gateway belum dikonfigurasi.');
    }
    const settings = JSON.parse(settingsRes.rows[0].setting_value);

    return new midtransClient.Snap({
        isProduction: settings.isProduction,
        serverKey: settings.serverKey,
        clientKey: settings.clientKey
    });
}

/**
 * Membuat transaksi pembayaran di Midtrans.
 * @param {object} booking - Objek booking dari database.
 * @returns {Promise<string>} Token transaksi dari Midtrans.
 */
async function createPaymentTransaction(booking) {
    const snap = await getMidtransSnap();

    const parameter = {
        "transaction_details": {
            "order_id": `BOOKING-${booking.id}-${Date.now()}`, // Buat order ID unik
            "gross_amount": parseFloat(booking.total_price)
        },
        "customer_details": {
            "first_name": booking.guest_name,
            "email": booking.guest_email,
        },
        "item_details": [{
            "id": `ROOM-${booking.room_type_id}`,
            "price": parseFloat(booking.total_price),
            "quantity": 1,
            "name": `${booking.room_name} di ${booking.hotel_name}`
        }],
        "callbacks": {
            "finish": `${process.env.FRONTEND_URL}/booking-success.html` // URL redirect setelah pembayaran
        }
    };

    const transaction = await snap.createTransaction(parameter);
    return transaction.token;
}

module.exports = { createPaymentTransaction, getMidtransSnap };