const API_URL = '/api';

function loadServices() {
  fetch(`${API_URL}/services`)
    .then(res => res.json())
    .then(services => {
      const grid = document.getElementById('services-grid');
      const select = document.getElementById('service_id');

      grid.innerHTML = '';
      select.innerHTML = '<option value="">Choisissez un service</option>';

      services.forEach(service => {
        grid.innerHTML += `
          <div class="service-card">
            <span class="category">${service.category}</span>
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            <span class="price">${service.price} DT</span>
            <span class="duration"> - ${service.duration} min</span>
          </div>
        `;

        select.innerHTML += `<option value="${service.id}">${service.name} - ${service.price} DT</option>`;
      });
    })
    .catch(err => console.error('Erreur chargement services:', err));
}

function loadOffers() {
  fetch(`${API_URL}/offers`)
    .then(res => res.json())
    .then(offers => {
      const container = document.getElementById('offers-container');
      container.innerHTML = '';

      offers.forEach(offer => {
        container.innerHTML += `
          <div class="offer-card">
            <h3>${offer.title}</h3>
            <p>${offer.description}</p>
          </div>
        `;
      });
    })
    .catch(err => console.error('Erreur chargement offres:', err));
}

let bookedTimes = [];

function setMinDate() {
  const dateInput = document.getElementById('appointment_date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);
  dateInput.value = today;
  checkBookedTimes(today);
}

document.getElementById('appointment_date').addEventListener('change', function() {
  checkBookedTimes(this.value);
});

document.getElementById('appointment_time').addEventListener('input', function() {
  const msg = document.getElementById('time-warning');
  if (bookedTimes.includes(this.value)) {
    msg.textContent = '⚠ Ce créneau est déjà réservé. Choisissez un autre horaire.';
    msg.style.display = 'block';
  } else {
    msg.style.display = 'none';
  }
});

function checkBookedTimes(date) {
  if (!date) return;
  fetch(`${API_URL}/appointments/booked?date=${date}`)
    .then(r => r.json())
    .then(times => {
      bookedTimes = times;
      const msg = document.getElementById('time-warning');
      const input = document.getElementById('appointment_time');
      if (bookedTimes.includes(input.value)) {
        msg.textContent = '⚠ Ce créneau est déjà réservé. Choisissez un autre horaire.';
        msg.style.display = 'block';
      } else {
        msg.style.display = 'none';
      }
    });
}

document.getElementById('booking-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const data = {
    client_name: document.getElementById('client_name').value,
    client_email: document.getElementById('client_email').value,
    client_phone: document.getElementById('client_phone').value,
    service_id: document.getElementById('service_id').value,
    appointment_date: document.getElementById('appointment_date').value,
    appointment_time: document.getElementById('appointment_time').value,
    notes: document.getElementById('notes').value
  };

  const messageEl = document.getElementById('form-message');
  messageEl.style.color = '#666';

  fetch(`${API_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(result => {
      if (result.error) {
        messageEl.style.color = 'red';
        messageEl.textContent = result.error;
      } else {
        messageEl.style.color = 'green';
        messageEl.textContent = 'Votre demande a été envoyée ! Nous vous contacterons pour confirmer le rendez-vous.';
        this.reset();
        setMinDate();
        bookedTimes = [];
        document.getElementById('service_id').innerHTML = '<option value="">Choisissez un service</option>';
        loadServices();
      }
    })
    .catch(err => {
      messageEl.style.color = 'red';
      messageEl.textContent = 'Erreur lors de la réservation. Veuillez réessayer.';
    });
});

loadServices();
loadOffers();
setMinDate();
