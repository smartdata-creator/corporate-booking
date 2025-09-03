const nodemailer = require('nodemailer');

let transporter;

// Fungsi untuk menginisialisasi transporter email.
// Kita menggunakan Ethereal untuk development. Di produksi, Anda akan menggantinya
// dengan kredensial dari layanan seperti Gmail, SendGrid, atau Mailgun.
async function initializeEmail() {
    if (transporter) {
        return;
    }

    try {
        // Buat akun tes di Ethereal
        let testAccount = await nodemailer.createTestAccount();

        console.log('========================================================');
        console.log('EMAIL TEST ACCOUNT (ETHEREAL)');
        console.log(`User: ${testAccount.user}`);
        console.log(`Pass: ${testAccount.pass}`);
        console.log('========================================================');

        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
            tls: {
                // Jangan gagal pada sertifikat yang tidak valid (khusus untuk Ethereal/dev)
                rejectUnauthorized: false
            },
        });
    } catch (error) {
        console.error("Gagal membuat akun tes email:", error);
    }
}

async function sendSubmissionStatusEmail(toEmail, companyName, status) {
    if (!transporter) {
        console.error("Transporter email belum diinisialisasi.");
        return;
    }

    if (!toEmail) {
        console.error("Gagal mengirim email status: tidak ada email penerima yang diberikan.");
        return;
    }

    const subject = `Update Status Pengajuan Credit Facility untuk ${companyName}`;
    const text = `Halo, \n\nTerima kasih telah mengajukan permohonan credit facility. Saat ini, status pengajuan Anda adalah: ${status.toUpperCase()}.\n\nTim kami sedang melakukan verifikasi data Anda. Kami akan segera menghubungi Anda kembali.\n\nTerima kasih,\nTim MICE & TRAVEL Booking`;
    const html = `<p>Halo,</p><p>Terima kasih telah mengajukan permohonan credit facility. Saat ini, status pengajuan Anda adalah: <strong>${status.toUpperCase()}</strong>.</p><p>Tim kami sedang melakukan verifikasi data Anda. Kami akan segera menghubungi Anda kembali.</p><p>Terima kasih,<br>Tim MICE & TRAVEL Booking</p>`;

    try {
        let info = await transporter.sendMail({
            from: '"MICE & TRAVEL Booking" <noreply@micetravel.com>',
            to: toEmail,
            subject: subject,
            text: text,
            html: html,
        });

        console.log(`Email notifikasi terkirim ke ${toEmail}. URL pratinjau: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (error) {
        console.error("Gagal mengirim email:", error);
    }
}

async function sendSubmissionRejectionEmail(toEmail, companyName) {
    if (!transporter) {
        console.error("Transporter email belum diinisialisasi.");
        return;
    }

    if (!toEmail) {
        console.error("Gagal mengirim email penolakan: tidak ada email penerima yang diberikan.");
        return;
    }

    const subject = `Pembaruan Pengajuan Credit Facility untuk ${companyName}`;
    const text = `Halo, \n\nDengan berat hati kami memberitahukan bahwa setelah proses verifikasi, pengajuan credit facility Anda untuk ${companyName} belum dapat kami setujui saat ini.\n\nJika Anda memiliki pertanyaan lebih lanjut, jangan ragu untuk menghubungi tim kami.\n\nTerima kasih atas pengertian Anda,\nTim MICE & TRAVEL Booking`;
    const html = `<p>Halo,</p><p>Dengan berat hati kami memberitahukan bahwa setelah proses verifikasi, pengajuan credit facility Anda untuk <strong>${companyName}</strong> belum dapat kami setujui saat ini.</p><p>Jika Anda memiliki pertanyaan lebih lanjut, jangan ragu untuk menghubungi tim kami.</p><p>Terima kasih atas pengertian Anda,<br>Tim MICE & TRAVEL Booking</p>`;

    try {
        let info = await transporter.sendMail({
            from: '"MICE & TRAVEL Booking" <noreply@micetravel.com>',
            to: toEmail,
            subject: subject,
            text: text,
            html: html,
        });

        console.log(`Email penolakan terkirim ke ${toEmail}. URL pratinjau: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (error) {
        console.error("Gagal mengirim email penolakan:", error);
    }
}

async function sendNewSubmissionAdminNotification(adminEmail, submissionData) {
    if (!transporter) {
        console.error("Transporter email belum diinisialisasi.");
        return;
    }

    if (!adminEmail) {
        console.error("Gagal mengirim notifikasi admin: tidak ada email admin yang dikonfigurasi (cek .env ADMIN_EMAIL).");
        return;
    }

    // FIX: Gunakan company_name, bukan company.
    const companyName = submissionData.company_name || 'Perusahaan Tidak Dikenal';
    const subject = `Pengajuan Credit Facility Baru dari ${companyName}`;
    const text = `Halo Admin,\n\nAda pengajuan credit facility baru yang masuk dari perusahaan: ${companyName}.\n\nSilakan login ke panel admin untuk meninjau pengajuan tersebut.\n\nTerima kasih.`;
    const html = `<p>Halo Admin,</p><p>Ada pengajuan credit facility baru yang masuk dari perusahaan: <strong>${companyName}</strong>.</p><p>Silakan login ke <a href="http://localhost:5500/admin.html#submission-management">panel admin</a> untuk meninjau pengajuan tersebut.</p><p>Terima kasih.</p>`;

    try {
        let info = await transporter.sendMail({
            from: '"MICE & TRAVEL Booking Notifikasi" <noreply@micetravel.com>',
            to: adminEmail, // Mengirim ke email admin dari .env
            subject: subject,
            text: text,
            html: html,
        });

        console.log(`Email notifikasi admin terkirim ke ${adminEmail}. URL pratinjau: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (error) {
        console.error("Gagal mengirim email notifikasi admin:", error);
    }
}

async function sendBookingStatusUpdateEmail(bookingDetails) {
    const { toEmail, guestName, hotelName, roomName, checkInDate, checkOutDate, status } = bookingDetails;

    if (!transporter) {
        console.error("Transporter email belum diinisialisasi.");
        return;
    }

    if (!toEmail) {
        console.error("Gagal mengirim email status booking: tidak ada email penerima yang diberikan.");
        return;
    }

    let subject = '';
    let html = '';
    const formattedCheckIn = new Date(checkInDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedCheckOut = new Date(checkOutDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    if (status === 'confirmed') {
        subject = `Konfirmasi Booking Anda di ${hotelName}`;
        html = `
            <p>Halo ${guestName},</p>
            <p>Kabar baik! Booking Anda telah <strong>DIKONFIRMASI</strong>.</p>
            <p>Berikut adalah detail pemesanan Anda:</p>
            <ul>
                <li><strong>Hotel:</strong> ${hotelName}</li>
                <li><strong>Tipe Kamar:</strong> ${roomName}</li>
                <li><strong>Tanggal Check-in:</strong> ${formattedCheckIn}</li>
                <li><strong>Tanggal Check-out:</strong> ${formattedCheckOut}</li>
            </ul>
            <p>Kami menantikan kedatangan Anda!</p>
            <p>Terima kasih,<br>Tim MICE & TRAVEL Booking</p>
        `;
    } else if (status === 'canceled') {
        subject = `Pemberitahuan Pembatalan Booking Anda di ${hotelName}`;
        html = `
            <p>Halo ${guestName},</p>
            <p>Dengan menyesal kami informasikan bahwa booking Anda telah <strong>DIBATALKAN</strong>.</p>
            <p>Jika Anda merasa ini adalah sebuah kesalahan atau memiliki pertanyaan, silakan hubungi kami.</p>
            <p>Terima kasih,<br>Tim MICE & TRAVEL Booking</p>
        `;
    } else {
        return; // Jangan kirim email untuk status lain seperti 'pending'
    }

    try {
        let info = await transporter.sendMail({ from: '"MICE & TRAVEL Booking" <noreply@micetravel.com>', to: toEmail, subject, html });
        console.log(`Email status booking terkirim ke ${toEmail}. URL pratinjau: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (error) {
        console.error("Gagal mengirim email status booking:", error);
    }
}

async function sendBookingApprovalNotification(approverEmails, bookingDetails, companyName) {
    if (!transporter) {
        console.error("Transporter email belum diinisialisasi.");
        return;
    }
    if (!approverEmails || approverEmails.length === 0) {
        console.log("Tidak ada approver yang ditemukan untuk dikirimi notifikasi.");
        return;
    }

    const { id, guest_name, hotel_name, room_name, check_in_date, check_out_date, total_price } = bookingDetails;
    const formattedCheckIn = new Date(check_in_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedCheckOut = new Date(check_out_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(total_price);

    const subject = `[Persetujuan Diperlukan] Booking Baru dari ${guest_name} - ${companyName}`;
    const html = `
        <p>Halo Tim Approver ${companyName},</p>
        <p>Sebuah booking baru telah dibuat dan memerlukan persetujuan Anda.</p>
        <p><strong>Detail Booking:</strong></p>
        <ul>
            <li><strong>ID Booking:</strong> #${id}</li>
            <li><strong>Nama Tamu:</strong> ${guest_name}</li>
            <li><strong>Hotel:</strong> ${hotel_name}</li>
            <li><strong>Tipe Kamar:</strong> ${room_name}</li>
            <li><strong>Tanggal Check-in:</strong> ${formattedCheckIn}</li>
            <li><strong>Tanggal Check-out:</strong> ${formattedCheckOut}</li>
            <li><strong>Total Harga:</strong> ${formattedPrice}</li>
        </ul>
        <p>Silakan login ke portal perusahaan Anda untuk meninjau dan memberikan persetujuan.</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5500'}/portal-history.html">Lihat Riwayat Booking</a></p>
        <p>Terima kasih,<br>Sistem MICE & TRAVEL Booking</p>
    `;

    try {
        let info = await transporter.sendMail({
            from: '"MICE & TRAVEL Booking Notifikasi" <noreply@micetravel.com>',
            to: approverEmails.join(', '), // Kirim ke semua approver
            subject: subject,
            html: html,
        });

        console.log(`Email notifikasi persetujuan terkirim ke ${approverEmails.join(', ')}. URL pratinjau: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (error) {
        console.error("Gagal mengirim email notifikasi persetujuan:", error);
    }
}

module.exports = { initializeEmail, sendSubmissionStatusEmail, sendSubmissionRejectionEmail, sendNewSubmissionAdminNotification, sendBookingStatusUpdateEmail, sendBookingApprovalNotification };