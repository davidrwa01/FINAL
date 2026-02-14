import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Lock, BarChart3 } from 'lucide-react';
import ProfileHeader from '../components/profile/ProfileHeader';
import AccountInformation from '../components/profile/AccountInformation';
import SubscriptionCard from '../components/profile/SubscriptionCard';
import ScanHistory from '../components/profile/ScanHistory';
import SecuritySettings from '../components/profile/SecuritySettings';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch subscription data on component mount
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/subscription/status', {
          credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
          setSubscriptionData(data.data);
        } else {
          setError(data.message || 'Failed to load subscription data');
        }
      } catch (err) {
        console.error('Failed to fetch subscription data:', err);
        setError('Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSubscriptionData();
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'subscription', label: 'Subscription', icon: '💳' },
    { id: 'history', label: 'History', icon: '📊' },
    { id: 'security', label: 'Security', icon: '🔒' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <ProfileHeader user={user} subscriptionData={subscriptionData} />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Tab Navigation - Desktop */}
        <div className="hidden md:flex border-b border-gray-800 mb-8 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Navigation - Mobile */}
        <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-900 text-gray-400 border border-gray-800'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {activeTab === 'account' && (
            <>
              <AccountInformation user={user} subscriptionData={subscriptionData} />
            </>
          )}

          {activeTab === 'subscription' && (
            <>
              <SubscriptionCard user={user} subscriptionData={subscriptionData} loading={loading} />
            </>
          )}

          {activeTab === 'history' && (
            <>
              <ScanHistory user={user} subscriptionData={subscriptionData} />
            </>
          )}

          {activeTab === 'security' && (
            <>
              <SecuritySettings user={user} />
            </>
          )}
        </div>

        {/* Logout Button */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-red-900/20 border border-red-800 text-red-400 hover:bg-red-900/30 transition-colors font-medium"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
