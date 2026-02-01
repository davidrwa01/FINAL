import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardStats from '../../components/admin/DashboardStats';
import UserManagement from '../../components/admin/UserManagement';
import SubscriptionManagement from '../../components/admin/SubscriptionManagement';
import PlanManagement from '../../components/admin/PlanManagement';
import { BarChart3, Users, CreditCard, Package, LogOut, ArrowRight, AlertCircle, User } from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const tabs = [
    { id: 'dashboard', label: 'Operations', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'subscriptions', label: 'Payments', icon: CreditCard },
    { id: 'plans', label: 'Plans', icon: Package },
  ];

  const ActiveIcon = tabs.find(t => t.id === activeTab)?.icon || BarChart3;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* HEADER - Command Center */}
      <div className="fixed top-0 w-full bg-black-light border-b border-gray-800 z-40 px-6 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Left: Logo + Role */}
          <div className="flex items-center space-x-6">
            <div>
              <div className="text-sm font-bold tracking-wider text-white">
                SMART-KORAFX
              </div>
              <div className="text-xs text-yellow font-mono">ADMIN CONTROL</div>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-green rounded-full animate-pulse"></div>
              <span className="text-gray-400">LIVE</span>
            </div>
          </div>

          {/* Right: Admin Info + Actions */}
          <div className="flex items-center space-x-4">
            <div className="text-right text-xs">
              <div className="text-white font-mono">{user?.fullName || 'Administrator'}</div>
              <div className="text-gray-500">Super Admin</div>
            </div>
            <button
              onClick={() => navigate('/trading')}
              className="text-xs text-gray-400 hover:text-yellow transition flex items-center gap-1"
              title="Return to Trading"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="text-gray-400 hover:text-yellow transition p-1"
              title="Profile"
            >
              <User className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-yellow transition p-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SIDEBAR + CONTENT Layout */}
      <div className="flex flex-1 pt-16">
        {/* SIDEBAR - Navigation */}
        <div className="w-56 bg-black-light border-r border-gray-800 pt-6 fixed h-full left-0 top-16">
          <div className="space-y-2 px-4">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-yellow text-black'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 ml-56 px-6 py-8">
          <div className="max-w-6xl">
            {/* Page Header */}
            <div className="mb-8 flex items-center gap-3">
              <ActiveIcon className="w-6 h-6 text-yellow" />
              <h1 className="text-2xl font-bold tracking-wider text-white">
                {tabs.find(t => t.id === activeTab)?.label.toUpperCase()}
              </h1>
            </div>

            {/* Content Area */}
            <div className="bg-black-light rounded-lg border border-gray-800 p-6">
              {activeTab === 'dashboard' && <DashboardStats />}
              {activeTab === 'users' && <UserManagement />}
              {activeTab === 'subscriptions' && <SubscriptionManagement />}
              {activeTab === 'plans' && <PlanManagement />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
