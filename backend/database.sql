-- Skrip untuk inisialisasi database PostgreSQL
-- =============================================================================
-- Corporate Booking - Database Initialization Script for PostgreSQL
-- =============================================================================
-- This script is designed to be re-runnable. It will first drop all existing
-- objects to ensure a clean setup.
--
-- NOTE: The "NOTICE" messages about objects not existing during the DROP
-- phase are normal and expected when running this script for the first time.
-- =============================================================================


-- 1. DROP ALL EXISTING OBJECTS
-- =============================================================================
-- We drop objects in reverse order of dependency or use CASCADE to handle it automatically.
-- Using CASCADE is simpler and more robust for development environments.

DROP TABLE IF EXISTS hotel_reviews CASCADE;
DROP TABLE IF EXISTS corporate_rates CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS admin_hotel_access CASCADE;
DROP TABLE IF EXISTS company_users CASCADE; -- Ditambahkan untuk memastikan tabel ini juga dihapus
DROP TABLE IF EXISTS room_allotments CASCADE;
DROP TABLE IF EXISTS corporate_users CASCADE;
DROP TABLE IF EXISTS room_types CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS site_settings CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;
DROP TABLE IF EXISTS testimonials CASCADE;
DROP TABLE IF EXISTS promos CASCADE;
DROP TABLE IF EXISTS activities CASCADE;

-- Drop the trigger function after dropping tables that might use it.
DROP FUNCTION IF EXISTS update_updated_at_column();


-- 2. CREATE HELPER FUNCTIONS
-- =============================================================================
-- This trigger function automatically updates the `updated_at` column on any change.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';


-- 3. CREATE TABLES
-- =============================================================================

CREATE TABLE hotels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url TEXT,
    description TEXT,
    amenities JSONB, -- Stores an array of featured amenities, e.g., '["Pool", "Free WiFi"]'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel untuk menyimpan data testimoni
CREATE TABLE testimonials (
    id SERIAL PRIMARY KEY,
    author VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    quote TEXT NOT NULL,
    image_url TEXT,
    is_featured BOOLEAN DEFAULT FALSE, -- To mark testimonials for the main page
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel untuk menyimpan data pengajuan fasilitas kredit
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_npwp VARCHAR(25) NOT NULL,
    company_address TEXT,
    contact_person_name VARCHAR(255) NOT NULL,
    contact_person_email VARCHAR(255) NOT NULL,
    contact_person_phone VARCHAR(50),
    finance_pic_email VARCHAR(255) NOT NULL,
    service_type VARCHAR(50),
    credit_estimation NUMERIC(15, 2) DEFAULT 0.00,
    terms_agreement BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- pending, verifying, approved, rejected
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel untuk perusahaan yang disetujui
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    credit_limit NUMERIC(15, 2) DEFAULT 0.00,
    credit_used NUMERIC(15, 2) DEFAULT 0.00,
    submission_id INTEGER REFERENCES submissions(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' atau 'suspended'
    accessible_hotel_ids INTEGER[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel untuk user admin
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'superadmin')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel untuk hak akses admin per hotel (Many-to-Many)
CREATE TABLE admin_hotel_access (
    admin_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    PRIMARY KEY (admin_id, hotel_id) -- Kunci utama komposit untuk memastikan keunikan
);

CREATE TABLE company_users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee', -- 'employee' atau 'approver'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, email) -- Pastikan email unik untuk setiap perusahaan
);

-- Tabel untuk tipe kamar per hotel
CREATE TABLE room_types (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    facilities TEXT[], -- Stores room facilities, e.g., ARRAY['AC', 'Cable TV']
    price_options JSONB, -- Stores price packages, e.g., '[{"name": "Room Only", "price": 500000, "description": "..."}]'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel untuk alokasi kamar harian
CREATE TABLE room_allotments (
    id SERIAL PRIMARY KEY,
    room_type_id INTEGER NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    allotment_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0, -- Changed from total_allotment for clarity and simplicity
    booked_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(room_type_id, allotment_date) -- Pastikan hanya ada satu entri per kamar per hari
);

-- Tabel untuk harga korporat khusus
-- Diubah untuk mendukung harga per paket kamar, bukan hanya per tipe kamar.
CREATE TABLE corporate_rates (
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    room_type_id INTEGER NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    price_option_name VARCHAR(255) NOT NULL, -- Nama paket harga, e.g., "Room Only", "With Breakfast"
    special_price NUMERIC(12, 2) NOT NULL,
    PRIMARY KEY (company_id, room_type_id, price_option_name) -- Kunci komposit untuk memastikan keunikan
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES company_users(id) ON DELETE SET NULL, -- ID user korporat yang memesan
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL, -- Untuk booking korporat
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE, -- Hotel yang di-booking
    room_type_id INTEGER NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    room_name VARCHAR(255) NOT NULL, -- Menyimpan nama kamar lengkap dengan paketnya
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- awaiting_payment, pending, confirmed, canceled, done, pending_approval, rejected_by_company
    guest_id_image TEXT, -- Path to the uploaded ID image
    guarantee_letter TEXT, -- Path to the uploaded guarantee letter PDF
    booking_date TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel untuk menyimpan ulasan hotel dari perusahaan
CREATE TABLE hotel_reviews (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE, -- Setiap booking hanya bisa diulas sekali
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE, -- Bisa NULL untuk tamu publik
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    reviewer_name VARCHAR(255), -- Nama tamu publik, atau bisa diisi nama user korporat
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- Star rating 1-5
    comment TEXT,
    is_featured BOOLEAN DEFAULT FALSE, -- Untuk menandai ulasan yang akan ditampilkan di halaman utama
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- Contoh: 'booking_created', 'submission_approved'
    description TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk menyimpan pengaturan umum website, seperti URL gambar hero
CREATE TABLE site_settings (
    setting_key VARCHAR(255) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel untuk menyimpan data promo di halaman utama
CREATE TABLE promos (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    title VARCHAR(255), -- Digunakan untuk alt text gambar
    link_url TEXT,      -- URL tujuan jika promo diklik
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE SET NULL, -- Link ke hotel spesifik, bisa NULL
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 4. CREATE TRIGGERS
-- =============================================================================
-- Apply the trigger to tables that have an `updated_at` column.

CREATE TRIGGER update_hotels_updated_at
BEFORE UPDATE ON hotels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_types_updated_at
BEFORE UPDATE ON room_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON site_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promos_updated_at
BEFORE UPDATE ON promos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
BEFORE UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_users_updated_at
BEFORE UPDATE ON company_users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- 5. SEED INITIAL DATA (Optional)
-- =============================================================================

INSERT INTO hotels (name, image_url, description, amenities) VALUES
('Grand Serela Setiabudhi Bandung', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2l2Ry-RYhqzs3-5jHetvaWKf-xTtohXLoYQ&s', 'Terletak di jantung kota Bandung, Grand Serela menawarkan kemewahan dan kenyamanan dengan akses mudah ke pusat perbelanjaan dan kuliner.', '["Kolam Renang", "WiFi Gratis", "Restoran", "Pusat Kebugaran", "Spa"]'),
('Gino Feruci Braga Bandung', 'https://ginoferuci.com/braga-bandung/wp-content/uploads/sites/3/revslider/main-home-1/Gino-Feruci-Braga-Facade_1920_edit.jpg', 'Nikmati pengalaman menginap yang tak terlupakan di kawasan bersejarah Braga. Hotel kami memadukan desain modern dengan sentuhan klasik.', '["Akses Jalan Braga", "Restoran Atap", "Parkir Gratis"]'),
('Golden Flower Bandung', 'https://golden-flower.co.id/wp-content/uploads/2020/01/facade.jpg', 'Pilihan ideal untuk pelancong bisnis dan liburan, berlokasi strategis di pusat kota Bandung dengan fasilitas MICE yang lengkap.', '["Ballroom", "Ruang Meeting", "Kolam Renang", "Restoran"]');

INSERT INTO testimonials (author, title, quote, image_url) VALUES
('Budi Santoso', 'Manajer Operasional, PT Maju Jaya', 'Platform ini benar-benar mengubah cara kami mengelola perjalanan dinas. Semuanya jadi lebih efisien dan transparan. Sangat direkomendasikan!', 'https://i.pravatar.cc/60?img=1'),
('Rina Hartono', 'Kepala Keuangan, Startup Inovasi', 'Fitur pelaporan pengeluarannya sangat membantu tim keuangan kami. Kami bisa menghemat banyak waktu dan mengurangi kesalahan manual.', 'https://i.pravatar.cc/60?img=5'),
('Dewi Lestari', 'Event Coordinator, CV Cipta Kreasi', 'Layanan pelanggan yang luar biasa! Tim mereka sangat responsif dan membantu kami menemukan solusi hotel terbaik untuk acara konferensi tahunan kami.', 'https://i.pravatar.cc/60?img=7');

INSERT INTO submissions (
    company_name, company_npwp, company_address,
    contact_person_name, contact_person_email, contact_person_phone,
    finance_pic_email, service_type, credit_estimation, terms_agreement
) VALUES (
    'PT Sejahtera Bersama', '01.234.567.8-901.000', 'Jl. Gatot Subroto No. 12, Jakarta Selatan',
    'Andi Wijaya', 'andi.w@sejahterabersama.com', '081298765432',
    'finance@sejahterabersama.com', 'mice', 50000000.00, true
);

INSERT INTO room_types (hotel_id, name, description, image_url, facilities, price_options) VALUES
(1, 'Deluxe Room', 'Kamar elegan dengan pemandangan kota, luas 32 m².', 'https://dksw6vf0i66fe.cloudfront.net/room_type_image/image/1ed22173-4061-4417-bcda-e4295b8b25a3_1724807572.jpg', ARRAY['AC', 'TV Kabel', 'WiFi', 'Shower', 'Meja Kerja'], '[
    {"name": "Room Only", "price": 550000, "description": "Hanya kamar, tanpa sarapan."},
    {"name": "Include Breakfast", "price": 680000, "description": "Termasuk sarapan untuk 2 orang."}
]'),
(1, 'Executive Suite', 'Suite mewah dengan ruang tamu terpisah, luas 60 m².', 'https://dksw6vf0i66fe.cloudfront.net/room_type_image/image/1ed22173-4061-4417-bcda-e4295b8b25a3_1724807572.jpg', ARRAY['AC', 'TV Kabel', 'WiFi', 'Shower', 'Sofa', 'Bathtub'], '[
    {"name": "Room Only", "price": 1200000, "description": "Hanya kamar, tanpa sarapan."},
    {"name": "Include Breakfast", "price": 1450000, "description": "Termasuk sarapan dan akses lounge."}
]'),
(2, 'Superior Room', 'Kamar nyaman untuk pebisnis, luas 28 m².', 'https://dksw6vf0i66fe.cloudfront.net/room_type_image/image/1ed22173-4061-4417-bcda-e4295b8b25a3_1724807572.jpg', ARRAY['AC', 'TV Kabel', 'WiFi'], '[
    {"name": "Room Only", "price": 480000, "description": "Hanya kamar, tanpa sarapan."}
]');

-- Masukkan data admin awal (ganti dengan password yang aman)
-- Password untuk contoh ini adalah 'admin123'
INSERT INTO admin_users (full_name, email, password_hash, role) VALUES
('Kagum Super Admin', 'admin@kagum.com', '$2b$10$E.p/aV/hG5C8WwzQz.p1guYv1q.L3g3eK.sX.Z.z.z.z.z.z.z.z', 'superadmin'); -- Ganti hash ini dengan yang di-generate oleh bcrypt untuk 'admin123' atau password pilihan Anda

-- Masukkan nilai awal untuk pengaturan situs
INSERT INTO site_settings (setting_key, setting_value) VALUES
('hero_background_url', 'https://dksw6vf0i66fe.cloudfront.net/room_type_image/image/1ed22173-4061-4417-bcda-e4295b8b25a3_1724807572.jpg'),
('payment_gateway_settings', '{"isProduction":false,"serverKey":"","clientKey":""}'),
('integration_settings', '{"apiUrl":"","apiKey":"","hotelId":""}'),
('company_logo_url', '{"url": ""}')
ON CONFLICT (setting_key) DO NOTHING;

-- Masukkan data promo awal
INSERT INTO promos (image_url, title, hotel_id) VALUES
('https://dksw6vf0i66fe.cloudfront.net/room_type_image/image/1ed22173-4061-4417-bcda-e4295b8b25a3_1724807572.jpg', 'Promo Spesial Ruang Meeting', 1),
('https://ginoferuci.com/braga-bandung/wp-content/uploads/sites/3/revslider/main-home-1/Gino-Feruci-Braga-Facade_1920_edit.jpg', 'Diskon Menginap Akhir Pekan', 2);