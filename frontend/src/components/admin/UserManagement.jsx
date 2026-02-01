import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { RefreshCw, Search, CheckCircle, Clock, Eye, Check, X, User, Mail, Calendar, LogOut } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [filter, search]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;

      const response = await adminService.getUsers(params);
      if (response.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    if (!confirm('Are you sure you want to approve this user?')) return;

    try {
      const response = await adminService.approveUser(userId);
      if (response.success) {
        alert('User approved successfully!');
        loadUsers();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve user');
    }
  };

  const handleReject = async (userId) => {
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return; // Cancelled

    try {
      const response = await adminService.rejectUser(userId, reason);
      if (response.success) {
        alert('User approval revoked');
        loadUsers();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-4 py-2 bg-yellow/10 border border-yellow text-yellow rounded hover:bg-yellow/20 transition text-sm font-semibold"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-black-light border border-gray-800 rounded-lg p-6">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Filter by Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 bg-black border border-gray-800 text-white text-sm rounded focus:outline-none focus:border-yellow transition"
            >
              <option value="all">All Users</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-600" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, username..."
                className="w-full pl-10 pr-4 py-2 bg-black border border-gray-800 text-white text-sm rounded focus:outline-none focus:border-yellow transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-gray-400">Loading users...</div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-black-light border border-gray-800 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-sm">No users found matching your criteria</p>
        </div>
      ) : (
        <div className="bg-black-light border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-gray-400">User</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-gray-400">Contact</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-gray-400">Status</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-gray-400">Registered</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-black/50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-semibold text-sm">{user.fullName}</p>
                        <p className="text-gray-500 text-xs">@{user.username}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-300 text-sm">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {user.isApproved ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green/10 border border-green/30 text-green rounded text-xs font-semibold">
                          <CheckCircle size={14} /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow/10 border border-yellow/30 text-yellow rounded text-xs font-semibold">
                          <Clock size={14} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {!user.isApproved ? (
                          <button
                            onClick={() => handleApprove(user._id)}
                            className="flex items-center gap-1 px-3 py-1 bg-green/10 border border-green/30 text-green rounded hover:bg-green/20 transition text-xs font-semibold"
                          >
                            <Check size={14} /> Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReject(user._id)}
                            className="flex items-center gap-1 px-3 py-1 bg-red/10 border border-red/30 text-red rounded hover:bg-red/20 transition text-xs font-semibold"
                          >
                            <X size={14} /> Revoke
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="flex items-center gap-1 px-3 py-1 bg-yellow/10 border border-yellow/30 text-yellow rounded hover:bg-yellow/20 transition text-xs font-semibold"
                        >
                          <Eye size={14} /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRefresh={loadUsers}
        />
      )}
    </div>
  );
}

function UserDetailsModal({ user, onClose, onRefresh }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserDetails();
  }, [user._id]);

  const loadUserDetails = async () => {
    try {
      const response = await adminService.getUserDetails(user._id);
      if (response.success) {
        setSubscriptions(response.data.subscriptions);
        setUsage(response.data.usage);
      }
    } catch (error) {
      console.error('Failed to load user details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-black border border-gray-800 rounded-lg p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">User Details</h2>
            <p className="text-gray-500 text-sm">Complete profile & subscription information</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* User Info Section */}
        <div className="bg-black-light border border-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Profile Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Full Name</p>
                <p className="text-white text-sm font-semibold">{user.fullName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                <p className="text-white text-sm font-semibold">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Username</p>
                <p className="text-white text-sm font-semibold">@{user.username}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle size={16} className={`mt-1 flex-shrink-0 ${user.isApproved ? 'text-green' : 'text-yellow'}`} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                <p className={`text-sm font-semibold ${user.isApproved ? 'text-green' : 'text-yellow'}`}>
                  {user.isApproved ? 'Approved' : 'Pending Approval'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <LogOut size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Role</p>
                <p className="text-white text-sm font-semibold">{user.role || 'User'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Registered</p>
                <p className="text-white text-sm font-semibold">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 text-gray-400">Loading details...</div>
        ) : (
          <>
            {/* Usage Stats */}
            {usage && (
              <div className="bg-black-light border border-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Today's Usage</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Signals Used</p>
                    <p className="text-white text-2xl font-mono font-bold">{usage.today}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Daily Limit</p>
                    <p className="text-white text-2xl font-mono font-bold">{usage.limit}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Remaining</p>
                    <p className="text-yellow text-2xl font-mono font-bold">{usage.remaining}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Subscriptions */}
            <div className="bg-black-light border border-gray-800 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Subscription History</h3>
              {subscriptions.length > 0 ? (
                <div className="space-y-3">
                  {subscriptions.map((sub) => (
                    <div key={sub._id} className="bg-black border border-gray-800 rounded p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-semibold text-sm">
                            {sub.planId?.tier || 'N/A'} Plan
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            ${sub.amountUSD} ({sub.amountRWF.toLocaleString()} FRW)
                          </p>
                          {sub.startDate && (
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(sub.startDate).toLocaleDateString()} - 
                              {new Date(sub.endDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${
                          sub.status === 'ACTIVE' ? 'bg-green/10 border border-green/30 text-green' :
                          sub.status === 'PENDING' ? 'bg-yellow/10 border border-yellow/30 text-yellow' :
                          sub.status === 'REJECTED' ? 'bg-red/10 border border-red/30 text-red' :
                          'bg-gray-800/50 border border-gray-700 text-gray-400'
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center text-sm py-4">
                  No subscription history
                </p>
              )}
            </div>
          </>
        )}

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-yellow/10 border border-yellow text-yellow rounded hover:bg-yellow/20 transition font-semibold text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
