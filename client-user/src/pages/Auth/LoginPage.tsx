// 登录页面
// 作用：
// - 接受手机号/用户名/邮箱任一 + 明文密码
// - 调用后端登录接口校验密码哈希（后端用 bcrypt）
// - 登录成功后写入 userId 并跳转首页
import React, { useState } from 'react';
import { Container, Box, TextField, Button, Typography, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { login as loginApi } from '../../services/authService';

const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 提交登录：后端将比较明文与数据库哈希
  const handleSubmit = async () => {
    setError('');
    try {
      const user = await loginApi({ identifier, password });
      localStorage.setItem('userId', String(user.id));
      localStorage.setItem('userName', user.username || '');
      navigate('/home');
    } catch (e: any) {
      setError(e?.response?.data?.message || '登录失败');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>登录</Typography>
      <Box display="flex" flexDirection="column" gap={2}>
        <TextField
          label="手机号/用户名/邮箱"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          fullWidth
        />
        <TextField
          label="密码"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
        />
        {error && <Typography color="error">{error}</Typography>}
        <Button variant="contained" onClick={handleSubmit}>登录</Button>
        <Typography variant="body2">
          还没有账号？<Link href="/register">去注册</Link>
        </Typography>
      </Box>
    </Container>
  );
};

export default LoginPage;
