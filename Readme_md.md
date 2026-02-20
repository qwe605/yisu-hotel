易宿酒店预订平台 项目文档 (VSCode + Windows 环境)

1. 开发前准备

1.1 环境要求

• Node.js (v18.0.0+)

• MySQL (v8.0+)

• Git

• VSCode

1.2 项目架构生成命令

在终端依次执行以下命令：
# 创建项目根目录
mkdir yisu-hotel-platform
cd yisu-hotel-platform

# 初始化项目
npm init -y

# 安装共享依赖
npm install react react-dom react-router-dom axios

# 创建用户端(移动端)项目
npx create-react-app client-user --template cra-template-typescript
cd client-user
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material date-fns react-datepicker
cd ..

# 创建管理端(PC端)项目
npx create-react-app admin-pc --template cra-template-typescript
cd admin-pc
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material react-hook-form
cd ..

# 创建后端服务
mkdir server
cd server
npm init -y
npm install express mysql2 cors dotenv bcryptjs jsonwebtoken express-validator
npm install -D nodemon
cd ..

# 创建共享类型定义
mkdir shared-types
cd shared-types
npm init -y
cd ..


2. 数据库设计

2.1 数据库创建

在MySQL中执行：
-- 创建数据库
CREATE DATABASE IF NOT EXISTS yisu_hotel DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yisu_hotel;

-- 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'merchant', 'user') DEFAULT 'user',
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 酒店表
CREATE TABLE hotels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name_zh VARCHAR(200) NOT NULL,
    name_en VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    star_rating DECIMAL(2,1) CHECK (star_rating BETWEEN 1 AND 5),
    opening_date DATE,
    description TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    merchant_id INT,
    status ENUM('draft', 'pending', 'approved', 'rejected', 'offline') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES users(id)
);

-- 房型表
CREATE TABLE room_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    capacity INT NOT NULL,
    amenities TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- 酒店特色表
CREATE TABLE hotel_features (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    feature_type ENUM('attraction', 'transport', 'mall') NOT NULL,
    name VARCHAR(100) NOT NULL,
    distance VARCHAR(50),
    description TEXT,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- 促销活动表
CREATE TABLE promotions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    discount_type ENUM('percentage', 'fixed', 'package') NOT NULL,
    discount_value DECIMAL(10,2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- 酒店图片表
CREATE TABLE hotel_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- 预订表
CREATE TABLE bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    room_type_id INT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

-- 审核日志表
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    admin_id INT NOT NULL,
    action ENUM('approve', 'reject', 'suspend') NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id),
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX idx_hotels_status ON hotels(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);


3. 完整项目目录结构


yisu-hotel-platform/
├── client-user/                    # 用户端(移动端)
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── pages/                 # 页面组件
│   │   │   ├── HomePage/         # 酒店查询页(首页)
│   │   │   │   ├── HomePage.tsx
│   │   │   │   ├── HomePage.css
│   │   │   │   └── index.ts
│   │   │   ├── HotelListPage/    # 酒店列表页
│   │   │   │   ├── HotelListPage.tsx
│   │   │   │   ├── HotelListPage.css
│   │   │   │   └── index.ts
│   │   │   ├── HotelDetailPage/  # 酒店详情页
│   │   │   │   ├── HotelDetailPage.tsx
│   │   │   │   ├── HotelDetailPage.css
│   │   │   │   └── index.ts
│   │   │   └── BookingFlow/      # 预订流程页面
│   │   │       ├── BookingPage.tsx
│   │   │       ├── ConfirmationPage.tsx
│   │   │       └── index.ts
│   │   ├── components/           # 公共组件
│   │   │   ├── common/
│   │   │   │   ├── Header/
│   │   │   │   ├── Footer/
│   │   │   │   ├── SearchBar/
│   │   │   │   ├── HotelCard/
│   │   │   │   └── PriceDisplay/
│   │   │   └── hotel/
│   │   │       ├── RoomTypeCard/
│   │   │       ├── HotelGallery/
│   │   │       ├── FeatureList/
│   │   │       └── PromotionBanner/
│   │   ├── services/             # API服务
│   │   │   ├── api.ts
│   │   │   ├── hotelService.ts
│   │   │   └── bookingService.ts
│   │   ├── utils/                # 工具函数
│   │   │   ├── dateUtils.ts
│   │   │   ├── priceUtils.ts
│   │   │   └── constants.ts
│   │   ├── types/                # TypeScript类型
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.tsx
│   │   └── index.css
│   ├── package.json
│   └── tsconfig.json
│
├── admin-pc/                      # 管理端(PC端)
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── pages/                # 页面组件
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage/    # 登录页
│   │   │   │   ├── RegisterPage/ # 注册页
│   │   │   │   └── index.ts
│   │   │   ├── merchant/
│   │   │   │   ├── HotelFormPage/    # 酒店信息录入/编辑
│   │   │   │   ├── HotelListPage/    # 酒店管理列表
│   │   │   │   └── index.ts
│   │   │   └── admin/
│   │   │       ├── AuditPage/    # 酒店信息审核
│   │   │       ├── DashboardPage/ # 仪表板
│   │   │       └── index.ts
│   │   ├── components/           # 公共组件
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar/
│   │   │   │   ├── Topbar/
│   │   │   │   └── Layout.tsx
│   │   │   ├── forms/
│   │   │   │   ├── HotelForm/
│   │   │   │   ├── RoomTypeForm/
│   │   │   │   └── PromotionForm/
│   │   │   └── tables/
│   │   │       ├── HotelTable/
│   │   │       └── AuditTable/
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── utils/
│   │   │   └── validation.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.css
│   ├── package.json
│   └── tsconfig.json
│
├── server/                        # 后端服务
│   ├── src/
│   │   ├── controllers/          # 控制器
│   │   │   ├── authController.ts
│   │   │   ├── hotelController.ts
│   │   │   ├── bookingController.ts
│   │   │   └── adminController.ts
│   │   ├── routes/              # 路由
│   │   │   ├── authRoutes.ts
│   │   │   ├── hotelRoutes.ts
│   │   │   ├── bookingRoutes.ts
│   │   │   └── adminRoutes.ts
│   │   ├── models/              # 数据模型
│   │   │   ├── User.ts
│   │   │   ├── Hotel.ts
│   │   │   ├── RoomType.ts
│   │   │   ├── Booking.ts
│   │   │   └── Promotion.ts
│   │   ├── middleware/          # 中间件
│   │   │   ├── authMiddleware.ts
│   │   │   └── validation.ts
│   │   ├── utils/               # 工具函数
│   │   │   ├── db.ts
│   │   │   ├── jwt.ts
│   │   │   └── logger.ts
│   │   ├── config/             # 配置文件
│   │   │   └── database.ts
│   │   └── app.ts             # 应用入口
│   ├── package.json
│   └── tsconfig.json
│
├── shared-types/                  # 共享类型定义
│   └── src/
│       └── index.ts
│
├── scripts/                      # 构建脚本
│   ├── build-all.ps1
│   └── start-all.ps1
│
└── README.md                     # 项目文档


4. 页面功能列表与文件对应关系

4.1 用户端预定流程(移动端)

页面1: 酒店查询页(首页) - client-user/src/pages/HomePage/


功能列表:
- 城市/地区搜索框
- 日期选择器(入住/退房)
- 房型/人数选择
- 热门酒店推荐轮播
- 优惠活动展示横幅
- 快速筛选(价格/星级/距离)
- 搜索按钮
对应文件: HomePage.tsx


页面2: 酒店列表页 - client-user/src/pages/HotelListPage/


功能列表:
- 搜索结果展示(分页)
- 多维度排序(价格/评分/距离)
- 高级筛选侧边栏
- 酒店卡片展示(图片/名称/价格/评分)
- 地图视图切换
- 收藏/分享功能
对应文件: HotelListPage.tsx


页面3: 酒店详情页 - client-user/src/pages/HotelDetailPage/


功能列表:
- 酒店图片轮播图
- 基本信息展示(中英文名/地址/星级)
- 房型列表与选择
- 价格详情(原价/折扣价)
- 附近特色展示(景点/交通/商场)
- 促销活动展示
- 用户评价
- 立即预订按钮
对应文件: HotelDetailPage.tsx


4.2 管理酒店信息系统(PC站点)

页面1: 用户登录/注册页 - admin-pc/src/pages/auth/


登录页功能:
- 用户名/密码登录
- 记住我选项
- 忘记密码链接
- 注册入口
对应文件: LoginPage/LoginPage.tsx

注册页功能:
- 用户注册表单
- 角色选择(商户/管理员)
- 邮箱验证
- 协议确认
对应文件: RegisterPage/RegisterPage.tsx


页面2: 酒店信息录入/编辑页 - admin-pc/src/pages/merchant/HotelFormPage/


功能列表:
- 酒店基本信息表单
- 多语言名称输入
- 地址选择(地图集成)
- 房型管理(增删改)
- 图片上传组件
- 特色信息管理
- 促销活动设置
- 保存/提交按钮
对应文件: HotelFormPage.tsx


页面3: 酒店信息审核页 - admin-pc/src/pages/admin/AuditPage/


功能列表:
- 待审核酒店列表
- 酒店详情预览
- 审核操作(通过/拒绝/下线)
- 审核意见填写
- 审核历史查看
- 批量操作
对应文件: AuditPage.tsx


5. 页面拼装与运行指南

5.1 开发环境设置

# 1. 克隆项目(如使用Git)
git clone <repository-url>
cd yisu-hotel-platform

# 2. 安装所有依赖
cd client-user && npm install
cd ../admin-pc && npm install
cd ../server && npm install
cd ../shared-types && npm install
cd ..

# 3. 配置环境变量
# 在server目录创建.env文件：
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=yisu_hotel
JWT_SECRET=your_jwt_secret_key
PORT=3001

# 4. 启动数据库
# 确保MySQL服务运行，执行2.1的SQL脚本


5.2 页面拼装步骤

步骤1: 基础配置

1. 在shared-types/src/index.ts定义共享类型
2. 在两个前端项目的tsconfig.json中添加路径映射：
{
  "compilerOptions": {
    "paths": {
      "@shared-types/*": ["../shared-types/src/*"]
    }
  }
}


步骤2: 用户端路由配置

编辑client-user/src/App.tsx：
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage';
import HotelListPage from './pages/HotelListPage/HotelListPage';
import HotelDetailPage from './pages/HotelDetailPage/HotelDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/hotels" element={<HotelListPage />} />
        <Route path="/hotels/:id" element={<HotelDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}


步骤3: 管理端路由配置

编辑admin-pc/src/App.tsx：
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage/LoginPage';
import HotelFormPage from './pages/merchant/HotelFormPage/HotelFormPage';
import AuditPage from './pages/admin/AuditPage/AuditPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/merchant/hotels/new" element={<HotelFormPage />} />
        <Route path="/admin/audit" element={<AuditPage />} />
      </Routes>
    </BrowserRouter>
  );
}


步骤4: 后端API配置

编辑server/src/app.ts设置路由：
import express from 'express';
import authRoutes from './routes/authRoutes';
import hotelRoutes from './routes/hotelRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();

app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/admin', adminRoutes);


5.3 运行项目

方法1: 分别启动(开发模式)

# 终端1 - 启动用户端
cd client-user
npm start

# 终端2 - 启动管理端
cd admin-pc
npm start

# 终端3 - 启动后端
cd server
npm run dev


方法2: 使用脚本启动(Windows)

创建scripts/start-all.ps1：
# 启动脚本
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client-user; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd admin-pc; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm run dev"


执行：
.\scripts\start-all.ps1


5.4 访问地址

• 用户端: http://localhost:3000

• 管理端: http://localhost:3002

• 后端API: http://localhost:3001

6. 测试流程

6.1 功能测试清单

1. 用户端测试
   • 搜索功能测试

   • 酒店列表筛选排序

   • 详情页展示完整性

   • 预订流程完整性

2. 管理端测试
   • 用户登录/注册

   • 酒店信息CRUD操作

   • 图片上传功能

   • 审核流程测试

3. API测试
   • 使用Postman测试所有端点

   • 验证身份验证

   • 测试错误处理

6.2 集成测试步骤

# 1. 启动所有服务
npm run start:all

# 2. 执行数据库初始化脚本
mysql -u root -p < database/init.sql

# 3. 测试用户流程
# 访问 http://localhost:3000
# 搜索酒店 -> 查看列表 -> 进入详情 -> 模拟预订

# 4. 测试管理流程
# 访问 http://localhost:3002/login
# 使用商户账号登录 -> 添加酒店 -> 提交审核
# 使用管理员账号登录 -> 审核酒店 -> 发布


6.3 数据验证

检查数据库表确保：
• 用户数据正确存储

• 酒店信息完整

• 图片URL有效

• 促销活动日期逻辑正确

• 预订记录准确

7. 常见问题解决

1. 端口冲突
   • 修改端口在package.json的scripts中

2. 数据库连接失败
   • 检查.env配置

   • 确认MySQL服务运行

   • 验证用户权限

3. 跨域问题
   • 后端已配置CORS

   • 检查前端API调用地址

4. 类型错误
   • 确保shared-types正确安装

   • 重新构建TypeScript项目

5. 图片上传失败
   • 检查文件大小限制

   • 验证存储路径权限

8. 下一步开发建议

1. 添加单元测试
2. 集成支付网关
3. 实现邮件通知
4. 添加实时聊天
5. 优化移动端性能
6. 实现PWA功能
7. 添加数据分析面板

