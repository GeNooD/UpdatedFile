const express = require('express');
const path = require('path');
const { patients, doctors } = require('./data/mockData');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Please enter both username and password.' });
  }

  const patient = patients.find((p) => p.username === username && p.password === password);

  if (!patient) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }

  const { password: _, ...safePatient } = patient;
  return res.json({ message: 'Login successful.', patient: safePatient });
});

app.get('/api/doctors', (_req, res) => {
  res.json(doctors);
});

app.get('/api/patients/:id/records', (req, res) => {
  const patient = patients.find((p) => p.id === Number(req.params.id));
  if (!patient) return res.status(404).json({ message: 'Patient not found.' });
  res.json(patient.records);
});

app.get('/api/patients/:id/appointments', (req, res) => {
  const patient = patients.find((p) => p.id === Number(req.params.id));
  if (!patient) return res.status(404).json({ message: 'Patient not found.' });
  res.json(patient.appointments);
});

app.post('/api/appointments', (req, res) => {
  const { patientId, doctorId, date, time } = req.body || {};
  const patient = patients.find((p) => p.id === Number(patientId));
  const doctor = doctors.find((d) => d.id === Number(doctorId));

  if (!patient || !doctor || !date || !time) {
    return res.status(400).json({ message: 'Missing or invalid booking details.' });
  }

  const duplicateAppointment = patient.appointments.find(
    (appointment) => appointment.date === date && appointment.time === time
  );

  if (duplicateAppointment) {
    return res.status(400).json({ message: 'You already have an appointment booked for this time.' });
  }

  const dayAvailability = doctor.availability.find((entry) => entry.date === date);
  if (!dayAvailability || !dayAvailability.slots.includes(time)) {
    return res.status(400).json({ message: 'Selected slot is no longer available.' });
  }

  const appointment = {
    id: Date.now(),
    doctorId: doctor.id,
    doctor: doctor.name,
    specialty: doctor.specialty,
    date,
    time,
    status: 'Confirmed'
  };

  patient.appointments.push(appointment);
  dayAvailability.slots = dayAvailability.slots.filter((slot) => slot !== time);

  return res.status(201).json({ message: 'Appointment booked successfully.', appointment });
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
