// Use relative path so it automatically works locally and inside Docker reverse proxy
const AUTH_API = '';

function openAuthModal() {
  document.getElementById('authModal').style.display = 'flex';
  checkAuthStatus();
}

function closeAuthModal() {
  document.getElementById('authModal').style.display = 'none';
}

// Close on outside click
window.onclick = function(event) {
  const modal = document.getElementById('authModal');
  if (event.target === modal) {
    closeAuthModal();
  }
};

async function checkAuthStatus() {
  try {
    const res = await fetch(`${AUTH_API}/api/auth/me`, { credentials: 'include' });
    const data = await res.json();
    
    const loginState = document.getElementById('authStateLogin');
    const mfaPendingState = document.getElementById('authStateMfaPending');
    const dashboardState = document.getElementById('authStateDashboard');
    const authNavBtn = document.getElementById('authBtn');

    if (!data.authenticated) {
      loginState.style.display = 'block';
      mfaPendingState.style.display = 'none';
      dashboardState.style.display = 'none';
      authNavBtn.innerText = 'Sign In';
      return;
    }

    if (!data.mfaVerified) {
      loginState.style.display = 'none';
      mfaPendingState.style.display = 'block';
      dashboardState.style.display = 'none';
      authNavBtn.innerText = '2FA Required';
      return;
    }

    // Fully authenticated & verified
    loginState.style.display = 'none';
    mfaPendingState.style.display = 'none';
    dashboardState.style.display = 'block';

    authNavBtn.innerText = data.user.displayName || data.user.username;
    document.getElementById('userName').innerText = data.user.displayName || data.user.username;
    document.getElementById('userAvatar').src = data.user.avatar || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';

    const statusBadge = document.getElementById('userStatus');
    const mfaInactive = document.getElementById('mfaInactiveSection');
    const mfaActive = document.getElementById('mfaActiveSection');
    const mfaSetup = document.getElementById('mfaSetupSection');

    if (data.user.mfaEnabled) {
      statusBadge.innerText = 'MFA Protected';
      statusBadge.className = 'badge-mfa badge-active';
      mfaInactive.style.display = 'none';
      mfaSetup.style.display = 'none';
      mfaActive.style.display = 'block';
    } else {
      statusBadge.innerText = 'MFA Disabled';
      statusBadge.className = 'badge-mfa badge-inactive';
      mfaInactive.style.display = 'block';
      mfaActive.style.display = 'none';
    }

  } catch (err) {
    console.warn('Auth server not reached:', err);
  }
}

async function verifyMfaCode() {
  const code = document.getElementById('mfaVerifyCode').value;
  const msg = document.getElementById('mfaVerifyMsg');
  msg.innerText = '';

  try {
    const res = await fetch(`${AUTH_API}/api/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: code }),
      credentials: 'include'
    });
    const data = await res.json();
    if (res.ok) {
      checkAuthStatus();
    } else {
      msg.style.color = '#ef4444';
      msg.innerText = data.error || 'Invalid verification code';
    }
  } catch (e) {
    msg.style.color = '#ef4444';
    msg.innerText = 'Verification failed. Try again.';
  }
}

async function setupMfa() {
  try {
    const res = await fetch(`${AUTH_API}/api/auth/mfa/generate`, {
      method: 'POST',
      credentials: 'include'
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('mfaInactiveSection').style.display = 'none';
      document.getElementById('mfaSetupSection').style.display = 'block';
      document.getElementById('mfaQrImg').src = data.qrCodeUrl;
      document.getElementById('mfaSecretText').innerText = data.secret;
    }
  } catch (e) {
    alert('Failed to generate MFA setup key.');
  }
}

async function confirmMfaSetup() {
  const code = document.getElementById('mfaSetupCode').value;
  const msg = document.getElementById('mfaSetupMsg');
  msg.innerText = '';

  try {
    const res = await fetch(`${AUTH_API}/api/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: code }),
      credentials: 'include'
    });
    const data = await res.json();
    if (res.ok) {
      checkAuthStatus();
    } else {
      msg.style.color = '#ef4444';
      msg.innerText = data.error || 'Invalid verification code';
    }
  } catch (e) {
    msg.style.color = '#ef4444';
    msg.innerText = 'Error confirming MFA.';
  }
}

async function disableMfa() {
  if (!confirm('Are you sure you want to disable Multi-Factor Authentication?')) return;
  try {
    await fetch(`${AUTH_API}/api/auth/mfa/disable`, {
      method: 'POST',
      credentials: 'include'
    });
    checkAuthStatus();
  } catch (e) {
    alert('Failed to disable MFA.');
  }
}

async function logout() {
  try {
    await fetch(`${AUTH_API}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    checkAuthStatus();
  } catch (e) {
    console.error(e);
  }
}

// On page load, check auth and handle URL redirects
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('auth') === 'mfa_pending' || params.get('auth') === 'success') {
    openAuthModal();
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  checkAuthStatus();
});
