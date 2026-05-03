import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { showToast } from './ToastNotification.jsx';

function MyBookingsPage({ user, onRefreshEvents }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedQr, setExpandedQr] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        const myBookings = data.filter(
          (b) => b.userName === (user.profileName || user.name) || b.userEmail === user.email
        );
        setBookings(myBookings);
      }
    } catch (err) {
      console.error('Failed to fetch bookings', err);
    }
    setLoading(false);
  };

  const cancelBooking = async (booking) => {
    if (!window.confirm(`Cancel booking for "${booking.eventName}"?\nYou will receive a refund of ₹${booking.totalAmount.toFixed(2)}`))
      return;

    setCancellingId(booking.id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        showToast(`Booking cancelled! Refund of ₹${data.refundAmount.toFixed(2)} initiated.`, 'success');
        fetchBookings();
        if (onRefreshEvents) onRefreshEvents();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to cancel booking', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server', 'error');
    }
    setCancellingId(null);
  };

  const downloadTicket = (booking) => {
    let seats = '';
    try { seats = JSON.parse(booking.seatNumbers || '[]').join(', '); } catch(e) {}
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>EventHub Ticket - ${booking.eventName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#0c0e1a;padding:40px;display:flex;justify-content:center}
.ticket{width:600px;background:linear-gradient(135deg,#1e2036,#2a2d4a);border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5)}
.ticket-header{background:linear-gradient(135deg,#6366f1,#ec4899);padding:30px;text-align:center}.ticket-header h1{color:#fff;font-size:24px;margin-bottom:4px}.ticket-header p{color:rgba(255,255,255,0.8);font-size:14px}
.ticket-body{padding:30px}.ticket-event{font-size:20px;font-weight:700;color:#f1f5f9;margin-bottom:20px;text-align:center}
.ticket-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}.ticket-field label{display:block;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px}.ticket-field span{font-size:15px;color:#f1f5f9;font-weight:600}
.ticket-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);margin:20px 0}
.ticket-total{text-align:center;padding:16px;background:rgba(99,102,241,0.1);border-radius:12px;border:1px solid rgba(99,102,241,0.2)}
.ticket-total .label{font-size:12px;color:#94a3b8}.ticket-total .amount{font-size:28px;font-weight:800;color:#a5b4fc}
.ticket-footer{text-align:center;padding:20px 30px;background:rgba(0,0,0,0.2)}.ticket-footer .txn{font-size:12px;color:#64748b}</style></head>
<body><div class="ticket"><div class="ticket-header"><h1>🎪 EventHub</h1><p>Department Event Ticket</p></div>
<div class="ticket-body"><div class="ticket-event">${booking.eventName}</div>
<div class="ticket-grid"><div class="ticket-field"><label>Attendee</label><span>${booking.userName}</span></div>
<div class="ticket-field"><label>Email</label><span>${booking.userEmail}</span></div>
<div class="ticket-field"><label>Department</label><span>${booking.userDepartment}</span></div>
<div class="ticket-field"><label>Tickets</label><span>${booking.ticketsBooked}</span></div>
${seats ? `<div class="ticket-field"><label>Seats</label><span>${seats}</span></div>` : ''}
${booking.couponCode ? `<div class="ticket-field"><label>Coupon</label><span>${booking.couponCode} (-${booking.discount}%)</span></div>` : ''}
</div><div class="ticket-divider"></div>
<div class="ticket-total"><div class="label">Total Amount Paid</div><div class="amount">₹${booking.totalAmount.toFixed(2)}</div></div></div>
<div class="ticket-footer"><div class="txn">Transaction ID: ${booking.transactionId || 'N/A'}</div>
<div class="txn" style="margin-top:4px">Booked: ${booking.bookedAt}</div>
<div class="txn" style="margin-top:4px">Status: ${booking.status?.toUpperCase()}</div></div></div></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ticket_${booking.eventName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Ticket downloaded!', 'success');
  };

  const getQrData = (b) => JSON.stringify({
    event: b.eventName, attendee: b.userName, tickets: b.ticketsBooked,
    txn: b.transactionId, seats: b.seatNumbers, amount: b.totalAmount
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="payment-spinner" style={{ margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading your bookings...</p>
      </div>
    );
  }

  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const cancelled = bookings.filter((b) => b.status === 'cancelled');

  return (
    <div className="mybookings-page" id="mybookings-page">
      <div className="section-header">
        <div>
          <h2 className="section-title">🎫 My Bookings</h2>
          <p className="section-subtitle">{confirmed.length} active · {cancelled.length} cancelled</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🎫</div>
          <h3 className="empty-state__title">No bookings yet</h3>
          <p className="empty-state__desc">Book tickets from the Events page to see them here</p>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((b) => {
            const isConfirmed = b.status === 'confirmed';
            let seats = [];
            try { seats = JSON.parse(b.seatNumbers || '[]'); } catch(e) {}

            return (
              <div key={b.id} className={`booking-card ${!isConfirmed ? 'booking-card--cancelled' : ''}`}>
                <div className="booking-card__status">
                  <span className={`booking-status ${isConfirmed ? 'booking-status--confirmed' : 'booking-status--cancelled'}`}>
                    {isConfirmed ? '✅ Confirmed' : '❌ Cancelled'}
                  </span>
                  {b.transactionId && <span className="booking-card__txn">TXN: {b.transactionId}</span>}
                </div>

                <div className="booking-card__main">
                  <div className="booking-card__info">
                    <h3 className="booking-card__event">{b.eventName}</h3>
                    <div className="booking-card__details-grid">
                      <div className="booking-card__detail">
                        <span className="booking-card__detail-label">Attendee</span>
                        <span>{b.userName}</span>
                      </div>
                      <div className="booking-card__detail">
                        <span className="booking-card__detail-label">Email</span>
                        <span>{b.userEmail}</span>
                      </div>
                      <div className="booking-card__detail">
                        <span className="booking-card__detail-label">Department</span>
                        <span>{b.userDepartment}</span>
                      </div>
                      <div className="booking-card__detail">
                        <span className="booking-card__detail-label">Tickets</span>
                        <span>{b.ticketsBooked}</span>
                      </div>
                      <div className="booking-card__detail">
                        <span className="booking-card__detail-label">Amount</span>
                        <span style={{ color: 'var(--warning-400)', fontWeight: 700 }}>₹{b.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="booking-card__detail">
                        <span className="booking-card__detail-label">Booked At</span>
                        <span>{b.bookedAt}</span>
                      </div>
                      {seats.length > 0 && (
                        <div className="booking-card__detail">
                          <span className="booking-card__detail-label">Seats</span>
                          <span>{seats.join(', ')}</span>
                        </div>
                      )}
                      {b.couponCode && (
                        <div className="booking-card__detail">
                          <span className="booking-card__detail-label">Coupon</span>
                          <span style={{ color: 'var(--success-400)' }}>{b.couponCode} (-{b.discount}%)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QR Code */}
                  {isConfirmed && (
                    <div className="booking-card__qr">
                      <div
                        className="qr-wrapper"
                        onClick={() => setExpandedQr(expandedQr === b.id ? null : b.id)}
                        title="Click to enlarge"
                      >
                        <QRCodeSVG value={getQrData(b)} size={80} bgColor="transparent" fgColor="#a5b4fc" level="L" />
                      </div>
                      <span className="qr-label">Scan QR</span>
                    </div>
                  )}
                </div>

                {/* Expanded QR */}
                {expandedQr === b.id && (
                  <div className="qr-expanded">
                    <QRCodeSVG value={getQrData(b)} size={200} bgColor="#ffffff" fgColor="#1e2036" level="H" />
                    <p style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Show this at the venue entrance</p>
                  </div>
                )}

                {/* Actions */}
                <div className="booking-card__actions">
                  {isConfirmed && (
                    <>
                      <button className="btn btn--ghost btn--sm" onClick={() => downloadTicket(b)}>📥 Download</button>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => cancelBooking(b)}
                        disabled={cancellingId === b.id}
                      >
                        {cancellingId === b.id ? '⏳ Cancelling...' : '🚫 Cancel Booking'}
                      </button>
                    </>
                  )}
                  {!isConfirmed && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Refund of ₹{b.totalAmount.toFixed(2)} has been initiated
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyBookingsPage;
