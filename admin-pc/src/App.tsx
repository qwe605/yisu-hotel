import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage/LoginPage';
import RegisterPage from './pages/auth/RegisterPage/RegisterPage';
import HotelFormPage from './pages/merchant/HotelFormPage/HotelFormPage';
import AuditPage from './pages/admin/AuditPage/AuditPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/merchant/hotels/new" element={<HotelFormPage />} />
        <Route path="/admin/audit" element={<AuditPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
