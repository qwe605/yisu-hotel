// 我的预订页面
// 职责：展示当前登录用户的预订列表，支持“即将入住/历史订单”切换、取消、再次预订
// 数据来源：GET /api/reservations/my（需 JWT），封装于 reservationService.listMyReservations
// 交互：Tabs 切换触发刷新；取消后刷新；再次预订跳到酒店详情
import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Tabs, Tab, Card, CardContent, Button, Avatar, CardMedia, Pagination } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { listMyReservations, cancelReservation } from '../../services/reservationService';
import { getHotelDetail } from '../../services/hotelService';
import { getMyProfile } from '../../services/userService';
import backIcon from '../../image/返回.svg';

// 列表范围枚举：与后端保持一致，仅 'upcoming'（即将入住）与 'past'（历史订单）
type Scope = 'upcoming' | 'past';

const statusMap: Record<string, string> = {
  pending: '待处理/待确认',
  confirmed: '已确认/预订成功',
  cancelled: '已取消',
  checked_in: '已入住',
  checked_out: '已退房'
};

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
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [favoritesIds, setFavoritesIds] = useState<number[]>([]);
  const [favoriteHotels, setFavoriteHotels] = useState<Array<any>>([]);
  const [bookingPage, setBookingPage] = useState<number>(1);
  const [bookingPageSize, setBookingPageSize] = useState<number>(5);
  const [bookingsTotal, setBookingsTotal] = useState<number>(0);
  const [favoritesPage, setFavoritesPage] = useState<number>(1);
  const [favoritesPageSize, setFavoritesPageSize] = useState<number>(5);
  const [favoritesTotal, setFavoritesTotal] = useState<number>(0);

  // 拉取我的预订列表：
  // - 进入页面或切换 Tab 时调用
  // - 统一设置 loading 与错误文案，成功后渲染列表
  const fetchList = async (s: Scope, p?: number, ps?: number) => {
    setLoading(true);
    setError('');
    try {
      const pageArg = p ?? bookingPage;
      const sizeArg = ps ?? bookingPageSize;
      const resp = await listMyReservations(s, pageArg, sizeArg);
      setItems(resp.items || []);
      setBookingsTotal(Number(((resp as any)?.total ?? resp.items?.length ?? 0)));
      setBookingPage(Number(resp.page || pageArg));
      setBookingPageSize(Number(resp.pageSize || sizeArg));
    } catch (e: any) {
      setError(e?.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 监听 scope 变化，自动刷新当前 Tab 的数据
  useEffect(() => {
    setBookingPage(1);
    fetchList(scope, 1, bookingPageSize);
  }, [scope]);

  useEffect(() => {
    const initUser = async () => {
      try {
        const me = await getMyProfile();
        setUserName(me.username || '游客');
        setUserEmail(me.email || '');
        const ids = String(me.collect || '')
          .split(',')
          .map(x => Number(x))
          .filter(n => Number.isFinite(n));
        setFavoritesIds(ids);
        setFavoritesPage(1);
      } catch {
        const name = localStorage.getItem('userName') || localStorage.getItem('username') || '游客';
        const email = localStorage.getItem('userEmail') || localStorage.getItem('email') || '';
        setUserName(name);
        setUserEmail(email);
        setFavoritesIds([]);
        setFavoritesPage(1);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    let aborted = false;
    const loadFavs = async () => {
      if (!favoritesIds.length) {
        setFavoriteHotels([]);
        setFavoritesTotal(0);
        return;
      }
      const unique = Array.from(new Set(favoritesIds));
      setFavoritesTotal(unique.length);
      const start = Math.max((favoritesPage - 1) * favoritesPageSize, 0);
      const slice = unique.slice(start, start + favoritesPageSize);
      try {
        const list = await Promise.all(slice.map(async (id) => {
          try {
            const resp = await getHotelDetail(id);
            return resp?.hotel ? resp.hotel : null;
          } catch {
            return null;
          }
        }));
        if (!aborted) setFavoriteHotels(list.filter(Boolean));
      } catch {
        if (!aborted) setFavoriteHotels([]);
      }
    };
    loadFavs();
    return () => { aborted = true; };
  }, [favoritesIds, favoritesPage, favoritesPageSize]);

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
  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
    } catch { }
    navigate('/login');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Button onClick={() => navigate(-1)} aria-label="返回" sx={{ minWidth: 0, p: 0.5 }}>
          <img src={backIcon} alt="返回" style={{ width: 20, height: 20 }} />
        </Button>
        <Typography variant="h6">我的预订</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Avatar sx={{ bgcolor: '#1976d2' }}>{(userName || '游').slice(0, 1).toUpperCase()}</Avatar>
        <Box>
          <Typography fontWeight={600}>{userName || '游客'}</Typography>
          {userEmail && <Typography color="text.secondary">{userEmail}</Typography>}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" onClick={handleLogout}>退出登录</Button>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={scope} onChange={(_, v) => setScope(v)}>
          <Tab label="即将入住" value="upcoming" />
          <Tab label="历史订单" value="past" />
        </Tabs>
      </Box>
      {loading && <Typography>加载中...</Typography>}
      {error && <Typography color="error">{error}</Typography>}
      {!loading && items.length === 0 && <Typography>暂无相关订单</Typography>}
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
                <Typography>状态：{statusMap[it.status] ?? it.status}</Typography>
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
      {!loading && bookingsTotal > 0 && (
        <Box display="flex" justifyContent="center" mt={2}>
          <Pagination
            count={Math.ceil(bookingsTotal / bookingPageSize)}
            page={bookingPage}
            onChange={(_, value) => {
              setBookingPage(value);
              fetchList(scope, value, bookingPageSize);
            }}
            color="primary"
          />
        </Box>
      )}
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>我的收藏</Typography>
        {favoriteHotels.length === 0 && <Typography color="text.secondary">暂无收藏</Typography>}
        {favoriteHotels.length > 0 && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {favoriteHotels.map((h: any) => (
              <Card key={h.id} sx={{ width: 280, cursor: 'pointer' }} onClick={() => navigate(`/hotels/${h.id}`)}>
                {h.cover_image && <CardMedia component="img" image={h.cover_image} sx={{ height: 140 }} />}
                <CardContent>
                  <Typography fontWeight={700}>{h.name_zh}</Typography>
                  {h.address && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{h.address}</Typography>}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography color="primary">¥{h.min_price || 0} 起</Typography>
                    {h.star_rating != null && <Typography color="text.secondary">⭐ {h.star_rating}</Typography>}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
        {favoritesTotal > 0 && (
          <Box display="flex" justifyContent="center" mt={2}>
            <Pagination
              count={Math.ceil(favoritesTotal / favoritesPageSize)}
              page={favoritesPage}
              onChange={(_, value) => setFavoritesPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default MyBookingsPage;
