const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(registerMessage, '');

    const payload = {
      name: document.getElementById('name').value.trim(),
      dob: document.getElementById('dob').value,
      nhsNumber: document.getElementById('nhsNumber').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim(),
      emergencyContact: document.getElementById('emergencyContact').value.trim(),
      username: document.getElementById('username').value.trim(),
      password: document.getElementById('password').value.trim()
    };

    if (
      !payload.name ||
      !payload.dob ||
      !payload.nhsNumber ||
      !payload.email ||
      !payload.phone ||
      !payload.address ||
      !payload.emergencyContact ||
      !payload.username ||
      !payload.password
    ) {
      setMessage(registerMessage, 'Please complete all fields.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(registerMessage, data.message || 'Registration failed.', 'error');
        return;
      }

      setMessage(registerMessage, 'Account created successfully. Redirecting to login...', 'success');

      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1000);
    } catch (error) {
      setMessage(registerMessage, 'Unable to register right now. Please try again.', 'error');
    }
  });
}

function setMessage(element, text, type = '') {
  if (!element) return;
  element.textContent = text;
  element.className = `message ${type}`.trim();
}