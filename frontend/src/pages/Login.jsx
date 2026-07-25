import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import { auth } from '../config/firebase';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { setUser } = useAuth();
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsProcessing(true);

    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        await signOut(auth); // Immediately sign them out until they verify
        
        setMessage('Verification email sent. Please verify your email before logging in.');
        setMode('login');
      } 
      
      else if (mode === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        if (!userCredential.user.emailVerified) {
          await signOut(auth);
          throw new Error("Please verify your email before logging in.");
        }

        // Generate ID Token and pass to backend to set JWT cookie
        const idToken = await userCredential.user.getIdToken(true);
        const response = await api.post('/auth/firebase-login', { idToken, name });
        setUser(response.data.user);
      } 
      
      else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset email sent. Check your inbox.');
        setMode('login');
      }
    } catch (err) {
      console.error(err);
      // Clean up Firebase error messages for the user
      const errMsg = err.message.replace('Firebase:', '').trim();
      setError(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1324] flex items-center justify-center p-4 circuit-pattern text-[#dce2fa]">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#45dfa4]"></div>
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 mb-4 p-2 bg-[#141b2c] rounded-full border border-[#1e293b] flex items-center justify-center shadow-[0_0_15px_rgba(69,223,164,0.1)]">
            <img src="/fg-logo.png" alt="FileGate Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">FileGate Security</h2>
          <p className="text-[10px] font-mono text-[#45dfa4] tracking-widest uppercase mt-1">Zero-Trust Authentication</p>
        </div>

        {error && <div className="bg-[#93000a]/30 border border-[#ffb4ab]/30 p-3 rounded text-[#ffb4ab] text-sm mb-4 text-center">{error}</div>}
        {message && <div className="bg-[#00bd85]/20 border border-[#45dfa4]/30 p-3 rounded text-[#45dfa4] text-sm mb-4 text-center">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <input 
              type="text" placeholder="Full Name" required 
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#141b2c] border border-[#1e293b] rounded-lg px-4 py-3 text-sm text-white focus:border-[#45dfa4] focus:outline-none" 
            />
          )}
          
          <input 
            type="email" placeholder="Corporate Email Address" required 
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#141b2c] border border-[#1e293b] rounded-lg px-4 py-3 text-sm text-white focus:border-[#45dfa4] focus:outline-none" 
          />
          
          {mode !== 'forgot' && (
            <input 
              type="password" placeholder="Cryptographic Passphrase" required minLength="6"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#141b2c] border border-[#1e293b] rounded-lg px-4 py-3 text-sm text-white focus:border-[#45dfa4] focus:outline-none" 
            />
          )}

          <button 
            type="submit" disabled={isProcessing}
            className={`w-full bg-[#45dfa4] hover:bg-[#34c992] text-[#0f172a] font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isProcessing && <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>}
            {mode === 'login' ? 'Establish Secure Connection' : mode === 'signup' ? 'Request Clearance' : 'Reset Passphrase'}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-xs text-[#94a3b8]">
          {mode === 'login' ? (
            <>
              <button type="button" onClick={() => { setMode('forgot'); setError(''); setMessage(''); }} className="hover:text-white transition-colors">Forgot Passphrase?</button>
              <button type="button" onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className="hover:text-[#45dfa4] transition-colors">Request new cryptographic identity</button>
            </>
          ) : (
            <button type="button" onClick={() => { setMode('login'); setError(''); setMessage(''); }} className="hover:text-[#45dfa4] transition-colors">Return to active connection</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;