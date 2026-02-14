// 认证服务封装
// 作用：统一管理登录与注册 API 调用
import { apiClient } from './api';

// 登录：支持手机号/用户名/邮箱任一作为 identifier
export async function login(payload: { identifier: string; password: string }) {
  const resp = await apiClient.post('/api/auth/login', payload);
  return resp.data as { id: number; username: string; email: string; phone: string; role: string };
}

// 注册：后端负责对密码进行加盐哈希并入库
export async function register(payload: { username: string; email: string; phone: string; password: string }) {
  const resp = await apiClient.post('/api/auth/register', payload);
  return resp.data as { id: number };
}
