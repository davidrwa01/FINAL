import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MarketProvider } from './contexts/MarketContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import PendingApproval from './pages/PendingApproval';
import Subscribe from './pages/Subscribe';
import TradingDashboard from './pages/TradingDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';

function App() {
  return (
    <AuthProvider>
      <MarketProvider>
        <BrowserRouter>
        <Routes>
          {/* Landing Page - Public */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Protected Routes - Require Authentication */}
          <Route 
            path="/pending-approval" 
            element={
              <ProtectedRoute>
                <PendingApproval />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected Routes - Require Authentication + Approval */}
          <Route 
            path="/subscribe" 
            element={
              <ProtectedRoute requireApproved>
                <Subscribe />
              </ProtectedRoute>
            } 
          />
          
          {/* Trading Dashboard - Require Authentication + Approval */}
          <Route 
            path="/trading" 
            element={
              <ProtectedRoute requireApproved>
                <TradingDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Routes - Require Admin Role */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireApproved requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Profile Route - Require Authentication */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </MarketProvider>
    </AuthProvider>
  );
}

export default App;
