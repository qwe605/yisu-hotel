// 应用入口组件
// 作用：配置路由，拼装用户端页面
import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage';
import HotelListPage from './pages/HotelListPage/HotelListPage';
import HotelDetailPage from './pages/HotelDetailPage/HotelDetailPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import MapHotelsPage from './pages/MapPage/MapHotelsPage';

function App() {
  // 渲染基础路由结构
  return (
    <BrowserRouter>
      <Routes>
        {/* 默认页：登录 */}
        <Route path="/" element={<LoginPage />} />
        {/* 首页：酒店查询页 */}
        <Route path="/home" element={<HomePage />} />
        {/* 酒店列表页 */}
        <Route path="/hotels" element={<HotelListPage />} />
        {/* 地图页 */}
        <Route path="/map" element={<MapHotelsPage />} />
        {/* 酒店详情页 */}
        <Route path="/hotels/:id" element={<HotelDetailPage />} />
        {/* 登录/注册 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
