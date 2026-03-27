# Hospital Self-Service Project

This project is a cleaner and more polished version of the hospital self-service prototype created for the software engineering group assignment. The system allows a patient to log in, check doctor availability, view their medical records, and book appointments through one simple interface.

## What has been improved

- redesigned user interface with a more modern dashboard layout
- clearer patient profile and summary cards
- stronger appointment booking validation
- logout option added
- speciality filter added for the doctor calendar
- improved empty states and user feedback messages
- updated README and project structure for easier handover
- node modules removed from the final package

## Features

- Patient login
- Appointment booking
- Doctor availability calendar
- Medical records portal
- Profile overview
- Basic automated testing
- Express backend API

## Technologies used

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- Node test runner
- GitHub Actions

## Database used

This prototype does not use a real database. Instead, it uses mock in-memory data stored in `data/mockData.js`. This is enough for a university prototype because it demonstrates the logic clearly, but a production system should use a secure database such as MySQL or MongoDB.

## How to run the project

```bash
npm install
npm start
```

Open the browser at:

```text
http://localhost:3000
```

Demo login:

- Username: `amanda`
- Password: `Password123!`

## How to run tests

```bash
npm test
```

## Main files

- `server.js` - backend routes and application server
- `data/mockData.js` - mock patient, doctor, record, and appointment data
- `public/index.html` - main page structure
- `public/styles.css` - styling and responsive layout
- `public/app.js` - frontend logic and API calls
- `test/app.test.js` - automated tests

## Future improvements

- connect the system to a real database
- add patient registration and password reset
- support cancellation and rescheduling
- improve security with password hashing and sessions
- create separate doctor and admin dashboards
