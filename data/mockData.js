const patients = [
  {
    id: 1,
    username: 'amanda',
    password: 'Password123!',
    name: 'Amanda Carter',
    dob: '1990-05-18',
    nhsNumber: '943 476 5919',
    email: 'amanda@example.com',
    records: [
      { type: 'Diagnosis', date: '2026-02-11', detail: 'Seasonal asthma review. Symptoms stable.' },
      { type: 'Medication', date: '2026-02-11', detail: 'Salbutamol inhaler, 2 puffs as required.' },
      { type: 'Lab Result', date: '2026-01-24', detail: 'Blood pressure screening normal.' }
    ],
    appointments: [
      { id: 101, doctorId: 1, doctor: 'Dr Ravi Patel', specialty: 'General Practice', date: '2026-03-29', time: '10:30', status: 'Confirmed' }
    ]
  }
];

const doctors = [
  {
    id: 1,
    name: 'Dr Ravi Patel',
    specialty: 'General Practice',
    availability: [
      { date: '2026-03-29', slots: ['09:00', '10:30', '14:00', '15:15'] },
      { date: '2026-03-30', slots: ['09:15', '11:00', '13:30', '15:30'] },
      { date: '2026-03-31', slots: ['08:45', '10:00', '12:00', '16:15'] },
      { date: '2026-04-02', slots: ['09:30', '11:45', '14:15', '16:30'] }
    ]
  },
  {
    id: 2,
    name: 'Dr Sarah Ahmed',
    specialty: 'Cardiology',
    availability: [
      { date: '2026-03-29', slots: ['09:30', '11:30', '13:00', '15:00'] },
      { date: '2026-03-31', slots: ['10:00', '12:30', '16:00', '17:15'] },
      { date: '2026-04-01', slots: ['09:00', '10:45', '14:30', '16:45'] },
      { date: '2026-04-03', slots: ['08:30', '11:15', '13:45', '15:30'] }
    ]
  },
  {
    id: 3,
    name: 'Dr Michael Jones',
    specialty: 'Dermatology',
    availability: [
      { date: '2026-03-28', slots: ['08:45', '10:15', '12:15', '15:15'] },
      { date: '2026-04-01', slots: ['09:15', '11:00', '14:45', '16:00'] },
      { date: '2026-04-04', slots: ['09:30', '12:00', '13:30', '15:45'] },
      { date: '2026-04-06', slots: ['08:30', '10:30', '14:00', '16:30'] }
    ]
  }
];

module.exports = { patients, doctors };
