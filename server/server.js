require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const cors = require('cors');
const path = require('path');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

// Prometheus Metrics Instrumentation for Grafana Sync
const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'portfolio_http_requests_total',
  help: 'Total HTTP requests on Akarsh Portfolio Web Application',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const authEventCounter = new client.Counter({
  name: 'portfolio_auth_events_total',
  help: 'Total authentication and MFA events on Web Application',
  labelNames: ['type', 'status'],
  registers: [register]
});

const paymentEventCounter = new client.Counter({
  name: 'portfolio_payment_transactions_total',
  help: 'Total Razorpay transactions and orders generated',
  labelNames: ['status'],
  registers: [register]
});

const http = require('http');

// Ship real-time structured logs to Elasticsearch on VM 2
function sendLogToElastic(level, message, meta = {}) {
  try {
    const payload = JSON.stringify({
      '@timestamp': new Date().toISOString(),
      service: 'akarsh-portfolio-webapp',
      environment: 'production',
      origin_node: 'VM 1 (3.108.228.13)',
      level,
      message,
      ...meta
    });
    const req = http.request({
      host: '65.0.199.163',
      port: 9200,
      path: '/portfolio-logs/_doc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    });
    req.on('error', () => {}); // Non-blocking
    req.write(payload);
    req.end();
  } catch (e) {}
}

let totalRequests = 0;
let totalLogins = 0;
let totalPayments = 0;

// In-memory user database for demonstration (in production, use PostgreSQL/MongoDB)
// Structure: { githubId: { id, username, displayName, avatar, mfaSecret, mfaEnabled, tempMfaSecret } }
const usersDb = {};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics & Elasticsearch logging middleware
app.use((req, res, next) => {
  totalRequests++;
  const start = Date.now();
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status_code: res.statusCode
    });
    // Log non-static requests to Elasticsearch
    if (!req.path.includes('.') && req.path !== '/metrics') {
      sendLogToElastic('INFO', `${req.method} ${req.path} completed with ${res.statusCode}`, {
        method: req.method,
        path: req.path,
        status_code: res.statusCode,
        latency_ms: Date.now() - start,
        client_ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
      });
    }
  });
  next();
});

// Prometheus Scrape Endpoint (for Grafana / Prometheus sync)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Real-Time Telemetry API for the embedded web application dashboard
app.get('/api/telemetry', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ONLINE',
    uptime: Math.floor(process.uptime()),
    totalRequests,
    totalLogins,
    totalPayments,
    memoryUsageMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
    activeSessions: Object.keys(usersDb).length,
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static files (index.html, style.css, payment.js, auth.js)
app.use(express.static(path.join(__dirname, '..')));
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5000'],
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'akarsh_portfolio_auth_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = usersDb[id];
  done(null, user || null);
});

// Configure GitHub OAuth Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || 'dummy_id',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy_secret',
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/auth/github/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    if (!usersDb[profile.id]) {
      usersDb[profile.id] = {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName || profile.username,
        avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
        profileUrl: profile.profileUrl,
        mfaEnabled: false,
        mfaSecret: null,
        tempMfaSecret: null
      };
    }
    return done(null, usersDb[profile.id]);
  }
));

// ------------------- AUTH ROUTES -------------------

// 1. Kick off GitHub OAuth
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

// 2. OAuth Callback
app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login-failed' }),
  (req, res) => {
    // User is authenticated via GitHub OAuth
    // Check if MFA is required
    if (req.user.mfaEnabled) {
      req.session.mfaVerified = false;
      return res.redirect(`${FRONTEND_URL}/?auth=mfa_pending`);
    }
    req.session.mfaVerified = true;
    res.redirect(`${FRONTEND_URL}/?auth=success`);
  }
);

// 3. Current User State Check
app.get('/api/auth/me', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.json({ authenticated: false });
  }

  const user = usersDb[req.user.id];
  res.json({
    authenticated: true,
    mfaVerified: !!req.session.mfaVerified,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      mfaEnabled: user.mfaEnabled
    }
  });
});

// 4. Generate MFA QR Code (Setup Phase)
app.post('/api/auth/mfa/generate', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Please log in via GitHub first' });
  }

  const user = usersDb[req.user.id];
  // Generate a TOTP secret key for Authenticator app
  const secret = speakeasy.generateSecret({
    name: `Akarsh Portfolio (${user.username})`,
    issuer: 'Akarsh Portfolio'
  });

  // Temporarily store secret until verified
  user.tempMfaSecret = secret.base32;

  // Convert otpauth URL to QR code data URL
  QRCode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
    if (err) {
      return res.status(500).json({ error: 'Error generating QR code' });
    }
    res.json({
      qrCodeUrl: dataUrl,
      secret: secret.base32
    });
  });
});

// 5. Verify & Enable MFA
app.post('/api/auth/mfa/verify', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { token } = req.body;
  const user = usersDb[req.user.id];
  const secretToVerify = user.mfaEnabled ? user.mfaSecret : user.tempMfaSecret;

  if (!secretToVerify) {
    return res.status(400).json({ error: 'No MFA secret found. Please generate a QR code first.' });
  }

  // Validate the 6-digit TOTP code
  const verified = speakeasy.totp.verify({
    secret: secretToVerify,
    encoding: 'base32',
    token: token.trim(),
    window: 1 // allow 30s clock drift
  });

  if (verified) {
    if (!user.mfaEnabled) {
      user.mfaEnabled = true;
      user.mfaSecret = user.tempMfaSecret;
      user.tempMfaSecret = null;
    }
    req.session.mfaVerified = true;
    totalLogins++;
    authEventCounter.inc({ type: 'mfa', status: 'verified' });
    sendLogToElastic('INFO', 'TOTP MFA verification successful with Google Authenticator', {
      user: user.username,
      mfa_verified: true
    });
    return res.json({ success: true, message: 'MFA verified successfully!' });
  } else {
    authEventCounter.inc({ type: 'mfa', status: 'invalid' });
    sendLogToElastic('WARN', 'Failed TOTP MFA verification attempt', {
      user: user.username,
      mfa_verified: false
    });
    return res.status(400).json({ success: false, error: 'Invalid 6-digit verification code' });
  }
});

// 6. Disable MFA
app.post('/api/auth/mfa/disable', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = usersDb[req.user.id];
  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.tempMfaSecret = null;
  req.session.mfaVerified = true;

  res.json({ success: true, message: 'MFA disabled' });
});

// 7. Logout
app.post('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
});

// ==========================================
// 8. Razorpay Payment Gateway Integration
// ==========================================
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

let razorpayClient = null;
if (razorpayKeyId && razorpayKeySecret) {
  try {
    razorpayClient = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret
    });
    console.log('Razorpay Client initialized with Live/Test API Keys.');
  } catch (err) {
    console.warn('Razorpay init error:', err.message);
  }
} else {
  console.log('Razorpay running in Sandbox/Simulation Mode (No API keys provided).');
}

// Create an order
app.post('/api/pay/order', async (req, res) => {
  try {
    const { amount, currency = 'INR', notes = {} } = req.body;
    const numericAmount = Math.max(1, parseInt(amount, 10) || 500);

    // If real Razorpay client is initialized
    if (razorpayClient) {
      const options = {
        amount: numericAmount * 100, // paise
        currency: currency.toUpperCase(),
        receipt: `rcpt_${Date.now()}`,
        notes: notes
      };
      const order = await razorpayClient.orders.create(options);
      return res.json({
        success: true,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: razorpayKeyId,
        sandbox: false
      });
    }

    // Sandbox / Simulation Mode
    const mockOrderId = `order_mock_${Date.now()}`;
    return res.json({
      success: true,
      order_id: mockOrderId,
      amount: numericAmount * 100,
      currency: currency.toUpperCase(),
      key_id: 'rzp_test_simulated_demo',
      sandbox: true,
      message: 'Running in simulated sandbox mode. When you add real keys in .env, live checkout activates.'
    });
  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify payment signature
app.post('/api/pay/verify', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Sandbox mock verification
    if (razorpay_order_id && razorpay_order_id.startsWith('order_mock_')) {
      totalPayments++;
      paymentEventCounter.inc({ status: 'success' });
      return res.json({
        success: true,
        verified: true,
        mode: 'sandbox',
        payment_id: razorpay_payment_id || `pay_mock_${Date.now()}`,
        message: 'Payment verified successfully in Sandbox Mode!'
      });
    }

    if (!razorpayKeySecret) {
      totalPayments++;
      paymentEventCounter.inc({ status: 'success' });
      return res.status(400).json({ success: false, error: 'Server missing Razorpay secret key.' });
    }

    // Cryptographic HMAC SHA256 Signature verification
    const hmac = crypto.createHmac('sha256', razorpayKeySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === razorpay_signature) {
      totalPayments++;
      paymentEventCounter.inc({ status: 'success' });
      return res.json({
        success: true,
        verified: true,
        mode: 'live_test',
        payment_id: razorpay_payment_id,
        message: 'Payment signature verified successfully!'
      });
    } else {
      paymentEventCounter.inc({ status: 'failed' });
      return res.status(400).json({ success: false, verified: false, error: 'Invalid payment signature' });
    }
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const { exec } = require('child_process');

// Live Kubernetes Cluster status
app.get('/api/k8s/status', (req, res) => {
  exec('sudo k3s kubectl get pods -n portfolio-system -o json', (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: stderr || err.message });
    }
    try {
      const data = JSON.parse(stdout);
      const pods = (data.items || []).map(p => {
        const containerStatuses = p.status.containerStatuses || [];
        const restarts = containerStatuses.reduce((acc, c) => acc + (c.restartCount || 0), 0);
        const readyCount = containerStatuses.filter(c => c.ready).length;
        const totalContainers = containerStatuses.length || 1;
        return {
          name: p.metadata.name,
          phase: p.status.phase,
          ready: `${readyCount}/${totalContainers}`,
          restarts,
          podIP: p.status.podIP || 'ClusterIP',
          nodeName: p.spec.nodeName || 'vm1-k3s-master',
          startTime: p.status.startTime,
          labels: p.metadata.labels
        };
      });
      res.json({
        success: true,
        namespace: 'portfolio-system',
        cluster: 'K3s Production Cluster (AWS ap-south-1)',
        nodePort: 30080,
        nodePortUrl: 'http://3.108.228.13:30080',
        podCount: pods.length,
        pods
      });
    } catch (parseErr) {
      res.status(500).json({ success: false, error: parseErr.message });
    }
  });
});

app.listen(PORT, () => {
  console.log(`OAuth + MFA Auth Server running on http://localhost:${PORT}`);
});
