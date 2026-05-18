const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');

    // Create Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      name TEXT,
      profileName TEXT,
      email TEXT,
      age INTEGER
    )`, (err) => {
      if (!err) {
        db.run(`ALTER TABLE users ADD COLUMN profileName TEXT`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN email TEXT`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN age INTEGER`, () => {});
        db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
          if (row && row.count === 0) {
            db.run(`INSERT INTO users (username, password, role, name) VALUES 
              ('admin', 'admin123', 'admin', 'Admin User'),
              ('student', 'student123', 'student', 'Student User')
            `);
          }
        });
      }
    });

    // Create Events table
    db.run(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      department TEXT,
      date TEXT,
      time TEXT,
      venue TEXT,
      ticketPrice REAL,
      totalTickets INTEGER,
      availableTickets INTEGER,
      description TEXT,
      category TEXT DEFAULT 'Technical',
      totalSeats INTEGER DEFAULT 100
    )`, (err) => {
      if (!err) {
        db.run(`ALTER TABLE events ADD COLUMN category TEXT DEFAULT 'Technical'`, () => {});
        db.run(`ALTER TABLE events ADD COLUMN totalSeats INTEGER DEFAULT 100`, () => {});
        db.get("SELECT COUNT(*) AS count FROM events", (err, row) => {
          if (row && row.count === 0) {
            db.run(`INSERT INTO events (name, department, date, time, venue, ticketPrice, totalTickets, availableTickets, description, category, totalSeats) VALUES 
              ('TechVista 2026 — Annual Technical Fest', 'Computer Science', '2026-05-15', '09:00', 'Main Auditorium, Block A', 150, 100, 100, 'A grand technical festival featuring hackathons, coding contests, and tech talks.', 'Technical', 100),
              ('AI & Machine Learning Seminar', 'Information Technology', '2026-05-20', '10:00', 'Seminar Hall, Block B', 75, 60, 60, 'An insightful seminar on the latest trends in AI and ML by industry experts.', 'Seminar', 60),
              ('RoboWars Championship', 'Electronics', '2026-06-02', '11:00', 'Open Ground, Campus Center', 200, 150, 150, 'Watch thrilling robot battles and participate in the robotics challenge!', 'Competition', 150),
              ('Cultural Night 2026', 'Civil', '2026-05-25', '18:00', 'Open Air Theatre', 100, 200, 200, 'An evening of music, dance, drama, and cultural performances by students.', 'Cultural', 200),
              ('IoT Workshop', 'Electronics', '2026-06-10', '10:00', 'Lab 301, Block C', 50, 40, 40, 'Hands-on workshop on Internet of Things with Arduino and Raspberry Pi.', 'Workshop', 40)
            `);
          }
        });
      }
    });

    // Create Bookings table
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId INTEGER,
      eventName TEXT,
      userName TEXT,
      userEmail TEXT,
      userDepartment TEXT,
      ticketsBooked INTEGER,
      totalAmount REAL,
      bookedAt TEXT,
      transactionId TEXT,
      paymentMethod TEXT,
      status TEXT DEFAULT 'confirmed',
      seatNumbers TEXT,
      couponCode TEXT,
      discount REAL DEFAULT 0,
      FOREIGN KEY (eventId) REFERENCES events(id)
    )`);
    db.run(`ALTER TABLE bookings ADD COLUMN transactionId TEXT`, () => {});
    db.run(`ALTER TABLE bookings ADD COLUMN paymentMethod TEXT`, () => {});
    db.run(`ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'confirmed'`, () => {});
    db.run(`ALTER TABLE bookings ADD COLUMN seatNumbers TEXT`, () => {});
    db.run(`ALTER TABLE bookings ADD COLUMN couponCode TEXT`, () => {});
    db.run(`ALTER TABLE bookings ADD COLUMN discount REAL DEFAULT 0`, () => {});
  }
});

module.exports = db;
