require('dotenv').config();
console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);

const express = require('express');
const path = require('path');
const pool = require('./db');
const { doctors } = require('./data/mockData');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/register', async (req, res) => {
  try {
    const {
      username,
      password,
      name,
      dob,
      nhsNumber,
      email,
      phone,
      address,
      emergencyContact
    } = req.body || {};

    if (
      !username ||
      !password ||
      !name ||
      !dob ||
      !nhsNumber ||
      !email ||
      !phone ||
      !address ||
      !emergencyContact
    ) {
      return res.status(400).json({
        message: 'Please complete all required fields.'
      });
    }

    const existingPatient = await pool.query(
      'SELECT id FROM patients WHERE LOWER(username) = LOWER($1)',
      [username]
    );

    if (existingPatient.rows.length > 0) {
      return res.status(409).json({
        message: 'That username is already in use.'
      });
    }

    const patientResult = await pool.query(
      `INSERT INTO patients (username, password)
       VALUES ($1, $2)
       RETURNING id, username`,
      [username, password]
    );

    const patientId = patientResult.rows[0].id;

    await pool.query(
      `INSERT INTO profiles
       (patient_id, name, dob, nhs_number, email, phone, address, emergency_contact)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [patientId, name, dob, nhsNumber, email, phone, address, emergencyContact]
    );

    return res.status(201).json({
      message: 'Account created successfully.',
      patient: {
        id: patientId,
        username,
        name,
        dob,
        nhsNumber,
        email,
        phone,
        address,
        emergencyContact
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      message: 'Registration failed.'
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        message: 'Please enter both username and password.'
      });
    }

    const result = await pool.query(
      `SELECT
         p.id,
         p.username,
         pr.name,
         pr.dob,
         pr.nhs_number,
         pr.email,
         pr.phone,
         pr.address,
         pr.emergency_contact
       FROM patients p
       JOIN profiles pr ON pr.patient_id = p.id
       WHERE p.username = $1 AND p.password = $2`,
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid username or password.'
      });
    }

    const patient = result.rows[0];

    return res.json({
      message: 'Login successful.',
      patient: {
        id: patient.id,
        username: patient.username,
        name: patient.name,
        dob: patient.dob,
        nhsNumber: patient.nhs_number,
        email: patient.email,
        phone: patient.phone,
        address: patient.address,
        emergencyContact: patient.emergency_contact
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Login failed.'
    });
  }
});

app.get('/api/doctors', (_req, res) => {
  res.json(doctors);
});

app.get('/api/patients/:id/profile', async (req, res) => {
  try {
    const patientId = Number(req.params.id);

    const result = await pool.query(
      `SELECT
         p.id,
         p.username,
         pr.name,
         pr.dob,
         pr.nhs_number,
         pr.email,
         pr.phone,
         pr.address,
         pr.emergency_contact
       FROM patients p
       JOIN profiles pr ON pr.patient_id = p.id
       WHERE p.id = $1`,
      [patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const patient = result.rows[0];

    res.json({
      id: patient.id,
      username: patient.username,
      name: patient.name,
      dob: patient.dob,
      nhsNumber: patient.nhs_number,
      email: patient.email,
      phone: patient.phone,
      address: patient.address,
      emergencyContact: patient.emergency_contact
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Unable to load profile.' });
  }
});

app.put('/api/patients/:id/profile', async (req, res) => {
  try {
    const patientId = Number(req.params.id);
    const {
      name,
      dob,
      nhsNumber,
      email,
      phone,
      address,
      emergencyContact
    } = req.body || {};

    if (!name || !dob || !nhsNumber || !email || !phone || !address || !emergencyContact) {
      return res.status(400).json({
        message: 'Please complete all profile fields.'
      });
    }

    await pool.query(
      `UPDATE profiles
       SET
         name = $1,
         dob = $2,
         nhs_number = $3,
         email = $4,
         phone = $5,
         address = $6,
         emergency_contact = $7
       WHERE patient_id = $8`,
      [name, dob, nhsNumber, email, phone, address, emergencyContact, patientId]
    );

    const updated = await pool.query(
      `SELECT
         p.id,
         p.username,
         pr.name,
         pr.dob,
         pr.nhs_number,
         pr.email,
         pr.phone,
         pr.address,
         pr.emergency_contact
       FROM patients p
       JOIN profiles pr ON pr.patient_id = p.id
       WHERE p.id = $1`,
      [patientId]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const patient = updated.rows[0];

    return res.json({
      message: 'Profile updated successfully.',
      patient: {
        id: patient.id,
        username: patient.username,
        name: patient.name,
        dob: patient.dob,
        nhsNumber: patient.nhs_number,
        email: patient.email,
        phone: patient.phone,
        address: patient.address,
        emergencyContact: patient.emergency_contact
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({
      message: 'Profile update failed.'
    });
  }
});

app.get('/api/patients/:id/records', async (req, res) => {
  try {
    const patientId = Number(req.params.id);

    const result = await pool.query(
      `SELECT
         id,
         record_type AS type,
         record_date AS date,
         detail
       FROM medical_records
       WHERE patient_id = $1
       ORDER BY record_date DESC`,
      [patientId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Records fetch error:', error);
    res.status(500).json({ message: 'Unable to load records.' });
  }
});

app.get('/api/patients/:id/appointments', async (req, res) => {
  try {
    const patientId = Number(req.params.id);

    const result = await pool.query(
      `SELECT
         id,
         doctor_id AS "doctorId",
         doctor_name AS doctor,
         specialty,
         appointment_date AS date,
         appointment_time AS time,
         status
       FROM appointments
       WHERE patient_id = $1
       ORDER BY appointment_date ASC, appointment_time ASC`,
      [patientId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Appointments fetch error:', error);
    res.status(500).json({ message: 'Unable to load appointments.' });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { patientId, doctorId, date, time } = req.body || {};

    if (!patientId || !doctorId || !date || !time) {
      return res.status(400).json({
        message: 'Missing or invalid booking details.'
      });
    }

    const doctor = doctors.find((d) => d.id === Number(doctorId));

    if (!doctor) {
      return res.status(400).json({
        message: 'Doctor not found.'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    if (Number.isNaN(selectedDate.getTime())) {
      return res.status(400).json({
        message: 'Invalid appointment date.'
      });
    }

    if (selectedDate < today) {
      return res.status(400).json({
        message: 'You cannot book an appointment in the past.'
      });
    }

    const existingPatient = await pool.query(
      'SELECT id FROM patients WHERE id = $1',
      [patientId]
    );

    if (existingPatient.rows.length === 0) {
      return res.status(404).json({
        message: 'Patient not found.'
      });
    }

    const duplicateAppointment = await pool.query(
      `SELECT id
       FROM appointments
       WHERE patient_id = $1
         AND appointment_date = $2
         AND appointment_time = $3`,
      [patientId, date, time]
    );

    if (duplicateAppointment.rows.length > 0) {
      return res.status(400).json({
        message: 'You already have an appointment booked for this time.'
      });
    }

    const dayAvailability = doctor.availability.find((entry) => entry.date === date);

    if (!dayAvailability || !dayAvailability.slots.includes(time)) {
      return res.status(400).json({
        message: 'Selected slot is no longer available.'
      });
    }

    const inserted = await pool.query(
      `INSERT INTO appointments
       (patient_id, doctor_id, doctor_name, specialty, appointment_date, appointment_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         id,
         doctor_id AS "doctorId",
         doctor_name AS doctor,
         specialty,
         appointment_date AS date,
         appointment_time AS time,
         status`,
      [patientId, doctor.id, doctor.name, doctor.specialty, date, time, 'Confirmed']
    );

    dayAvailability.slots = dayAvailability.slots.filter((slot) => slot !== time);

    return res.status(201).json({
      message: 'Appointment booked successfully.',
      appointment: inserted.rows[0]
    });
  } catch (error) {
    console.error('Appointment booking error:', error);
    return res.status(500).json({
      message: 'Unable to book appointment.'
    });
  }
});

app.get('/api/test-db', async (_req, res) => {
  try {
    const result = await pool.query('select now()');
    res.json({ ok: true, result: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Database connection failed' });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Hospital self-service app listening on port ${PORT}`);
  });
}

module.exports = app;