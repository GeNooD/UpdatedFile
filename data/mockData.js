
// Constants for slot times and working days
const DEFAULT_SLOT_TIMES = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Monday to Friday

/**
 * Generate future availability for a doctor.
 * @param {number} daysAhead - How many days ahead to generate.
 * @param {string[]} slotTimes - Array of slot times per day.
 * @param {number[]} workingDays - Array of allowed day numbers (0=Sun, 6=Sat).
 * @returns {Array<{date: string, slots: string[]}>}
 */
function generateFutureAvailability(daysAhead = 21, slotTimes = DEFAULT_SLOT_TIMES, workingDays = DEFAULT_WORKING_DAYS) {
  const availability = [];
  const today = new Date();
  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = date.getDay();
    if (workingDays.includes(dayOfWeek)) {
      const formattedDate = date.toISOString().split('T')[0];
      availability.push({
        date: formattedDate,
        slots: [...slotTimes]
      });
    }
  }
  return availability;
}


// Example patients (add more for realism)
const patients = [
  {
    id: 1,
    username: 'amanda',
    password: 'Password123!',
    name: 'Amanda Carter',
    dob: '1990-05-18',
    nhsNumber: '943 476 5919',
    email: 'amanda@example.com',
    phone: '07123456789',
    address: '12 Green Street, Canterbury',
    emergencyContact: 'John Carter - 07111111111',
    records: [
      { type: 'Diagnosis', date: '2026-02-11', detail: 'Seasonal asthma review. Symptoms stable.' },
      { type: 'Medication', date: '2026-02-11', detail: 'Salbutamol inhaler, 2 puffs as required.' },
      { type: 'Lab Result', date: '2026-01-24', detail: 'Blood pressure screening normal.' }
    ],
    appointments: [
      { id: 101, doctorId: 1, doctor: 'Dr Ravi Patel', specialty: 'General Practice', date: '2026-03-29', time: '10:30', status: 'Confirmed' }
    ]
  },
  {
    id: 2,
    username: 'brian',
    password: 'BrianPass456!',
    name: 'Brian Smith',
    dob: '1985-09-12',
    nhsNumber: '123 456 7890',
    email: 'brian@example.com',
    phone: '07234567890',
    address: '34 Blue Lane, Dover',
    emergencyContact: 'Anna Smith - 07222222222',
    records: [
      { type: 'Diagnosis', date: '2026-03-01', detail: 'Type 2 diabetes, stable.' }
    ],
    appointments: []
  }
];


// Example doctors (add more for realism)
const doctors = [
  {
    id: 1,
    name: 'Dr Ravi Patel',
    specialty: 'General Practice',
    availability: generateFutureAvailability(21)
  },
  {
    id: 2,
    name: 'Dr Sarah Ahmed',
    specialty: 'Cardiology',
    availability: generateFutureAvailability(21, DEFAULT_SLOT_TIMES, [1,2,3,4]) // Mon-Thu only
  },
  {
    id: 3,
    name: 'Dr Michael Jones',
    specialty: 'Dermatology',
    availability: generateFutureAvailability(21, ['10:00', '11:00', '14:00', '15:00'], [2,3,4,5]) // Tue-Fri, fewer slots
  },
  {
    id: 4,
    name: 'Dr Emily Green',
    specialty: 'Pediatrics',
    availability: generateFutureAvailability(14, ['09:30', '10:30', '13:30', '15:30'], [1,3,5]) // Mon, Wed, Fri
  }
];

// Helper functions for tests or dynamic data
function addMockPatient(patient) {
  patient.id = patients.length ? Math.max(...patients.map(p => p.id)) + 1 : 1;
  patients.push(patient);
  return patient;
}

function addMockDoctor(doctor) {
  doctor.id = doctors.length ? Math.max(...doctors.map(d => d.id)) + 1 : 1;
  doctors.push(doctor);
  return doctor;
}

// Export data and helpers
module.exports = {
  patients,
  doctors,
  generateFutureAvailability,
  addMockPatient,
  addMockDoctor,
  DEFAULT_SLOT_TIMES,
  DEFAULT_WORKING_DAYS
};