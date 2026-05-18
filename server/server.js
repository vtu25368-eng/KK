const express = require('express');
const cors = require('cors');
require('dotenv').config();
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ===== GMAIL CONFIG =====
// Get App Password: Google Account → Security → 2-Step Verification → App Passwords
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';

// ===== TWILIO SMS CONFIG =====
// Sign up: https://www.twilio.com (free trial = $15 credit)
// Get SID + Auth Token from: https://console.twilio.com
const TWILIO_SID = process.env.TWILIO_SID || '';
const TWILIO_AUTH = process.env.TWILIO_AUTH || '';
const TWILIO_PHONE = process.env.TWILIO_PHONE || '';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

const twilioClient = twilio(TWILIO_SID, TWILIO_AUTH);

// Test SMS endpoint — visit http://localhost:5000/api/test-sms?to=+917075276902 in browser
app.get('/api/test-sms', async (req, res) => {
  const to = req.query.to || '+917075276902';
  try {
    const msg = await twilioClient.messages.create({
      body: 'EventHub test SMS - if you see this, Twilio is working!',
      from: TWILIO_PHONE,
      to: to
    });
    res.json({ success: true, sid: msg.sid, to });
  } catch (err) {
    res.json({ error: err.message, code: err.code, status: err.status });
  }
});

// Store verification codes temporarily
const verificationCodes = {};

// ===== SEND REAL VERIFICATION CODE =====
app.post('/api/send-code', async (req, res) => {
  let { destination, method } = req.body;
  if (!destination) return res.status(400).json({ error: 'Destination is required' });

  // Auto-fix phone number format for India
  if (method === 'phone') {
    destination = destination.replace(/[\s\-()]/g, ''); // remove spaces, dashes
    if (!destination.startsWith('+')) {
      if (destination.startsWith('91') && destination.length === 12) {
        destination = '+' + destination;
      } else if (destination.length === 10) {
        destination = '+91' + destination;
      } else {
        destination = '+91' + destination;
      }
    }
    console.log(`📱 Formatted phone: ${destination}`);
  }

  const originalDest = req.body.destination;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  // Store code under BOTH original input AND formatted number
  verificationCodes[destination] = { code, expires: Date.now() + 5 * 60 * 1000 };
  verificationCodes[originalDest] = { code, expires: Date.now() + 5 * 60 * 1000 };

  try {
    if (method === 'phone') {
      // ===== REAL SMS via Twilio =====
      console.log(`📱 Sending SMS to ${destination} from ${TWILIO_PHONE}...`);
      const msg = await twilioClient.messages.create({
        body: `Your EventHub verification code is: ${code}. Valid for 5 minutes.`,
        from: TWILIO_PHONE,
        to: destination
      });
      console.log(`✅ SMS sent! SID: ${msg.sid}`);
      return res.json({ success: true, message: `SMS code sent to ${destination}` });

    } else {
      // ===== REAL EMAIL via Gmail =====
      console.log(`📧 Sending email to ${destination}...`);
      await transporter.sendMail({
        from: `"EventHub" <${EMAIL_USER}>`,
        to: destination,
        subject: 'EventHub - Your Verification Code',
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:30px;background:#0c0e1a;border-radius:16px;color:#f1f5f9"><div style="text-align:center;margin-bottom:24px"><div style="width:60px;height:60px;background:linear-gradient(135deg,#6366f1,#ec4899);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:28px">🎪</div><h1 style="font-size:22px;margin:16px 0 4px;color:#fff">EventHub</h1></div><div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;text-align:center"><p style="color:#94a3b8;font-size:14px;margin-bottom:16px">Your verification code is:</p><div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#a5b4fc;margin-bottom:16px">${code}</div><p style="color:#64748b;font-size:12px">Expires in 5 minutes. Do not share this code.</p></div></div>`
      });
      console.log(`✅ Email sent to ${destination}`);
      return res.json({ success: true, message: `Verification code sent to ${destination}` });
    }
  } catch (err) {
    console.error(`❌ SEND FAILED [${method}] to ${destination}:`);
    console.error(`   Error: ${err.message}`);
    console.error(`   Code: ${err.code || 'N/A'}`);
    console.error(`   Status: ${err.status || 'N/A'}`);
    console.log(`📌 Fallback — Code for ${destination}: ${code}`);
    // Also store with original input in case format changed
    verificationCodes[req.body.destination] = { code, expires: Date.now() + 5 * 60 * 1000 };
    return res.json({ success: true, message: `Code for ${destination}`, fallback: true, code });
  }
});

// ===== VERIFY CODE =====
app.post('/api/verify-code', (req, res) => {
  const { destination, code } = req.body;
  const stored = verificationCodes[destination];
  if (!stored) return res.status(400).json({ error: 'No code sent to this destination. Request a new one.' });
  if (Date.now() > stored.expires) {
    delete verificationCodes[destination];
    return res.status(400).json({ error: 'Code expired. Request a new one.' });
  }
  if (stored.code !== code) return res.status(400).json({ error: 'Invalid code. Please try again.' });
  delete verificationCodes[destination];
  res.json({ success: true, verified: true });
});

// ===== AUTH API =====
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  db.get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const { password: pwd, ...u } = user;
    res.json(u);
  });
});

app.post('/api/signup', (req, res) => {
  const { name, username, password, email, age } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'All fields are required' });
  const sql = `INSERT INTO users (name, username, password, role, profileName, email, age) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.run(sql, [name, username.toLowerCase(), password, 'student', name, email || '', age || null], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: 'Username already exists' });
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, name, username: username.toLowerCase(), role: 'student', profileName: name, email: email || '', age: age || null });
  });
});

// ===== USER PROFILE API =====
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { profileName, email } = req.body;
  db.run(`UPDATE users SET profileName = ?, email = ? WHERE id = ?`, [profileName, email, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      const { password, ...u } = user;
      res.json(u);
    });
  });
});

app.get('/api/users/:id', (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...u } = user;
    res.json(u);
  });
});

// ===== EVENTS API =====
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM events ORDER BY date ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/events', (req, res) => {
  const { name, department, date, time, venue, ticketPrice, totalTickets, description, category } = req.body;
  const availableTickets = totalTickets;
  const sql = `INSERT INTO events (name, department, date, time, venue, ticketPrice, totalTickets, availableTickets, description, category, totalSeats)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [name, department, date, time, venue, ticketPrice, totalTickets, availableTickets, description, category || 'Technical', totalTickets];
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name, department, date, time, venue, ticketPrice, totalTickets, availableTickets, description, category: category || 'Technical' });
  });
});

app.put('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const { name, department, date, time, venue, ticketPrice, totalTickets, availableTickets, description, category } = req.body;
  const sql = `UPDATE events SET name=?, department=?, date=?, time=?, venue=?, ticketPrice=?, totalTickets=?, availableTickets=?, description=?, category=? WHERE id=?`;
  db.run(sql, [name, department, date, time, venue, ticketPrice, totalTickets, availableTickets, description, category || 'Technical', id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes });
  });
});

app.delete('/api/events/:id', (req, res) => {
  db.run('DELETE FROM events WHERE id = ?', req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

// ===== BOOKED SEATS API =====
app.get('/api/events/:id/seats', (req, res) => {
  db.all('SELECT seatNumbers FROM bookings WHERE eventId = ? AND status = ?', [req.params.id, 'confirmed'], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const bookedSeats = [];
    rows.forEach(r => {
      if (r.seatNumbers) {
        try { bookedSeats.push(...JSON.parse(r.seatNumbers)); } catch(e) {}
      }
    });
    res.json({ bookedSeats });
  });
});

// ===== BOOKINGS API =====
app.post('/api/bookings', (req, res) => {
  const { eventId, eventName, userName, userEmail, userDepartment, ticketsBooked, totalAmount, bookedAt, transactionId, paymentMethod, seatNumbers, couponCode, discount } = req.body;

  // Prevent duplicate booking (same email + event)
  db.get('SELECT id FROM bookings WHERE userEmail = ? AND eventId = ? AND status = ?', [userEmail, eventId, 'confirmed'], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) return res.status(409).json({ error: 'You have already booked tickets for this event. Duplicate bookings are not allowed.' });

    // Verify tickets
    db.get('SELECT availableTickets FROM events WHERE id = ?', [eventId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Event not found' });
      if (row.availableTickets < ticketsBooked) return res.status(400).json({ error: 'Not enough tickets available' });

      const insertSql = `INSERT INTO bookings (eventId, eventName, userName, userEmail, userDepartment, ticketsBooked, totalAmount, bookedAt, transactionId, paymentMethod, status, seatNumbers, couponCode, discount)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)`;
      const params = [eventId, eventName, userName, userEmail, userDepartment, ticketsBooked, totalAmount, bookedAt, transactionId || '', paymentMethod || '', JSON.stringify(seatNumbers || []), couponCode || '', discount || 0];

      db.run(insertSql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const newBookingId = this.lastID;
        const newAvailable = row.availableTickets - ticketsBooked;
        db.run('UPDATE events SET availableTickets = ? WHERE id = ?', [newAvailable, eventId], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json({ id: newBookingId, success: true, newAvailable });
        });
      });
    });
  });
});

app.get('/api/bookings', (req, res) => {
  const email = req.query.email;
  const sql = email
    ? 'SELECT *, COALESCE(status, \'confirmed\') as status FROM bookings WHERE userEmail = ? ORDER BY id DESC'
    : 'SELECT *, COALESCE(status, \'confirmed\') as status FROM bookings ORDER BY id DESC';
  const params = email ? [email] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ===== BOOKING CANCELLATION =====
app.delete('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, booking) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'Booking already cancelled' });

    // Mark as cancelled
    db.run('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', id], function(err) {
      if (err) return res.status(500).json({ error: err.message });

      // Restore tickets
      db.run('UPDATE events SET availableTickets = availableTickets + ? WHERE id = ?', [booking.ticketsBooked, booking.eventId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, refundAmount: booking.totalAmount, ticketsRestored: booking.ticketsBooked });
      });
    });
  });
});

// ===== ADMIN STATS =====
app.get('/api/admin/stats', (req, res) => {
  const stats = {};
  db.get('SELECT COUNT(*) as totalEvents FROM events', (err, r) => {
    stats.totalEvents = r ? r.totalEvents : 0;
    // Include bookings where status is 'confirmed' OR status is NULL (old bookings)
    db.get(`SELECT COUNT(*) as totalBookings, COALESCE(SUM(ticketsBooked),0) as totalTicketsSold, COALESCE(SUM(totalAmount),0) as totalRevenue FROM bookings WHERE status = 'confirmed' OR status IS NULL`, (err, r2) => {
      stats.totalBookings = r2 ? r2.totalBookings : 0;
      stats.totalTicketsSold = r2 ? r2.totalTicketsSold : 0;
      stats.totalRevenue = r2 ? r2.totalRevenue : 0;
      db.all(`SELECT eventName, SUM(ticketsBooked) as tickets, SUM(totalAmount) as revenue FROM bookings WHERE status = 'confirmed' OR status IS NULL GROUP BY eventName`, (err, eventStats) => {
        stats.eventStats = eventStats || [];
        db.all(`SELECT bookedAt, COUNT(*) as count FROM bookings WHERE status = 'confirmed' OR status IS NULL GROUP BY bookedAt ORDER BY id`, (err, daily) => {
          stats.dailyBookings = daily || [];
          res.json(stats);
        });
      });
    });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
