-- 1. 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS yisu_hotel DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yisu_hotel;

-- 2. 用户表 (必须最先创建，因为其他表有外键引用它)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'merchant', 'user') DEFAULT 'user',
    phone VARCHAR(20),
    collect TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. 酒店表 (引用 users)
CREATE TABLE IF NOT EXISTS hotels (
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
    CONSTRAINT fk_hotels_merchant FOREIGN KEY (merchant_id) REFERENCES users(id)
);

-- 4. 房型表
CREATE TABLE IF NOT EXISTS room_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    capacity INT NOT NULL,
    amenities TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_room_types_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- 5. 酒店特色表
CREATE TABLE IF NOT EXISTS hotel_features (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    feature_type ENUM('attraction', 'transport', 'mall') NOT NULL,
    name VARCHAR(100) NOT NULL,
    distance VARCHAR(50),
    description TEXT,
    CONSTRAINT fk_features_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- 6. 促销活动表
CREATE TABLE IF NOT EXISTS promotions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    discount_type ENUM('percentage', 'fixed', 'package') NOT NULL,
    discount_value DECIMAL(10,2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_promotions_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- 7. 酒店图片表
CREATE TABLE IF NOT EXISTS hotel_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    CONSTRAINT fk_images_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- 8. 预订表
CREATE TABLE IF NOT EXISTS bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    room_type_id INT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_bookings_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

-- 9. 审核日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    admin_id INT NOT NULL,
    action ENUM('approve', 'reject', 'suspend') NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id),
    CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- 10. 创建索引 (MySQL 不支持 CREATE INDEX IF NOT EXISTS，
-- 因此建议将索引直接写在 CREATE TABLE 内部，或者单独处理)
-- 这里的索引已经包含在 PRIMARY KEY 和 UNIQUE 约束中。
-- 下面是针对非唯一字段的额外索引：
CREATE INDEX idx_hotels_status ON hotels(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);