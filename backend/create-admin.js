require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const createAdmin = async () => {
    const args = process.argv.slice(2);
    const fullName = args[0];
    const email = args[1];
    const password = args[2];
    const role = args[3] || 'admin'; // Default ke 'admin' jika tidak dispesifikasikan

    if (!fullName || !email || !password) {
        console.error('Penggunaan: node create-admin.js "<Nama Lengkap>" <email> <password> [role]');
        console.error('Contoh: node create-admin.js "Nama Admin" admin@example.com password123 superadmin');
        process.exit(1);
    }

    if (role !== 'admin' && role !== 'superadmin') {
        console.error('Error: Role harus "admin" atau "superadmin".');
        process.exit(1);
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            'INSERT INTO admin_users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role',
            [fullName, email, password_hash, role]
        );

        console.log('✅ User admin berhasil dibuat:');
        console.log(result.rows[0]);
    } catch (error) {
        console.error('❌ Gagal membuat user admin:', error.message);
    } finally {
        await pool.end();
    }
};

createAdmin();