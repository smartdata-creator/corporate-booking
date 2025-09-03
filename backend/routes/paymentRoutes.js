const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');
const { getMidtransSnap } = require('../services/paymentService');

/**
 * POST /api/payment-webhook
 * Menerima notifikasi dari Midtrans.
 */
router.post('/payment-webhook', async (req, res) => {
    try {
        const snap = await getMidtransSnap();
        const notificationJson = req.body;

        // Gunakan utility dari Midtrans untuk memverifikasi notifikasi
        const statusResponse = await snap.transaction.notification(notificationJson);
        let orderId = statusResponse.order_id;
        let transactionStatus = statusResponse.transaction_status;
        let fraudStatus = statusResponse.fraud_status;

        console.log(`Notifikasi diterima untuk Order ID ${orderId}: ${transactionStatus}`);

        // Ekstrak ID booking dari order_id
        const bookingId = parseInt(orderId.split('-')[1]);

        if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
            if (fraudStatus == 'accept') {
                // Pembayaran berhasil, update status booking menjadi 'pending'
                await pool.query(
                    "UPDATE bookings SET status = 'pending' WHERE id = $1 AND status = 'awaiting_payment'",
                    [bookingId]
                );
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook Error:', error.message);
        res.status(500).send('Error processing notification');
    }
});

module.exports = router;