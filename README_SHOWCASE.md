# Hospital Self-Service Portal

A patient-focused hospital self-service portal built with **Node.js**, **Express**, **PostgreSQL**, and vanilla **HTML/CSS/JavaScript**.

This project allows patients to register, log in, view and update their profile, check doctor availability, view medical records, book appointments, and use an AI-powered health guidance assistant.

## Current Features

- Patient registration
- Patient login
- Patient dashboard
- Profile viewing and editing
- Doctor availability browsing
- Appointment booking
- Medical records viewing
- AI health assistant with fallback responses
- Light/dark theme toggle
- Automated backend tests

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- HTML
- CSS
- JavaScript
- Dotenv
- Node test runner
- Supertest

## Project Structure

```text
.
├── data/
│   └── mockData.js
├── public/
│   ├── index.html
│   ├── login.html
│   ├── login.js
│   ├── register.html
│   ├── register.js
│   ├── dashboard.html
│   ├── dashboard.js
│   └── styles.css
├── test/
│   └── app.test.js
├── db.js
├── server.js
└── package.json
```

## Screenshots

### Server API

![Server API screenshot](assets/readme/server-api-screenshot.svg)

### Dashboard Logic

![Dashboard logic screenshot](assets/readme/dashboard-logic-screenshot.svg)

### Backend Test Suite

![Backend test suite screenshot](assets/readme/backend-tests-screenshot.svg)

### Test Verification Note

![Test verification note](assets/readme/test-verification-note.svg)

## How the App Works

### Authentication
Patients can create an account on the registration page and then sign in from the login page.

### Dashboard
After logging in, the patient dashboard allows users to:

- view their personal details
- update profile information
- see upcoming appointments
- view medical records
- book appointments using available doctor slots
- ask general health questions through the AI assistant

### Doctor Availability
Doctor availability is currently generated from `data/mockData.js`.

### Database
The application uses **PostgreSQL** for patient accounts, profiles, medical records, and appointments.

## Environment Variables
Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/hospital_portal
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
```

## Database Tables Expected
The backend expects these tables:

- `patients`
- `profiles`
- `medical_records`
- `appointments`

### Expected Columns

#### `patients`
- `id`
- `username`
- `password`

#### `profiles`
- `patient_id`
- `name`
- `dob`
- `nhs_number`
- `email`
- `phone`
- `address`
- `emergency_contact`

#### `medical_records`
- `id`
- `patient_id`
- `record_type`
- `record_date`
- `detail`

#### `appointments`
- `id`
- `patient_id`
- `doctor_id`
- `doctor_name`
- `specialty`
- `appointment_date`
- `appointment_time`
- `status`

## Installation

```bash
npm install
```

## Running the Project

```bash
npm start
```

Open:

```text
http://localhost:3000
```

You will be redirected to the login page.

## Running Tests

```bash
npm test
```

## AI Health Assistant
The dashboard includes an AI health assistant for general medical guidance.

- If `OPENAI_API_KEY` is available, the app sends questions to the OpenAI Responses API.
- If no API key is configured, the app falls back to built-in rule-based responses.
- The assistant is for general informational guidance only and does not provide diagnosis.

## Important Notes

- PostgreSQL is required for the full app experience.
- Doctor availability is still powered by mock data in `data/mockData.js`.
- Passwords are currently stored in plain text for prototype/demo purposes.
- This project is intended for educational and demonstration use.
- The screenshots added here show real code and the included backend test suite. I was not able to capture a live passing terminal run from this environment because package installation is blocked here.

## Main Files

- `server.js` - Express server and API routes
- `db.js` - PostgreSQL connection pool
- `data/mockData.js` - doctor availability and helper mock data
- `public/login.html` - login page
- `public/register.html` - registration page
- `public/dashboard.html` - patient dashboard
- `public/login.js` - login logic
- `public/register.js` - registration logic
- `public/dashboard.js` - dashboard logic, booking flow, profile editing, and assistant UI
- `test/app.test.js` - backend tests

## Future Improvements

- secure password hashing with bcrypt
- add session-based or token-based authentication
- move doctor availability into the database
- add appointment cancellation and rescheduling
- add admin and doctor dashboards
- add migration and seed scripts
- improve validation and production security

## Disclaimer
This project is for educational and demonstration purposes only. The AI assistant does not provide medical diagnosis. For urgent or professional medical advice, contact a qualified clinician or local emergency service.
