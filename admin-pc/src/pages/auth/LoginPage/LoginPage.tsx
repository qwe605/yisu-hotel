import React, { useState } from 'react';
import { Container, Box, TextField, Button, Typography, Checkbox, FormControlLabel, Link, Alert } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

async function postJSON(url: string, body: any) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data?.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await postJSON('http://localhost:3001/api/auth/login', { identifier, password });
      const token = data?.token;
      localStorage.setItem('token', token || '');
      localStorage.setItem('userId', String(data?.id ?? ''));
      localStorage.setItem('username', String(data?.username ?? ''));
      localStorage.setItem('role', String(data?.role ?? ''));
      if (String(data?.role) === 'admin') {
        navigate('/admin/audit');
      } else {
        navigate('/merchant/hotels/new');
      }
    } catch (e: any) {
      setError(e?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>管理系统登录</Typography>
      <Box display="flex" flexDirection="column" gap={2}>
        <TextField label="用户名/邮箱/手机号" value={identifier} onChange={e => setIdentifier(e.target.value)} />
        <TextField label="密码" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <FormControlLabel control={<Checkbox checked={remember} onChange={e => setRemember(e.target.checked)} />} label="记住我" />
        {error && <Alert severity="error">{error}</Alert>}
        <Button disabled={loading} variant="contained" onClick={handleSubmit}>登录</Button>
        <Box display="flex" justifyContent="space-between">
          <Link component={RouterLink} to="/register">没有账号？去注册</Link>
          <Link href="#" underline="hover">忘记密码</Link>
        </Box>
      </Box>
    </Container>
  );
}
