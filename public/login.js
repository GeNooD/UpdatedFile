const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

if (sessionStorage.getItem('patient')) {
  window.location.href = '/dashboard.html';
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(loginMessage, '');

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();

  if (!response.ok) {
    setMessage(loginMessage, data.message, 'error');
    return;
  }

  sessionStorage.setItem('patient', JSON.stringify(data.patient));
  setMessage(loginMessage, 'Login successful. Redirecting to dashboard...', 'success');
  window.location.href = '/dashboard.html';
});

function setMessage(element, text, type = '') {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}
