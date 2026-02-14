// 认证相关控制器
// 作用：
// - 提供登录与注册接口
// - 登录时使用 bcrypt 对明文密码与数据库中的 password_hash 做比对
// - 注册时对明文密码进行加盐哈希并写入数据库
const bcrypt = require('bcryptjs');

const userModel = require('../models/userModel');

async function login(req, res) {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      res.status(400).json({ message: '缺少必要参数' });
      return;
    }
    // 支持手机号/用户名/邮箱三种方式任意一个作为登录凭证
    const user = await userModel.findByIdentifier(identifier, process.env.DB_NAME);
    if (!user) {
      res.status(401).json({ message: '用户不存在或凭证错误' });
      return;
    }
    // 对比明文密码与数据库哈希（bcrypt.compare 会处理盐与成本因子）
    const ok = await bcrypt.compare(String(password), String(user.password_hash || ''));
    if (!ok) {
      res.status(401).json({ message: '用户不存在或凭证错误' });
      return;
    }
    // 登录成功返回最小必要信息（不包含敏感字段）
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role
    });
  } catch (err) {
    console.error('login error:', { code: err?.code, sqlMessage: err?.sqlMessage, sql: err?.sql });
    res.status(500).json({ message: '服务器内部错误' });
  }
}

async function register(req, res) {
  try {
    const { username, email, phone, password } = req.body || {};
    if (!username || !email || !phone || !password) {
      res.status(400).json({ message: '缺少必要参数' });
      return;
    }
    const exists = await userModel.existsUser(username, email, phone, process.env.DB_NAME);
    if (exists) {
      res.status(409).json({ message: '用户名/邮箱/手机号已存在' });
      return;
    }
    // 生成盐并哈希明文密码，避免明文入库
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(String(password), salt);
    const id = await userModel.createUser({ username, email, phone, passwordHash: hash }, process.env.DB_NAME);
    res.json({ id });
  } catch (err) {
    console.error('register error:', { code: err?.code, sqlMessage: err?.sqlMessage, sql: err?.sql });
    res.status(500).json({ message: '服务器内部错误' });
  }
}

module.exports = { login, register };
