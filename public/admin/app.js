const API = '/api';
const ADMIN_PASSWORD = 'admin123';
let currentAppointments = [];
let calOffset = 0;

function checkPassword() {
  const pwd = document.getElementById('password-input').value;
  if (pwd === ADMIN_PASSWORD) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').style.display = 'flex';
    init();
  } else {
    document.getElementById('login-error').textContent = 'Mot de passe incorrect';
  }
}

function logout() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-app').style.display = 'none';
  document.getElementById('password-input').value = '';
  document.getElementById('login-error').textContent = '';
}

function init() {
  loadDashboard();
  loadAppointments();
  renderCalendar();
}

function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#sidebar nav a').forEach(a => a.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelector(`#sidebar nav a[onclick*="${name}"]`).classList.add('active');
  const titles = { dashboard: 'Tableau de bord', appointments: 'Réservations', calendar: 'Calendrier' };
  document.getElementById('page-title').textContent = titles[name];
  if (name === 'dashboard') loadDashboard();
  if (name === 'calendar') renderCalendar();
}

/* Dashboard */
function loadDashboard() {
  fetch(`${API}/admin/stats`)
    .then(r => r.json())
    .then(s => {
      document.getElementById('stat-today').textContent = s.today;
      document.getElementById('stat-week').textContent = s.week;
      document.getElementById('stat-pending').textContent = s.pending;
      document.getElementById('stat-total').textContent = s.total;
    });
  fetch(`${API}/appointments`)
    .then(r => r.json())
    .then(appts => {
      const list = document.getElementById('recent-list');
      const statusLabel = s => s === 'pending' ? 'En attente' : s === 'confirmed' ? 'Confirmé' : s === 'arrived' ? 'Arrivé(e)' : s === 'completed' ? 'Terminé' : 'Annulé';
      list.innerHTML = appts.slice(0, 5).map(a => `
        <div class="stat-card" style="padding:15px 20px;margin-bottom:10px">
          <div style="flex:1">
            <strong>${a.client_name}</strong> - ${a.service_name || 'N/A'}
            <p style="font-size:0.85rem;color:#888;margin-top:4px">${a.appointment_date} à ${a.appointment_time}</p>
          </div>
          <span class="status-badge status-${a.status}">${statusLabel(a.status)}</span>
        </div>
      `).join('');
    });
}

/* Appointments */
function loadAppointments() {
  const date = document.getElementById('filter-date').value;
  const status = document.getElementById('filter-status').value;
  const search = document.getElementById('filter-search').value;
  let url = `${API}/appointments?`;
  if (date) url += `date=${date}&`;
  if (status) url += `status=${status}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;

  fetch(url)
    .then(r => r.json())
    .then(appts => {
      currentAppointments = appts;
      const tbody = document.getElementById('appointments-body');
      const empty = document.getElementById('no-appointments');
      if (appts.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
      }
      empty.style.display = 'none';
      tbody.innerHTML = appts.map(a => `
        <tr>
          <td>
            <strong>${a.client_name}</strong><br>
            <span style="font-size:0.8rem;color:#888">${a.client_email}${a.client_phone ? ' - ' + a.client_phone : ''}</span>
          </td>
          <td>${a.service_name || 'N/A'}</td>
          <td>${a.appointment_date}</td>
          <td>${a.appointment_time}</td>
          <td><span class="status-badge status-${a.status}">${a.status === 'pending' ? 'En attente' : a.status === 'confirmed' ? 'Confirmé' : a.status === 'arrived' ? 'Arrivé(e)' : a.status === 'completed' ? 'Terminé' : 'Annulé'}</span></td>
          <td>
            <div class="actions">
              ${a.status === 'pending' ? `<button class="btn btn-sm btn-success" onclick="updateStatus(${a.id},'confirmed')"><i class="fas fa-check"></i> Confirmer</button>` : ''}
              ${a.status === 'confirmed' ? `<button class="btn btn-sm btn-warning" onclick="updateStatus(${a.id},'arrived')"><i class="fas fa-user-check"></i> Arrivé</button>` : ''}
              ${a.status === 'arrived' ? `<button class="btn btn-sm btn-success" onclick="updateStatus(${a.id},'completed')"><i class="fas fa-check-double"></i> Terminé</button>` : ''}
              ${a.status !== 'completed' && a.status !== 'cancelled' ? `<button class="btn btn-sm btn-danger" onclick="updateStatus(${a.id},'cancelled')"><i class="fas fa-times"></i> Annuler</button>` : ''}
              <button class="btn btn-sm" onclick="showDetail(${a.id})"><i class="fas fa-eye"></i></button>
              <button class="btn btn-sm btn-danger" onclick="deleteAppointment(${a.id})"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    });
}

/* Add Appointment */
function showAddModal() {
  document.getElementById('add-modal').style.display = 'flex';
  document.getElementById('add-form').reset();
  document.getElementById('add-error').style.display = 'none';
  document.getElementById('add-date').min = new Date().toISOString().split('T')[0];

  fetch(`${API}/services`)
    .then(r => r.json())
    .then(services => {
      const sel = document.getElementById('add-service');
      sel.innerHTML = '<option value="">Sélectionner...</option>' +
        services.map(s => `<option value="${s.id}">${s.name} - ${s.price} DT</option>`).join('');
    });
}
function closeAddModal(e) {
  if (e && e.target !== e.currentTarget && e.type !== 'click') return;
  document.getElementById('add-modal').style.display = 'none';
}
function addAppointment(e) {
  e.preventDefault();
  const data = {
    client_name: document.getElementById('add-name').value,
    client_email: document.getElementById('add-email').value,
    client_phone: document.getElementById('add-phone').value,
    service_id: document.getElementById('add-service').value,
    appointment_date: document.getElementById('add-date').value,
    appointment_time: document.getElementById('add-time').value,
    notes: document.getElementById('add-notes').value
  };
  fetch(`${API}/admin/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(r => r.json())
    .then(res => {
      if (res.error) {
        document.getElementById('add-error').textContent = res.error;
        document.getElementById('add-error').style.display = 'block';
      } else {
        closeAddModal();
        loadAppointments();
        renderCalendar();
        loadDashboard();
      }
    });
}

function updateStatus(id, status) {
  fetch(`${API}/appointments/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
    .then(r => r.json())
    .then(r => { if (!r.error) loadAppointments(); renderCalendar(); loadDashboard(); });
}

function deleteAppointment(id) {
  if (!confirm('Supprimer ce rendez-vous ?')) return;
  fetch(`${API}/appointments/${id}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(r => { if (!r.error) loadAppointments(); renderCalendar(); loadDashboard(); });
}

let currentDetailId = null;
function showDetail(id) {
  const a = currentAppointments.find(x => x.id === id);
  if (!a) return;
  currentDetailId = id;
  document.getElementById('detail-body').innerHTML = `
    <p><strong>Client :</strong> ${a.client_name}</p>
    <p><strong>Email :</strong> ${a.client_email}</p>
    <p><strong>Téléphone :</strong> ${a.client_phone || '-'}</p>
    <p><strong>Service :</strong> ${a.service_name || 'N/A'}</p>
    <p><strong>Date :</strong> ${a.appointment_date}</p>
    <p><strong>Heure :</strong> ${a.appointment_time}</p>
    <p><strong>Statut :</strong> <span class="status-badge status-${a.status}">${a.status === 'pending' ? 'En attente' : a.status === 'confirmed' ? 'Confirmé' : a.status === 'arrived' ? 'Arrivé(e)' : a.status === 'completed' ? 'Terminé' : 'Annulé'}</span></p>
    <p><strong>Notes client :</strong> ${a.notes || '-'}</p>
  `;
  document.getElementById('internal-notes').value = a.internal_notes || '';
  document.getElementById('detail-modal').style.display = 'flex';
}

function closeModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('detail-modal').style.display = 'none';
}

function saveNotes() {
  const notes = document.getElementById('internal-notes').value;
  fetch(`${API}/appointments/${currentDetailId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ internal_notes: notes })
  })
    .then(r => r.json())
    .then(r => {
      if (!r.error) { alert('Notes enregistrées'); closeModal(); }
    });
}

/* Calendar */
function renderCalendar() {
  const now = new Date();
  now.setDate(now.getDate() + calOffset * 7);
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const options = { month: 'long', year: 'numeric' };
  const titleStart = monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const titleEnd = sunday.toLocaleDateString('fr-FR', options);
  document.getElementById('cal-title').textContent = `Semaine du ${titleStart} au ${titleEnd}`;

  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const todayStr = new Date().toISOString().split('T')[0];
  let html = days.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayNum = d.getDate();
    const isToday = dateStr === todayStr;

    const dayAppts = currentAppointments.filter(a => a.appointment_date === dateStr);
    html += `<div class="cal-day ${isToday ? 'today' : ''}">
      <div class="day-num">${dayNum}</div>
      ${dayAppts.map(a => `<div class="cal-slot ${a.status}" onclick="showDetail(${a.id})">${a.appointment_time} ${a.client_name}</div>`).join('')}
    </div>`;
  }
  document.getElementById('cal-grid').innerHTML = html;
}

function changeWeek(dir) {
  calOffset += dir;
  renderCalendar();
}
