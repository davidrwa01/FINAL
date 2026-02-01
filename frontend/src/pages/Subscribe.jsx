import React, { useState, useEffect } from 'react';
import { ChevronRight, Check, Zap, Lock, TrendingUp, AlertTriangle } from 'lucide-react';
import { subscriptionService } from '../services/api';

export default function Subscribe() {
  const [plans, setPlans] = useState([]);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  useEffect(() => {
    loadPlans();
    loadSubscriptionStatus();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await subscriptionService.getPlans();
      if (response.success) {
        setPlans(response.data.plans);
        setPaymentInfo(response.data.paymentInfo);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      const response = await subscriptionService.getStatus();
      if (response.success) {
        setSubscriptionStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 bg-gradient-to-b from-black via-black to-black-light">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
            Choose Your
            <span className="text-yellow block">Trading Plan</span>
          </h1>
          <p className="text-2xl text-gray-400 max-w-2xl mx-auto">
            Unlock unlimited signals and professional analysis tools. All plans include real-time market data and SMC analysis.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <div className="flex items-center gap-2 text-gray-300">
              <Check size={18} className="text-green flex-shrink-0" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Check size={18} className="text-green flex-shrink-0" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Check size={18} className="text-green flex-shrink-0" />
              <span>Instant activation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trial Info Banner */}
      {subscriptionStatus?.trial?.active && (
        <section className="px-6 -mt-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-yellow/10 to-transparent border border-yellow/30 rounded-xl p-6">
              <div className="flex gap-4 items-start">
                <AlertTriangle size={24} className="text-yellow flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-yellow font-bold text-lg mb-2">Free Trial Usage</h3>
                  <p className="text-gray-400 mb-3">
                    You've used <strong>{subscriptionStatus.trial.used}</strong> of <strong>{subscriptionStatus.trial.dailyLimit}</strong> free signals today.
                  </p>
                  <p className="text-sm text-gray-500">
                    Upgrade now to get unlimited signals and unlock all features!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Plans Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="group relative bg-black-light rounded-xl p-8 border border-gray-800 hover:border-yellow/50 transition duration-300 transform hover:-translate-y-2"
              >
                {/* Plan Header */}
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-yellow mb-2">{plan.tier}</h2>
                  <p className="text-gray-400 text-sm">Perfect for every trader</p>
                </div>

                {/* Pricing */}
                <div className="mb-6 pb-6 border-b border-gray-700">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-yellow">{plan.formattedUSD}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-2">≈ {plan.formattedRWF}</div>
                  <div className="text-xs text-gray-600 mt-1">Plan duration: {plan.durationDays} days</div>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-300">
                      <Check size={18} className="text-green flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className="w-full py-3 bg-yellow text-black font-bold rounded-lg hover:bg-yellow-600 transition duration-300 flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-yellow/30"
                >
                  Get Started <ChevronRight size={18} />
                </button>
              </div>
            ))}
          </div>

          {/* Why Upgrade Section */}
          <div className="mt-20 pt-20 border-t border-gray-800">
            <h3 className="text-3xl font-bold text-center mb-12">Why Upgrade?</h3>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: 'Unlimited Signals', desc: 'Generate as many signals as you need' },
                { icon: TrendingUp, title: 'Advanced Analytics', desc: 'Deeper market structure analysis' },
                { icon: Lock, title: 'Priority Support', desc: '24/7 dedicated support access' }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center p-6">
                  <div className="w-16 h-16 bg-yellow/20 rounded-full flex items-center justify-center mb-4">
                    <item.icon className="w-8 h-8 text-yellow" />
                  </div>
                  <h4 className="font-bold mb-2">{item.title}</h4>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Payment Modal */}
        {showPaymentModal && selectedPlan && (
          <PaymentModal
            plan={selectedPlan}
            paymentInfo={paymentInfo}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={() => {
              setShowPaymentModal(false);
              loadSubscriptionStatus();
            }}
          />
        )}
    </div>
  );
}

function PaymentModal({ plan, paymentInfo, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    transactionId: '',
    notes: '',
    screenshot: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    setFormData({ ...formData, screenshot: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('planId', plan.id);
      submitData.append('transactionId', formData.transactionId);
      if (formData.notes) submitData.append('notes', formData.notes);
      if (formData.screenshot) submitData.append('screenshot', formData.screenshot);

      const response = await subscriptionService.subscribe(submitData);
      
      if (response.success) {
        setSuccess('Payment submitted successfully! Pending admin approval.');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-black-light rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-b from-black-light to-transparent p-8 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-yellow mb-1">Complete Payment</h2>
            <p className="text-gray-400 text-sm">{plan.tier} Plan - {plan.durationDays} days</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-yellow text-3xl w-10 h-10 flex items-center justify-center rounded hover:bg-gray-800 transition"
          >
            ×
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Plan Summary */}
          <div className="grid grid-cols-2 gap-4 p-6 bg-black rounded-xl border border-gray-800">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Plan</p>
              <p className="text-xl font-bold">{plan.tier}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Duration</p>
              <p className="text-xl font-bold text-yellow">{plan.durationDays} days</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Price (USD)</p>
              <p className="text-xl font-bold text-yellow">{plan.formattedUSD}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Price (RWF)</p>
              <p className="text-xl font-bold">{plan.formattedRWF}</p>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-gradient-to-r from-yellow/10 to-transparent border border-yellow/30 rounded-xl p-6">
            <h3 className="text-yellow font-bold text-lg mb-4 flex items-center gap-2">
              <Zap size={20} />
              Payment Instructions
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-2 font-semibold">1. Dial USSD Code:</p>
                <div className="bg-black p-4 rounded-lg font-mono text-yellow text-lg font-bold border border-gray-700">
                  {paymentInfo?.ussdCode}
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-2 font-semibold">2. Send Payment To:</p>
                <div className="bg-black p-4 rounded-lg text-white font-semibold border border-gray-700">
                  {paymentInfo?.receiverName}
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-2 font-semibold">3. Keep Transaction Receipt:</p>
                <p className="text-gray-400 text-sm">You'll need your transaction ID to complete the submission.</p>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="bg-red/10 border border-red/50 text-red px-4 py-3 rounded-lg flex gap-2 items-start">
              <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Payment Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green/10 border border-green/50 text-green px-4 py-3 rounded-lg flex gap-2 items-start">
              <Check size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Payment Submitted</p>
                <p className="text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Transaction ID <span className="text-red">*</span>
              </label>
              <input
                type="text"
                value={formData.transactionId}
                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                className="w-full px-4 py-3 bg-black border border-gray-700 text-white rounded-lg focus:outline-none focus:border-yellow focus:ring-1 focus:ring-yellow/50 transition"
                placeholder="E.g., 12345678901"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter the transaction ID from your MTN payment confirmation</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Payment Screenshot <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-4 py-3 bg-black border border-gray-700 text-white rounded-lg focus:outline-none focus:border-yellow focus:ring-1 focus:ring-yellow/50 transition file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-yellow file:text-black hover:file:bg-yellow-600"
              />
              <p className="text-xs text-gray-500 mt-1">Upload a screenshot of your payment receipt for verification</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Notes <span className="text-gray-500">(Optional)</span></label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 bg-black border border-gray-700 text-white rounded-lg focus:outline-none focus:border-yellow focus:ring-1 focus:ring-yellow/50 transition"
                rows="3"
                placeholder="Any additional information for the admin review..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition duration-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-yellow text-black font-bold rounded-lg hover:bg-yellow-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    I've Paid - Submit
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
