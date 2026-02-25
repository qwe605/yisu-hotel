import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage/LoginPage';
import RegisterPage from './pages/auth/RegisterPage/RegisterPage';
import HotelFormPage from './pages/merchant/HotelFormPage/HotelFormPage';
import AuditPage from './pages/admin/AuditPage/AuditPage';

function PrivateRoute({ roles, children }: { roles: string[]; children: React.ReactElement }) {
  const role = localStorage.getItem('role') || '';
  const token = localStorage.getItem('token') || '';
  if (!token) return <Navigate to="/login" replace />;
  if (roles.length && !roles.includes(role)) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const role = localStorage.getItem('role') || '';
  const token = localStorage.getItem('token') || '';
  const defaultPath = token ? (role === 'admin' ? '/admin/audit' : '/merchant/hotels/new') : '/login';
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/merchant/hotels/new"
          element={
            <PrivateRoute roles={['merchant']}>
              <HotelFormPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <PrivateRoute roles={['admin']}>
              <AuditPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
