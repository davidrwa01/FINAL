import React, { useState } from 'react';
import { Calendar, AlertCircle, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SubscriptionCard({ user, subscriptionData, loading }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('status');

  // Extract subscription status from subscriptionData
  const hasActiveSubscription = subscriptionData?.hasActiveSubscription || false;
  const activeSubscription = subscriptionData?.activeSubscription;
  const pendingSubscriptions = subscriptionData?.pendingSubscriptions || [];
  const trial = subscriptionData?.trial || { daily: 2, remaining: 2, used: 0 };

  const isPending = pendingSubscriptions.length > 0;
  const isExpired = false; // Check if any subscription is expired

  const daysRemaining = hasActiveSubscription && activeSubscription
    ? activeSubscription.daysRemaining || 0
    : 0;

  const trialSignalsRemaining = trial?.remaining || 2;

  // Plan details
  const planDetails = {
    Regular: { features: ['Unlimited signals', 'Basic analysis', 'Email support'] },
    Standard: {
      features: ['Unlimited signals', 'Advanced SMC analysis', 'Priority support'],
    },
    VIP: {
      features: ['Unlimited signals', 'Personal consultant', 'API access', 'Advanced analytics'],
    },
  };

  const currentPlan = activeSubscription?.plan || 'Trial';
  const features = planDetails[currentPlan] || planDetails.Regular;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 md:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-700 rounded w-1/3"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Subscription Status Card */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 md:p-8">
        <h2 className="text-xl font-bold text-white mb-6">Subscription & Trial</h2>

        {/* Status Alert */}
        {hasActiveSubscription && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 mb-6 flex items-start gap-3">
            <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-400">Active Subscription</p>
              <p className="text-green-300 text-sm">
                Your {activeSubscription?.plan || 'plan'} plan is active and valid.
              </p>
            </div>
          </div>
        )}

        {isPending && (
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-400">Payment Pending Approval</p>
              <p className="text-yellow-300 text-sm">
                You have {pendingSubscriptions.length} pending subscription{pendingSubscriptions.length !== 1 ? 's' : ''} awaiting admin verification.
              </p>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-400">Subscription Expired</p>
              <p className="text-red-300 text-sm">
                Your subscription has expired. Renew your plan to continue generating signals.
              </p>
            </div>
          </div>
        )}

        {!hasActiveSubscription && !isPending && !isExpired && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-400">Free Trial Active</p>
              <p className="text-blue-300 text-sm">
                You're on the free trial with {trial?.remaining || 2} signals remaining today. Upgrade to unlimited access.
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-gray-800">
          {['status', 'trial'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'status' ? 'Subscription' : 'Trial Usage'}
            </button>
          ))}
        </div>

        {/* Subscription Tab Content */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            {/* Plan Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Current Plan</p>
                <p className="text-white font-bold text-lg mt-1">
                  {activeSubscription?.plan || 'Trial'}
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {hasActiveSubscription && (
                    <>
                      <CheckCircle size={18} className="text-green-400" />
                      <p className="text-green-400 font-bold">Active</p>
                    </>
                  )}
                  {isPending && (
                    <>
                      <RefreshCw size={18} className="text-yellow-400 animate-spin" />
                      <p className="text-yellow-400 font-bold">Pending</p>
                    </>
                  )}
                  {isExpired && (
                    <>
                      <AlertCircle size={18} className="text-red-400" />
                      <p className="text-red-400 font-bold">Expired</p>
                    </>
                  )}
                  {!hasActiveSubscription && !isPending && !isExpired && (
                    <p className="text-blue-400 font-bold">Trial</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Start Date</p>
                <p className="text-white font-bold text-lg mt-1">
                  {activeSubscription?.startDate
                    ? new Date(activeSubscription.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Expires</p>
                <p className="text-white font-bold text-lg mt-1">
                  {hasActiveSubscription && activeSubscription
                    ? new Date(activeSubscription.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Remaining Days */}
            {hasActiveSubscription && activeSubscription && (
              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-400 font-semibold">{daysRemaining} days remaining</p>
                    <p className="text-yellow-300 text-sm">
                      Renewal on{' '}
                      {new Date(activeSubscription.endDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="w-20 h-20 rounded-full border-4 border-yellow-400 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400">{daysRemaining}</p>
                      <p className="text-xs text-yellow-300">days</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Plan Features */}
            <div>
              <p className="text-gray-400 text-sm mb-3">Plan Features</p>
              <ul className="space-y-2">
                {features.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-white">
                    <CheckCircle size={16} className="text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Trial Tab Content */}
        {activeTab === 'trial' && !hasActiveSubscription && (
          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
              <p className="text-blue-400 font-semibold mb-2">Trial Usage Today</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <p className="text-blue-300">Signals Generated</p>
                    <p className="text-blue-400 font-bold">{trial?.used || 0}/{trial?.dailyLimit || 2}</p>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 transition-all"
                      style={{
                        width: `${((trial?.used || 0) / (trial?.dailyLimit || 2)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-blue-300 text-sm">
                    {trialSignalsRemaining > 0
                      ? `${trialSignalsRemaining} signal${trialSignalsRemaining !== 1 ? 's' : ''} remaining today`
                      : 'Daily limit reached. Upgrade to continue.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
              <p className="text-gray-400 text-sm font-medium">Trial Limitations</p>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• {trial?.dailyLimit || 2} signals per day maximum</li>
                <li>• Basic analysis only</li>
                <li>• No API access</li>
                <li>• Email support only</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {!hasActiveSubscription && (
          <button
            onClick={() => navigate('/subscribe')}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-yellow-400 text-black hover:bg-yellow-500 transition-colors font-bold flex-1"
          >
            <ArrowRight size={18} />
            {isExpired ? 'Renew Subscription' : 'Upgrade Plan'}
          </button>
        )}

        {isPending && (
          <button
            onClick={() => navigate('/subscribe')}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-yellow-400 text-black hover:bg-yellow-500 transition-colors font-bold flex-1"
          >
            View Verification Status
          </button>
        )}

        {hasActiveSubscription && (
          <>
            <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-yellow-400 text-black hover:bg-yellow-500 transition-colors font-bold flex-1">
              Upgrade Plan
            </button>
            <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 transition-colors font-medium flex-1">
              Cancel Subscription
            </button>
          </>
        )}
      </div>
    </div>
  );
}
