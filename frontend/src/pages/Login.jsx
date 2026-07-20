import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Auth = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  
  // State Machine: 'login' | 'signup' | 'otp'
  const [view, setView] = useState('login'); 
  
  // Form Data
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const handleLoginRequest = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(''); setMsg('');

    try {
      const response = await api.post('/auth/login-request', { email });
      setMsg(response.data.message);
      setView('otp'); // Move to verify phase
    } catch (err) {
      if (err.response?.data?.error === 'USER_NOT_FOUND') {
        // FLOWCHART LOGIC: Redirect to Sign Up if user does not exist
        setError('Account not found. Redirecting to Secure Sign Up...');
        setTimeout(() => {
          setError('');
          setView('signup');
        }, 2000);
      } else {
        setError(err.response?.data?.error || 'Connection failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupRequest = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(''); setMsg('');

    try {
      const response = await api.post('/auth/signup-request', { name, email, phone });
      setMsg(response.data.message);
      setView('otp'); // Move to verify phase
    } catch (err) {
      // FLOWCHART LOGIC: Catch Duplicate Email/Phone
      setError(err.response?.data?.message || 'Sign up failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(''); setMsg('');

    try {
      // FLOWCHART LOGIC: Verify OTP -> Create Account / Generate JWT -> Redirect
      const response = await api.post('/auth/verify-otp', { email, otp });
      setUser(response.data.user);
      navigate('/dashboard'); 
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid Identity Token.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1324] flex items-center justify-center p-4 circuit-pattern">
      <div className="bg-[#0f172a] border border-[#1e293b] p-8 rounded-2xl shadow-[0_0_50px_rgba(69,223,164,0.05)] w-full max-w-md relative overflow-hidden">
        
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#45dfa4] to-[#10b981]"></div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-[#141b2c] rounded-full border border-[#1e293b] flex items-center justify-center mb-4 shadow-lg">
            <img src="/fg-logo.png" alt="Logo" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FileGate Security</h1>
          <p className="text-xs text-[#94a3b8] uppercase tracking-widest mt-2">Zero-Trust Authentication</p>
        </div>

        {error && <div className="bg-[#93000a]/30 border border-[#ffb4ab]/30 text-[#ffb4ab] text-sm p-3 rounded-lg mb-4 text-center">{error}</div>}
        {msg && <div className="bg-[#00bd85]/20 border border-[#45dfa4]/30 text-[#45dfa4] text-sm p-3 rounded-lg mb-4 text-center">{msg}</div>}

        {/* STATE 1: LOGIN */}
        {view === 'login' && (
          <form onSubmit={handleLoginRequest} className="space-y-4">
            <div>
              <label className="block text-xs text-[#d3c5ac] uppercase tracking-wider font-semibold mb-2">Clearance Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#141b2c] border border-[#1e293b] rounded-lg px-4 py-3 text-sm text-white focus:border-[#45dfa4] focus:outline-none transition-colors" placeholder="agent@company.com" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-[#45dfa4]/10 hover:bg-[#45dfa4]/20 border border-[#45dfa4]/50 text-[#45dfa4] py-3 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(69,223,164,0.1)]">
              {isLoading ? 'Verifying Identity...' : 'Initiate Secure Login'}
            </button>
            <p className="text-center text-sm text-[#94a3b8] mt-4">
              Unrecognized identity? <button type="button" onClick={() => setView('signup')} className="text-[#fbbf24] hover:underline font-semibold">Request Clearance (Sign Up)</button>
            </p>
          </form>
        )}

        {/* STATE 2: SIGN UP */}
        {view === 'signup' && (
          <form onSubmit={handleSignupRequest} className="space-y-4">
            <div>
              <label className="block text-xs text-[#d3c5ac] uppercase tracking-wider font-semibold mb-2">Full Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#141b2c] border border-[#1e293b] rounded-lg px-4 py-3 text-sm text-white focus:border-[#fbbf24] focus:outline-none transition-colors" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-xs text-[#d3c5ac] uppercase tracking-wider font-semibold mb-2">Clearance Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#141b2c] border border-[#1e293b] rounded-lg px-4 py-3 text-sm text-white focus:border-[#fbbf24] focus:outline-none transition-colors" placeholder="agent@company.com" />
            </div>
            <div>
              <label className="block text-xs text-[#d3c5ac] uppercase tracking-wider font-semibold mb-2">Secure Phone</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-[#141b2c] border border-[#1e293b] rounded-lg px-4 py-3 text-sm text-white focus:border-[#fbbf24] focus:outline-none transition-colors" placeholder="+1 555-0123" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-[#fbbf24]/10 hover:bg-[#fbbf24]/20 border border-[#fbbf24]/50 text-[#fbbf24] py-3 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(251,191,36,0.1)]">
              {isLoading ? 'Processing...' : 'Register Cryptographic Identity'}
            </button>
            <p className="text-center text-sm text-[#94a3b8] mt-4">
              Already have clearance? <button type="button" onClick={() => setView('login')} className="text-[#45dfa4] hover:underline font-semibold">Login</button>
            </p>
          </form>
        )}

        {/* STATE 3: OTP VERIFICATION */}
        {view === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
             <div className="bg-[#141b2c] border border-[#1e293b] p-4 rounded-lg mb-6">
                <p className="text-sm text-[#d3c5ac] text-center mb-1">A 6-digit cryptographic token has been sent to</p>
                <p className="text-white text-center font-semibold">{email}</p>
             </div>
            <div>
              <label className="block text-xs text-[#d3c5ac] uppercase tracking-wider font-semibold mb-2">Enter Verification Token</label>
              <input type="text" required maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full bg-[#141b2c] border border-[#1e293b] rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] text-white focus:border-[#45dfa4] focus:outline-none transition-colors" placeholder="------" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-[#45dfa4] hover:bg-[#34d399] text-[#0c1324] py-3 rounded-lg font-bold transition-all shadow-[0_0_20px_rgba(69,223,164,0.3)]">
              {isLoading ? 'Authenticating...' : 'Establish Secure Connection'}
            </button>
            <button type="button" onClick={() => setView('login')} className="w-full text-center text-sm text-[#94a3b8] hover:text-white mt-4 font-semibold">
              Cancel Protocol
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Auth;