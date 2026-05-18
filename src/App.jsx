import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import HomePage from './components/HomePage.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import MyBookingsPage from './components/MyBookingsPage.jsx';
import ChatBot from './components/ChatBot.jsx';
import ToastContainer, { showToast } from './components/ToastNotification.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [events, setEvents] = useState([]);
  const [view, setView] = useState('home');
  const [welcomeBanner, setWelcomeBanner] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('eventhub_darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Persistent login: restore session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('eventhub_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUser(u);
        // Show welcome back
        const lastUser = localStorage.getItem('eventhub_lastUser');
        if (lastUser) {
          const lu = JSON.parse(lastUser);
          setWelcomeBanner(`Welcome back, ${lu.name}! 👋`);
          setTimeout(() => setWelcomeBanner(''), 4000);
        }
      } catch(e) {}
    }
    fetchEvents();
  }, []);

  // Dark mode effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('eventhub_darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) setEvents(await res.json());
    } catch (err) { console.error('API Error:', err); }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setShowLogin(false);
    // Persist session
    localStorage.setItem('eventhub_user', JSON.stringify(userData));
    localStorage.setItem('eventhub_lastUser', JSON.stringify({ name: userData.profileName || userData.name, id: userData.id }));

    // Welcome banner
    const lastUserRaw = localStorage.getItem('eventhub_lastUser');
    if (lastUserRaw) {
      try {
        const lu = JSON.parse(lastUserRaw);
        setWelcomeBanner(`Welcome back, ${userData.profileName || userData.name}! 👋`);
      } catch(e) {}
    }
    setTimeout(() => setWelcomeBanner(''), 4000);

    if (userData.role === 'admin') setView('admin');
    else setView('home');
    showToast(`Logged in as ${userData.profileName || userData.name}`, 'success');
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('eventhub_user', JSON.stringify(updatedUser));
    localStorage.setItem('eventhub_lastUser', JSON.stringify({ name: updatedUser.profileName || updatedUser.name, id: updatedUser.id }));
  };

  const handleLogout = () => {
    setUser(null);
    setView('home');
    setWelcomeBanner('');
    localStorage.removeItem('eventhub_user');
    showToast('Logged out successfully', 'info');
  };

  const handleAddEvent = async (eventData) => {
    try {
      const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eventData) });
      if (res.ok) fetchEvents();
    } catch (err) { console.error(err); }
  };

  const handleEditEvent = async (id, eventData) => {
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eventData) });
      if (res.ok) fetchEvents();
    } catch (err) { console.error(err); }
  };

  const handleDeleteEvent = async (id) => {
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (res.ok) fetchEvents();
    } catch (err) { console.error(err); }
  };

  const handleBookTickets = () => { fetchEvents(); };

  if (showLogin) {
    return (
      <>
        <LoginPage onLogin={handleLogin} onClose={() => setShowLogin(false)} />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <div className="app-bg"></div>

      {welcomeBanner && <div className="welcome-banner">{welcomeBanner}</div>}

      <div className="app-wrap">
        {/* NAVBAR */}
        <nav className="navbar" id="main-navbar">
          <div className="navbar__brand" onClick={() => setView('home')} style={{ cursor: 'pointer' }}>
            <div className="navbar__logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10h20"/><path d="M6 2v4"/><path d="M18 2v4"/><rect x="2" y="6" width="20" height="16" rx="2"/></svg>
            </div>
            <span className="navbar__title">EventHub</span>
          </div>

          <div className="navbar__center">
            <button className={`navbar__nav-link ${view === 'home' ? 'navbar__nav-link--active' : ''}`} onClick={() => setView('home')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'6px'}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Events
            </button>
            {user && user.role !== 'admin' && (
              <button className={`navbar__nav-link ${view === 'mybookings' ? 'navbar__nav-link--active' : ''}`} onClick={() => setView('mybookings')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'6px'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                My Bookings
              </button>
            )}
            {user && (
              <button className={`navbar__nav-link ${view === 'profile' ? 'navbar__nav-link--active' : ''}`} onClick={() => setView('profile')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'6px'}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profile
              </button>
            )}
            {user && user.role === 'admin' && (
              <button className={`navbar__nav-link ${view === 'admin' ? 'navbar__nav-link--active' : ''}`} onClick={() => setView('admin')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'6px'}}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Dashboard
              </button>
            )}
          </div>

          <div className="navbar__right">
            {/* Dark mode toggle */}
            <button className="dark-mode-toggle" onClick={() => setDarkMode(!darkMode)} title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'} id="dark-mode-btn">
              {darkMode ? '☀️' : '🌙'}
            </button>

            {user ? (
              <>
                <div className="navbar__user" onClick={() => setView('profile')} style={{ cursor: 'pointer' }}>
                  <div className="navbar__user-icon">
                    {(() => { const photo = localStorage.getItem('eventhub_photo_' + user.id); return photo ? <img src={photo} alt="" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}}/> : (user.profileName || user.name).charAt(0).toUpperCase(); })()}
                  </div>
                  <span>{user.profileName || user.name}</span>
                  <span className={`navbar__role ${user.role === 'admin' ? 'navbar__role--admin' : ''}`}>{user.role}</span>
                </div>
                <button className="btn btn--logout" onClick={handleLogout} id="logout-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'4px'}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Logout
                </button>
              </>
            ) : (
              <button className="login-icon-btn" onClick={() => setShowLogin(true)} id="login-icon-btn" title="Login / Sign Up">
                <span className="login-icon-btn__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <span className="login-icon-btn__label">Sign In</span>
              </button>
            )}
          </div>
        </nav>

        {/* PAGE CONTENT */}
        {view === 'home' && <HomePage events={events} user={user} onLoginClick={() => setShowLogin(true)} onBookTickets={handleBookTickets} />}
        {view === 'mybookings' && user && <MyBookingsPage user={user} onRefreshEvents={fetchEvents} />}
        {view === 'profile' && user && <ProfilePage user={user} onUpdateUser={handleUpdateUser} />}
        {view === 'admin' && user && user.role === 'admin' && <AdminDashboard events={events} onAddEvent={handleAddEvent} onEditEvent={handleEditEvent} onDeleteEvent={handleDeleteEvent} />}

        <footer className="app-footer" id="app-footer">© 2026 EventHub — Department Event Ticket Booking System. All rights reserved.</footer>
      </div>

      <ChatBot events={events} />
      <ToastContainer />
    </>
  );
}

export default App;
