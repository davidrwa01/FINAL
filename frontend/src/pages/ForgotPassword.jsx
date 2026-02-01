import React, { useState } from 'react';
import { Mail, CheckCircle, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [passwordErrors, setPasswordErrors] = useState({});

  // Step 1: Email Submission
  const handleEmailSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }

      setStep(2);
      setResendTimer(60);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: OTP Verification
  const handleOtpSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Invalid or expired code');
      }

      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: New Password
  const validatePassword = () => {
    const errors = {};

    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(newPassword)) {
      errors.newPassword = 'Password must contain at least one number';
    } else if (!/[!@#$%^&*]/.test(newPassword)) {
      errors.newPassword = 'Password must contain at least one special character';
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handlePasswordSubmit = async e => {
    e.preventDefault();
    setError('');

    const errors = validatePassword();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          otp, 
          newPassword,
          confirmPassword 
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setStep(4);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend code');
      }

      setResendTimer(60);
    } catch (err) {
      setError('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            Back to Login
          </button>

          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-gray-400">
            {step === 1 && 'Enter your email to receive a reset code'}
            {step === 2 && 'Enter the 6-digit code sent to your email'}
            {step === 3 && 'Create a new strong password'}
            {step === 4 && 'Your password has been reset'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:p-8">
          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-yellow-400 focus:outline-none placeholder-gray-500"
                  />
                </div>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-yellow-400 text-black hover:bg-yellow-500 transition-colors font-bold disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 flex items-start gap-2 mb-4">
                <AlertCircle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-blue-300 text-sm">
                  We sent a 6-digit code to <strong>{email}</strong>. Check your spam folder if you don't see it.
                </p>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setError('');
                  }}
                  placeholder="000000"
                  maxLength="6"
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white text-2xl text-center tracking-widest font-mono focus:border-yellow-400 focus:outline-none placeholder-gray-600"
                />
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 rounded-lg bg-yellow-400 text-black hover:bg-yellow-500 transition-colors font-bold disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2">Didn't receive the code?</p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || loading}
                  className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium disabled:text-gray-600 disabled:cursor-not-allowed"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => {
                      setNewPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Create a strong password"
                    className={`w-full px-4 py-3 rounded-lg bg-gray-800 border transition-colors font-mono text-sm focus:outline-none ${
                      passwordErrors.newPassword
                        ? 'border-red-700 focus:border-red-600'
                        : 'border-gray-700 focus:border-yellow-400'
                    } text-white placeholder-gray-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-red-400 text-sm mt-1">{passwordErrors.newPassword}</p>
                )}

                {/* Password Requirements */}
                <div className="mt-3 space-y-1 text-xs">
                  <p className="text-gray-400">Password requirements:</p>
                  <ul className="space-y-1 text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle
                        size={12}
                        className={
                          newPassword.length >= 8
                            ? 'text-green-400'
                            : 'text-gray-600'
                        }
                      />
                      8+ characters
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle
                        size={12}
                        className={
                          /[A-Z]/.test(newPassword)
                            ? 'text-green-400'
                            : 'text-gray-600'
                        }
                      />
                      One uppercase letter
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle
                        size={12}
                        className={
                          /[0-9]/.test(newPassword)
                            ? 'text-green-400'
                            : 'text-gray-600'
                        }
                      />
                      One number
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle
                        size={12}
                        className={
                          /[!@#$%^&*]/.test(newPassword)
                            ? 'text-green-400'
                            : 'text-gray-600'
                        }
                      />
                      One special character
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Re-enter your password"
                    className={`w-full px-4 py-3 rounded-lg bg-gray-800 border transition-colors font-mono text-sm focus:outline-none ${
                      passwordErrors.confirmPassword
                        ? 'border-red-700 focus:border-red-600'
                        : 'border-gray-700 focus:border-yellow-400'
                    } text-white placeholder-gray-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-red-400 text-sm mt-1">{passwordErrors.confirmPassword}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-yellow-400 text-black hover:bg-yellow-500 transition-colors font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Lock size={18} />
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-900/30 border border-green-800 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Password Reset Successful</h2>
                <p className="text-gray-400">
                  Your password has been updated. You can now login with your new password.
                </p>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-lg bg-yellow-400 text-black hover:bg-yellow-500 transition-colors font-bold"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
