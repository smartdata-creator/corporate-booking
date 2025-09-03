require('dotenv').config(); // Muat variabel dari .env di baris paling atas
const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Impor pool dari file terpusat
const helmet = require('helmet'); // Impor helmet
const { initializeEmail } = require('./emailService');
const path = require('path');
const http = require('http');
const { initializeWebSocket } = require('./websocket');

// --- Import Rute ---
// Asumsi file-file ini sudah dibuat dan berisi logika yang sesuai
const publicRoutes = require('./routes/publicRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminEmployeeRoutes = require('./routes/adminEmployeeRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const portalRoutes = require('./routes/portalRoutes');
const companyRoutes = require('./routes/companyRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const dashboardAdminRoutes = require('./routes/dashboardRoutes');

// Rute Publik
const publicHotelRoutes = require('./routes/publicHotelRoutes');

const app = express();
const port = process.env.PORT || 3000;

// --- Konfigurasi Middleware ---
app.use(helmet()); // Menambahkan header keamanan dasar

// Konfigurasi CORS yang lebih aman untuk produksi
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
const corsOptions = {
    origin: (origin, callback) => {
        // Izinkan request tanpa origin (misalnya dari Postman, mobile apps) atau dari domain yang diizinkan
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
};
app.use(cors(corsOptions));

app.use(express.json()); // Mem-parsing body request sebagai JSON

// Middleware untuk menyajikan file statis dari direktori 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware untuk logging request (membantu debugging)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// --- Gunakan Rute ---
app.use('/api', publicRoutes);
app.use('/api', publicHotelRoutes); // Tambahkan baris ini
app.use('/api/auth', authRoutes);
app.use('/api', paymentRoutes); // Webhook tidak perlu prefix /admin atau /portal
app.use('/api/portal', portalRoutes);

// --- Rute Admin (Dikelompokkan untuk kejelasan) ---
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminEmployeeRoutes);
app.use('/api/admin', companyRoutes);
app.use('/api/admin', submissionRoutes);
app.use('/api/admin', reviewRoutes);
app.use('/api/admin', dashboardAdminRoutes);

// Endpoint untuk mengecek koneksi
app.get('/', (req, res) => {
    res.send('Backend server is running!');
});

// --- Penanganan Error (Harus diletakkan setelah semua rute) ---

// Middleware untuk menangani rute yang tidak ditemukan (404 Not Found)
app.use((req, res, next) => {
    res.status(404).json({ message: "Resource not found on this server" });
});

// Middleware untuk menangani error terpusat (error handler harus memiliki 4 argumen)
app.use((err, req, res, next) => {
    console.error(err.stack); // Penting untuk logging di Render
    res.status(err.status || 500).json({
        message: err.message || 'An internal server error occurred',
    });
});
// --- Menjalankan Server & WebSocket ---
const server = http.createServer(app);

// Inisialisasi dan tempelkan server WebSocket ke server HTTP
initializeWebSocket(server);

// --- Start Server after DB Connection ---
const startServer = async () => {
    try {
        // 1. Test Database Connection
        const client = await pool.connect();
        console.log('✅ Successfully connected to the database.');
        client.release();

        // 2. Initialize other services
        await initializeEmail();

        // 3. Start listening for requests only after everything is ready
        server.listen(port, () => {
            console.log(`🚀 Server running on http://localhost:${port}`);
        });
    } catch (err) {
        console.error('❌ FATAL: Could not start server. Please check database connection and .env file.', err.stack);
        process.exit(1);
    }
};

startServer();
