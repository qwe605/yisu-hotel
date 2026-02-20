// 应用入口（Express）
// 作用：初始化中间件、注册路由并启动服务
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const hotelRoutes = require('./routes/hotelRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const authRoutes = require('./routes/authRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const userRoutes = require('./routes/userRoutes');
const { authOptional } = require('./middleware/authMiddleware');

// 加载环境变量
dotenv.config();

const app = express();

// 通用中间件
app.use(cors()); // 允许跨域请求（前端本地开发访问）
app.use(express.json()); // 解析 JSON 请求体
app.use(authOptional);

// 路由注册：酒店相关 API
app.use('/api/hotels', hotelRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

// 健康检查接口
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// 启动服务
const port = process.env.PORT || 3001; // 端口默认 3001
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
