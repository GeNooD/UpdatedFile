const state = {
  patient: null,
  doctors: [],
  records: [],
  appointments: [],
  chatHistory: []
};

const bookingForm = document.getElementById('bookingForm');
const bookingMessage = document.getElementById('bookingMessage');
const doctorSelect = document.getElementById('doctorSelect');
const dateSelect = document.getElementById('dateSelect');
const timeSelect = document.getElementById('timeSelect');
const logoutButton = document.getElementById('logoutButton');

const profileForm = document.getElementById('profileForm');
const profileMessage = document.getElementById('profileMessage');
const assistantForm = document.getElementById('assistantForm');
const assistantInput = document.getElementById('assistantInput');
const assistantMessages = document.getElementById('assistantMessages');
const assistantSendButton = document.getElementById('assistantSendButton');
const assistantCounter = document.getElementById('assistantCounter');
const assistantQuickPrompts = document.getElementById('assistantQuickPrompts');
const clearChatBtn = document.getElementById('clearChatBtn');
const savedNotesContainer = document.getElementById('savedNotesContainer');
const savedAssistantNotesSection = document.getElementById('savedAssistantNotes');

window.addEventListener('load', async () => {
  const storedPatient = sessionStorage.getItem('patient');

  if (!storedPatient) {
    window.location.href = '/login.html';
    return;
  }

  state.patient = JSON.parse(storedPatient);
  document.getElementById('welcomeTitle').textContent = `Welcome, ${state.patient.name}`;
  await loadDashboard();
  loadChatHistory();
  renderSavedNotes();
});

bookingForm?.addEventListener('submit', async (event) => {
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

  try {
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
      setMessage(bookingMessage, data.message || 'Unable to book appointment.', 'error');
      return;
    }

    setMessage(
      bookingMessage,
      `${data.message} A confirmation has been added to your dashboard.`,
      'success'
    );

    await loadAppointments();
    await loadDoctors();
    renderStats();
  } catch (error) {
    setMessage(bookingMessage, 'Unable to book appointment right now.', 'error');
  }
});

profileForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(profileMessage, '');

  if (!state.patient) {
    setMessage(profileMessage, 'Please sign in first.', 'error');
    return;
  }

  const payload = {
    name: document.getElementById('profileName').value.trim(),
    dob: document.getElementById('profileDob').value,
    nhsNumber: document.getElementById('profileNhsNumber').value.trim(),
    email: document.getElementById('profileEmail').value.trim(),
    phone: document.getElementById('profilePhone').value.trim(),
    address: document.getElementById('profileAddress').value.trim(),
    emergencyContact: document.getElementById('profileEmergencyContact').value.trim()
  };

  if (
    !payload.name ||
    !payload.dob ||
    !payload.nhsNumber ||
    !payload.email ||
    !payload.phone ||
    !payload.address ||
    !payload.emergencyContact
  ) {
    setMessage(profileMessage, 'Please complete all profile fields.', 'error');
    return;
  }

  try {
    const response = await fetch(`/api/patients/${state.patient.id}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(profileMessage, data.message || 'Unable to update profile.', 'error');
      return;
    }

    state.patient = data.patient;
    sessionStorage.setItem('patient', JSON.stringify(state.patient));

    renderProfile();
    populateProfileForm();
    setMessage(profileMessage, 'Profile updated successfully.', 'success');
  } catch (error) {
    setMessage(profileMessage, 'Unable to update profile right now.', 'error');
  }
});

doctorSelect?.addEventListener('change', populateDateOptions);
dateSelect?.addEventListener('change', populateTimeOptions);
logoutButton?.addEventListener('click', handleLogout);

assistantInput?.addEventListener('input', () => {
  assistantCounter.textContent = `${assistantInput.value.length}/800`;
});

assistantQuickPrompts?.addEventListener('click', (event) => {
  const trigger = event.target.closest('.quick-prompt');
  if (!trigger || !assistantInput) return;
  assistantInput.value = trigger.dataset.prompt || '';
  assistantCounter.textContent = `${assistantInput.value.length}/800`;
  assistantInput.focus();
});

assistantForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const question = assistantInput.value.trim();
  if (!question) return;

  appendAssistantMessage(question, 'user');
  assistantInput.value = '';
  assistantCounter.textContent = '0/800';
  assistantSendButton.disabled = true;

  try {
    const response = await fetch('/api/assistant/medical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    const data = await response.json();
    if (!response.ok) {
      appendAssistantMessage(
        data.message || 'I could not generate a response right now. Please try again shortly.',
        'bot',
        'low'
      );
      return;
    }

    appendAssistantMessage(data.reply, 'bot', data.triage || 'low');
  } catch (error) {
    appendAssistantMessage(
      'I could not connect to the assistant service right now. Please try again.',
      'bot',
      'low'
    );
  } finally {
    assistantSendButton.disabled = false;
  }
});

clearChatBtn?.addEventListener('click', () => {
  state.chatHistory = [];
  const key = `chatHistory_${state.patient?.id}`;
  sessionStorage.removeItem(key);
  assistantMessages.innerHTML = `
    <div class="assistant-message assistant-message-bot">
      <div class="message-body">Hello, I can provide general health information and next-step guidance, but I cannot diagnose conditions.</div>
    </div>`;
});

savedNotesContainer?.addEventListener('click', (event) => {
  const btn = event.target.closest('.remove-note-btn');
  if (!btn) return;
  const index = parseInt(btn.dataset.noteIndex, 10);
  const notes = JSON.parse(sessionStorage.getItem('assistantNotes') || '[]');
  notes.splice(index, 1);
  sessionStorage.setItem('assistantNotes', JSON.stringify(notes));
  renderSavedNotes();
});

async function loadDashboard() {
  await Promise.all([
    loadProfile(),
    loadDoctors(),
    loadRecords(),
    loadAppointments()
  ]);

  renderProfile();
  populateProfileForm();
  renderStats();
}

async function loadProfile() {
  try {
    const response = await fetch(`/api/patients/${state.patient.id}/profile`);
    const data = await response.json();

    if (!response.ok) {
      return;
    }

    state.patient = data;
    sessionStorage.setItem('patient', JSON.stringify(state.patient));
  } catch (error) {
    console.error('Failed to load profile:', error);
  }
}

async function loadDoctors() {
  try {
    const response = await fetch('/api/doctors');
    const data = await response.json();
    state.doctors = data;
    populateDoctorOptions();
  } catch (error) {
    console.error('Failed to load doctors:', error);
  }
}

async function loadRecords() {
  try {
    const response = await fetch(`/api/patients/${state.patient.id}/records`);
    const records = await response.json();
    state.records = Array.isArray(records) ? records : [];

    const recordsElement = document.getElementById('records');

    if (!state.records.length) {
      recordsElement.innerHTML = '<div class="empty-state">No medical records are available yet.</div>';
      return;
    }

    recordsElement.innerHTML = state.records.map((record) => `
      <div class="record-item">
        <strong>${record.type}</strong>
        <div class="small">${record.date}</div>
        <p>${record.detail}</p>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load records:', error);
    document.getElementById('records').innerHTML =
      '<div class="empty-state">Unable to load medical records.</div>';
  }
}

async function loadAppointments() {
  try {
    const response = await fetch(`/api/patients/${state.patient.id}/appointments`);
    const appointments = await response.json();
    state.appointments = Array.isArray(appointments) ? appointments : [];

    const appointmentsElement = document.getElementById('appointments');

    if (!state.appointments.length) {
      appointmentsElement.innerHTML = '<div class="empty-state">No appointments booked yet.</div>';
      return;
    }

    appointmentsElement.innerHTML = state.appointments.map((item) => `
      <div class="appointment-item">
        <strong>${item.doctor}</strong>
        <div>${item.specialty}</div>
        <div class="small">${item.date} at ${item.time}</div>
        <div>Status: ${item.status}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load appointments:', error);
    document.getElementById('appointments').innerHTML =
      '<div class="empty-state">Unable to load appointments.</div>';
  }
}

function renderProfile() {
  document.getElementById('profile').innerHTML = `
    <div class="profile-grid">
      <div class="profile-item">
        <strong>Name</strong>
        <span>${state.patient.name || ''}</span>
      </div>
      <div class="profile-item">
        <strong>Date of birth</strong>
        <span>${state.patient.dob || ''}</span>
      </div>
      <div class="profile-item">
        <strong>NHS number</strong>
        <span>${state.patient.nhsNumber || ''}</span>
      </div>
      <div class="profile-item">
        <strong>Email</strong>
        <span>${state.patient.email || ''}</span>
      </div>
      <div class="profile-item">
        <strong>Phone</strong>
        <span>${state.patient.phone || ''}</span>
      </div>
      <div class="profile-item">
        <strong>Address</strong>
        <span>${state.patient.address || ''}</span>
      </div>
      <div class="profile-item">
        <strong>Emergency contact</strong>
        <span>${state.patient.emergencyContact || ''}</span>
      </div>
      <div class="profile-item">
        <strong>Username</strong>
        <span>${state.patient.username || ''}</span>
      </div>
    </div>
  `;
}

function populateProfileForm() {
  const nameField = document.getElementById('profileName');
  const dobField = document.getElementById('profileDob');
  const nhsField = document.getElementById('profileNhsNumber');
  const emailField = document.getElementById('profileEmail');
  const phoneField = document.getElementById('profilePhone');
  const addressField = document.getElementById('profileAddress');
  const emergencyField = document.getElementById('profileEmergencyContact');

  if (nameField) nameField.value = state.patient.name || '';
  if (dobField) dobField.value = state.patient.dob || '';
  if (nhsField) nhsField.value = state.patient.nhsNumber || '';
  if (emailField) emailField.value = state.patient.email || '';
  if (phoneField) phoneField.value = state.patient.phone || '';
  if (addressField) addressField.value = state.patient.address || '';
  if (emergencyField) emergencyField.value = state.patient.emergencyContact || '';
}

function renderStats() {
  document.getElementById('appointmentCount').textContent = state.appointments.length;
  document.getElementById('recordCount').textContent = state.records.length;
  document.getElementById('doctorCount').textContent = state.doctors.length;
}

function populateDoctorOptions() {
  if (!state.doctors.length) {
    doctorSelect.innerHTML = '<option value="">No doctors available</option>';
    dateSelect.innerHTML = '<option value="">No dates available</option>';
    timeSelect.innerHTML = '<option value="">No times available</option>';
    return;
  }

  doctorSelect.innerHTML = state.doctors
    .map((doctor) => `<option value="${doctor.id}">${doctor.name} — ${doctor.specialty}</option>`)
    .join('');

  populateDateOptions();
}

function populateDateOptions() {
  const doctor = state.doctors.find((item) => item.id === Number(doctorSelect.value)) || state.doctors[0];

  if (!doctor) {
    dateSelect.innerHTML = '<option value="">No dates available</option>';
    timeSelect.innerHTML = '<option value="">No times available</option>';
    return;
  }

  const availableDates = doctor.availability.filter((entry) => entry.slots.length > 0);

  if (!availableDates.length) {
    dateSelect.innerHTML = '<option value="">No dates available</option>';
    timeSelect.innerHTML = '<option value="">No times available</option>';
    return;
  }

  dateSelect.innerHTML = availableDates
    .map((entry) => `<option value="${entry.date}">${entry.date}</option>`)
    .join('');

  populateTimeOptions();
}

function populateTimeOptions() {
  const doctor = state.doctors.find((item) => item.id === Number(doctorSelect.value)) || state.doctors[0];

  if (!doctor) {
    timeSelect.innerHTML = '<option value="">No times available</option>';
    return;
  }

  const day = doctor.availability.find((entry) => entry.date === dateSelect.value) || doctor.availability[0];
  const slots = day?.slots || [];

  timeSelect.innerHTML = slots.length
    ? slots.map((slot) => `<option value="${slot}">${slot}</option>`).join('')
    : '<option value="">No available time slots</option>';
}

function handleLogout() {
  sessionStorage.removeItem('patient');
  window.location.href = '/login.html';
}

function setMessage(element, text, type = '') {
  if (!element) return;
  element.textContent = text;
  element.className = `message ${type}`.trim();
}

function appendAssistantMessage(text, role = 'bot', triage = 'low', skipSave = false) {
  if (!assistantMessages) return;

  const item = document.createElement('div');
  item.className = `assistant-message ${role === 'user' ? 'assistant-message-user' : 'assistant-message-bot'}`;

  if (role === 'bot') {
    const tLabel = triage === 'urgent' ? 'Urgent' : triage === 'medium' ? 'Seek advice' : 'General info';
    item.innerHTML =
      `<div class="message-header">` +
      `<span class="triage-badge triage-${triage}">${tLabel}</span>` +
      `<button type="button" class="save-note-btn" aria-label="Save this response as a note">Save note</button>` +
      `</div><div class="message-body">${escapeHtml(text)}</div>`;
    item.querySelector('.save-note-btn').addEventListener('click', () => saveAssistantNote(text, triage));
  } else {
    item.textContent = text;
  }

  assistantMessages.appendChild(item);
  assistantMessages.scrollTop = assistantMessages.scrollHeight;

  if (!skipSave) {
    state.chatHistory.push({ text, role, triage });
    const key = `chatHistory_${state.patient?.id}`;
    sessionStorage.setItem(key, JSON.stringify(state.chatHistory));
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadChatHistory() {
  if (!state.patient) return;
  const key = `chatHistory_${state.patient.id}`;
  const history = JSON.parse(sessionStorage.getItem(key) || '[]');
  if (!history.length) return;
  assistantMessages.innerHTML = '';
  history.forEach(({ text, role, triage }) => {
    appendAssistantMessage(text, role, triage || 'low', true);
  });
  state.chatHistory = history;
}

function saveAssistantNote(text, triage) {
  const note = { text, triage, savedAt: new Date().toLocaleString() };
  const notes = JSON.parse(sessionStorage.getItem('assistantNotes') || '[]');
  notes.push(note);
  sessionStorage.setItem('assistantNotes', JSON.stringify(notes));
  renderSavedNotes();
}

function renderSavedNotes() {
  if (!savedAssistantNotesSection) return;
  const notes = JSON.parse(sessionStorage.getItem('assistantNotes') || '[]');
  if (!notes.length) {
    savedAssistantNotesSection.hidden = true;
    return;
  }
  savedAssistantNotesSection.hidden = false;
  if (savedNotesContainer) {
    savedNotesContainer.innerHTML = notes.map((note, i) => {
      const label = note.triage === 'urgent' ? 'Urgent' : note.triage === 'medium' ? 'Seek advice' : 'General info';
      return (
        `<div class="saved-note-item triage-${note.triage}">` +
        `<div class="saved-note-meta">` +
        `<span class="triage-badge triage-${note.triage}">${label}</span>` +
        `<span class="small">${note.savedAt}</span>` +
        `<button type="button" class="remove-note-btn" data-note-index="${i}" aria-label="Remove note">&times;</button>` +
        `</div><p class="small">${escapeHtml(note.text)}</p></div>`
      );
    }).join('');
  }
}