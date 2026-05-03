import React, { useState, useEffect } from 'react';

function SeatSelection({ event, ticketCount, onConfirm, onCancel }) {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  const totalSeats = event.totalSeats || event.totalTickets || 60;
  const cols = 10;
  const rows = Math.ceil(totalSeats / cols);

  useEffect(() => {
    fetchBookedSeats();
  }, [event.id]);

  const fetchBookedSeats = async () => {
    try {
      const res = await fetch(`/api/events/${event.id}/seats`);
      if (res.ok) {
        const data = await res.json();
        setBookedSeats(data.bookedSeats || []);
      }
    } catch (err) {
      console.error('Failed to fetch seats', err);
    }
    setLoading(false);
  };

  const toggleSeat = (seatId) => {
    if (bookedSeats.includes(seatId)) return;
    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        return prev.filter((s) => s !== seatId);
      }
      if (prev.length >= ticketCount) {
        return [...prev.slice(1), seatId];
      }
      return [...prev, seatId];
    });
  };

  const getSeatStatus = (seatId) => {
    if (bookedSeats.includes(seatId)) return 'booked';
    if (selectedSeats.includes(seatId)) return 'selected';
    return 'available';
  };

  const getSeatLabel = (index) => {
    const row = String.fromCharCode(65 + Math.floor(index / cols));
    const col = (index % cols) + 1;
    return `${row}${col}`;
  };

  if (loading) {
    return (
      <div className="seat-loading">
        <div className="payment-spinner"></div>
        <p>Loading seat map...</p>
      </div>
    );
  }

  return (
    <div className="seat-selection" id="seat-selection">
      <div className="seat-selection__header">
        <h3>Select Your Seats</h3>
        <p className="seat-selection__subtitle">
          Pick {ticketCount} seat{ticketCount > 1 ? 's' : ''} — {selectedSeats.length}/{ticketCount} selected
        </p>
      </div>

      {/* Screen indicator */}
      <div className="seat-screen">
        <div className="seat-screen__bar"></div>
        <span className="seat-screen__label">STAGE / SCREEN</span>
      </div>

      {/* Seat Grid */}
      <div className="seat-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: rows * cols }, (_, i) => {
          if (i >= totalSeats) return <div key={i} className="seat-placeholder"></div>;
          const seatId = getSeatLabel(i);
          const status = getSeatStatus(seatId);
          return (
            <button
              key={i}
              className={`seat seat--${status}`}
              onClick={() => toggleSeat(seatId)}
              disabled={status === 'booked'}
              title={`Seat ${seatId}`}
            >
              <span className="seat__label">{seatId}</span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="seat-legend">
        <div className="seat-legend__item">
          <span className="seat-legend__dot seat-legend__dot--available"></span>
          <span>Available</span>
        </div>
        <div className="seat-legend__item">
          <span className="seat-legend__dot seat-legend__dot--selected"></span>
          <span>Selected</span>
        </div>
        <div className="seat-legend__item">
          <span className="seat-legend__dot seat-legend__dot--booked"></span>
          <span>Booked</span>
        </div>
      </div>

      {/* Selected seats display */}
      {selectedSeats.length > 0 && (
        <div className="seat-selected-info">
          <span className="seat-selected-info__label">Your seats:</span>
          <div className="seat-selected-info__tags">
            {selectedSeats.map((s) => (
              <span key={s} className="seat-tag">{s}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem' }}>
        <button
          className="btn btn--primary"
          style={{ flex: 1 }}
          onClick={() => onConfirm(selectedSeats)}
          disabled={selectedSeats.length !== ticketCount}
        >
          {selectedSeats.length === ticketCount
            ? `✅ Confirm ${ticketCount} Seat${ticketCount > 1 ? 's' : ''}`
            : `Select ${ticketCount - selectedSeats.length} more`}
        </button>
        <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default SeatSelection;
