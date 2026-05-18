import React, { useState, useRef } from 'react';

function LoginPage({ onLogin, onClose }) {
  const [mode, setMode] = useState('signin');
  const [formData, setFormData] = useState({ name: '', username: '', password: '', email: '', phone: '', age: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [verifyCode, setVerifyCode] = useState(['', '', '', '', '', '']);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [verifyMethod, setVerifyMethod] = useState('');
  const [verifyDest, setVerifyDest] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verified, setVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [fallbackCode, setFallbackCode] = useState('');
  const [toastDest, setToastDest] = useState('');
  const [toastMethod, setToastMethod] = useState('');
  const inputRefs = useRef([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateSignupFields = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Name required';
    if (!formData.username.trim()) errs.username = 'Username required';
    if (!formData.password.trim() || formData.password.length < 6) errs.password = 'Min 6 characters';
    if (!formData.age || isNaN(formData.age) || Number(formData.age) <= 0) errs.age = 'Valid age required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ===== SIGN IN =====
  const handleSignIn = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!formData.username.trim()) errs.username = 'Username is required';
    if (!formData.password.trim()) errs.password = 'Password is required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username.trim(), password: formData.password.trim() }),
      });
      const data = await res.json();
      if (res.ok) onLogin(data);
      else setErrors({ general: data.error || 'Invalid credentials' });
    } catch { setErrors({ general: 'Server connection failed' }); }
    setIsLoading(false);
  };

  // ===== GOOGLE =====
  const handleGoogleClick = () => {
    if (!validateSignupFields()) return;
    setMode('google-select');
  };

  const selectGoogleAccount = (email) => {
    if (email === 'Use another account...') { setMode('enter-email'); setVerifyMethod('google'); return; }
    setFormData(prev => ({ ...prev, email }));
    setVerifyMethod('google');
    setVerifyDest(email);
    sendCodeToServer(email, 'email');
  };

  // ===== EMAIL =====
  const handleEmailClick = () => {
    if (!validateSignupFields()) return;
    setMode('enter-email'); setVerifyMethod('email');
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors({ email: 'Enter a valid email address' }); return;
    }
    setVerifyDest(formData.email);
    sendCodeToServer(formData.email, 'email');
  };

  // ===== PHONE =====
  const handlePhoneClick = () => {
    if (!validateSignupFields()) return;
    setMode('enter-phone'); setVerifyMethod('phone');
  };

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) {
      setErrors({ phone: 'Enter a valid 10-digit phone number' }); return;
    }
    setVerifyDest(formData.phone);
    sendCodeToServer(formData.phone, 'phone');
  };

  // ===== CALL SERVER TO SEND CODE =====
  const sendCodeToServer = async (destination, method) => {
    setSendingCode(true);
    setFallbackCode('');
    try {
      const res = await fetch('/api/send-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, method }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifyCode(['', '', '', '', '', '']);
        setVerifyError('');
        setVerified(false);
        setMode('verify');
        if (data.fallback && data.code) {
          // Real service failed — show code on screen
          setFallbackCode(data.code);
          setToastMsg(data.code);
        } else {
          // Real service worked — just show "sent" message
          setFallbackCode('');
          setToastMsg(data.message || `Code sent to ${destination}`);
        }
        setToastDest(destination);
        setToastMethod(method);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 12000);
      } else {
        setErrors({ general: data.error || 'Failed to send code' });
      }
    } catch {
      setErrors({ general: 'Server connection failed. Make sure backend is running.' });
    }
    setSendingCode(false);
  };

  // ===== VERIFY CODE VIA SERVER =====
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...verifyCode];
    newCode[index] = value.slice(-1);
    setVerifyCode(newCode);
    setVerifyError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verifyCode[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleVerify = async () => {
    const entered = verifyCode.join('');
    if (entered.length !== 6) { setVerifyError('Enter all 6 digits'); return; }

    setIsLoading(true);
    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: verifyDest, code: entered }),
      });
      const data = await res.json();
      if (data.verified) {
        setVerified(true);
        setMode('success');
        // Now create the account
        const emailVal = verifyMethod === 'phone' ? '' : (formData.email || verifyDest);
        const signupRes = await fetch('/api/signup', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(), username: formData.username.trim().toLowerCase(),
            password: formData.password.trim(), email: emailVal, age: formData.age
          }),
        });
        const signupData = await signupRes.json();
        if (signupRes.ok) setTimeout(() => onLogin(signupData), 1500);
        else { setErrors({ general: signupData.error || 'Signup failed' }); setMode('signup'); }
      } else {
        setVerifyError(data.error || 'Invalid code');
      }
    } catch {
      setVerifyError('Server connection failed');
    }
    setIsLoading(false);
  };

  const googleEmails = [
    formData.name ? formData.name.toLowerCase().replace(/\s/g, '.') + '@gmail.com' : 'user@gmail.com',
    'student.events@gmail.com',
    'Use another account...'
  ];

  return (
    <div className="login-page">
      <div className="login-page__bg">
        <div className="login-page__blob login-page__blob--1"></div>
        <div className="login-page__blob login-page__blob--2"></div>
        <div className="login-page__blob login-page__blob--3"></div>
      </div>

      {showToast && (
        <div className="otp-toast">
          <div className="otp-toast__icon">{toastMethod === 'phone' ? '📱' : '📧'}</div>
          <div style={{flex:1}}>
            {fallbackCode ? (<>
              <div className="otp-toast__title">{toastMethod === 'phone' ? 'SMS Message' : 'Email'} • {toastDest}</div>
              <div style={{fontSize:'.82rem',color:'var(--text-secondary)',margin:'4px 0'}}>Your EventHub verification code is:</div>
              <div className="otp-toast__code">{fallbackCode}</div>
              <div style={{fontSize:'.7rem',color:'var(--text-muted)',marginTop:'4px'}}>Via {toastMethod === 'phone' ? 'SMS Gateway' : 'Email Service'} • Expires in 5 min</div>
            </>) : (<>
              <div className="otp-toast__title" style={{color:'var(--success-400)',fontWeight:700}}>✅ {toastMethod === 'phone' ? 'SMS Sent!' : 'Email Sent!'}</div>
              <div style={{fontSize:'.82rem',color:'var(--text-secondary)',margin:'4px 0'}}>Code sent to <strong style={{color:'var(--primary-300)'}}>{toastDest}</strong></div>
              <div style={{fontSize:'.72rem',color:'var(--text-muted)'}}>Check your {toastMethod === 'phone' ? 'phone messages' : 'email inbox'}</div>
            </>)}
          </div>
          <button className="otp-toast__close" onClick={() => setShowToast(false)}>✕</button>
        </div>
      )}

      <div className="login-page__container">
        <div className="login-page__hero">
          <div className="login-page__hero-img"><img src="/images/event_tech_fest.png" alt="EventHub" /></div>
          <div className="login-page__hero-content">
            <span className="login-page__hero-badge">🎪 EventHub Platform</span>
            <h1 className="login-page__hero-title">Book Amazing<br/><span className="login-page__hero-gradient">Campus Events</span></h1>
            <p className="login-page__hero-desc">Discover, book, and manage department events. From tech fests to cultural nights.</p>
            <div className="login-page__hero-stats">
              <div><div className="login-page__stat-num">50+</div><div className="login-page__stat-label">Events</div></div>
              <div><div className="login-page__stat-num">5K+</div><div className="login-page__stat-label">Students</div></div>
              <div><div className="login-page__stat-num">100%</div><div className="login-page__stat-label">Secure</div></div>
            </div>
          </div>
        </div>

        <div className="login-page__form-section">
          <div className="login-card">
            <div className="login-card__logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M2 10h20"/><path d="M6 2v4"/><path d="M18 2v4"/><rect x="2" y="6" width="20" height="16" rx="2"/></svg>
            </div>

            {/* SIGN IN */}
            {mode === 'signin' && (<>
              <h2 className="login-card__title">Welcome Back</h2>
              <p className="login-card__subtitle">Sign in to your account</p>
              {errors.general && <div className="error-banner"><span>⚠️</span><span className="error-banner__text">{errors.general}</span></div>}
              <form onSubmit={handleSignIn}>
                <div className="form-group"><label className="form-group__label form-group__label--req">Username</label>
                <input name="username" className={`form-group__input ${errors.username?'form-group__input--error':''}`} placeholder="Enter username" value={formData.username} onChange={handleChange}/>{errors.username && <div className="form-group__error">⚠ {errors.username}</div>}</div>
                <div className="form-group"><label className="form-group__label form-group__label--req">Password</label>
                <input name="password" type="password" className={`form-group__input ${errors.password?'form-group__input--error':''}`} placeholder="Enter password" value={formData.password} onChange={handleChange}/>{errors.password && <div className="form-group__error">⚠ {errors.password}</div>}</div>
                <button type="submit" className="btn btn--primary btn--full" disabled={isLoading} style={{padding:'13px',fontSize:'.95rem',marginTop:'.5rem'}}>
                  {isLoading ? <span className="btn-spinner-wrap"><span className="btn-spinner"></span>Signing in...</span> : '🔐 Sign In'}
                </button>
              </form>
              <div className="login-divider"><span>or</span></div>
              <p style={{textAlign:'center',fontSize:'.88rem',color:'var(--text-secondary)'}}>Don't have an account? <button className="link-btn" onClick={()=>{setMode('signup');setErrors({})}}>Create Account</button></p>
            </>)}

            {/* SIGN UP with Google/Email/Phone buttons */}
            {mode === 'signup' && (<>
              <h2 className="login-card__title">Create Account</h2>
              <p className="login-card__subtitle">Join EventHub today</p>
              {errors.general && <div className="error-banner"><span>⚠️</span><span className="error-banner__text">{errors.general}</span></div>}
              <div className="form-group"><label className="form-group__label form-group__label--req">Full Name</label>
              <input name="name" className={`form-group__input ${errors.name?'form-group__input--error':''}`} placeholder="John Doe" value={formData.name} onChange={handleChange}/>{errors.name && <div className="form-group__error">⚠ {errors.name}</div>}</div>
              <div className="form-group"><label className="form-group__label form-group__label--req">Username</label>
              <input name="username" className={`form-group__input ${errors.username?'form-group__input--error':''}`} placeholder="Choose a username" value={formData.username} onChange={handleChange}/>{errors.username && <div className="form-group__error">⚠ {errors.username}</div>}</div>
              <div className="form-group"><label className="form-group__label form-group__label--req">Password</label>
              <input name="password" type="password" className={`form-group__input ${errors.password?'form-group__input--error':''}`} placeholder="Min 6 characters" value={formData.password} onChange={handleChange}/>{errors.password && <div className="form-group__error">⚠ {errors.password}</div>}</div>
              <div className="form-group"><label className="form-group__label form-group__label--req">Age</label>
              <input name="age" type="number" min="1" className={`form-group__input ${errors.age?'form-group__input--error':''}`} placeholder="Enter your age" value={formData.age} onChange={handleChange}/>{errors.age && <div className="form-group__error">⚠ {errors.age}</div>}</div>

              <div className="login-divider"><span>Continue with</span></div>

              <div className="signup-methods">
                <button type="button" className="signup-method-btn signup-method-btn--google" onClick={handleGoogleClick}>
                  <span className="signup-method-btn__icon"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg></span>
                  <span>Continue with Google</span>
                </button>
                <button type="button" className="signup-method-btn signup-method-btn--email" onClick={handleEmailClick}>
                  <span className="signup-method-btn__icon">📧</span>
                  <span>Continue with Email</span>
                </button>
                <button type="button" className="signup-method-btn signup-method-btn--phone" onClick={handlePhoneClick}>
                  <span className="signup-method-btn__icon">📱</span>
                  <span>Continue with Phone Number</span>
                </button>
              </div>
              <p style={{textAlign:'center',fontSize:'.88rem',color:'var(--text-secondary)',marginTop:'1rem'}}>Already have an account? <button className="link-btn" onClick={()=>{setMode('signin');setErrors({})}}>Sign In</button></p>
            </>)}

            {/* GOOGLE ACCOUNT PICKER */}
            {mode === 'google-select' && (<>
              <h2 className="login-card__title">Choose an account</h2>
              <p className="login-card__subtitle">to continue to EventHub</p>
              <div className="google-picker">
                <div className="google-picker__header">
                  <svg width="40" height="40" viewBox="0 0 24 24" style={{margin:'0 auto 12px',display:'block'}}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                {googleEmails.map((email, i) => (
                  <button key={i} className="google-account-btn" onClick={() => selectGoogleAccount(email)} disabled={sendingCode}>
                    <div className="google-account-btn__avatar">{email === 'Use another account...' ? '➕' : email.charAt(0).toUpperCase()}</div>
                    <div className="google-account-btn__info">
                      <span className="google-account-btn__email">{sendingCode ? 'Sending code...' : email}</span>
                      {email !== 'Use another account...' && <span className="google-account-btn__sub">Google Account</span>}
                    </div>
                  </button>
                ))}
              </div>
              <button className="link-btn" onClick={()=>setMode('signup')} style={{display:'block',margin:'1.5rem auto 0'}}>← Back</button>
            </>)}

            {/* ENTER EMAIL */}
            {mode === 'enter-email' && (<>
              <h2 className="login-card__title">📧 Email Verification</h2>
              <p className="login-card__subtitle">We'll send a verification code to your email</p>
              <form onSubmit={handleEmailSubmit}>
                <div className="form-group"><label className="form-group__label form-group__label--req">Email Address</label>
                <input name="email" type="email" className={`form-group__input ${errors.email?'form-group__input--error':''}`} placeholder="you@gmail.com" value={formData.email} onChange={handleChange} autoFocus/>{errors.email && <div className="form-group__error">⚠ {errors.email}</div>}</div>
                <button type="submit" className="btn btn--primary btn--full" disabled={sendingCode} style={{padding:'13px'}}>
                  {sendingCode ? <span className="btn-spinner-wrap"><span className="btn-spinner"></span>Sending...</span> : '📨 Send Verification Code'}
                </button>
              </form>
              <button className="link-btn" onClick={()=>setMode('signup')} style={{display:'block',margin:'1.5rem auto 0'}}>← Back</button>
            </>)}

            {/* ENTER PHONE */}
            {mode === 'enter-phone' && (<>
              <h2 className="login-card__title">📱 Phone Verification</h2>
              <p className="login-card__subtitle">We'll send an SMS code to your number</p>
              <form onSubmit={handlePhoneSubmit}>
                <div className="form-group"><label className="form-group__label form-group__label--req">Phone Number</label>
                <input name="phone" type="tel" className={`form-group__input ${errors.phone?'form-group__input--error':''}`} placeholder="+91 98765 43210" value={formData.phone} onChange={handleChange} autoFocus maxLength={15}/>{errors.phone && <div className="form-group__error">⚠ {errors.phone}</div>}</div>
                <button type="submit" className="btn btn--success btn--full" disabled={sendingCode} style={{padding:'13px'}}>
                  {sendingCode ? <span className="btn-spinner-wrap"><span className="btn-spinner"></span>Sending...</span> : '📲 Send SMS Code'}
                </button>
              </form>
              <button className="link-btn" onClick={()=>setMode('signup')} style={{display:'block',margin:'1.5rem auto 0'}}>← Back</button>
            </>)}

            {/* VERIFY CODE */}
            {mode === 'verify' && (<div style={{textAlign:'center'}}>
              <h2 className="login-card__title">Enter Verification Code</h2>
              <p className="login-card__subtitle">
                {verifyMethod === 'phone' ? '📲 SMS' : '📧 Email'} sent to <strong style={{color:'var(--primary-300)'}}>{verifyDest}</strong>
              </p>
              <div className="otp-inputs">
                {verifyCode.map((digit, i) => (
                  <input key={i} ref={el => inputRefs.current[i] = el} type="text" inputMode="numeric" maxLength={1}
                    className={`otp-input ${digit?'otp-input--filled':''}`} value={digit}
                    onChange={e => handleCodeChange(i, e.target.value)} onKeyDown={e => handleCodeKeyDown(i, e)} autoFocus={i===0}/>
                ))}
              </div>
              {verifyError && <div className="error-banner" style={{justifyContent:'center'}}><span className="error-banner__text">{verifyError}</span></div>}
              <button className="btn btn--success btn--full" onClick={handleVerify} disabled={isLoading} style={{padding:'13px'}}>
                {isLoading ? <span className="btn-spinner-wrap"><span className="btn-spinner"></span>Verifying...</span> : '✅ Verify & Create Account'}
              </button>
              <div style={{marginTop:'1rem',display:'flex',gap:'12px',justifyContent:'center'}}>
                <button className="link-btn" onClick={()=>sendCodeToServer(verifyDest, verifyMethod)}>Resend Code</button>
                <span style={{color:'var(--text-muted)'}}>•</span>
                <button className="link-btn" onClick={()=>setMode(verifyMethod==='phone'?'enter-phone':'enter-email')}>Change {verifyMethod==='phone'?'number':'email'}</button>
              </div>
            </div>)}

            {/* SUCCESS */}
            {mode === 'success' && (<div className="otp-success-state" style={{textAlign:'center'}}>
              <div className="otp-success-icon">✓</div>
              <h2 style={{fontSize:'1.4rem',fontWeight:700,color:'var(--success-400)',marginBottom:'8px'}}>Verified Successfully!</h2>
              <p style={{color:'var(--text-secondary)'}}>Creating your account...</p>
              <div className="btn-spinner" style={{margin:'1rem auto',width:'24px',height:'24px'}}></div>
            </div>)}

            <button onClick={onClose} style={{position:'absolute',top:'20px',right:'20px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'50%',width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',cursor:'pointer',fontSize:'1.1rem',zIndex:10}} title="Close">✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
