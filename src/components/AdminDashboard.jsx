import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { showToast } from './ToastNotification.jsx';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics',
  'Mechanical', 'Civil', 'Electrical', 'Chemical', 'Biotechnology',
];
const CATEGORIES = ['Technical', 'Cultural', 'Workshop', 'Seminar', 'Competition'];

const emptyForm = {
  name: '', department: '', date: '', time: '', venue: '', ticketPrice: '', totalTickets: '', description: '', category: 'Technical',
};

function AdminDashboard({ events, onAddEvent, onEditEvent, onDeleteEvent }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('events'); // events | analytics | bookings
  const [stats, setStats] = useState(null);
  const [allBookings, setAllBookings] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchAllBookings();
  }, [events]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) setStats(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchAllBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) setAllBookings(await res.json());
    } catch (err) { console.error(err); }
  };

  const openAddForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setErrors({});
    setShowForm(true);
  };

  const openEditForm = (event) => {
    setFormData({
      name: event.name, department: event.department, date: event.date, time: event.time,
      venue: event.venue, ticketPrice: String(event.ticketPrice), totalTickets: String(event.totalTickets),
      availableTickets: event.availableTickets, description: event.description || '', category: event.category || 'Technical',
    });
    setEditingId(event.id);
    setErrors({});
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Event name is required';
    if (!formData.department) errs.department = 'Department is required';
    if (!formData.date) errs.date = 'Date is required';
    if (!formData.time) errs.time = 'Time is required';
    if (!formData.venue.trim()) errs.venue = 'Venue is required';
    if (!formData.ticketPrice || Number(formData.ticketPrice) <= 0) errs.ticketPrice = 'Enter a valid price';
    if (!formData.totalTickets || Number(formData.totalTickets) <= 0) errs.totalTickets = 'Enter a valid number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const eventData = {
      name: formData.name.trim(), department: formData.department, date: formData.date, time: formData.time,
      venue: formData.venue.trim(), ticketPrice: Number(formData.ticketPrice), totalTickets: Number(formData.totalTickets),
      availableTickets: formData.availableTickets !== undefined ? formData.availableTickets : Number(formData.totalTickets),
      description: formData.description.trim(), category: formData.category,
    };
    if (editingId) {
      onEditEvent(editingId, eventData);
      showToast('Event updated successfully!', 'success');
    } else {
      onAddEvent(eventData);
      showToast('Event added successfully!', 'success');
    }
    setShowForm(false);
    setFormData(emptyForm);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      onDeleteEvent(id);
      showToast('Event deleted.', 'warning');
    }
  };

  const deleteBooking = async (id) => {
    if (!window.confirm('Cancel this booking and refund?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Booking cancelled & refunded', 'success');
        fetchAllBookings();
        fetchStats();
      }
    } catch(err) { showToast('Failed', 'error'); }
  };

  const exportCSV = () => {
    if (allBookings.length === 0) { showToast('No bookings to export', 'warning'); return; }
    const headers = ['ID','Event','Attendee','Email','Department','Tickets','Amount','Status','Transaction','Booked At'];
    const rows = allBookings.map(b => [b.id, b.eventName, b.userName, b.userEmail, b.userDepartment, b.ticketsBooked, b.totalAmount, b.status, b.transactionId, b.bookedAt]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'EventHub_Bookings.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast('CSV exported!', 'success');
  };

  // Chart Data
  const chartColors = ['#6366f1','#ec4899','#f59e0b','#10b981','#f87171','#8b5cf6','#06b6d4','#84cc16'];
  const pieData = stats?.eventStats ? {
    labels: stats.eventStats.map(e => e.eventName.substring(0, 20)),
    datasets: [{ data: stats.eventStats.map(e => e.tickets), backgroundColor: chartColors, borderColor: '#0c0e1a', borderWidth: 2 }]
  } : null;

  const barData = stats?.eventStats ? {
    labels: stats.eventStats.map(e => e.eventName.substring(0, 15)),
    datasets: [{ label: 'Revenue (₹)', data: stats.eventStats.map(e => e.revenue), backgroundColor: chartColors.map(c => c + '99'), borderColor: chartColors, borderWidth: 2, borderRadius: 8 }]
  } : null;

  const lineData = stats?.dailyBookings ? {
    labels: stats.dailyBookings.map(d => d.bookedAt?.substring(0, 10) || 'Unknown'),
    datasets: [{ label: 'Bookings', data: stats.dailyBookings.map(d => d.count), fill: true, backgroundColor: 'rgba(99,102,241,0.1)', borderColor: '#6366f1', tension: 0.4, pointBackgroundColor: '#6366f1' }]
  } : null;

  const chartOpts = { responsive: true, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } }, scales: { x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' } } } };
  const pieOpts = { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 16 } } } };

  return (
    <div>
      {/* Admin Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'events' ? 'admin-tab--active' : ''}`} onClick={() => setActiveTab('events')}>📋 Events</button>
        <button className={`admin-tab ${activeTab === 'analytics' ? 'admin-tab--active' : ''}`} onClick={() => setActiveTab('analytics')}>📊 Analytics</button>
        <button className={`admin-tab ${activeTab === 'bookings' ? 'admin-tab--active' : ''}`} onClick={() => setActiveTab('bookings')}>🎫 Bookings</button>
      </div>

      {/* ===== EVENTS TAB ===== */}
      {activeTab === 'events' && (
        <>
          <div className="section-header">
            <div>
              <h2 className="section-title">📋 Manage Events</h2>
              <p className="section-subtitle">{events.length} event(s) created</p>
            </div>
            <button className="btn btn--primary" onClick={openAddForm} id="add-event-btn">＋ Add New Event</button>
          </div>

          {showForm && (
            <div className="modal-overlay" onClick={() => setShowForm(false)}>
              <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
                <div className="card__header">
                  <div className={`card__icon ${editingId ? 'card__icon--accent' : 'card__icon--primary'}`}>{editingId ? '✏️' : '🆕'}</div>
                  <div><h2 className="card__title">{editingId ? 'Edit Event' : 'Add New Event'}</h2><p className="card__desc">Fill in all the event details</p></div>
                </div>
                <form onSubmit={handleSubmit} id="event-form">
                  <div className="form-group">
                    <label className="form-group__label form-group__label--req">Event Name</label>
                    <input name="name" className={`form-group__input ${errors.name ? 'form-group__input--error' : ''}`} placeholder="e.g. TechVista 2026" value={formData.name} onChange={handleChange} />
                    {errors.name && <div className="form-group__error">⚠ {errors.name}</div>}
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
                      <label className="form-group__label form-group__label--req">Category</label>
                      <select name="category" className="form-group__select" value={formData.category} onChange={handleChange}>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-group__label form-group__label--req">Venue</label>
                    <input name="venue" className={`form-group__input ${errors.venue ? 'form-group__input--error' : ''}`} placeholder="e.g. Main Auditorium" value={formData.venue} onChange={handleChange} />
                    {errors.venue && <div className="form-group__error">⚠ {errors.venue}</div>}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-group__label form-group__label--req">Event Date</label>
                      <input name="date" type="date" className={`form-group__input ${errors.date ? 'form-group__input--error' : ''}`} value={formData.date} onChange={handleChange} />
                      {errors.date && <div className="form-group__error">⚠ {errors.date}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-group__label form-group__label--req">Event Time</label>
                      <input name="time" type="time" className={`form-group__input ${errors.time ? 'form-group__input--error' : ''}`} value={formData.time} onChange={handleChange} />
                      {errors.time && <div className="form-group__error">⚠ {errors.time}</div>}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-group__label form-group__label--req">Ticket Price (₹)</label>
                      <input name="ticketPrice" type="number" min="1" className={`form-group__input ${errors.ticketPrice ? 'form-group__input--error' : ''}`} placeholder="e.g. 150" value={formData.ticketPrice} onChange={handleChange} />
                      {errors.ticketPrice && <div className="form-group__error">⚠ {errors.ticketPrice}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-group__label form-group__label--req">Total Tickets</label>
                      <input name="totalTickets" type="number" min="1" className={`form-group__input ${errors.totalTickets ? 'form-group__input--error' : ''}`} placeholder="e.g. 100" value={formData.totalTickets} onChange={handleChange} />
                      {errors.totalTickets && <div className="form-group__error">⚠ {errors.totalTickets}</div>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-group__label">Description (Optional)</label>
                    <textarea name="description" className="form-group__textarea" placeholder="Brief description..." value={formData.description} onChange={handleChange} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '1.25rem' }}>
                    <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>{editingId ? '💾 Update Event' : '✅ Create Event'}</button>
                    <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {events.length === 0 ? (
            <div className="empty-state"><div className="empty-state__icon">📭</div><h3 className="empty-state__title">No events yet</h3><p className="empty-state__desc">Click "Add New Event" to create your first event</p></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table" id="events-table">
                <thead><tr><th>Event Name</th><th>Category</th><th>Department</th><th>Date</th><th>Venue</th><th>Price</th><th>Tickets</th><th>Actions</th></tr></thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ev.name}</td>
                      <td><span className="category-badge">{ev.category || 'Technical'}</span></td>
                      <td>{ev.department}</td>
                      <td>{ev.date}</td>
                      <td>{ev.venue}</td>
                      <td style={{ color: 'var(--warning-400)', fontWeight: 600 }}>₹{ev.ticketPrice}</td>
                      <td>
                        <span style={{ color: ev.availableTickets === 0 ? 'var(--error-400)' : 'var(--success-400)', fontWeight: 600 }}>{ev.availableTickets}</span>
                        <span style={{ color: 'var(--text-muted)' }}> / {ev.totalTickets}</span>
                      </td>
                      <td>
                        <div className="admin-table__actions">
                          <button className="btn btn--ghost btn--sm" onClick={() => openEditForm(ev)}>✏️ Edit</button>
                          <button className="btn btn--danger btn--sm" onClick={() => handleDelete(ev.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ===== ANALYTICS TAB ===== */}
      {activeTab === 'analytics' && (
        <div className="analytics-page">
          <div className="section-header">
            <div><h2 className="section-title">📊 Dashboard Analytics</h2><p className="section-subtitle">Overview of all event activities</p></div>
          </div>

          {/* Stat Cards */}
          <div className="stats-grid">
            <div className="stat-card stat-card--primary">
              <div className="stat-card__icon">🎪</div>
              <div className="stat-card__value">{stats?.totalEvents || 0}</div>
              <div className="stat-card__label">Total Events</div>
            </div>
            <div className="stat-card stat-card--accent">
              <div className="stat-card__icon">🎫</div>
              <div className="stat-card__value">{stats?.totalBookings || 0}</div>
              <div className="stat-card__label">Total Bookings</div>
            </div>
            <div className="stat-card stat-card--success">
              <div className="stat-card__icon">🎟️</div>
              <div className="stat-card__value">{stats?.totalTicketsSold || 0}</div>
              <div className="stat-card__label">Tickets Sold</div>
            </div>
            <div className="stat-card stat-card--warning">
              <div className="stat-card__icon">💰</div>
              <div className="stat-card__value">₹{(stats?.totalRevenue || 0).toFixed(0)}</div>
              <div className="stat-card__label">Total Revenue</div>
            </div>
          </div>

          {/* Charts */}
          <div className="charts-grid">
            {pieData && pieData.labels.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-card__title">🎯 Ticket Distribution by Event</h3>
                <div className="chart-card__body"><Pie data={pieData} options={pieOpts} /></div>
              </div>
            )}
            {barData && barData.labels.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-card__title">💹 Revenue per Event</h3>
                <div className="chart-card__body"><Bar data={barData} options={chartOpts} /></div>
              </div>
            )}
            {lineData && lineData.labels.length > 0 && (
              <div className="chart-card chart-card--full">
                <h3 className="chart-card__title">📈 Daily Bookings Trend</h3>
                <div className="chart-card__body"><Line data={lineData} options={chartOpts} /></div>
              </div>
            )}
          </div>

          {(!stats?.eventStats || stats.eventStats.length === 0) && (
            <div className="empty-state"><div className="empty-state__icon">📊</div><h3 className="empty-state__title">No data yet</h3><p className="empty-state__desc">Analytics will appear once bookings are made</p></div>
          )}
        </div>
      )}

      {/* ===== BOOKINGS TAB ===== */}
      {activeTab === 'bookings' && (
        <>
          <div className="section-header">
            <div><h2 className="section-title">🎫 All Bookings</h2><p className="section-subtitle">{allBookings.length} total booking(s)</p></div>
            <button className="btn btn--ghost" onClick={exportCSV}>📤 Export CSV</button>
          </div>

          {allBookings.length === 0 ? (
            <div className="empty-state"><div className="empty-state__icon">📭</div><h3 className="empty-state__title">No bookings</h3></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Event</th><th>Attendee</th><th>Email</th><th>Tickets</th><th>Amount</th><th>Status</th><th>Booked At</th><th>Actions</th></tr></thead>
                <tbody>
                  {allBookings.map((b) => (
                    <tr key={b.id} style={{ opacity: b.status === 'cancelled' ? 0.5 : 1 }}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.eventName}</td>
                      <td>{b.userName}</td>
                      <td style={{ fontSize: '0.8rem' }}>{b.userEmail}</td>
                      <td>{b.ticketsBooked}</td>
                      <td style={{ color: 'var(--warning-400)', fontWeight: 600 }}>₹{b.totalAmount.toFixed(2)}</td>
                      <td>
                        <span className={`booking-status ${b.status === 'confirmed' ? 'booking-status--confirmed' : 'booking-status--cancelled'}`}>
                          {b.status === 'confirmed' ? '✅' : '❌'} {b.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{b.bookedAt}</td>
                      <td>
                        {b.status === 'confirmed' && (
                          <button className="btn btn--danger btn--sm" onClick={() => deleteBooking(b.id)}>🚫 Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
