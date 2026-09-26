import React, { useState, useEffect } from 'react';
import PhoneFrame from './components/PhoneFrame';
import AuthScreen from './components/AuthScreen';
import HomeScreen from './components/HomeScreen';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mausam_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isPhoneFrame, setIsPhoneFrame] = useState(true);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('mausam_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('mausam_user');
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 font-sans text-slate-900">
      {!user ? (
        <PhoneFrame
          isPhoneFrame={isPhoneFrame}
          onToggleFrame={() => setIsPhoneFrame((prev) => !prev)}
        >
          <AuthScreen onLoginSuccess={handleLoginSuccess} />
        </PhoneFrame>
      ) : (
        <PhoneFrame
          isPhoneFrame={isPhoneFrame}
          onToggleFrame={() => setIsPhoneFrame((prev) => !prev)}
        >
          <HomeScreen
            user={user}
            onLogout={handleLogout}
            isPhoneFrame={isPhoneFrame}
            onTogglePhoneFrame={() => setIsPhoneFrame((prev) => !prev)}
          />
        </PhoneFrame>
      )}
    </div>
  );
}
