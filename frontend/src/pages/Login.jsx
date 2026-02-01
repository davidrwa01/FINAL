import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(formData);
      if (response.success) {
        // Get user status from response
        const userData = response.data;
        const redirectPath = response.redirectTo || '/trading';
        
        // Show status message based on user type
        if (!userData.isApproved) {
          setSuccess('✓ Login successful! Your account is pending admin approval.');
        } else if (userData.role === 'admin') {
          setSuccess('✓ Welcome Admin! Redirecting to dashboard...');
        } else {
          setSuccess('✓ Login successful! Redirecting to trading dashboard...');
        }
        
        // Wait before redirect
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 1500);
      } else {
        setError(response.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="bg-black-light border border-gray-800 p-8 rounded-lg max-w-sm w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Smart-KORAFX" className="h-16 w-auto" />
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold text-center mb-2 text-white">
          Access Trading Dashboard
        </h1>
        <p className="text-xs text-gray-500 text-center mb-6 uppercase tracking-wider">
          Secure Login
        </p>

        {/* Messages */}
        {error && (
          <div className="bg-red/10 border border-red/30 text-red px-3 py-2 rounded text-xs mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green/10 border border-green/30 text-green px-3 py-2 rounded text-xs mb-4">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email/Username */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Email or Username</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-600" />
              <input
                type="text"
                placeholder="Enter credentials"
                value={formData.emailOrUsername}
                onChange={(e) => setFormData({ ...formData, emailOrUsername: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-black border border-gray-800 text-white text-sm rounded focus:outline-none focus:border-yellow transition"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-600" />
              <input
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-black border border-gray-800 text-white text-sm rounded focus:outline-none focus:border-yellow transition"
                required
              />
            </div>
            <div className="mt-2 text-right">
              <Link to="/forgot-password" className="text-xs text-gray-500 hover:text-yellow transition">
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-yellow text-black text-sm font-semibold rounded hover:bg-yellow/90 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        {/* Register Link */}
        <div className="mt-6 pt-6 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            New user?{' '}
            <Link to="/register" className="text-yellow hover:text-yellow/80 font-medium">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
