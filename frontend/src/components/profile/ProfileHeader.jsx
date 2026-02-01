import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function ProfileHeader({ user }) {
  const getStatusBadge = () => {
    if (!user) return null;

    if (user.subscription?.status === 'ACTIVE') {
      const endDate = new Date(user.subscription.endDate);
      return {
        text: `${user.subscription.plan || 'Active'} Active · Expires ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        color: 'bg-green-900/30 border-green-800 text-green-400',
        icon: CheckCircle,
      };
    } else if (user.subscription?.status === 'PENDING') {
      return {
        text: 'Pending Payment Approval',
        color: 'bg-yellow-900/30 border-yellow-800 text-yellow-400',
        icon: Clock,
      };
    } else if (user.subscription?.status === 'EXPIRED') {
      return {
        text: 'Subscription Expired',
        color: 'bg-red-900/30 border-red-800 text-red-400',
        icon: AlertCircle,
      };
    } else {
      return {
        text: 'Trial Active · 2 signals/day',
        color: 'bg-blue-900/30 border-blue-800 text-blue-400',
        icon: Clock,
      };
    }
  };

  const getApprovalBadge = () => {
    if (!user) return null;

    return {
      text: user.isApproved ? '✓ Account: Approved' : '⏳ Account: Pending Approval',
      color: user.isApproved
        ? 'bg-green-900/30 border-green-800 text-green-400'
        : 'bg-yellow-900/30 border-yellow-800 text-yellow-400',
    };
  };

  const statusBadge = getStatusBadge();
  const approvalBadge = getApprovalBadge();
  const StatusIcon = statusBadge?.icon || CheckCircle;
  const initials = user
    ? user.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="bg-gradient-to-b from-gray-900 to-black border-b border-gray-800 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Avatar & Name Section */}
        <div className="flex items-start gap-6 mb-6">
          {/* Avatar */}
          <div className="flex-shrink-0 w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-3xl font-bold text-black">
            {initials}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">{user?.fullName || 'User'}</h1>
            <p className="text-lg text-gray-400 mb-4">@{user?.username || 'username'}</p>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-3">
              {statusBadge && (
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${statusBadge.color} text-sm font-medium`}
                >
                  <StatusIcon size={16} />
                  {statusBadge.text}
                </div>
              )}

              {approvalBadge && (
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${approvalBadge.color} text-sm font-medium`}
                >
                  {approvalBadge.text}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Created Info */}
        <div className="flex gap-8 text-sm text-gray-400">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Member Since</p>
            <p className="text-white font-medium">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Last Login</p>
            <p className="text-white font-medium">Today</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Account Role</p>
            <p className="text-white font-medium capitalize">{user?.role || 'User'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
