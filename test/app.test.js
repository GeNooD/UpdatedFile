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
