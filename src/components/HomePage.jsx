import React, { useState, useEffect, useRef } from 'react';
import PaymentModal from './PaymentModal.jsx';
import SeatSelection from './SeatSelection.jsx';
import VenueMap from './VenueMap.jsx';
import { showToast } from './ToastNotification.jsx';

const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics',
  'Mechanical', 'Civil', 'Electrical', 'Chemical', 'Biotechnology',
];

const CATEGORIES = ['All', 'Technical', 'Cultural', 'Workshop', 'Seminar', 'Competition'];

const COUPONS = {
  'FEST50': { discount: 50, label: '50% Off' },
  'TECH20': { discount: 20, label: '20% Off' },
  'FIRST10': { discount: 10, label: '10% Off' },
  'EVENT25': { discount: 25, label: '25% Off' },
};

function HomePage({ events, user, onLoginClick, onBookTickets }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isBookingProcessing, setIsBookingProcessing] = useState(false);
  const [optimisticEvents, setOptimisticEvents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showMapFor, setShowMapFor] = useState({});

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setOptimisticEvents(events);
  }, [events]);

  // Booking timer
  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerRef.current = setTimeout(() => setTimerSeconds((s) => s - 1), 1000);
    } else if (timerActive && timerSeconds === 0) {
      setShowBookingForm(false);
      setShowSeatSelection(false);
      setTimerActive(false);
      showToast('Session expired! Please try again.', 'warning');
    }
    return () => clearTimeout(timerRef.current);
  }, [timerActive, timerSeconds]);

  const startTimer = () => { setTimerSeconds(120); setTimerActive(true); };
  const stopTimer = () => { setTimerActive(false); clearTimeout(timerRef.current); };

  // Booking form state
  const [formData, setFormData] = useState({ name: '', email: '', department: '', tickets: '' });
  const [errors, setErrors] = useState({});

  const openBooking = (event) => {
    if (!user) { onLoginClick(); return; }
    setSelectedEvent(event);
    setShowBookingForm(true);
    setFormData({
      name: user.profileName || user.name || '',
      email: user.email || '',
      department: '',
      tickets: ''
    });
    setErrors({});
    setSuccessMsg('');
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');
    setSelectedSeats([]);
    startTimer();
  };

  const closeBookingForm = () => {
    setShowBookingForm(false);
    setShowSeatSelection(false);
    stopTimer();
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

  const applyCoupon = () => {
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) { setCouponError('Enter a coupon code'); return; }
    const coupon = COUPONS[code];
    if (!coupon) { setCouponError('Invalid coupon code'); return; }
    setAppliedCoupon({ code, ...coupon });
    showToast(`Coupon applied! ${coupon.label}`, 'success');
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponCode(''); };

  const handleBookSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    // Move to seat selection
    setShowBookingForm(false);
    setShowSeatSelection(true);
  };

  const handleSeatsConfirmed = (seats) => {
    setSelectedSeats(seats);
    setShowSeatSelection(false);
    stopTimer();
    setIsBookingProcessing(true);

    const ticketCount = parseInt(formData.tickets, 10);
    const baseAmount = ticketCount * selectedEvent.ticketPrice;
    const discountPct = appliedCoupon ? appliedCoupon.discount : 0;
    const finalAmount = baseAmount * (1 - discountPct / 100);

    const bookingData = {
      userName: formData.name.trim(),
      userEmail: formData.email.trim(),
      userDepartment: formData.department,
      ticketsBooked: ticketCount,
      totalAmount: finalAmount,
      eventName: selectedEvent.name,
      eventId: selectedEvent.id,
      seatNumbers: seats,
      couponCode: appliedCoupon?.code || '',
      discount: discountPct,
    };

    setTimeout(() => {
      setPendingBooking(bookingData);
      setShowPayment(true);
      setIsBookingProcessing(false);
    }, 400);
  };

  const handlePaymentSuccess = async (paymentInfo) => {
    const finalBooking = { ...pendingBooking, ...paymentInfo, bookedAt: new Date().toLocaleString() };
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalBooking)
      });
      if (res.ok) {
        const data = await res.json();
        setOptimisticEvents(prev => prev.map(ev =>
          ev.id === pendingBooking.eventId ? { ...ev, availableTickets: data.newAvailable } : ev
        ));
        onBookTickets();
        setShowPayment(false);
        setPendingBooking(null);
        setSelectedEvent(null);
        showToast('🎉 Booking Successful! Check "My Bookings" for details.', 'success', 5000);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Booking failed!', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server.', 'error');
    }
  };

  const handlePaymentCancel = () => { setShowPayment(false); setPendingBooking(null); };

  const formatDate = (dateStr) => {
    try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return dateStr; }
  };

  const getEventImage = (event) => {
    const name = event.name.toLowerCase();
    const dept = event.department.toLowerCase();
    if (name.includes('ai') || name.includes('machine') || dept.includes('information')) return '/images/event_ai_seminar.png';
    if (name.includes('robo') || name.includes('mechanic') || dept.includes('electronics') || dept.includes('mechanical')) return '/images/event_robotics.png';
    return '/images/event_tech_fest.png';
  };

  const getCategoryIcon = (cat) => {
    const icons = { Technical: '💻', Cultural: '🎭', Workshop: '🔧', Seminar: '📚', Competition: '🏆' };
    return icons[cat] || '🎪';
  };

  const shareEvent = (event) => {
    const text = `Check out "${event.name}" on EventHub!\n📅 ${formatDate(event.date)} at ${event.time}\n📍 ${event.venue}\n🎟️ ₹${event.ticketPrice}`;
    if (navigator.share) {
      navigator.share({ title: event.name, text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(text);
      showToast('Event details copied to clipboard!', 'info');
    }
  };

  // Filter events
  const filteredEvents = selectedCategory === 'All'
    ? optimisticEvents
    : optimisticEvents.filter(ev => (ev.category || 'Technical') === selectedCategory);

  // Recommendations (same dept or nearby date)
  const getRecommendations = () => {
    if (!user || !optimisticEvents.length) return [];
    return optimisticEvents
      .filter(ev => ev.availableTickets > 0)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
  };

  const formatTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const ticketCount = parseInt(formData.tickets, 10) || 0;
  const baseAmount = ticketCount * (selectedEvent?.ticketPrice || 0);
  const discountAmount = appliedCoupon ? baseAmount * (appliedCoupon.discount / 100) : 0;
  const finalAmount = baseAmount - discountAmount;

  return (
    <div>
      {/* Hero */}
      {!user && (
        <section className="hero" style={{ textAlign: 'center', padding: '3rem 1rem 2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(135deg, var(--text-primary), var(--primary-300))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Discover & Book Upcoming Events
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Join the most exciting technical fests, seminars, and workshops. Secure your spot now!
          </p>
        </section>
      )}

      {/* Category Filter */}
      <div className="category-filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`category-filter ${selectedCategory === cat ? 'category-filter--active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'All' ? '🎪' : getCategoryIcon(cat)} {cat}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="section-header">
        <div>
          <h2 className="section-title">🎪 {selectedCategory === 'All' ? 'All' : selectedCategory} Events</h2>
          <p className="section-subtitle">{filteredEvents.length} event(s) available</p>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="empty-state"><div className="empty-state__icon">📭</div><h3 className="empty-state__title">No events in this category</h3><p className="empty-state__desc">Try selecting a different category</p></div>
      ) : (
        <div className="events-grid" id="events-grid">
          {filteredEvents.map((ev) => {
            const isSoldOut = ev.availableTickets === 0;
            const isLow = ev.availableTickets > 0 && ev.availableTickets <= 10;
            const isCriticalLow = ev.availableTickets > 0 && ev.availableTickets <= 3;
            return (
              <div className="event-card" key={ev.id}>
                {isCriticalLow && (
                  <div className="event-card__warning-badge pulse-warning">⚠️ Only {ev.availableTickets} left!</div>
                )}
                <div className="event-card__img">
                  <img src={getEventImage(ev)} alt={ev.name} loading="lazy" />
                  <div className="event-card__img-overlay"></div>
                  <span className="event-card__dept-badge">{getCategoryIcon(ev.category)} {ev.category || 'Technical'}</span>
                </div>
                <div className="event-card__body">
                  <h3 className="event-card__name">{ev.name}</h3>
                  <span className="event-card__dept-tag">🏛️ {ev.department}</span>
                  <div className="event-card__details">
                    <div className="event-card__detail"><span className="event-card__detail-icon">📅</span><span>{formatDate(ev.date)} at {ev.time}</span></div>
                    <div className="event-card__detail"><span className="event-card__detail-icon">📍</span><span>{ev.venue}</span></div>
                    {ev.description && (
                      <div className="event-card__detail"><span className="event-card__detail-icon">📝</span>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ev.description}</span>
                      </div>
                    )}
                  </div>
                  <div className="event-card__footer">
                    <span className="event-card__price">₹{ev.ticketPrice}</span>
                    <span className={`event-card__tickets ticket-count-anim ${isSoldOut ? 'event-card__tickets--sold' : isCriticalLow ? 'event-card__tickets--critical' : isLow ? 'event-card__tickets--low' : ''}`} key={ev.availableTickets}>
                      {isSoldOut ? '❌ Sold Out' : `🎟️ ${ev.availableTickets} left`}
                    </span>
                  </div>
                  <div className="event-card__actions">
                    <button className={`btn ${isSoldOut ? 'btn--ghost' : 'btn--primary'}`} style={{ flex: 1 }} disabled={isSoldOut} onClick={() => openBooking(ev)}>
                      {isSoldOut ? '🚫 Sold Out' : '🎫 Book Now'}
                    </button>
                    <button
                      className={`btn btn--ghost btn--sm ${showMapFor[ev.id] ? 'btn--map-active' : ''}`}
                      onClick={() => setShowMapFor(prev => ({ ...prev, [ev.id]: !prev[ev.id] }))}
                      title={showMapFor[ev.id] ? 'Hide Map' : 'View Map'}
                    >
                      📍 {showMapFor[ev.id] ? 'Hide' : 'Map'}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => shareEvent(ev)} title="Share">📤</button>
                  </div>
                  {showMapFor[ev.id] && (
                    <div className="event-card__map-section">
                      <VenueMap venue={ev.venue} height={180} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recommendations */}
      {user && optimisticEvents.length > 3 && (
        <div style={{ marginTop: '2rem' }}>
          <div className="section-header"><div><h2 className="section-title">💡 You May Also Like</h2><p className="section-subtitle">Recommended events for you</p></div></div>
          <div className="events-grid">
            {getRecommendations().map((ev) => (
              <div className="event-card event-card--recommended" key={'rec-' + ev.id}>
                <div className="event-card__img"><img src={getEventImage(ev)} alt={ev.name} loading="lazy" /><div className="event-card__img-overlay"></div></div>
                <div className="event-card__body">
                  <h3 className="event-card__name">{ev.name}</h3>
                  <div className="event-card__footer" style={{ marginTop: '0.5rem' }}>
                    <span className="event-card__price">₹{ev.ticketPrice}</span>
                    <span className="event-card__tickets">🎟️ {ev.availableTickets} left</span>
                  </div>
                  <button className="btn btn--primary btn--full" style={{ marginTop: '0.75rem' }} onClick={() => openBooking(ev)}>🎫 Book Now</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      {showBookingForm && selectedEvent && (
        <div className="modal-overlay" onClick={closeBookingForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="card__header">
              <div className="card__icon card__icon--accent">🎫</div>
              <div style={{ flex: 1 }}>
                <h2 className="card__title">Book Tickets</h2>
                <p className="card__desc">{selectedEvent.name}</p>
              </div>
              {timerActive && (
                <div className={`booking-timer ${timerSeconds <= 30 ? 'booking-timer--urgent' : ''}`}>
                  ⏱️ {formatTimer(timerSeconds)}
                </div>
              )}
            </div>

            <form onSubmit={handleBookSubmit} id="student-booking-form">
              <div className="form-group">
                <label className="form-group__label form-group__label--req">Full Name</label>
                <input name="name" className={`form-group__input ${errors.name ? 'form-group__input--error' : ''}`} placeholder="Enter your full name" value={formData.name} onChange={handleChange} />
                {errors.name && <div className="form-group__error">⚠ {errors.name}</div>}
              </div>
              <div className="form-group">
                <label className="form-group__label form-group__label--req">Email Address</label>
                <input name="email" type="email" className={`form-group__input ${errors.email ? 'form-group__input--error' : ''}`} placeholder="you@example.com" value={formData.email} onChange={handleChange} />
                {errors.email && <div className="form-group__error">⚠ {errors.email}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-group__label form-group__label--req">Department</label>
                  <select name="department" className={`form-group__select ${errors.department ? 'form-group__input--error' : ''}`} value={formData.department} onChange={handleChange}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {errors.department && <div className="form-group__error">⚠ {errors.department}</div>}
                </div>
                <div className="form-group">
                  <label className="form-group__label form-group__label--req">Tickets (Max 5)</label>
                  <input name="tickets" type="number" min="1" max={Math.min(5, selectedEvent.availableTickets)} className={`form-group__input ${errors.tickets ? 'form-group__input--error' : ''}`} placeholder="e.g. 2" value={formData.tickets} onChange={handleChange} />
                  {errors.tickets && <div className="form-group__error">⚠ {errors.tickets}</div>}
                </div>
              </div>

              {/* Coupon Section */}
              <div className="coupon-section">
                <label className="form-group__label">🏷️ Have a promo code?</label>
                {appliedCoupon ? (
                  <div className="coupon-applied">
                    <span>✅ <strong>{appliedCoupon.code}</strong> — {appliedCoupon.label}</span>
                    <button type="button" className="coupon-remove" onClick={removeCoupon}>✕ Remove</button>
                  </div>
                ) : (
                  <div className="coupon-input-row">
                    <input className="form-group__input" placeholder="e.g. FEST50" value={couponCode} onChange={(e) => { setCouponCode(e.target.value); setCouponError(''); }} style={{ flex: 1 }} />
                    <button type="button" className="btn btn--ghost btn--sm" onClick={applyCoupon}>Apply</button>
                  </div>
                )}
                {couponError && <div className="form-group__error">⚠ {couponError}</div>}
              </div>

              {/* Price Summary */}
              {ticketCount > 0 && !errors.tickets && (
                <div className="payment-summary">
                  <div className="payment-summary__row"><span>Price per ticket</span><span>₹{selectedEvent.ticketPrice}</span></div>
                  <div className="payment-summary__row"><span>Subtotal ({ticketCount} tickets)</span><span>₹{baseAmount.toFixed(2)}</span></div>
                  {appliedCoupon && (
                    <div className="payment-summary__row" style={{ color: 'var(--success-400)' }}>
                      <span>Discount ({appliedCoupon.label})</span><span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="payment-summary__row payment-summary__row--total">
                    <span>Total</span><span>₹{finalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
                <button type="submit" className="btn btn--success" style={{ flex: 1 }} disabled={isBookingProcessing}>
                  {isBookingProcessing ? <span className="btn-spinner-wrap"><span className="btn-spinner"></span>Processing...</span> : '🪑 Select Seats →'}
                </button>
                <button type="button" className="btn btn--ghost" onClick={closeBookingForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seat Selection Modal */}
      {showSeatSelection && selectedEvent && (
        <div className="modal-overlay" onClick={() => { setShowSeatSelection(false); stopTimer(); }}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <SeatSelection
              event={selectedEvent}
              ticketCount={parseInt(formData.tickets, 10)}
              onConfirm={handleSeatsConfirmed}
              onCancel={() => { setShowSeatSelection(false); setShowBookingForm(true); }}
            />
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && pendingBooking && (
        <PaymentModal booking={pendingBooking} onPaymentSuccess={handlePaymentSuccess} onCancel={handlePaymentCancel} />
      )}
    </div>
  );
}

export default HomePage;
