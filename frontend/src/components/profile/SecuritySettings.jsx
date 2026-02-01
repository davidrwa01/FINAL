import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SecuritySettings({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});

  const validatePassword = () => {
    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Password must contain at least one number';
    } else if (!/[!@#$%^&*]/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Password must contain at least one special character (!@#$%^&*)';
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handlePasswordChange = e => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordSubmit = async e => {
    e.preventDefault();

    const errors = validatePassword();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      setPasswordStatus('saving');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Password change failed');
      }

      setPasswordStatus('success');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setTimeout(() => setPasswordStatus(''), 3000);
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordStatus('error');
      setPasswordErrors({ general: error.message || 'Failed to change password' });
      setTimeout(() => setPasswordStatus(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-3 border-b border-gray-800 overflow-x-auto">
        {[
          { id: 'password', label: 'Change Password' },
          { id: 'forgot', label: 'Forgot Password' },
          { id: 'sessions', label: 'Active Sessions' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Change Password Tab */}
      {activeTab === 'password' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 md:p-8 max-w-2xl">
          <h2 className="text-xl font-bold text-white mb-2">Change Password</h2>
          <p className="text-gray-400 text-sm mb-6">Keep your account secure by using a strong password</p>

          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-white font-medium mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter your current password"
                  className={`w-full px-4 py-3 rounded-lg bg-gray-800 border transition-colors font-mono text-sm focus:outline-none ${
                    passwordErrors.currentPassword
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
              {passwordErrors.currentPassword && (
                <p className="text-red-400 text-sm mt-1">{passwordErrors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-white font-medium mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Create a strong password"
                  className={`w-full px-4 py-3 rounded-lg bg-gray-800 border transition-colors font-mono text-sm focus:outline-none ${
                    passwordErrors.newPassword
                      ? 'border-red-700 focus:border-red-600'
                      : 'border-gray-700 focus:border-yellow-400'
                  } text-white placeholder-gray-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="text-red-400 text-sm mt-1">{passwordErrors.newPassword}</p>
              )}

              {/* Password Requirements */}
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-gray-400">Password must contain:</p>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle
                      size={14}
                      className={
                        passwordForm.newPassword.length >= 8
                          ? 'text-green-400'
                          : 'text-gray-600'
                      }
                    />
                    Minimum 8 characters
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle
                      size={14}
                      className={
                        /[A-Z]/.test(passwordForm.newPassword)
                          ? 'text-green-400'
                          : 'text-gray-600'
                      }
                    />
                    At least one uppercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle
                      size={14}
                      className={
                        /[0-9]/.test(passwordForm.newPassword)
                          ? 'text-green-400'
                          : 'text-gray-600'
                      }
                    />
                    At least one number
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle
                      size={14}
                      className={
                        /[!@#$%^&*]/.test(passwordForm.newPassword)
                          ? 'text-green-400'
                          : 'text-gray-600'
                      }
                    />
                    At least one special character (!@#$%^&*)
                  </li>
                </ul>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-white font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Re-enter your new password"
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

            {/* Status Messages */}
            {passwordStatus === 'success' && (
              <div className="bg-green-900/30 border border-green-800 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-400">Password changed successfully</p>
                  <p className="text-green-300 text-sm">
                    Your password has been updated. Please log in again with your new password.
                  </p>
                </div>
              </div>
            )}

            {passwordStatus === 'error' && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-400">Failed to change password</p>
                  <p className="text-red-300 text-sm">
                    {passwordErrors.general || 'Please try again'}
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={passwordStatus === 'saving'}
              className="w-full py-3 rounded-lg bg-yellow-400 text-black hover:bg-yellow-500 transition-colors font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock size={18} />
              {passwordStatus === 'saving' ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* Forgot Password Tab */}
      {activeTab === 'forgot' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 md:p-8 max-w-2xl">
          <h2 className="text-xl font-bold text-white mb-2">Reset Your Password</h2>
          <p className="text-gray-400 text-sm mb-6">
            If you forgot your password, we can send you a reset link via email
          </p>

          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-400">Security Verification</p>
              <p className="text-blue-300 text-sm">
                We'll send a secure reset code to your registered email address. Never share this code with anyone.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full py-3 rounded-lg bg-yellow-400 text-black hover:bg-yellow-500 transition-colors font-bold flex items-center justify-center gap-2"
          >
            <ArrowRight size={18} />
            Send Password Reset Link
          </button>

          <p className="text-gray-400 text-sm text-center mt-4">
            You'll be sent to a secure verification page
          </p>
        </div>
      )}

      {/* Active Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 md:p-8 max-w-2xl">
          <h2 className="text-xl font-bold text-white mb-2">Active Sessions</h2>
          <p className="text-gray-400 text-sm mb-6">Manage devices where you're logged in</p>

          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-medium">This Device</p>
                  <p className="text-gray-400 text-sm">
                    Windows • Chrome • Last active: Just now
                  </p>
                </div>
                <span className="px-3 py-1 bg-green-900/30 text-green-400 text-xs font-bold rounded">
                  Current
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button className="w-full py-3 rounded-lg bg-gray-800 border border-gray-700 text-red-400 hover:bg-gray-700 transition-colors font-bold">
              Logout from All Devices
            </button>
          </div>

          <p className="text-gray-500 text-xs text-center mt-4">
            You will be immediately logged out from all other devices
          </p>
        </div>
      )}
    </div>
  );
}
