import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { RefreshCw, Clock, CheckCircle, XCircle, Eye, AlertCircle, DollarSign, CreditCard, Calendar, FileText, X } from 'lucide-react';

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [selectedSub, setSelectedSub] = useState(null);
  const [counts, setCounts] = useState({ pending: 0, active: 0, expired: 0, rejected: 0 });

  useEffect(() => {
    loadSubscriptions();
  }, [filter]);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'ALL') params.status = filter;

      const response = await adminService.getSubscriptions(params);
      if (response.success) {
        setSubscriptions(response.data.subscriptions);
        setCounts(response.data.counts);
      }
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (subscriptionId) => {
    if (!confirm('Are you sure you want to approve this subscription?')) return;

    try {
      const response = await adminService.approveSubscription(subscriptionId);
      if (response.success) {
        alert('Subscription approved successfully!');
        loadSubscriptions();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve subscription');
    }
  };

  const handleReject = async (subscriptionId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const response = await adminService.rejectSubscription(subscriptionId, reason);
      if (response.success) {
        alert('Subscription rejected');
        loadSubscriptions();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject subscription');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Subscription Management</h2>
        <button
          onClick={loadSubscriptions}
          className="flex items-center gap-2 px-4 py-2 bg-yellow/10 border border-yellow text-yellow rounded hover:bg-yellow/20 transition text-sm font-semibold"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Status Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard
          label="Pending"
          count={counts.pending}
          active={filter === 'PENDING'}
          onClick={() => setFilter('PENDING')}
          icon={Clock}
          color="yellow"
        />
        <StatusCard
          label="Active"
          count={counts.active}
          active={filter === 'ACTIVE'}
          onClick={() => setFilter('ACTIVE')}
          icon={CheckCircle}
          color="green"
        />
        <StatusCard
          label="Expired"
          count={counts.expired}
          active={filter === 'EXPIRED'}
          onClick={() => setFilter('EXPIRED')}
          icon={AlertCircle}
          color="gray"
        />
        <StatusCard
          label="Rejected"
          count={counts.rejected}
          active={filter === 'REJECTED'}
          onClick={() => setFilter('REJECTED')}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Subscriptions List */}
      {loading ? (
        <div className="flex justify-center py-12 text-gray-400">Loading subscriptions...</div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-black-light border border-gray-800 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-sm">No subscriptions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <div
              key={sub._id}
              className="bg-black-light border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* User & Plan Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-semibold text-sm">
                      {sub.userId?.fullName || 'Unknown User'}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                      sub.status === 'PENDING' ? 'bg-yellow/10 border border-yellow/30 text-yellow' :
                      sub.status === 'ACTIVE' ? 'bg-green/10 border border-green/30 text-green' :
                      sub.status === 'REJECTED' ? 'bg-red/10 border border-red/30 text-red' :
                      'bg-gray-800/50 border border-gray-700 text-gray-400'
                    }`}>
                      {sub.status === 'PENDING' && <Clock size={12} />}
                      {sub.status === 'ACTIVE' && <CheckCircle size={12} />}
                      {sub.status === 'REJECTED' && <XCircle size={12} />}
                      {sub.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="text-gray-400">
                      <span className="text-yellow font-semibold">
                        {sub.planId?.tier || 'N/A'}
                      </span> Plan · <span className="font-mono">${sub.amountUSD}</span> · <span className="font-mono">{sub.amountRWF.toLocaleString()} FRW</span>
                    </p>
                    <p className="text-gray-500">{sub.userId?.email || 'N/A'}</p>
                    <p className="text-gray-500 font-mono">ID: {sub.transactionId}</p>
                    <p className="text-gray-500">{new Date(sub.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 min-w-fit">
                  {sub.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleApprove(sub._id)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green/10 border border-green/30 text-green rounded hover:bg-green/20 transition text-sm font-semibold"
                      >
                        <CheckCircle size={16} /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(sub._id)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red/10 border border-red/30 text-red rounded hover:bg-red/20 transition text-sm font-semibold"
                      >
                        <XCircle size={16} /> Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedSub(sub)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow/10 border border-yellow/30 text-yellow rounded hover:bg-yellow/20 transition text-sm font-semibold"
                  >
                    <Eye size={16} /> View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedSub && (
        <SubscriptionDetailsModal
          subscription={selectedSub}
          onClose={() => setSelectedSub(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}

function StatusCard({ label, count, active, onClick, icon: Icon, color }) {
  const colors = {
    yellow: active ? 'bg-yellow/10 border-yellow text-yellow' : 'bg-black border-gray-800 text-gray-400',
    green: active ? 'bg-green/10 border-green text-green' : 'bg-black border-gray-800 text-gray-400',
    gray: active ? 'bg-gray-700 border-gray-500 text-white' : 'bg-black border-gray-800 text-gray-400',
    red: active ? 'bg-red/10 border-red text-red' : 'bg-black border-gray-800 text-gray-400',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 border rounded-lg transition flex flex-col items-center gap-2 ${colors[color]}`}
    >
      <Icon size={20} />
      <p className="text-xs font-semibold">{label}</p>
      <p className="text-2xl font-mono font-bold">{count}</p>
    </button>
  );
}

function SubscriptionDetailsModal({ subscription, onClose, onApprove, onReject }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-black border border-gray-800 rounded-lg p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Subscription Details</h2>
            <p className="text-gray-500 text-sm">Payment verification & subscription information</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* User Info */}
        <div className="bg-black-light border border-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">User Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <FileText size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Full Name</p>
                <p className="text-white text-sm font-semibold">{subscription.userId?.fullName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                <p className="text-white text-sm font-semibold">{subscription.userId?.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Username</p>
                <p className="text-white text-sm font-semibold">@{subscription.userId?.username}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-black-light border border-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Payment Information</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CreditCard size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Plan</p>
                <p className="text-white text-sm font-semibold">{subscription.planId?.tier}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <DollarSign size={16} className="text-gray-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Amount USD</p>
                  <p className="text-white text-sm font-mono font-bold">${subscription.amountUSD}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign size={16} className="text-gray-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Amount RWF</p>
                  <p className="text-white text-sm font-mono font-bold">{subscription.amountRWF.toLocaleString()} FRW</p>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Exchange Rate</p>
                <p className="text-white text-sm font-mono">1 USD = {subscription.exchangeRate} FRW</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Transaction ID</p>
                <p className="text-white text-sm font-mono">{subscription.transactionId}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Payment Method</p>
                <p className="text-white text-sm">{subscription.paymentMethod} ({subscription.ussdCode})</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Receiver</p>
                <p className="text-white text-sm">{subscription.paymentName}</p>
              </div>
            </div>
            {subscription.notes && (
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="text-gray-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Notes</p>
                  <p className="text-white text-sm">{subscription.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Screenshot */}
        {subscription.screenshotUrl && (
          <div className="bg-black-light border border-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Payment Screenshot</h3>
            <img
              src={subscription.screenshotUrl}
              alt="Payment screenshot"
              className="w-full rounded-lg border border-gray-800"
            />
          </div>
        )}

        {/* Status & Dates */}
        <div className="bg-black-light border border-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Status & Dates</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle size={16} className={`mt-1 flex-shrink-0 ${
                subscription.status === 'PENDING' ? 'text-yellow' :
                subscription.status === 'ACTIVE' ? 'text-green' :
                subscription.status === 'REJECTED' ? 'text-red' :
                'text-gray-600'
              }`} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                <span className={`inline-block px-3 py-1 rounded text-xs font-semibold border ${
                  subscription.status === 'PENDING' ? 'bg-yellow/10 border-yellow/30 text-yellow' :
                  subscription.status === 'ACTIVE' ? 'bg-green/10 border-green/30 text-green' :
                  subscription.status === 'REJECTED' ? 'bg-red/10 border-red/30 text-red' :
                  'bg-gray-800/50 border-gray-700 text-gray-400'
                }`}>
                  {subscription.status}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Submitted</p>
                <p className="text-white text-sm">{new Date(subscription.createdAt).toLocaleString()}</p>
              </div>
            </div>
            {subscription.startDate && (
              <>
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-gray-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Start Date</p>
                    <p className="text-white text-sm">{new Date(subscription.startDate).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-gray-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">End Date</p>
                    <p className="text-white text-sm">{new Date(subscription.endDate).toLocaleString()}</p>
                  </div>
                </div>
              </>
            )}
            {subscription.rejectionReason && (
              <div className="flex items-start gap-3">
                <XCircle size={16} className="text-red mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Rejection Reason</p>
                  <p className="text-red text-sm">{subscription.rejectionReason}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {subscription.status === 'PENDING' && (
            <>
              <button
                onClick={() => {
                  onApprove(subscription._id);
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-green/10 border border-green text-green rounded hover:bg-green/20 transition font-semibold text-sm"
              >
                <CheckCircle size={16} /> Approve Payment
              </button>
              <button
                onClick={() => {
                  onReject(subscription._id);
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-red/10 border border-red text-red rounded hover:bg-red/20 transition font-semibold text-sm"
              >
                <XCircle size={16} /> Reject Payment
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-800/50 border border-gray-700 text-white rounded hover:bg-gray-800 transition font-semibold text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
