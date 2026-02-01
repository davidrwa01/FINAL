import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { RefreshCw, Edit, Power, X, Check, AlertCircle, Package } from 'lucide-react';

export default function PlanManagement() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const response = await adminService.getPlans();
      if (response.success) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlan = async (planId) => {
    try {
      const response = await adminService.togglePlan(planId);
      if (response.success) {
        loadPlans();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to toggle plan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Plan Management</h2>
        <button
          onClick={loadPlans}
          className="flex items-center gap-2 px-4 py-2 bg-yellow/10 border border-yellow text-yellow rounded hover:bg-yellow/20 transition text-sm font-semibold"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-gray-400">Loading plans...</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`bg-black border rounded-lg p-6 transition ${
                plan.isActive ? 'border-green/50 hover:border-green' : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <Package size={20} className="text-yellow" />
                  <h3 className="text-lg font-bold text-white">{plan.tier}</h3>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${
                  plan.isActive ? 'bg-green/10 border-green/30 text-green' : 'bg-gray-800/50 border-gray-700 text-gray-400'
                }`}>
                  {plan.isActive ? (
                    <>
                      <Check size={12} /> Active
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} /> Inactive
                    </>
                  )}
                </span>
              </div>

              {/* Pricing */}
              <div className="mb-6">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Pricing</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-mono font-bold text-yellow">${plan.priceUSD}</span>
                  <span className="text-gray-500 text-sm">/ {plan.durationDays} days</span>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Features</p>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                      <Check size={14} className="text-green mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => setEditingPlan(plan)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-yellow/10 border border-yellow/30 text-yellow rounded hover:bg-yellow/20 transition font-semibold text-sm"
                >
                  <Edit size={16} /> Edit Plan
                </button>
                <button
                  onClick={() => handleTogglePlan(plan._id)}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded transition font-semibold text-sm border ${
                    plan.isActive
                      ? 'bg-red/10 border-red/30 text-red hover:bg-red/20'
                      : 'bg-green/10 border-green/30 text-green hover:bg-green/20'
                  }`}
                >
                  <Power size={16} />
                  {plan.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <PlanEditModal
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSave={() => {
            setEditingPlan(null);
            loadPlans();
          }}
        />
      )}
    </div>
  );
}

function PlanEditModal({ plan, onClose, onSave }) {
  const [formData, setFormData] = useState({
    tier: plan.tier,
    priceUSD: plan.priceUSD,
    durationDays: plan.durationDays,
    features: plan.features.join('\n'),
    isActive: plan.isActive,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const planData = {
        tier: formData.tier,
        priceUSD: parseFloat(formData.priceUSD),
        durationDays: parseInt(formData.durationDays),
        features: formData.features.split('\n').filter(f => f.trim()),
        isActive: formData.isActive,
      };

      const response = await adminService.savePlan(planData);
      
      if (response.success) {
        alert('Plan updated successfully!');
        onSave();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-black border border-gray-800 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Edit {plan.tier} Plan</h2>
            <p className="text-gray-500 text-sm">Update plan details and features</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red/10 border border-red/30 text-red px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Plan Tier */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Plan Tier</label>
            <select
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
              className="w-full px-4 py-2 bg-black-light border border-gray-800 text-white text-sm rounded focus:outline-none focus:border-yellow transition"
              required
            >
              <option value="Basic">Basic</option>
              <option value="Pro">Pro</option>
              <option value="VIP">VIP</option>
            </select>
          </div>

          {/* Price & Duration */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Price (USD)</label>
              <input
                type="number"
                step="0.01"
                value={formData.priceUSD}
                onChange={(e) => setFormData({ ...formData, priceUSD: e.target.value })}
                className="w-full px-4 py-2 bg-black-light border border-gray-800 text-white text-sm rounded focus:outline-none focus:border-yellow transition"
                required
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Duration (Days)</label>
              <input
                type="number"
                value={formData.durationDays}
                onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                className="w-full px-4 py-2 bg-black-light border border-gray-800 text-white text-sm rounded focus:outline-none focus:border-yellow transition"
                required
                min="1"
              />
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
              Features (one per line)
            </label>
            <textarea
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className="w-full px-4 py-2 bg-black-light border border-gray-800 text-white text-xs rounded focus:outline-none focus:border-yellow transition font-mono"
              rows="6"
              placeholder="Unlimited Signal Generation&#10;Advanced SMC Analysis&#10;Priority Support"
              required
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3 p-4 bg-black-light border border-gray-800 rounded">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5 rounded border-gray-700 bg-black text-yellow focus:ring-yellow cursor-pointer"
            />
            <label htmlFor="isActive" className="text-white text-sm cursor-pointer">
              Plan is active and visible to users
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-gray-800/50 border border-gray-700 text-white rounded hover:bg-gray-800 transition font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-yellow/10 border border-yellow text-yellow rounded hover:bg-yellow/20 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
