import React, { useState, useEffect, useRef } from 'react';

function ProfilePage({ user, onUpdateUser }) {
  const [profileName, setProfileName] = useState(user?.profileName || user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [bookingStats, setBookingStats] = useState({ totalBookings: 0, totalSpent: 0, totalTickets: 0 });
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem('eventhub_photo_' + user?.id) || '');
  const fileInputRef = useRef(null);

  useEffect(() => { fetchBookingStats(); }, [user]);

  const fetchBookingStats = async () => {
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        const userBookings = data.filter(b => b.userName === (user.profileName || user.name) || b.userEmail === user.email);
        setBookingStats({
          totalBookings: userBookings.filter(b => b.status === 'confirmed').length,
          totalSpent: userBookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.totalAmount, 0),
          totalTickets: userBookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.ticketsBooked, 0),
        });
      }
    } catch (err) { console.error(err); }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Photo must be under 2MB'); return; }
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setProfilePhoto(base64);
      localStorage.setItem('eventhub_photo_' + user.id, base64);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setProfilePhoto('');
    localStorage.removeItem('eventhub_photo_' + user.id);
  };

  const handleSave = async () => {
    if (!profileName.trim()) { setError('Profile name cannot be empty'); return; }
    setError('');
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileName: profileName.trim(), email: email.trim() })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        localStorage.setItem('eventhub_lastUser', JSON.stringify({ name: updatedUser.profileName || updatedUser.name, id: updatedUser.id }));
        onUpdateUser(updatedUser);
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update profile');
      }
    } catch { setError('Failed to connect to server'); }
    setIsSaving(false);
  };

  const getInitials = (name) => name.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);

  return (
    <div className="profile-page" id="profile-page">
      {saveSuccess && (
        <div className="success-banner" style={{ marginBottom: '1.5rem' }}>
          <span>✅</span><span className="success-banner__text">Profile updated successfully!</span>
        </div>
      )}

      <div className="profile-header">
        {/* Profile Photo */}
        <div className="profile-avatar" style={{ cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()} title="Click to upload photo">
          {profilePhoto ? (
            <img src={profilePhoto} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span className="profile-avatar__initials">{getInitials(profileName || user.name)}</span>
          )}
          <div className="profile-avatar__badge" style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--accent-500))', border: 'none', color: '#fff', fontSize: '.8rem' }}>
            📷
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
        </div>

        <div className="profile-header__info">
          <h1 className="profile-header__name">{profileName || user.name}</h1>
          <span className={`profile-header__role ${user.role === 'admin' ? 'profile-header__role--admin' : ''}`}>
            {user.role === 'admin' ? '🛡️ Administrator' : '🎓 Student'}
          </span>
          <p className="profile-header__username">@{user.username}</p>

          {/* Photo actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => fileInputRef.current?.click()}>
              📷 {profilePhoto ? 'Change Photo' : 'Upload Photo'}
            </button>
            {profilePhoto && (
              <button className="btn btn--danger btn--sm" onClick={removePhoto}>🗑️ Remove</button>
            )}
          </div>
        </div>
      </div>

      <div className="profile-stats">
        <div className="profile-stat-card">
          <div className="profile-stat-card__icon">🎫</div>
          <div className="profile-stat-card__value">{bookingStats.totalBookings}</div>
          <div className="profile-stat-card__label">Total Bookings</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-card__icon">🎟️</div>
          <div className="profile-stat-card__value">{bookingStats.totalTickets}</div>
          <div className="profile-stat-card__label">Tickets Booked</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-card__icon">💰</div>
          <div className="profile-stat-card__value">₹{bookingStats.totalSpent.toFixed(0)}</div>
          <div className="profile-stat-card__label">Total Spent</div>
        </div>
      </div>

      <div className="profile-details-card">
        <div className="profile-details-card__header">
          <h2>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'8px',verticalAlign:'middle'}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profile Details
          </h2>
          {!isEditing && (
            <button className="btn btn--ghost btn--sm" onClick={() => setIsEditing(true)} id="edit-profile-btn">✏️ Edit Profile</button>
          )}
        </div>

        {error && <div className="error-banner"><span>⚠️</span><span className="error-banner__text">{error}</span></div>}

        <div className="profile-fields">
          <div className="profile-field">
            <label className="profile-field__label">Display Name</label>
            {isEditing ? (
              <input className="form-group__input" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Enter your display name" />
            ) : (
              <div className="profile-field__value">{profileName || user.name}</div>
            )}
          </div>
          <div className="profile-field">
            <label className="profile-field__label">Email Address</label>
            {isEditing ? (
              <input className="form-group__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
            ) : (
              <div className="profile-field__value">{email || 'Not set'}</div>
            )}
          </div>
          <div className="profile-field">
            <label className="profile-field__label">Username</label>
            <div className="profile-field__value profile-field__value--muted">@{user.username}</div>
          </div>
          <div className="profile-field">
            <label className="profile-field__label">Role</label>
            <div className="profile-field__value">
              <span className={`navbar__role ${user.role === 'admin' ? 'navbar__role--admin' : ''}`} style={{fontSize:'0.75rem'}}>{user.role}</span>
            </div>
          </div>
        </div>

        {isEditing && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem' }}>
            <button className="btn btn--primary" onClick={handleSave} disabled={isSaving} style={{ flex: 1 }}>
              {isSaving ? <span className="btn-spinner-wrap"><span className="btn-spinner"></span>Saving...</span> : '💾 Save Changes'}
            </button>
            <button className="btn btn--ghost" onClick={() => { setIsEditing(false); setError(''); setProfileName(user.profileName || user.name); setEmail(user.email || ''); }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
