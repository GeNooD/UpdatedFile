const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');

test('GET / should return the login page', async () => {
  const response = await request(app).get('/');
  assert.equal(response.statusCode, 200);
  assert.match(response.text, /Patient login/i);
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

// Registration tests
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

// Login error cases
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

// Patient profile tests
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
      name: 'Amanda Carter',
      dob: '1990-05-18',
      nhsNumber: '943 476 5919',
      email: 'amanda@example.com',
      phone: '07123456789',
      address: '12 Green Street, Canterbury',
      emergencyContact: 'John Carter - 07111111111'
    });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.patient.name, 'Amanda Carter');
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

// Patient records and appointments
test('GET /api/patients/1/records returns records', async () => {
  const response = await request(app).get('/api/patients/1/records');
  assert.equal(response.statusCode, 200);
  assert.ok(Array.isArray(response.body));
});

test('GET /api/patients/999/records returns 404', async () => {
  const response = await request(app).get('/api/patients/999/records');
  assert.equal(response.statusCode, 404);
});

test('GET /api/patients/1/appointments returns appointments', async () => {
  const response = await request(app).get('/api/patients/1/appointments');
  assert.equal(response.statusCode, 200);
  assert.ok(Array.isArray(response.body));
});

test('GET /api/patients/999/appointments returns 404', async () => {
  const response = await request(app).get('/api/patients/999/appointments');
  assert.equal(response.statusCode, 404);
});

// Appointment booking
test('POST /api/appointments with missing data returns 400', async () => {
  const response = await request(app)
    .post('/api/appointments')
    .send({});
  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /booking details/i);
});

test('POST /api/appointments with invalid patient returns 400', async () => {
  const response = await request(app)
    .post('/api/appointments')
    .send({ patientId: 999, doctorId: 1, date: '2026-04-01', time: '09:00' });
  assert.equal(response.statusCode, 400);
});

test('POST /api/appointments with invalid doctor returns 400', async () => {
  const response = await request(app)
    .post('/api/appointments')
    .send({ patientId: 1, doctorId: 999, date: '2026-04-01', time: '09:00' });
  assert.equal(response.statusCode, 400);
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
  // Book once
  await request(app)
    .post('/api/appointments')
    .send({ patientId: 1, doctorId: 1, date: '2026-03-29', time: '10:30' });
  // Book duplicate
  const response = await request(app)
    .post('/api/appointments')
    .send({ patientId: 1, doctorId: 1, date: '2026-03-29', time: '10:30' });
  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /already have an appointment/i);
});

test('POST /api/appointments with unavailable slot returns 400', async () => {
  // Book a slot to make it unavailable
  await request(app)
    .post('/api/appointments')
    .send({ patientId: 1, doctorId: 1, date: '2026-03-29', time: '09:00' });
  // Book again for same slot
  const response = await request(app)
    .post('/api/appointments')
    .send({ patientId: 1, doctorId: 1, date: '2026-03-29', time: '09:00' });
  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /no longer available/i);
});

// Unknown route returns login page
test('GET /unknown returns login page', async () => {
  const response = await request(app).get('/unknown');
  assert.equal(response.statusCode, 200);
  assert.match(response.text, /Patient login/i);
});
