// 我的预订页面
// 职责：展示当前登录用户的预订列表，支持“即将入住/历史订单”切换、取消、再次预订
// 数据来源：GET /api/reservations/my（需 JWT），封装于 reservationService.listMyReservations
// 交互：Tabs 切换触发刷新；取消后刷新；再次预订跳到酒店详情
import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Tabs, Tab, Card, CardContent, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { listMyReservations, cancelReservation } from '../../services/reservationService';

// 列表范围枚举：与后端保持一致，仅 'upcoming'（即将入住）与 'past'（历史订单）
type Scope = 'upcoming' | 'past';

// 将 YYYY-MM-DD 或可解析的日期字符串格式化为标准展示文案
function formatDate(d: string) {
  try {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  } catch {
    return d;
  }
}

// 计算间夜数：基于入住/离店日期差值，最少返回 1 晚
function nightsBetween(check_in: string, check_out: string) {
  const a = new Date(check_in);
  const b = new Date(check_out);
  const ms = b.getTime() - a.getTime();
  return Math.max(1, Math.round(ms / (24 * 3600 * 1000)));
}

const MyBookingsPage: React.FC = () => {
  // 当前列表范围：'upcoming' 或 'past'
  const [scope, setScope] = useState<Scope>('upcoming');
  // 列表数据项（后端返回的结构，包含酒店与房型关键信息）
  const [items, setItems] = useState<Array<any>>([]);
  // 加载态与错误态，用于页面三态展示
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 路由跳转器：用于“再次预订”进入酒店详情
  const navigate = useNavigate();

  // 拉取我的预订列表：
  // - 进入页面或切换 Tab 时调用
  // - 统一设置 loading 与错误文案，成功后渲染列表
  const fetchList = async (s: Scope) => {
    setLoading(true);
    setError('');
    try {
      const resp = await listMyReservations(s, 1, 20);
      setItems(resp.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 监听 scope 变化，自动刷新当前 Tab 的数据
  useEffect(() => {
    fetchList(scope);
  }, [scope]);

  // 取消预订：调用后端删除/置为取消；成功后刷新列表
  const handleCancel = async (id: number) => {
    try {
      await cancelReservation(id);
      fetchList(scope);
    } catch (e) {
      // 简单处理
      alert('取消失败');
    }
  };

  // 再次预订：跳转到酒店详情页，用户可重新选择日期并下单
  const handleRebook = (hotel_id: number) => {
    navigate(`/hotels/${hotel_id}`);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 2 }}>
      {/* 页面标题与范围切换 Tabs */}
      <Typography variant="h6" gutterBottom>我的预订</Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={scope} onChange={(_, v) => setScope(v)}>
          <Tab label="即将入住" value="upcoming" />
          <Tab label="历史订单" value="past" />
        </Tabs>
      </Box>
      {loading && <Typography>加载中...</Typography>}
      {error && <Typography color="error">{error}</Typography>}
      {!loading && items.length === 0 && <Typography>暂无相关订单</Typography>}
      {/* 列表卡片：逐条展示订单的酒店与房型信息、日期与状态、操作按钮 */}
      <Box display="flex" flexDirection="column" gap={2}>
        {items.map(it => (
          <Card key={it.id} variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold">{it.hotel_name}</Typography>
              <Typography variant="body2" color="text.secondary">{it.address}</Typography>
              <Box mt={1} display="flex" gap={2}>
                <Typography>房型：{it.room_name}</Typography>
                <Typography>价格：¥{it.base_price}</Typography>
              </Box>
              <Box mt={1} display="flex" gap={2}>
                <Typography>入住：{formatDate(it.check_in)}</Typography>
                <Typography>离店：{formatDate(it.check_out)}</Typography>
                <Typography>晚数：{nightsBetween(it.check_in, it.check_out)}</Typography>
              </Box>
              <Box mt={1} display="flex" gap={2}>
                <Typography>状态：{it.status}</Typography>
              </Box>
              <Box mt={2} display="flex" gap={2}>
                {scope === 'upcoming' && (
                  <Button variant="outlined" color="error" onClick={() => handleCancel(it.id)}>取消预订</Button>
                )}
                <Button variant="contained" onClick={() => handleRebook(it.hotel_id)}>再次预订</Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
};

export default MyBookingsPage;
