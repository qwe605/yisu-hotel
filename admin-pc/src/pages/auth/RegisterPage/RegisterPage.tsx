import React, { useState } from 'react';
import { Container, Box, TextField, Button, Typography, Select, MenuItem, Alert, FormControl, InputLabel, Checkbox, FormControlLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';

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

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'merchant' | 'admin' | 'user'>('merchant');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const handleSubmit = async () => {
    if (!agree) {
      setError('请勾选协议确认');
      return;
    }
    setLoading(true);
    setError('');
    setOk('');
    try {
      await postJSON('http://localhost:3001/api/auth/register', { username, email, phone, password, role });
      setOk('注册成功，请登录');
      setTimeout(() => navigate('/login'), 800);
    } catch (e: any) {
      setError(e?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>管理系统注册</Typography>
      <Box display="flex" flexDirection="column" gap={2}>
        <TextField label="用户名" value={username} onChange={e => setUsername(e.target.value)} />
        <TextField label="邮箱" value={email} onChange={e => setEmail(e.target.value)} />
        <TextField label="手机号" value={phone} onChange={e => setPhone(e.target.value)} />
        <TextField label="密码" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <FormControl>
          <InputLabel id="role-label">角色</InputLabel>
          <Select labelId="role-label" label="角色" value={role} onChange={e => setRole(e.target.value as any)}>
            <MenuItem value="merchant">商户</MenuItem>
            <MenuItem value="admin">管理员</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel control={<Checkbox checked={agree} onChange={e => setAgree(e.target.checked)} />} label="我已阅读并同意《用户协议》" />
        {error && <Alert severity="error">{error}</Alert>}
        {ok && <Alert severity="success">{ok}</Alert>}
        <Button disabled={loading} variant="contained" onClick={handleSubmit}>注册</Button>
      </Box>
    </Container>
  );
}
