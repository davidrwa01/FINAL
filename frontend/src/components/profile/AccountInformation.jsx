import React, { useState } from 'react';
import { Edit2, Save, X, Mail, Smartphone } from 'lucide-react';

export default function AccountInformation({ user }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
  });
  const [saveStatus, setSaveStatus] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Update failed');
      }

      setSaveStatus('success');
      setIsEditing(false);
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Profile update error:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: user?.fullName || '',
      phone: user?.phone || '',
    });
    setIsEditing(false);
  };

  const infoRows = [
    {
      label: 'Full Name',
      value: formData.fullName,
      name: 'fullName',
      editable: true,
      icon: null,
    },
    {
      label: 'Username',
      value: user?.username || 'N/A',
      editable: false,
      note: '(Admin approval required to change)',
    },
    {
      label: 'Email',
      value: user?.email || 'N/A',
      editable: false,
      icon: Mail,
      note: '(Cannot be changed)',
    },
    {
      label: 'Phone Number',
      value: formData.phone || 'Not provided',
      name: 'phone',
      editable: true,
      icon: Smartphone,
    },
    {
      label: 'Account Created',
      value: user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'N/A',
      editable: false,
    },
    {
      label: 'Account Status',
      value: user?.isApproved ? 'Approved' : 'Pending Approval',
      editable: false,
    },
  ];

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Account Information</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400/10 border border-yellow-800 text-yellow-400 hover:bg-yellow-400/20 transition-colors font-medium text-sm"
          >
            <Edit2 size={16} />
            Edit
          </button>
        )}
      </div>

      {/* Info Rows */}
      <div className="space-y-4">
        {infoRows.map((row, idx) => (
          <div key={idx} className="flex items-center justify-between py-4 border-b border-gray-800 last:border-0">
            <div className="flex items-center gap-3">
              {row.icon && <row.icon size={18} className="text-gray-500" />}
              <div>
                <p className="text-gray-400 text-sm">{row.label}</p>
                {row.note && <p className="text-gray-600 text-xs">{row.note}</p>}
              </div>
            </div>

            {isEditing && row.editable ? (
              <input
                type="text"
                name={row.name}
                value={row.value}
                onChange={handleChange}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white font-mono text-sm focus:border-yellow-400 focus:outline-none"
              />
            ) : (
              <p className="text-white font-medium">{row.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-800">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-yellow-400 text-black hover:bg-yellow-500 transition-colors font-bold disabled:opacity-50"
          >
            <Save size={18} />
            {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors font-medium"
          >
            <X size={18} />
            Cancel
          </button>
        </div>
      )}

      {saveStatus === 'success' && (
        <div className="mt-4 p-3 rounded-lg bg-green-900/30 border border-green-800 text-green-400 text-sm font-medium">
          ✓ Changes saved successfully
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm font-medium">
          ✗ Error saving changes. Please try again.
        </div>
      )}
    </div>
  );
}
