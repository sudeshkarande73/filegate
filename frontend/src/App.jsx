import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const { user, loading } = useAuth();

  // Biometric loading guard while checking HTTP-only cookie
  if (loading) {
    return (
      <div className="bg-[#0c1324] min-h-screen flex flex-col items-center justify-center font-sans circuit-pattern">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[#1e293b] border-t-[#45dfa4] animate-spin"></div>
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#fbbf24] to-[#d97706] animate-pulse shadow-[0_0_15px_#fbbf24]"></div>
        </div>
        <p className="mt-4 text-xs font-mono text-[#d3c5ac] tracking-widest uppercase animate-pulse">
          Verifying Cryptographic Session...
        </p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;