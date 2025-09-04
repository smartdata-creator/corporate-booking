const API_BASE_URL = 'https://corporate-booking.onrender.com/api';

const formatCurrency = (number) => {
    if (number === null || number === undefined) return 'N/A';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(number);
};

const generateStars = (rating) => {
    const totalStars = 5;
    let starHTML = '';
    const roundedRating = Math.round(rating);
    for (let i = 0; i < totalStars; i++) {
        starHTML += i < roundedRating ? '★' : '☆';
    }
    return `<span style="color: #FBBF24; font-size: 1.1rem;">${starHTML}</span>`;
};

/**
 * Membuat avatar placeholder dengan inisial nama.
 * @param {string} name - Nama lengkap.
 * @returns {string} HTML untuk elemen avatar.
 */
const createAvatar = (name) => {
    if (!name) return '<div class="avatar-placeholder">?</div>';
    const initials = name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    return `<div class="avatar-placeholder">${initials}</div>`;
};

const renderHotelReviews = async () => {
    const hotelReviewsGrid = document.getElementById('hotel-reviews-grid');
    if (!hotelReviewsGrid) return;

    try {
        const response = await fetch(`${API_BASE_URL}/hotels/reviews/summary`);
        if (!response.ok) {
            throw new Error('Gagal memuat ulasan hotel.');
        }
        const reviews = await response.json();
        
        if (reviews.length === 0) {
            hotelReviewsGrid.innerHTML = '<p>Belum ada ulasan untuk ditampilkan.</p>';
            return;
        }

        hotelReviewsGrid.innerHTML = ''; // Clear loading message
        reviews.forEach(review => {
            const card = document.createElement('div');
            card.className = 'review-card';
            
            const averageRating = parseFloat(review.average_rating).toFixed(1);

            card.innerHTML = `
                <img src="${review.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8aG90ZWx8fHx8fHwxNjM4OTg4OTM2&ixlib=rb-1.2.1&q=80&w=1080'}" alt="Foto ${review.name}" class="review-card-image">
                <div class="review-card-content">
                    <h3>${review.name}</h3>
                    <div class="review-card-rating">${generateStars(review.average_rating)}</div>
                    <p class="review-card-summary"><strong>${averageRating}</strong> dari 5 (${review.review_count} ulasan)</p>
                </div>
            `;
            hotelReviewsGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Error rendering hotel reviews:', error);
        hotelReviewsGrid.innerHTML = '<p style="color: red;">Gagal memuat ulasan.</p>';
    }
};

// --- Logic untuk mengisi pilihan hotel di form secara dinamis ---
/**
 * Mengisi pilihan hotel di formulir secara dinamis
 * berdasarkan data dari localStorage.
 */
const populateHotelSelect = (hotels) => {
    const hotelSelect = document.getElementById('hotel-select'); // Untuk form kredit
    const reviewHotelSelect = document.getElementById('public-review-hotel-id'); // Untuk form ulasan publik

    if (hotelSelect) {
        hotelSelect.innerHTML = '<option value="">Pilih Hotel</option>'; // Opsi default
        hotels.forEach(hotel => {
            const option = new Option(hotel.name, hotel.id);
            hotelSelect.appendChild(option);
        });
    }

    if (reviewHotelSelect) {
        reviewHotelSelect.innerHTML = '<option value="">Pilih Hotel</option>';
        hotels.forEach(hotel => {
            const option = new Option(hotel.name, hotel.id);
            reviewHotelSelect.appendChild(option);
        });
    }
};

// Buat observer untuk animasi fade-up
const animationObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

/**
 * Memuat gambar latar hero secara dinamis dari API.
 */
const loadHeroBackground = async () => {
    const heroSection = document.querySelector('.hero');
    if (!heroSection) return;

    try {
        const response = await fetch(`${API_BASE_URL}/settings/hero-background`);
        if (!response.ok) throw new Error('Gagal mengambil data gambar hero');
        const data = await response.json();
        if (data.url) {
            heroSection.style.backgroundImage = `linear-gradient(rgba(26, 32, 44, 0.7), rgba(26, 32, 44, 0.7)), url('${data.url}')`;
        }
    } catch (error) {
        console.error('Error memuat gambar latar hero:', error);
        // Fallback jika API gagal, agar section tidak kosong
        heroSection.style.backgroundColor = 'var(--dark-color)';
    }
};

/**
 * Memuat dan menampilkan promo di halaman utama.
 */
const renderPromos = async () => {
    const promoGrid = document.getElementById('promo-grid');
    if (!promoGrid) return;

    try {
        // Asumsi endpoint baru untuk promo, yang bisa dikelola dari admin panel
        const response = await fetch(`${API_BASE_URL}/promos`);
        if (!response.ok) throw new Error('Gagal memuat data promo.');
        const promos = await response.json();

        promoGrid.innerHTML = ''; // Kosongkan placeholder

        if (!promos || promos.length === 0) {
            // Jika tidak ada promo, sembunyikan seluruh seksi
            const promoSection = promoGrid.closest('.promo-section');
            if (promoSection) {
                promoSection.style.display = 'none';
            }
            return;
        }

        const originalPromoCards = promos.map(promo => {
            const promoCard = document.createElement('a');
            
            // Logika baru: prioritaskan link ke hotel jika hotel_id ada
            if (promo.hotel_id) {
                promoCard.href = `hotel-details.html?id=${promo.hotel_id}`;
            } else {
                promoCard.href = promo.link_url || '#';
            }
            
            promoCard.className = 'promo-card';
            if (promo.link_url && !promo.hotel_id) { // Buka di tab baru hanya jika link eksternal
                promoCard.target = '_blank';
                promoCard.rel = 'noopener noreferrer';
            }
            promoCard.innerHTML = `<img src="${promo.image_url}" alt="${promo.title || 'Promo'}">`;
            return promoCard;
        });

        originalPromoCards.forEach(card => promoGrid.appendChild(card));

        // Duplikasi kartu untuk efek scrolling tak terbatas
        originalPromoCards.forEach(card => {
            const clone = card.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            promoGrid.appendChild(clone);
        });
    } catch (error) {
        console.error('Error rendering promos:', error);
        const promoSection = promoGrid.closest('.promo-section');
        if (promoSection) {
            promoSection.style.display = 'none'; // Sembunyikan seksi jika ada error
        }
    }
};
/**
 * Membuat dan menampilkan kartu hotel di halaman utama berdasarkan data dari localStorage.
 */
const renderHotelCards = async () => {
    const hotelGrid = document.querySelector('.hotel-grid');
    if (!hotelGrid) return;
    try {
        const response = await fetch(`${API_BASE_URL}/hotels`);
        if (!response.ok) throw new Error('Gagal memuat data hotel.');
        const hotels = await response.json();

        // Panggil fungsi untuk mengisi dropdown hotel di form
        populateHotelSelect(hotels);

        // Hapus kartu hotel yang di-hardcode
        hotelGrid.innerHTML = '';

        if (!hotels || hotels.length === 0) {
            hotelGrid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Saat ini tidak ada hotel yang tersedia.</p>';
            return;
        }

        hotels.forEach(hotel => {
            const card = document.createElement('div');
            card.className = 'hotel-card fade-up';
            card.innerHTML = `
                <img src="${hotel.image_url}" alt="${hotel.name}">
                <div class="hotel-card-content">
                    <h3>${hotel.name}</h3>
                    <div class="hotel-rating">
                        ${generateStars(hotel.average_rating)}
                        <small>(${hotel.review_count} ulasan)</small>
                    </div>
                    <div class="hotel-price">
                        <span>Mulai dari</span>
                        <strong>${formatCurrency(hotel.min_price)}</strong>
                    </div>
                </div>
                <div class="hotel-cta">
                    <a href="hotel-details.html?id=${hotel.id}" class="btn btn-secondary">Lihat Kamar</a>
                </div>
            `;
            hotelGrid.appendChild(card);
            animationObserver.observe(card); // Terapkan observer ke kartu baru
        });
    } catch (error) {
        console.error('Error rendering hotels:', error);
        hotelGrid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Tidak dapat memuat data hotel. Coba lagi nanti.</p>';
    }
};

/**
 * Membuat dan menampilkan kartu testimoni di halaman utama berdasarkan data dari localStorage.
 */
const renderTestimonials = async () => {
    const testimonialGrid = document.querySelector('.testimonial-grid');
    if (!testimonialGrid) return;
    try {
        const response = await fetch(`${API_BASE_URL}/testimonials`);
        if (!response.ok) throw new Error('Gagal memuat data testimoni.');
        const testimonials = await response.json();

        testimonialGrid.innerHTML = ''; // Selalu bersihkan grid untuk diisi ulang

        if (!testimonials || testimonials.length === 0) {
            testimonialGrid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Belum ada testimoni.</p>';
            return;
        }

        testimonials.forEach(testimonial => {
            const card = document.createElement('div');
            card.className = 'testimonial-card fade-up';
            card.innerHTML = `
                <div class="testimonial-rating">
                    ${generateStars(5)} <!-- Testimoni pilihan selalu ditampilkan sebagai 5 bintang -->
                </div>
                <p class="testimonial-comment">"${testimonial.quote}"</p>
                <div class="testimonial-author">
                    ${testimonial.image_url 
                        ? `<img src="${testimonial.image_url}" alt="Foto ${testimonial.author}">` 
                        : createAvatar(testimonial.author)}
                    <div class="author-info">
                        <strong>${testimonial.author}</strong>
                        <span>${testimonial.title}</span>
                    </div>
                </div>
            `;
            testimonialGrid.appendChild(card);
            animationObserver.observe(card);
        });
    } catch (error) {
        console.error('Error rendering testimonials:', error);
        testimonialGrid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Tidak dapat memuat testimoni. Coba lagi nanti.</p>';
    }
};

// Panggil fungsi untuk me-render kartu dan mengisi hotel saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Logic untuk menutup banner pengumuman
    const announcementBanner = document.getElementById('announcement-banner');
    const closeBannerBtn = document.getElementById('close-banner-btn');

    if (announcementBanner && closeBannerBtn) {
        closeBannerBtn.addEventListener('click', () => {
            announcementBanner.classList.add('hidden');
        });
    }

    // --- Logika Modal ---
    /**
     * Membuka modal yang spesifik berdasarkan ID.
     * @param {string} modalId ID dari elemen modal yang akan dibuka.
     */
    const openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        const overlay = document.querySelector('.modal-overlay');
        if (modal && overlay) {
            // Tutup modal lain yang mungkin terbuka
            document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
            
            modal.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Mencegah scroll di background
        }
    };

    /** Menutup semua modal yang sedang aktif. */
    const closeModal = () => {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        const overlay = document.querySelector('.modal-overlay.active');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.style.overflow = ''; // Mengembalikan scroll
    };

    // --- Event Delegation untuk semua aksi klik ---
    document.body.addEventListener('click', (e) => {
        // Cek apakah tombol "Daftar Sekarang" (#open-modal-btn) yang diklik
        if (e.target.matches('#open-modal-btn')) {
            e.preventDefault();
            openModal('credit-modal');
        }
        // Cek apakah tombol "Beri Ulasan" (#open-review-modal-btn) yang diklik
        if (e.target.matches('#open-review-modal-btn')) {
            e.preventDefault();
            openModal('public-review-modal');
        }
    });

    // Menutup modal dengan tombol 'Escape'
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.querySelector('.modal.active')) {
            closeModal();
        }
    });

    // Listener generik untuk semua tombol tutup modal dan overlay
    document.querySelectorAll('.modal-close-btn, .modal-overlay').forEach(el => {
        el.addEventListener('click', closeModal);
    });

    const creditForm = document.getElementById('credit-form');
    // Listener untuk form pengajuan kredit
    if (creditForm) {
        creditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const termsCheckbox = document.getElementById('terms-agreement');
            if (!termsCheckbox.checked) {
                alert('Anda harus menyetujui Syarat dan Ketentuan untuk melanjutkan.');
                return;
            }

            // Validasi NPWP 16 Digit (NIK)
            const npwpInput = document.getElementById('company-npwp');
            // Hapus semua karakter non-digit (seperti titik, strip) untuk validasi
            const npwpCleaned = npwpInput.value.replace(/\D/g, ''); 

            if (npwpCleaned.length !== 16) {
                alert('Format NPWP tidak valid. Sesuai aturan terbaru, harap masukkan 16 digit NIK Anda sebagai NPWP.');
                npwpInput.focus(); // Bantu pengguna dengan mengarahkan ke input yang salah
                return; // Hentikan pengiriman form jika tidak valid
            }

            const submitButton = creditForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Mengirim...';

            const formData = new FormData(creditForm);
            const submissionData = Object.fromEntries(formData.entries());
            submissionData.creditEstimation = Number(submissionData.creditEstimation) || 0;
            submissionData.termsAgreement = submissionData.termsAgreement === 'agree';

            try {
                const response = await fetch(`${API_BASE_URL}/submissions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submissionData)
                });
                if (!response.ok) {
                    let errorMessage = 'Gagal mengirim pengajuan.';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || JSON.stringify(errorData);
                    } catch (jsonError) {
                        errorMessage = await response.text();
                    }
                    throw new Error(errorMessage);
                }
                alert('Pengajuan Anda telah diterima! Tim kami akan segera menghubungi Anda.');
                closeModal();
                creditForm.reset();
            } catch (error) {
                console.error('Submission Error:', error);
                alert(`Terjadi kesalahan:\n\n${error.message}`);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }

    const publicReviewForm = document.getElementById('public-review-form');
    // Listener untuk form ulasan publik
    if (publicReviewForm) {
        publicReviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitButton = publicReviewForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            
            const formData = new FormData(publicReviewForm);
            const reviewData = {
                hotelId: formData.get('hotelId'),
                reviewerName: formData.get('reviewerName'),
                comment: formData.get('comment'),
                // Anda bisa menambahkan input rating bintang di HTML dan mengambil nilainya di sini
                // rating: parseInt(formData.get('rating'), 10) 
            };

            // Validasi sederhana di sisi klien
            if (!reviewData.hotelId || !reviewData.reviewerName.trim() || !reviewData.comment.trim()) {
                alert('Harap isi semua kolom yang diperlukan.');
                return;
            }
            
            submitButton.disabled = true;
            submitButton.textContent = 'Mengirim...';

            try {
                // PENTING: Pastikan endpoint ini ada di backend Anda
                const response = await fetch(`${API_BASE_URL}/reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reviewData)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.message || 'Gagal mengirim ulasan. Silakan coba lagi.';
                    throw new Error(errorMessage);
                }

                alert('Terima kasih! Ulasan Anda telah berhasil dikirim.');
                closeModal();
                publicReviewForm.reset();
            } catch (error) {
                console.error('Review Submission Error:', error);
                alert(`Terjadi kesalahan saat mengirim ulasan:\n${error.message}`);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }

    // --- Panggilan Fungsi Inisialisasi ---
    loadHeroBackground();
    renderPromos();
    renderHotelCards();
    renderHotelReviews();
    renderTestimonials();

});
