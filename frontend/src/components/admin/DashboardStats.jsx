import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { Users, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';

export default function DashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await adminService.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-400">Failed to load statistics</div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Key Metrics - Professional Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={stats.users.total}
          icon={Users}
          approved={stats.users.approved}
          pending={stats.users.pending}
        />

        <MetricCard
          title="Pending Approval"
          value={stats.users.pending}
          icon={AlertCircle}
          subtitle="Awaiting review"
          color="warning"
        />

        <MetricCard
          title="Active Subscriptions"
          value={stats.subscriptions.active}
          icon={CheckCircle}
          pending={stats.subscriptions.pending}
          color="success"
        />

        <MetricCard
          title="Total Revenue"
          value={`$${stats.revenue.total.toFixed(2)}`}
          icon={DollarSign}
          subtitle="USD"
        />
      </div>

      {/* Pending Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {stats.users.pending > 0 && (
          <div className="bg-black-light rounded-xl p-6 border border-yellow/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-yellow">Pending User Approvals</h3>
              <span className="bg-yellow text-black px-3 py-1 rounded-full font-bold">
                {stats.users.pending}
              </span>
            </div>
            <p className="text-gray-400 mb-4">
              You have {stats.users.pending} user(s) waiting for approval
            </p>
            <button
              onClick={() => (window.location.hash = '#users')}
              className="w-full py-3 bg-yellow text-black font-bold rounded-lg hover:bg-yellow-dark transition"
            >
              Review Users
            </button>
          </div>
        )}

        {stats.subscriptions.pending > 0 && (
          <div className="bg-black-light rounded-xl p-6 border border-yellow/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-yellow">Pending Payment Approvals</h3>
              <span className="bg-yellow text-black px-3 py-1 rounded-full font-bold">
                {stats.subscriptions.pending}
              </span>
            </div>
            <p className="text-gray-400 mb-4">
              You have {stats.subscriptions.pending} payment(s) waiting for review
            </p>
            <button
              onClick={() => (window.location.hash = '#subscriptions')}
              className="w-full py-3 bg-yellow text-black font-bold rounded-lg hover:bg-yellow-dark transition"
            >
              Review Payments
            </button>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-black-light rounded-xl p-6">
        <h3 className="text-xl font-bold text-yellow mb-4">Recent Subscription Requests</h3>

        {stats.recentActivity && stats.recentActivity.length > 0 ? (
          <div className="space-y-3">
            {stats.recentActivity.map((activity) => (
              <div
                key={activity._id}
                className="bg-black rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <p className="text-white font-semibold">
                    {activity.userId?.fullName || 'Unknown User'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {activity.planId?.tier || 'N/A'} Plan •
                    ${activity.amountUSD} ({activity.amountRWF.toLocaleString()} FRW)
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      activity.status === 'PENDING'
                        ? 'bg-yellow/20 text-yellow'
                        : activity.status === 'ACTIVE'
                        ? 'bg-green/20 text-green'
                        : activity.status === 'REJECTED'
                        ? 'bg-red/20 text-red'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {activity.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No recent activity</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, approved, pending, subtitle, color = 'default' }) {
  const colorClass = {
    default: 'border-gray-800',
    warning: 'border-yellow/30 bg-yellow/5',
    success: 'border-green/30 bg-green/5'
  }[color];

  return (
    <div className={`bg-black rounded-lg border ${colorClass} p-5`}>
      <div className="flex items-start justify-between mb-4">
        <Icon className="w-5 h-5 text-yellow" />
      </div>
      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">{title}</div>
      <div className="text-2xl font-bold text-white font-mono mb-2">{value}</div>
      {approved !== undefined && <div className="text-xs text-green">{approved} approved</div>}
      {pending !== undefined && <div className="text-xs text-yellow">{pending} pending</div>}
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}
