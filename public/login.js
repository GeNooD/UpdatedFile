const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

if (sessionStorage.getItem('patient')) {
  window.location.href = '/dashboard.html';
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(loginMessage, '');

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
      setMessage(loginMessage, 'Please enter both username and password.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(loginMessage, data.message || 'Login failed.', 'error');
        return;
      }

      sessionStorage.setItem('patient', JSON.stringify(data.patient));
      setMessage(loginMessage, 'Login successful. Redirecting to dashboard...', 'success');

      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 800);
    } catch (error) {
      setMessage(loginMessage, 'Unable to log in right now. Please try again.', 'error');
    }
  });
}

function setMessage(element, text, type = '') {
  if (!element) return;
  element.textContent = text;
  element.className = `message ${type}`.trim();
}