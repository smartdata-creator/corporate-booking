document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://corporate-booking.onrender.com/api';

    const verificationStep = document.getElementById('verification-step');
    const reviewStep = document.getElementById('review-step');
    const successStep = document.getElementById('success-step');

    const verificationForm = document.getElementById('verification-form');
    const reviewForm = document.getElementById('review-form');

    const bookingIdInput = document.getElementById('booking-id');
    const bookingEmailInput = document.getElementById('booking-email');
    const verificationError = document.getElementById('verification-error');
    const reviewError = document.getElementById('review-error');

    let verifiedBookingData = null;

    // --- Star Rating Logic ---
    const stars = document.querySelectorAll('#review-star-rating span');
    const ratingValueInput = document.getElementById('review-rating-value');

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = star.dataset.value;
            ratingValueInput.value = rating;
            stars.forEach(s => {
                s.innerHTML = s.dataset.value <= rating ? '★' : '☆';
                s.style.color = s.dataset.value <= rating ? '#FBBF24' : '#A0AEC0';
            });
        });
    });

    // --- Step 1: Verification ---
    verificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        verificationError.style.display = 'none';
        const bookingId = bookingIdInput.value.trim();
        const email = bookingEmailInput.value.trim();

        if (!bookingId || !email) {
            verificationError.textContent = 'ID Booking dan Email wajib diisi.';
            verificationError.style.display = 'block';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/bookings/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: bookingId, email: email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verifikasi gagal.');
            }

            verifiedBookingData = data;

            // Populate review step
            document.getElementById('review-hotel-name').textContent = verifiedBookingData.hotel.name;
            document.getElementById('review-guest-name').textContent = verifiedBookingData.booking.guest_name;
            document.getElementById('review-check-in').textContent = new Date(verifiedBookingData.booking.check_in_date).toLocaleDateString('id-ID');

            // Switch to review step
            verificationStep.style.display = 'none';
            reviewStep.style.display = 'block';

        } catch (error) {
            verificationError.textContent = error.message;
            verificationError.style.display = 'block';
        }
    });

    // --- Step 2: Submit Review ---
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        reviewError.style.display = 'none';

        const reviewData = {
            booking_id: verifiedBookingData.booking.id,
            email: verifiedBookingData.booking.guest_email,
            rating: parseInt(ratingValueInput.value, 10),
            comment: document.getElementById('review-comment').value.trim()
        };

        if (!reviewData.rating) {
            reviewError.textContent = 'Rating wajib diisi.';
            reviewError.style.display = 'block';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/reviews/public`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reviewData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Gagal mengirim ulasan.');
            }

            // Switch to success step
            reviewStep.style.display = 'none';
            successStep.style.display = 'block';

        } catch (error) {
            reviewError.textContent = error.message;
            reviewError.style.display = 'block';
        }
    });

    // Handle URL params to pre-fill booking ID
    const urlParams = new URLSearchParams(window.location.search);
    const bookingIdFromUrl = urlParams.get('booking_id');
    if (bookingIdFromUrl) {
        bookingIdInput.value = bookingIdFromUrl;
    }
});

