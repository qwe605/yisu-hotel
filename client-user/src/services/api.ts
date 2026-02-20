// Axios 实例封装
// 作用：统一设置后端 API 基础地址与公共拦截器
import axios from 'axios';

// 创建 axios 实例，指向后端服务端口
export const apiClient = axios.create({
  baseURL: 'http://localhost:3001', // 后端基础地址
  timeout: 10000 // 请求超时（毫秒）
});

// 请求拦截器（可在此添加认证等逻辑）
apiClient.interceptors.request.use((config) => {
  // 这里可以统一添加 token 等头部信息
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器（统一错误处理）
apiClient.interceptors.response.use(
  (resp) => resp,
  (err) => {
    // 打印错误，便于调试
    console.error('API Error:', err);
    return Promise.reject(err);
  }
);
