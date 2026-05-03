import React, { useState } from 'react';
import PaymentModal from './PaymentModal.jsx';

const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics',
  'Mechanical', 'Civil', 'Electrical', 'Chemical', 'Biotechnology',
];

function StudentDashboard({ events, onBookTickets }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');

  // Booking form state
  const [formData, setFormData] = useState({ name: '', email: '', department: '', tickets: '' });
  const [errors, setErrors] = useState({});

  const openBooking = (event) => {
    setSelectedEvent(event);
    setShowBookingForm(true);
    setFormData({ name: '', email: '', department: '', tickets: '' });
    setErrors({});
    setSuccessMsg('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    else if (formData.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!validateEmail(formData.email)) errs.email = 'Enter a valid email address';
    if (!formData.department) errs.department = 'Select your department';
    if (!formData.tickets) errs.tickets = 'Number of tickets is required';
    else {
      const n = parseInt(formData.tickets, 10);
      if (isNaN(n) || n <= 0) errs.tickets = 'Enter a valid positive number';
      else if (n > selectedEvent.availableTickets) errs.tickets = `Only ${selectedEvent.availableTickets} ticket(s) available`;
      else if (n > 5) errs.tickets = 'Maximum 5 tickets per booking';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleBookSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const ticketCount = parseInt(formData.tickets, 10);
    const bookingData = {
      userName: formData.name.trim(),
      userEmail: formData.email.trim(),
      userDepartment: formData.department,
      ticketsBooked: ticketCount,
      totalAmount: ticketCount * selectedEvent.ticketPrice,
      eventName: selectedEvent.name,
      eventId: selectedEvent.id,
    };

    setPendingBooking(bookingData);
    setShowBookingForm(false);
    setShowPayment(true);
  };

  const handlePaymentSuccess = (paymentInfo) => {
    const finalBooking = { ...pendingBooking, ...paymentInfo, bookedAt: new Date().toLocaleString() };
    onBookTickets(pendingBooking.eventId, pendingBooking.ticketsBooked);
    setBookingHistory((prev) => [finalBooking, ...prev]);
    setShowPayment(false);
    setPendingBooking(null);
    setSelectedEvent(null);
    setSuccessMsg('Booking confirmed! Check your booking history below.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setPendingBooking(null);
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <div>
      {successMsg && (
        <div className="success-banner">
          <span>🎉</span><span className="success-banner__text">{successMsg}</span>
        </div>
      )}

      {/* Events Grid */}
      <div className="section-header">
        <div>
          <h2 className="section-title">🎪 Upcoming Events</h2>
          <p className="section-subtitle">{events.length} event(s) available for booking</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📭</div>
          <h3 className="empty-state__title">No events available</h3>
          <p className="empty-state__desc">Check back later for upcoming events</p>
        </div>
      ) : (
        <div className="events-grid" id="events-grid">
          {events.map((ev) => {
            const isSoldOut = ev.availableTickets === 0;
            const isLow = ev.availableTickets > 0 && ev.availableTickets <= 10;
            return (
              <div className="event-card" key={ev.id}>
                <div className="event-card__banner"></div>
                <div className="event-card__body">
                  <h3 className="event-card__name">{ev.name}</h3>
                  <span className="event-card__dept">🏛️ {ev.department}</span>

                  <div className="event-card__details">
                    <div className="event-card__detail">
                      <span className="event-card__detail-icon">📅</span>
                      <span>{formatDate(ev.date)} at {ev.time}</span>
                    </div>
                    <div className="event-card__detail">
                      <span className="event-card__detail-icon">📍</span>
                      <span>{ev.venue}</span>
                    </div>
                    {ev.description && (
                      <div className="event-card__detail">
                        <span className="event-card__detail-icon">📝</span>
                        <span>{ev.description}</span>
                      </div>
                    )}
                  </div>

                  <div className="event-card__footer">
                    <span className="event-card__price">₹{ev.ticketPrice}</span>
                    <span className={`event-card__tickets ${isSoldOut ? 'event-card__tickets--sold' : isLow ? 'event-card__tickets--low' : ''}`}>
                      {isSoldOut ? '❌ Sold Out' : `🎟️ ${ev.availableTickets} left`}
                    </span>
                  </div>

                  <div className="event-card__actions">
                    <button
                      className="btn btn--primary btn--full"
                      disabled={isSoldOut}
                      onClick={() => openBooking(ev)}
                    >
                      {isSoldOut ? '🚫 Sold Out' : '🎫 Book Tickets'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Form Modal */}
      {showBookingForm && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowBookingForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="card__header">
              <div className="card__icon card__icon--accent">🎫</div>
              <div>
                <h2 className="card__title">Book Tickets</h2>
                <p className="card__desc">{selectedEvent.name}</p>
              </div>
            </div>

            <form onSubmit={handleBookSubmit} id="student-booking-form">
              <div className="form-group">
                <label className="form-group__label form-group__label--req">Full Name</label>
                <input name="name" className={`form-group__input ${errors.name ? 'form-group__input--error' : ''}`}
                  placeholder="Enter your full name" value={formData.name} onChange={handleChange} />
                {errors.name && <div className="form-group__error">⚠ {errors.name}</div>}
              </div>

              <div className="form-group">
                <label className="form-group__label form-group__label--req">Email Address</label>
                <input name="email" type="email" className={`form-group__input ${errors.email ? 'form-group__input--error' : ''}`}
                  placeholder="you@example.com" value={formData.email} onChange={handleChange} />
                {errors.email && <div className="form-group__error">⚠ {errors.email}</div>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-group__label form-group__label--req">Department</label>
                  <select name="department" className={`form-group__select ${errors.department ? 'form-group__input--error' : ''}`}
                    value={formData.department} onChange={handleChange}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {errors.department && <div className="form-group__error">⚠ {errors.department}</div>}
                </div>
                <div className="form-group">
                  <label className="form-group__label form-group__label--req">Tickets (Max 5)</label>
                  <input name="tickets" type="number" min="1" max={Math.min(5, selectedEvent.availableTickets)}
                    className={`form-group__input ${errors.tickets ? 'form-group__input--error' : ''}`}
                    placeholder="e.g. 2" value={formData.tickets} onChange={handleChange} />
                  {errors.tickets && <div className="form-group__error">⚠ {errors.tickets}</div>}
                </div>
              </div>

              {formData.tickets && parseInt(formData.tickets) > 0 && (
                <div className="payment-summary">
                  <div className="payment-summary__row">
                    <span>Price per ticket</span><span>₹{selectedEvent.ticketPrice}</span>
                  </div>
                  <div className="payment-summary__row payment-summary__row--total">
                    <span>Total</span>
                    <span>₹{(parseInt(formData.tickets) * selectedEvent.ticketPrice).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
                <button type="submit" className="btn btn--success" style={{ flex: 1 }}>
                  💳 Proceed to Payment
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setShowBookingForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && pendingBooking && (
        <PaymentModal
          booking={pendingBooking}
          onPaymentSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}

      {/* Booking History */}
      {bookingHistory.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">📋 Your Bookings</h2>
              <p className="section-subtitle">{bookingHistory.length} booking(s)</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table" id="bookings-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Tickets</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Booked At</th>
                </tr>
              </thead>
              <tbody>
                {bookingHistory.map((b, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.eventName}</td>
                    <td>{b.ticketsBooked}</td>
                    <td style={{ color: 'var(--warning-400)', fontWeight: 600 }}>₹{b.totalAmount.toFixed(2)}</td>
                    <td style={{ color: 'var(--success-400)' }}>✅ Paid</td>
                    <td>{b.bookedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
