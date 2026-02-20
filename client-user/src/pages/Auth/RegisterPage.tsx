// 注册页面
// 作用：
// - 采集用户名/邮箱/手机号/明文密码
// - 调用后端注册接口进行写库（后端负责对密码进行哈希）
// - 注册成功后自动登录并保存 userId，随后跳转
import React, { useState } from 'react';
import { Container, Box, TextField, Button, Typography, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { register as registerApi, login as loginApi } from '../../services/authService';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 提交注册：后端完成唯一性校验与密码哈希
  const handleSubmit = async () => {
    setError('');
    try {
      const res = await registerApi({ username, email, phone, password });
      // 注册成功后自动登录
      const user = await loginApi({ identifier: username, password });
      localStorage.setItem('userId', String(user.id));
      localStorage.setItem('userName', user.username || '');
      navigate('/home');
    } catch (e: any) {
      setError(e?.response?.data?.message || '注册失败');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>注册</Typography>
      <Box display="flex" flexDirection="column" gap={2}>
        <TextField label="用户名" value={username} onChange={e => setUsername(e.target.value)} fullWidth />
        <TextField label="邮箱" value={email} onChange={e => setEmail(e.target.value)} fullWidth />
        <TextField label="手机号" value={phone} onChange={e => setPhone(e.target.value)} fullWidth />
        <TextField label="密码" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth />
        {error && <Typography color="error">{error}</Typography>}
        <Button variant="contained" onClick={handleSubmit}>注册</Button>
        <Typography variant="body2">
          已有账号？<Link href="/login">去登录</Link>
        </Typography>
      </Box>
    </Container>
  );
};

export default RegisterPage;
