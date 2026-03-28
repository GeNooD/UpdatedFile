const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const path = require('node:path');
const { doctors } = require('../data/mockData');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// -----------------------------
// Mock database state
// -----------------------------
let patientsTable;
let profilesTable;
let medicalRecordsTable;
let appointmentsTable;
let nextPatientId;
let nextAppointmentId;

function resetMockDb() {
  patientsTable = [
    {
      id: 1,
      username: 'amanda',
      password: 'Password123!'
    }
  ];

  profilesTable = [
    {
      patient_id: 1,
      name: 'Amanda Carter',
      dob: '1990-05-18',
      nhs_number: '943 476 5919',
      email: 'amanda@example.com',
      phone: '07123456789',
      address: '12 Green Street, Canterbury',
      emergency_contact: 'John Carter - 07111111111'
    }
  ];

  medicalRecordsTable = [
    {
      id: 1,
      patient_id: 1,
      record_type: 'Diagnosis',
      record_date: '2026-03-20',
      detail: 'Seasonal asthma review. Symptoms stable.'
    },
    {
      id: 2,
      patient_id: 1,
      record_type: 'Medication',
      record_date: '2026-03-20',
      detail: 'Salbutamol inhaler, 2 puffs as required.'
    }
  ];

  appointmentsTable = [
    {
      id: 101,
      patient_id: 1,
      doctor_id: 1,
      doctor_name: 'Dr Ravi Patel',
      specialty: 'General Practice',
      appointment_date: doctors[0].availability[0].date,
      appointment_time: doctors[0].availability[0].slots[0],
      status: 'Confirmed'
    }
  ];

  nextPatientId = 2;
  nextAppointmentId = 102;
}

resetMockDb();

// -----------------------------
// Mock db.js before loading app
// -----------------------------
const mockPool = {
  async query(sql, params = []) {
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();

    // Test connection
    if (normalized === 'select now()') {
      return { rows: [{ now: new Date().toISOString() }] };
    }

    // Register: check duplicate username
    if (normalized.includes('select id from patients where lower(username) = lower($1)')) {
      const username = params[0].toLowerCase();
      const found = patientsTable.filter((p) => p.username.toLowerCase() === username);
      return { rows: found.map((p) => ({ id: p.id })) };
    }

    // Register: insert patient
    if (normalized.includes('insert into patients (username, password)')) {
      const [username, password] = params;
      const newPatient = {
        id: nextPatientId++,
        username,
        password
      };
      patientsTable.push(newPatient);
      return {
        rows: [{ id: newPatient.id, username: newPatient.username }]
      };
    }

    // Register: insert profile
    if (normalized.includes('insert into profiles')) {
      const [patientId, name, dob, nhsNumber, email, phone, address, emergencyContact] = params;
      profilesTable.push({
        patient_id: patientId,
        name,
        dob,
        nhs_number: nhsNumber,
        email,
        phone,
        address,
        emergency_contact: emergencyContact
      });
      return { rows: [] };
    }

    // Login / profile fetch
    if (
      normalized.includes('from patients p join profiles pr on pr.patient_id = p.id where p.username = $1 and p.password = $2')
    ) {
      const [username, password] = params;
      const patient = patientsTable.find((p) => p.username === username && p.password === password);

      if (!patient) return { rows: [] };

      const profile = profilesTable.find((pr) => pr.patient_id === patient.id);
      if (!profile) return { rows: [] };

      return {
        rows: [
          {
            id: patient.id,
            username: patient.username,
            name: profile.name,
            dob: profile.dob,
            nhs_number: profile.nhs_number,
            email: profile.email,
            phone: profile.phone,
            address: profile.address,
            emergency_contact: profile.emergency_contact
          }
        ]
      };
    }

    if (
      normalized.includes('from patients p join profiles pr on pr.patient_id = p.id where p.id = $1')
    ) {
      const patientId = Number(params[0]);
      const patient = patientsTable.find((p) => p.id === patientId);
      const profile = profilesTable.find((pr) => pr.patient_id === patientId);

      if (!patient || !profile) return { rows: [] };

      return {
        rows: [
          {
            id: patient.id,
            username: patient.username,
            name: profile.name,
            dob: profile.dob,
            nhs_number: profile.nhs_number,
            email: profile.email,
            phone: profile.phone,
            address: profile.address,
            emergency_contact: profile.emergency_contact
          }
        ]
      };
    }

    // Update profile
    if (normalized.includes('update profiles set')) {
      const [name, dob, nhsNumber, email, phone, address, emergencyContact, patientId] = params;
      const profile = profilesTable.find((pr) => pr.patient_id === Number(patientId));

      if (profile) {
        profile.name = name;
        profile.dob = dob;
        profile.nhs_number = nhsNumber;
        profile.email = email;
        profile.phone = phone;
        profile.address = address;
        profile.emergency_contact = emergencyContact;
      }

      return { rows: [] };
    }

    // Records
    if (normalized.includes('from medical_records')) {
      const patientId = Number(params[0]);
      const rows = medicalRecordsTable
        .filter((r) => r.patient_id === patientId)
        .sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)))
        .map((r) => ({
          id: r.id,
          type: r.record_type,
          date: r.record_date,
          detail: r.detail
        }));

      return { rows };
    }

    // Appointments list
    if (
      normalized.includes('from appointments') &&
      normalized.includes('where patient_id = $1') &&
      normalized.includes('order by appointment_date asc')
    ) {
      const patientId = Number(params[0]);
      const rows = appointmentsTable
        .filter((a) => a.patient_id === patientId)
        .sort((a, b) => {
          const dateCompare = String(a.appointment_date).localeCompare(String(b.appointment_date));
          if (dateCompare !== 0) return dateCompare;
          return String(a.appointment_time).localeCompare(String(b.appointment_time));
        })
        .map((a) => ({
          id: a.id,
          doctorId: a.doctor_id,
          doctor: a.doctor_name,
          specialty: a.specialty,
          date: a.appointment_date,
          time: a.appointment_time,
          status: a.status
        }));

      return { rows };
    }

    // Check patient exists for booking
    if (normalized === 'select id from patients where id = $1') {
      const patientId = Number(params[0]);
      const patient = patientsTable.find((p) => p.id === patientId);
      return { rows: patient ? [{ id: patient.id }] : [] };
    }

    // Duplicate appointment check
    if (
      normalized.includes('select id from appointments where patient_id = $1 and appointment_date = $2 and appointment_time = $3')
    ) {
      const [patientId, date, time] = params;
      const rows = appointmentsTable
        .filter(
          (a) =>
            a.patient_id === Number(patientId) &&
            a.appointment_date === date &&
            a.appointment_time === time
        )
        .map((a) => ({ id: a.id }));

      return { rows };
    }

    // Insert appointment
    if (normalized.includes('insert into appointments')) {
      const [patientId, doctorId, doctorName, specialty, date, time, status] = params;

      const appointment = {
        id: nextAppointmentId++,
        patient_id: Number(patientId),
        doctor_id: Number(doctorId),
        doctor_name: doctorName,
        specialty,
        appointment_date: date,
        appointment_time: time,
        status
      };

      appointmentsTable.push(appointment);

      return {
        rows: [
          {
            id: appointment.id,
            doctorId: appointment.doctor_id,
            doctor: appointment.doctor_name,
            specialty: appointment.specialty,
            date: appointment.appointment_date,
            time: appointment.appointment_time,
            status: appointment.status
          }
        ]
      };
    }

    throw new Error(`Unhandled SQL in test mock: ${sql}`);
  }
};

const dbPath = path.join(__dirname, '..', 'db.js');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: mockPool
};

const app = require('../server');

// Reset mock DB before each test
test.beforeEach(() => {
  resetMockDb();
});

test('GET / should return the login entry page', async () => {
  const response = await request(app).get('/');
  assert.equal(response.statusCode, 200);
  assert.match(response.text, /(Patient login|Redirecting to|login\.html)/i);
});

test('POST /api/login authenticates a valid patient', async () => {
  const response = await request(app)
    .post('/api/login')
    .send({ username: 'amanda', password: 'Password123!' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.patient.name, 'Amanda Carter');
});

test('GET /api/doctors returns expanded doctor availability', async () => {
  const response = await request(app).get('/api/doctors');
  assert.equal(response.statusCode, 200);
  assert.ok(response.body.length >= 3);
  assert.ok(response.body[0].availability.length >= 4);
  assert.ok(response.body[0].availability[0].slots.length >= 4);
});

test('POST /api/register registers a new patient', async () => {
  const response = await request(app)
    .post('/api/register')
    .send({
      username: 'newuser',
      password: 'TestPass123!',
      name: 'Test User',
      dob: '1995-01-01',
      nhsNumber: '123 456 7890',
      email: 'testuser@example.com',
      phone: '07000000000',
      address: '1 Test Street',
      emergencyContact: 'Jane Doe - 07000000001'
    });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.patient.name, 'Test User');
});

test('POST /api/register with missing fields returns 400', async () => {
  const response = await request(app)
    .post('/api/register')
    .send({ username: 'incomplete' });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /required fields/i);
});

test('POST /api/register with duplicate username returns 409', async () => {
  await request(app)
    .post('/api/register')
    .send({
      username: 'dupeuser',
      password: 'TestPass123!',
      name: 'Dupe User',
      dob: '1995-01-01',
      nhsNumber: '123 456 7891',
      email: 'dupeuser@example.com',
      phone: '07000000002',
      address: '2 Test Street',
      emergencyContact: 'Jane Doe - 07000000003'
    });

  const response = await request(app)
    .post('/api/register')
    .send({
      username: 'dupeuser',
      password: 'TestPass123!',
      name: 'Dupe User',
      dob: '1995-01-01',
      nhsNumber: '123 456 7891',
      email: 'dupeuser@example.com',
      phone: '07000000002',
      address: '2 Test Street',
      emergencyContact: 'Jane Doe - 07000000003'
    });

  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /already in use/i);
});

test('POST /api/login with missing fields returns 400', async () => {
  const response = await request(app)
    .post('/api/login')
    .send({ username: 'amanda' });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /both username and password/i);
});

test('POST /api/login with invalid credentials returns 401', async () => {
  const response = await request(app)
    .post('/api/login')
    .send({ username: 'amanda', password: 'wrongpass' });

  assert.equal(response.statusCode, 401);
  assert.match(response.body.message, /invalid username or password/i);
});

test('GET /api/patients/1/profile returns patient profile', async () => {
  const response = await request(app).get('/api/patients/1/profile');
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.name, 'Amanda Carter');
});

test('GET /api/patients/999/profile returns 404', async () => {
  const response = await request(app).get('/api/patients/999/profile');
  assert.equal(response.statusCode, 404);
});

test('PUT /api/patients/1/profile updates profile', async () => {
  const response = await request(app)
    .put('/api/patients/1/profile')
    .send({
      name: 'Amanda Carter Updated',
      dob: '1990-05-18',
      nhsNumber: '943 476 5919',
      email: 'amanda@example.com',
      phone: '07123456789',
      address: '12 Green Street, Canterbury',
      emergencyContact: 'John Carter - 07111111111'
    });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.patient.name, 'Amanda Carter Updated');
});

test('PUT /api/patients/1/profile with missing fields returns 400', async () => {
  const response = await request(app)
    .put('/api/patients/1/profile')
    .send({ name: 'Amanda Carter' });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /all profile fields/i);
});

test('PUT /api/patients/999/profile returns 404', async () => {
  const response = await request(app)
    .put('/api/patients/999/profile')
    .send({
      name: 'Ghost',
      dob: '2000-01-01',
      nhsNumber: '000 000 0000',
      email: 'ghost@example.com',
      phone: '07000000000',
      address: 'Nowhere',
      emergencyContact: 'Nobody - 07000000000'
    });

  assert.equal(response.statusCode, 404);
});

test('GET /api/patients/1/records returns records', async () => {
  const response = await request(app).get('/api/patients/1/records');
  assert.equal(response.statusCode, 200);
  assert.ok(Array.isArray(response.body));
  assert.ok(response.body.length >= 1);
});

test('GET /api/patients/999/records returns empty array', async () => {
  const response = await request(app).get('/api/patients/999/records');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, []);
});

test('GET /api/patients/1/appointments returns appointments', async () => {
  const response = await request(app).get('/api/patients/1/appointments');
  assert.equal(response.statusCode, 200);
  assert.ok(Array.isArray(response.body));
  assert.ok(response.body.length >= 1);
});

test('GET /api/patients/999/appointments returns empty array', async () => {
  const response = await request(app).get('/api/patients/999/appointments');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, []);
});

test('POST /api/appointments with missing data returns 400', async () => {
  const response = await request(app)
    .post('/api/appointments')
    .send({});

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /booking details/i);
});

test('POST /api/appointments with invalid patient returns 404', async () => {
  const validDate = doctors[0].availability[0].date;
  const validTime = doctors[0].availability[0].slots[1];

  const response = await request(app)
    .post('/api/appointments')
    .send({ patientId: 999, doctorId: 1, date: validDate, time: validTime });

  assert.equal(response.statusCode, 404);
  assert.match(response.body.message, /patient not found/i);
});

test('POST /api/appointments with invalid doctor returns 400', async () => {
  const validDate = doctors[0].availability[0].date;
  const validTime = doctors[0].availability[0].slots[1];

  const response = await request(app)
    .post('/api/appointments')
    .send({ patientId: 1, doctorId: 999, date: validDate, time: validTime });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /doctor not found/i);
});

test('POST /api/appointments with invalid date returns 400', async () => {
  const response = await request(app)
    .post('/api/appointments')
    .send({ patientId: 1, doctorId: 1, date: 'invalid-date', time: '09:00' });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /invalid appointment date/i);
});

test('POST /api/appointments with past date returns 400', async () => {
  const response = await request(app)
    .post('/api/appointments')
    .send({ patientId: 1, doctorId: 1, date: '2020-01-01', time: '09:00' });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /cannot book an appointment in the past/i);
});

test('POST /api/appointments with duplicate appointment returns 400', async () => {
  const existingDate = appointmentsTable[0].appointment_date;
  const existingTime = appointmentsTable[0].appointment_time;

  const response = await request(app)
    .post('/api/appointments')
    .send({ patientId: 1, doctorId: 1, date: existingDate, time: existingTime });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /already have an appointment/i);
});

test('POST /api/appointments with unavailable slot returns 400', async () => {
  const validDate = doctors[0].availability[0].date;
  const validTime = doctors[0].availability[0].slots[1];

  await request(app)
    .post('/api/appointments')
    .send({ patientId: 1, doctorId: 1, date: validDate, time: validTime });

  const response = await request(app)
    .post('/api/appointments')
    .send({ patientId: 1, doctorId: 1, date: validDate, time: validTime });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /already have an appointment|no longer available/i);
});

test('GET /unknown returns login entry page', async () => {
  const response = await request(app).get('/unknown');
  assert.equal(response.statusCode, 200);
  assert.match(response.text, /(Patient login|Redirecting to|login\.html)/i);
});