const state = {
  patient: null,
  doctors: [],
  records: [],
  specialty: 'all'
};

const loginSection = document.getElementById('loginSection');
const loginForm = document.getElementById('loginForm');
const bookingForm = document.getElementById('bookingForm');
const loginMessage = document.getElementById('loginMessage');
const bookingMessage = document.getElementById('bookingMessage');
const dashboard = document.getElementById('dashboard');
const doctorSelect = document.getElementById('doctorSelect');
const dateSelect = document.getElementById('dateSelect');
const timeSelect = document.getElementById('timeSelect');
const specialtyFilter = document.getElementById('specialtyFilter');
const logoutButton = document.getElementById('logoutButton');

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(loginMessage, '');

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();

  if (!response.ok) {
    setMessage(loginMessage, data.message, 'error');
    return;
  }

  state.patient = data.patient;
  loginSection.classList.add('hidden');
  dashboard.classList.remove('hidden');
  setMessage(loginMessage, data.message, 'success');
  document.getElementById('welcomeTitle').textContent = `Welcome, ${state.patient.name}`;
  await loadDashboard();
});

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(bookingMessage, '');

  if (!state.patient) {
    setMessage(bookingMessage, 'Please sign in first.', 'error');
    return;
  }

  if (!doctorSelect.value || !dateSelect.value || !timeSelect.value) {
    setMessage(bookingMessage, 'Please choose a doctor, date, and available time.', 'error');
    return;
  }

  const payload = {
    patientId: state.patient.id,
    doctorId: Number(doctorSelect.value),
    date: dateSelect.value,
    time: timeSelect.value
  };

  const response = await fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    setMessage(bookingMessage, data.message, 'error');
    return;
  }

  setMessage(bookingMessage, `${data.message} A confirmation has been added to your dashboard.`, 'success');
  await loadDashboard();
});

doctorSelect.addEventListener('change', populateDateOptions);
dateSelect.addEventListener('change', populateTimeOptions);
specialtyFilter.addEventListener('change', (event) => {
  state.specialty = event.target.value;
  renderCalendar();
});
logoutButton.addEventListener('click', handleLogout);

window.addEventListener('load', async () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1') {
    document.getElementById('username').value = 'amanda';
    document.getElementById('password').value = 'Password123!';
    loginForm.requestSubmit();
  }
});

async function loadDashboard() {
  await Promise.all([loadDoctors(), loadRecords(), loadAppointments()]);
  renderProfile();
  renderStats();
}

async function loadDoctors() {
  const response = await fetch('/api/doctors');
  state.doctors = await response.json();
  populateSpecialtyFilter();
  renderCalendar();
  populateDoctorOptions();
}

async function loadRecords() {
  const response = await fetch(`/api/patients/${state.patient.id}/records`);
  const records = await response.json();
  state.records = records;
  const recordsElement = document.getElementById('records');

  if (!records.length) {
    recordsElement.innerHTML = '<div class="empty-state">No medical records are available yet.</div>';
    return;
  }

  recordsElement.innerHTML = records.map((record) => `
    <div class="record-item">
      <strong>${record.type}</strong>
      <div class="small">${record.date}</div>
      <p>${record.detail}</p>
    </div>
  `).join('');
}

async function loadAppointments() {
  const response = await fetch(`/api/patients/${state.patient.id}/appointments`);
  const appointments = await response.json();
  state.patient.appointments = appointments;
  const appointmentsElement = document.getElementById('appointments');

  if (!appointments.length) {
    appointmentsElement.innerHTML = '<div class="empty-state">No appointments booked yet.</div>';
    return;
  }

  appointmentsElement.innerHTML = appointments.map((item) => `
    <div class="appointment-item">
      <strong>${item.doctor}</strong>
      <div>${item.specialty}</div>
      <div class="small">${item.date} at ${item.time}</div>
      <div>Status: ${item.status}</div>
    </div>
  `).join('');
}

function renderProfile() {
  document.getElementById('profile').innerHTML = `
    <div class="profile-grid">
      <div class="profile-item">
        <strong>Name</strong>
        <span>${state.patient.name}</span>
      </div>
      <div class="profile-item">
        <strong>Date of birth</strong>
        <span>${state.patient.dob}</span>
      </div>
      <div class="profile-item">
        <strong>NHS number</strong>
        <span>${state.patient.nhsNumber}</span>
      </div>
      <div class="profile-item">
        <strong>Email</strong>
        <span>${state.patient.email}</span>
      </div>
    </div>
  `;
}

function renderStats() {
  document.getElementById('appointmentCount').textContent = state.patient.appointments.length;
  document.getElementById('recordCount').textContent = state.records.length;
  document.getElementById('doctorCount').textContent = state.doctors.length;
}

function renderCalendar() {
  const calendar = document.getElementById('calendar');
  const filteredDoctors = state.specialty === 'all'
    ? state.doctors
    : state.doctors.filter((doctor) => doctor.specialty === state.specialty);

  if (!filteredDoctors.length) {
    calendar.innerHTML = '<div class="empty-state">No doctors match the current filter.</div>';
    return;
  }

  calendar.innerHTML = filteredDoctors.map((doctor) => `
    <div class="calendar-day">
      <h3>${doctor.name}</h3>
      <div class="small">${doctor.specialty}</div>
      ${doctor.availability.map((entry) => `
        <div class="slot-group">
          <strong>${entry.date}</strong>
          <div>${entry.slots.map((slot) => `<span class="slot">${slot}</span>`).join('') || '<span class="small">No slots</span>'}</div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function populateSpecialtyFilter() {
  const specialities = [...new Set(state.doctors.map((doctor) => doctor.specialty))];
  const currentValue = specialtyFilter.value || 'all';
  specialtyFilter.innerHTML = '<option value="all">All specialities</option>' +
    specialities.map((specialty) => `<option value="${specialty}">${specialty}</option>`).join('');
  specialtyFilter.value = specialities.includes(currentValue) || currentValue === 'all' ? currentValue : 'all';
}

function populateDoctorOptions() {
  doctorSelect.innerHTML = state.doctors.map((doctor) => `<option value="${doctor.id}">${doctor.name} — ${doctor.specialty}</option>`).join('');
  populateDateOptions();
}

function populateDateOptions() {
  const doctor = state.doctors.find((item) => item.id === Number(doctorSelect.value)) || state.doctors[0];
  if (!doctor) return;
  dateSelect.innerHTML = doctor.availability.map((entry) => `<option value="${entry.date}">${entry.date}</option>`).join('');
  populateTimeOptions();
}

function populateTimeOptions() {
  const doctor = state.doctors.find((item) => item.id === Number(doctorSelect.value)) || state.doctors[0];
  if (!doctor) return;
  const day = doctor.availability.find((entry) => entry.date === dateSelect.value) || doctor.availability[0];
  const slots = day?.slots || [];
  timeSelect.innerHTML = slots.length
    ? slots.map((slot) => `<option value="${slot}">${slot}</option>`).join('')
    : '<option value="">No available time slots</option>';
}

function handleLogout() {
  state.patient = null;
  state.records = [];
  setMessage(loginMessage, 'You have been logged out.', 'success');
  setMessage(bookingMessage, '');
  dashboard.classList.add('hidden');
  loginSection.classList.remove('hidden');
  loginForm.reset();
}

function setMessage(element, text, type = '') {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}
