const state = {
  patient: null,
  doctors: [],
  records: [],
  specialty: 'all',
  loading: false
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
  try {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const response = await safeFetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
      setMessage(loginMessage, response.data?.message || 'Login failed.', 'error');
      announce('Login failed.');
      return;
    }
    state.patient = response.data.patient;
    loginSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
    setMessage(loginMessage, response.data.message, 'success');
    document.getElementById('welcomeTitle').textContent = `Welcome, ${state.patient.name}`;
    announce('Login successful. Welcome, ' + state.patient.name);
    await loadDashboard();
  } catch (err) {
    setMessage(loginMessage, 'Network error. Please try again.', 'error');
    announce('Network error.');
  } finally {
    // login done
  }
});

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(bookingMessage, '');
  const submitBtn = bookingForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    if (!state.patient) {
      setMessage(bookingMessage, 'Please sign in first.', 'error');
      announce('Please sign in first.');
      return;
    }
    if (!doctorSelect.value || !dateSelect.value || !timeSelect.value) {
      setMessage(bookingMessage, 'Please choose a doctor, date, and available time.', 'error');
      announce('Please choose a doctor, date, and available time.');
      return;
    }
    const payload = {
      patientId: state.patient.id,
      doctorId: Number(doctorSelect.value),
      date: dateSelect.value,
      time: timeSelect.value
    };
    const response = await safeFetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      setMessage(bookingMessage, response.data?.message || 'Booking failed.', 'error');
      announce('Booking failed.');
      return;
    }
    setMessage(bookingMessage, `${response.data.message} A confirmation has been added to your dashboard.`, 'success');
    announce('Appointment booked successfully.');
    await loadDashboard();
  } catch (err) {
    setMessage(bookingMessage, 'Network error. Please try again.', 'error');
    announce('Network error.');
  } finally {
    submitBtn.disabled = false;
  }
});

doctorSelect.addEventListener('change', populateDateOptions);
dateSelect.addEventListener('change', populateTimeOptions);
// Debounce utility
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

specialtyFilter.addEventListener('change', debounce((event) => {
  state.specialty = event.target.value;
  renderCalendar();
}, 200));
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
  try {
    await Promise.all([loadDoctors(), loadRecords(), loadAppointments()]);
    renderProfile();
    renderStats();
  } finally {
    // done
  }
}

async function loadDoctors() {
  const response = await safeFetch('/api/doctors');
  if (response.ok) {
    state.doctors = response.data;
    populateSpecialtyFilter();
    renderCalendar();
    populateDoctorOptions();
  }
}

async function loadRecords() {
  const recordsElement = document.getElementById('records');
  recordsElement.setAttribute('aria-busy', 'true');
  const response = await safeFetch(`/api/patients/${state.patient.id}/records`);
  if (response.ok) {
    state.records = response.data;
    if (!state.records.length) {
      recordsElement.innerHTML = '<div class="empty-state">No medical records are available yet.</div>';
    } else {
      recordsElement.innerHTML = state.records.map((record) => `
        <div class="record-item">
          <strong>${record.type}</strong>
          <div class="small">${record.date}</div>
          <p>${record.detail}</p>
        </div>
      `).join('');
    }
  }
  recordsElement.setAttribute('aria-busy', 'false');
}

async function loadAppointments() {
  const appointmentsElement = document.getElementById('appointments');
  appointmentsElement.setAttribute('aria-busy', 'true');
  const response = await safeFetch(`/api/patients/${state.patient.id}/appointments`);
  if (response.ok) {
    state.patient.appointments = response.data;
    if (!state.patient.appointments.length) {
      appointmentsElement.innerHTML = '<div class="empty-state">No appointments booked yet.</div>';
    } else {
      appointmentsElement.innerHTML = state.patient.appointments.map((item) => `
        <div class="appointment-item">
          <strong>${item.doctor}</strong>
          <div>${item.specialty}</div>
          <div class="small">${item.date} at ${item.time}</div>
          <div>Status: ${item.status}</div>
        </div>
      `).join('');
    }
  }
  appointmentsElement.setAttribute('aria-busy', 'false');
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
  calendar.setAttribute('aria-busy', 'true');
  const filteredDoctors = state.specialty === 'all'
    ? state.doctors
    : state.doctors.filter((doctor) => doctor.specialty === state.specialty);

  if (!filteredDoctors.length) {
    calendar.innerHTML = '<div class="empty-state">No doctors match the current filter.</div>';
    calendar.setAttribute('aria-busy', 'false');
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
  calendar.setAttribute('aria-busy', 'false');
}
// Fetch helper with error handling
async function safeFetch(url, options) {
  try {
    const response = await fetch(url, options);
    let data = null;
    try {
      data = await response.json();
    } catch (e) {}
    return { ok: response.ok, data };
  } catch (err) {
    return { ok: false, data: null };
  }
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
  announce('You have been logged out.');
}

function setMessage(element, text, type = '') {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}
