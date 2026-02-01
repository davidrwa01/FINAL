import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function PendingApproval() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="bg-black-light p-10 rounded-xl max-w-lg text-center">
        <div className="text-6xl mb-6">⏳</div>
        
        <h1 className="text-3xl font-bold text-yellow mb-4">
          Account Pending Approval
        </h1>
        
        <div className="text-gray-400 space-y-4 mb-8">
          <p>
            Thank you for registering! Your account is currently pending admin approval.
          </p>
          <p>
            You will receive access to the trading platform once an administrator 
            reviews and approves your account.
          </p>
          <p className="text-yellow">
            This usually takes 24-48 hours.
          </p>
        </div>

        <button
          onClick={logout}
          className="px-6 py-3 bg-red text-white font-semibold rounded-lg hover:bg-red/80 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
