import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const PAYMENT_METHODS = [
  { id: 'upi', icon: '📱', name: 'UPI Payment', desc: 'Google Pay, PhonePe, Paytm UPI' },
  { id: 'card', icon: '💳', name: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
  { id: 'netbanking', icon: '🏦', name: 'Net Banking', desc: 'All major banks supported' },
  { id: 'wallet', icon: '👛', name: 'Digital Wallet', desc: 'Paytm, Amazon Pay, MobiKwik' },
];

function PaymentModal({ booking, onPaymentSuccess, onCancel }) {
  const [method, setMethod] = useState('upi');
  const [step, setStep] = useState('select');
  const [upiId, setUpiId] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const handleProceed = () => {
    setError('');
    if (method === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) { setError('Enter a valid UPI ID (e.g. name@upi)'); return; }
    } else if (method === 'card') {
      if (cardNum.replace(/\s/g, '').length < 16) { setError('Enter a valid 16-digit card number'); return; }
      if (!cardExpiry || cardExpiry.length < 5) { setError('Enter expiry in MM/YY format'); return; }
      if (!cardCvv || cardCvv.length < 3) { setError('Enter a valid CVV'); return; }
    }
    setStep('processing');
  };

  useEffect(() => {
    if (step === 'processing') {
      const timer = setTimeout(() => { setTransactionId('TXN' + Date.now()); setStep('success'); }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleDone = () => {
    onPaymentSuccess({ paymentMethod: method, transactionId });
  };

  let seats = [];
  try { seats = booking.seatNumbers || []; } catch(e) {}

  const qrData = JSON.stringify({
    event: booking.eventName, attendee: booking.userName, tickets: booking.ticketsBooked,
    txn: transactionId, seats, amount: booking.totalAmount
  });

  const downloadTicket = () => {
    const seatStr = seats.join(', ');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>EventHub Ticket - ${booking.eventName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#0c0e1a;padding:40px;display:flex;justify-content:center}
.ticket{width:600px;background:linear-gradient(135deg,#1e2036,#2a2d4a);border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5)}
.ticket-header{background:linear-gradient(135deg,#6366f1,#ec4899);padding:30px;text-align:center}.ticket-header h1{color:#fff;font-size:24px}.ticket-header p{color:rgba(255,255,255,0.8);font-size:14px}
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
${seatStr ? `<div class="ticket-field"><label>Seats</label><span>${seatStr}</span></div>` : ''}
${booking.couponCode ? `<div class="ticket-field"><label>Discount</label><span>${booking.couponCode} (-${booking.discount}%)</span></div>` : ''}
</div><div class="ticket-divider"></div>
<div class="ticket-total"><div class="label">Total Paid</div><div class="amount">₹${booking.totalAmount.toFixed(2)}</div></div></div>
<div class="ticket-footer"><div class="txn">Transaction: ${transactionId}</div><div class="txn">${PAYMENT_METHODS.find(p=>p.id===method)?.name}</div></div></div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `Ticket_${booking.eventName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {step === 'select' && (
          <>
            <div className="card__header">
              <div className="card__icon card__icon--accent">💳</div>
              <div><h2 className="card__title">Choose Payment Method</h2><p className="card__desc">Select how you'd like to pay</p></div>
            </div>
            <div className="payment-summary">
              <div className="payment-summary__row"><span>Event</span><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{booking.eventName}</span></div>
              <div className="payment-summary__row"><span>Tickets</span><span>{booking.ticketsBooked}</span></div>
              {seats.length > 0 && <div className="payment-summary__row"><span>Seats</span><span>{seats.join(', ')}</span></div>}
              {booking.couponCode && <div className="payment-summary__row" style={{ color: 'var(--success-400)' }}><span>Coupon ({booking.couponCode})</span><span>-{booking.discount}%</span></div>}
              <div className="payment-summary__row payment-summary__row--total"><span>Total</span><span>₹{booking.totalAmount.toFixed(2)}</span></div>
            </div>
            <div className="payment-methods">
              {PAYMENT_METHODS.map((pm) => (
                <div key={pm.id} className={`payment-method ${method === pm.id ? 'payment-method--selected' : ''}`} onClick={() => setMethod(pm.id)}>
                  <div className="payment-method__radio"></div>
                  <div className="payment-method__icon">{pm.icon}</div>
                  <div className="payment-method__info"><div className="payment-method__name">{pm.name}</div><div className="payment-method__desc">{pm.desc}</div></div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => setStep('details')}>Continue →</button>
              <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
            </div>
          </>
        )}

        {step === 'details' && (
          <>
            <div className="card__header">
              <div className="card__icon card__icon--primary">{PAYMENT_METHODS.find(p => p.id === method)?.icon}</div>
              <div><h2 className="card__title">{PAYMENT_METHODS.find(p => p.id === method)?.name}</h2><p className="card__desc">Enter your payment details</p></div>
            </div>
            {error && <div className="error-banner"><span>⚠️</span><span className="error-banner__text">{error}</span></div>}
            {method === 'upi' && (
              <div className="form-group"><label className="form-group__label form-group__label--req">UPI ID</label>
              <input className="form-group__input" placeholder="yourname@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} /></div>
            )}
            {method === 'card' && (
              <><div className="form-group"><label className="form-group__label form-group__label--req">Card Number</label>
              <input className="form-group__input" placeholder="1234 5678 9012 3456" maxLength={19} value={cardNum} onChange={(e) => setCardNum(e.target.value)} /></div>
              <div className="form-row"><div className="form-group"><label className="form-group__label form-group__label--req">Expiry</label>
              <input className="form-group__input" placeholder="MM/YY" maxLength={5} value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} /></div>
              <div className="form-group"><label className="form-group__label form-group__label--req">CVV</label>
              <input className="form-group__input" type="password" placeholder="•••" maxLength={4} value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} /></div></div></>
            )}
            {(method === 'netbanking' || method === 'wallet') && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--surface-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>{method === 'netbanking' ? '🏦' : '👛'}</div>
                <p style={{ fontSize: '.9rem', color: 'var(--text-secondary)' }}>You will be redirected to complete payment</p>
                <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Amount: <strong style={{ color: 'var(--primary-300)' }}>₹{booking.totalAmount.toFixed(2)}</strong></p>
              </div>
            )}
            <div className="payment-summary"><div className="payment-summary__row payment-summary__row--total"><span>Pay</span><span>₹{booking.totalAmount.toFixed(2)}</span></div></div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn--success" style={{ flex: 1 }} onClick={handleProceed}>💳 Pay ₹{booking.totalAmount.toFixed(2)}</button>
              <button className="btn btn--ghost" onClick={() => { setStep('select'); setError(''); }}>← Back</button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="payment-processing">
            <div className="payment-spinner"></div>
            <p className="payment-processing__text">Processing Payment...</p>
            <p className="payment-processing__sub">Please do not close this window</p>
            <div className="payment-processing__steps">
              <div className="processing-step processing-step--done"><span className="processing-step__dot"></span><span>Verifying details</span></div>
              <div className="processing-step processing-step--active"><span className="processing-step__dot"></span><span>Processing payment</span></div>
              <div className="processing-step"><span className="processing-step__dot"></span><span>Confirming booking</span></div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="payment-success">
            <div className="payment-success__icon">✓</div>
            <h2 className="payment-success__title">Payment Successful!</h2>
            <p className="payment-success__sub">Your tickets have been booked</p>

            {/* QR Code */}
            <div className="qr-ticket-section">
              <QRCodeSVG value={qrData} size={150} bgColor="#ffffff" fgColor="#1e2036" level="H" style={{ borderRadius: '12px', padding: '12px', background: '#fff' }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>Scan this QR at the venue</p>
            </div>

            {/* Email Confirmation */}
            <div className="email-confirmation">
              <div className="email-confirmation__badge"><span>📧</span><span>Confirmation sent to {booking.userEmail}</span></div>
              <button className="email-confirmation__preview-btn" onClick={() => setShowEmailPreview(!showEmailPreview)}>
                {showEmailPreview ? '🔽 Hide Email' : '📨 View Email Preview'}
              </button>
            </div>

            {showEmailPreview && (
              <div className="email-preview">
                <div className="email-preview__header">
                  <div><strong>From:</strong> noreply@eventhub.com</div>
                  <div><strong>To:</strong> {booking.userEmail}</div>
                  <div><strong>Subject:</strong> 🎫 Booking Confirmed — {booking.eventName}</div>
                </div>
                <div className="email-preview__body">
                  <p>Hi <strong>{booking.userName}</strong>,</p>
                  <p>Your booking has been confirmed!</p>
                  <div className="email-preview__details">
                    <div><strong>Event:</strong> {booking.eventName}</div>
                    <div><strong>Tickets:</strong> {booking.ticketsBooked}</div>
                    {seats.length > 0 && <div><strong>Seats:</strong> {seats.join(', ')}</div>}
                    <div><strong>Amount:</strong> ₹{booking.totalAmount.toFixed(2)}</div>
                    <div><strong>Transaction:</strong> {transactionId}</div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '8px' }}>— Team EventHub</p>
                </div>
              </div>
            )}

            <div className="summary-rows">
              <div className="summary-row"><span className="summary-row__label">Event</span><span className="summary-row__value">{booking.eventName}</span></div>
              <div className="summary-row"><span className="summary-row__label">Attendee</span><span className="summary-row__value">{booking.userName}</span></div>
              <div className="summary-row"><span className="summary-row__label">Tickets</span><span className="summary-row__value">{booking.ticketsBooked}</span></div>
              {seats.length > 0 && <div className="summary-row"><span className="summary-row__label">Seats</span><span className="summary-row__value">{seats.join(', ')}</span></div>}
              <div className="summary-row"><span className="summary-row__label">Payment</span><span className="summary-row__value">{PAYMENT_METHODS.find(p => p.id === method)?.name}</span></div>
              <div className="summary-row"><span className="summary-row__label">Transaction</span><span className="summary-row__value" style={{ fontSize: '0.75rem' }}>{transactionId}</span></div>
              <div className="summary-divider"></div>
              <div className="summary-total"><span className="summary-total__label">Total Paid</span><span className="summary-total__value">₹{booking.totalAmount.toFixed(2)}</span></div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button className="btn btn--accent btn--full" onClick={downloadTicket}>📥 Download Ticket</button>
              <button className="btn btn--primary btn--full" onClick={handleDone}>✅ Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentModal;
