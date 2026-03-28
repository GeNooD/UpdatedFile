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

app.post('/api/assistant/medical', async (req, res) => {
  try {
    const { question } = req.body || {};

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        message: 'Please enter a health question.'
      });
    }

    const trimmedQuestion = question.trim();

    if (trimmedQuestion.length > 800) {
      return res.status(400).json({
        message: 'Please keep your question under 800 characters.'
      });
    }

    const emergencyPattern = /chest pain|can\'t breathe|cannot breathe|severe bleeding|stroke|suicidal|unconscious|seizure/i;

    if (emergencyPattern.test(trimmedQuestion)) {
      return res.json({
        reply: 'Your symptoms may be serious. Please seek urgent medical help immediately or call your local emergency number now.'
      });
    }

    if (!process.env.OPENAI_API_KEY || typeof fetch !== 'function') {
      return res.json({
        reply: buildFallbackMedicalReply(trimmedQuestion)
      });
    }

    const prompt = `You are a cautious medical information assistant for patients.\nRules:\n- Do not diagnose.\n- Give concise, practical self-care and triage guidance.\n- Include clear red-flag symptoms requiring urgent care.\n- Recommend contacting GP/clinician for persistent or worsening symptoms.\n- Add a brief disclaimer that this is not a medical diagnosis.\n\nPatient question: ${trimmedQuestion}`;

    const aiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: prompt,
        temperature: 0.2
      })
    });

    if (!aiResponse.ok) {
      return res.json({
        reply: buildFallbackMedicalReply(trimmedQuestion)
      });
    }

    const aiData = await aiResponse.json();
    const output = aiData?.output_text || '';

    if (!output.trim()) {
      return res.json({
        reply: buildFallbackMedicalReply(trimmedQuestion)
      });
    }

    return res.json({ reply: output.trim() });
  } catch (error) {
    console.error('Assistant error:', error);
    return res.status(500).json({
      message: 'Assistant is temporarily unavailable. Please try again.'
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

function buildFallbackMedicalReply(question) {
  const normalized = question.toLowerCase();

  if (normalized.includes('headache') || normalized.includes('fever')) {
    return 'For mild headache or fever: rest, hydrate well, and consider standard over-the-counter pain relief if suitable for you. Seek urgent care for severe headache, stiff neck, confusion, rash, persistent vomiting, or worsening symptoms. This guidance is informational and not a diagnosis.';
  }

  if (normalized.includes('cough') || normalized.includes('sore throat')) {
    return 'For mild cough or sore throat: fluids, warm drinks, rest, and symptom relief medicines can help. Seek urgent care for breathing difficulty, chest pain, coughing blood, dehydration, or symptoms that worsen or last beyond several days. This guidance is informational and not a diagnosis.';
  }

  if (normalized.includes('stomach') || normalized.includes('vomit') || normalized.includes('diarrhea')) {
    return 'For mild stomach upset: sip fluids often, try bland foods, and avoid dehydration. Seek urgent care for severe abdominal pain, blood in stool or vomit, persistent vomiting, high fever, or dehydration signs. This guidance is informational and not a diagnosis.';
  }

  return 'I can provide general guidance but not a diagnosis. Monitor your symptoms, rest, stay hydrated, and seek clinical advice if symptoms persist or worsen. Seek urgent medical help immediately for severe pain, trouble breathing, confusion, fainting, or heavy bleeding.';
}

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