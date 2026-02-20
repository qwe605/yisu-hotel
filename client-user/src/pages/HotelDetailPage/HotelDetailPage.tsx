// 酒店详情页（用户端）
// 作用：展示酒店基本信息、活动、图片、房间列表；支持日期选择、价格与标签筛选；提供预约/取消操作
// 主要分区：数据加载、交互状态、派生数据计算（useMemo）、事件处理（预约/取消/筛选）、页面渲染
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Box, Typography, Button, Grid, Card, CardContent, Chip, Skeleton, Slider, Select, MenuItem } from '@mui/material';
import { getHotelDetail } from '../../services/hotelService';
import { updateRoomCapacity } from '../../services/hotelService';
import { createReservation, cancelReservation } from '../../services/reservationService';
import { HotelDetail } from '../../types';
import './HotelDetailPage.css';
import DateRangeSheet from '../../components/DateRangeSheet/DateRangeSheet';
import mapIcon from '../../image/地图.svg';

const HotelDetailPage: React.FC = () => {
  const { id } = useParams(); // 路由参数：酒店ID
  const navigate = useNavigate(); // 返回/导航
  // 基础数据
  const [hotel, setHotel] = useState<HotelDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  // UI交互
  const [titleOpacity, setTitleOpacity] = useState(0); // 吸顶标题透明度
  const [bookingMap, setBookingMap] = useState<Record<number, number>>({}); // 房型ID→预约ID 映射
  const [userBookedQty, setUserBookedQty] = useState<Record<number, number>>({}); // 本用户每房型已预订间数
  const [tempQty, setTempQty] = useState<Record<number, number>>({}); // 预约时临时选择的间数
  const [calendarOpen, setCalendarOpen] = useState(false); // 日历开关
  // 日期默认：今天→明天
  const [checkIn, setCheckIn] = useState<Date | null>(new Date());
  const [checkOut, setCheckOut] = useState<Date | null>(new Date(Date.now() + 24 * 3600 * 1000));
  // 筛选面板状态（临时与生效分离）
  const [filterOpen, setFilterOpen] = useState(false);
  const [tempSelectedTags, setTempSelectedTags] = useState<string[]>([]);
  const [activeSelectedTags, setActiveSelectedTags] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [tempPriceMin, setTempPriceMin] = useState<number | null>(null);
  const [tempPriceMax, setTempPriceMax] = useState<number | null>(null);
  const [activePriceMin, setActivePriceMin] = useState<number | null>(null);
  const [activePriceMax, setActivePriceMax] = useState<number | null>(null);
  // 预约信息
  const [bookings, setBookings] = useState<any[]>([]);

  // 数据加载：根据路由ID拉取酒店详情（酒店、房型、特征、图片、活动）
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const resp = await getHotelDetail(Number(id));
        console.log('获取酒店详情成功:', resp);
        setHotel(resp.hotel);
        setRooms(resp.rooms || []);
        setFeatures(resp.features || []);
        setImages(resp.images || []);
        setPromotions(resp.promotions || []);
        setBookings(resp.bookings || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    // 监听窗口滚动事件，按滚动距离计算吸顶标题透明度
    const onScroll = () => {
      // 当前垂直滚动距离（像素）
      const y = window.scrollY;
      // 将滚动距离映射到 [0,1]，滚动到 160px 时完全不透明
      const t = Math.min(1, y / 160);
      // 更新透明度状态，驱动 UI 重渲染
      setTitleOpacity(t);
    };
    // passive:true 表示该监听器不会调用 preventDefault，可提升滚动性能
    window.addEventListener('scroll', onScroll, { passive: true });
    // 组件卸载时移除监听，避免内存泄漏或重复绑定
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [heroIndex, setHeroIndex] = useState<number>(0);
  const handlePrev = () => {
    const n = images.length;
    if (n > 0) setHeroIndex(prev => (prev - 1 + n) % n);
  };
  const handleNext = () => {
    const n = images.length;
    if (n > 0) setHeroIndex(prev => (prev + 1) % n);
  };
  const heroImage = useMemo(() => {
    const h = images[heroIndex];
    return h?.image_url || 'https://dimg04.c-ctrip.com/images/1mc4812000p4ppxq6E330_W_1280_853_R5_Q70.jpg';
  }, [images, heroIndex]);

  const validPromotions = useMemo(() => {
    const now = new Date();
    return promotions.filter((p: any) => {
      const s = p.start_date ? new Date(p.start_date) : null;
      const e = p.end_date ? new Date(p.end_date) : null;
      if (s && now < s) return false;
      if (e && now > e) return false;
      return true;
    });
  }, [promotions]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach(r => {
      const tags: string[] = typeof r.amenities === 'string' ? r.amenities.split(',') : [];
      tags.forEach((t: string) => {
        const v = (t || '').trim();
        if (v) set.add(v);
      });
    });
    return Array.from(set);
  }, [rooms]);

  const [priceBoundsMin, priceBoundsMax] = useMemo(() => {
    if (!rooms.length) return [0, 1000];
    const arr = rooms.map(r => Number(r.base_price || 0));
    return [Math.min(...arr), Math.max(...arr)];
  }, [rooms]);

  // 房间过滤：按照已应用的标签与价格区间过滤
  const filteredRooms = useMemo(() => {
    let list = rooms.slice();
    if (activeSelectedTags.length) {
      list = list.filter(r => {
        const tags = typeof r.amenities === 'string' ? r.amenities.split(',').map((t: string) => t.trim()) : [];
        return activeSelectedTags.every(t => tags.includes(t));
      });
    }
    if (activePriceMin != null) {
      list = list.filter(r => Number(r.base_price || 0) >= activePriceMin!);
    }
    if (activePriceMax != null) {
      list = list.filter(r => Number(r.base_price || 0) <= activePriceMax!);
    }
    return list;
  }, [rooms, activeSelectedTags, activePriceMin, activePriceMax]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const ms = Math.max(0, checkOut.getTime() - checkIn.getTime());
    return Math.max(0, Math.round(ms / (24 * 3600 * 1000)));
  }, [checkIn, checkOut]);

  const fmt = (d: Date | null) => {
    if (!d) return '--';
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setCheckIn(start);
    setCheckOut(end);
    if (start && end) {
      setCalendarOpen(false);
    }
  };

  const handleClearFilter = () => {
    setTempSelectedTags([]);
    setActiveSelectedTags([]);
    setTempPriceMin(null);
    setTempPriceMax(null);
    setActivePriceMin(null);
    setActivePriceMax(null);
    setFilterOpen(false);
  };

  const handleApplyFilter = () => {
    setActiveSelectedTags(tempSelectedTags.slice());
    setActivePriceMin(tempPriceMin);
    setActivePriceMax(tempPriceMax);
    setFilterOpen(false);
  };

  // 预约：选择间数并确认后，减少该房型的 capacity（在 bookings 表新增记录）
  const handleBook = async (room: any) => {
    const qty = Math.max(1, Math.min(Number(tempQty[room.id] || 1), Number(room.capacity || 0)));
    if (qty <= 0) return;
    try {
      const resp = await updateRoomCapacity(room.id, -qty);
      setRooms(prev => prev.map(rt => rt.id === room.id ? { ...rt, capacity: resp.capacity } : rt));
      setUserBookedQty(prev => ({ ...prev, [room.id]: (prev[room.id] || 0) + qty }));
      setTempQty(prev => ({ ...prev, [room.id]: 1 }));
      const userId = Number(localStorage.getItem('userId') || 0);
      if (!userId) {
        navigate('/login');
        return;
      }
      const totalPrice = Number(room.base_price || 0) * qty * Math.max(1, Number(nights || 1));
      const resv = await createReservation({
        room_type_id: room.id,
        user_id: userId,
        total_price: totalPrice,
        check_in: fmt(checkIn),
        check_out: fmt(checkOut),
        status: 'confirmed'
      });
      setBookingMap(prev => ({ ...prev, [room.id]: resv.reservation_id }));
      setBookings(prev => ([...prev, { id: resv.reservation_id, room_type_id: room.id, user_id: userId, qty, total_price: totalPrice, check_in: fmt(checkIn), check_out: fmt(checkOut), status: 'confirmed' }]));
    } catch (_) { }
  };

  // 取消预约：增加该房型的 capacity（按本用户已预订间数返还）
  const handleCancel = async (room: any) => {
    const qty = Math.max(0, Number(userBookedQty[room.id] || 0));
    if (qty <= 0) return;
    try {
      const resp = await updateRoomCapacity(room.id, qty);
      setRooms(prev => prev.map(rt => rt.id === room.id ? { ...rt, capacity: resp.capacity } : rt));
      setUserBookedQty(prev => {
        const next = { ...prev };
        delete next[room.id];
        return next;
      });
      const rid = bookingMap[room.id];
      if (rid) {
        await cancelReservation(rid);
        setBookingMap(prev => {
          const next = { ...prev };
          delete next[room.id];
          return next;
        });
        setBookings(prev => prev.filter(b => Number(b.id) !== Number(rid)));
      }
    } catch (_) { }
  };

  return (
    <Container maxWidth="md">
      {/* 吸顶标题栏：透明度随滚动增加 */}
      <Box className="sticky-header" sx={{ backgroundColor: `rgba(255,255,255,${titleOpacity})` }}>
        <Button className="back-icon" aria-label="返回" onClick={() => navigate(-1)} />
        <Typography className="sticky-title">{hotel?.name_zh || '酒店详情'}</Typography>
      </Box>
      {/* 顶部图片 */}
      <Box className="detail-hero">
        {loading ? (
          <Skeleton variant="rectangular" className="detail-hero-img" />
        ) : (
          <img className="detail-hero-img" src={heroImage} alt={hotel?.name_zh || '酒店图片'} />
        )}
        <div className="detail-hero-nav left" onClick={handlePrev} aria-label="上一张" />
        <div className="detail-hero-nav right" onClick={handleNext} aria-label="下一张" />
        <Box className="detail-hero-dots" aria-hidden="true">
          {images.map((_, i) => (
            <span key={i} className={`dot ${i === heroIndex ? 'active' : ''}`} />
          ))}
        </Box>
      </Box>
      {loading && <Typography>加载中...</Typography>}
      {!loading && hotel && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h5">{hotel.name_zh} ({hotel.name_en})</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography color="text.secondary" sx={{ flex: '0 1 auto' }}>{hotel.address}</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (hotel.latitude != null) params.set('userLat', String(hotel.latitude));
                  if (hotel.longitude != null) params.set('userLng', String(hotel.longitude));
                  params.set('selectedId', String(hotel.id));
                  params.set('page', '1');
                  params.set('pageSize', '100');
                  params.set('sort', 'distanceAsc');
                  navigate(`/map?${params.toString()}`);
                }}
                sx={{ minWidth: 0, p: 0.5, borderRadius: 1 }}
                aria-label="地图"
              >
                <img src={mapIcon} alt="地图" style={{ width: 20, height: 20 }} />
              </Button>
            </Box>
            <Typography sx={{ mt: 1 }}>⭐ {hotel.star_rating} 星</Typography>
            {hotel.description && <Typography sx={{ mt: 1 }}>{hotel.description}</Typography>}

            {/* 景点特征 */}
            {features.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">附近景点</Typography>
                {features.map((f: any, idx: number) => (
                  <Box key={idx} sx={{ mt: 1 }}>
                    <Typography fontWeight={600}>{f.name}</Typography>
                    {f.description && <Typography color="text.secondary">{f.description}</Typography>}
                  </Box>
                ))}
              </Box>
            )}

            {/* 活动（有效期内） */}
            {validPromotions.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">当前活动</Typography>
                {validPromotions.map((p: any) => (
                  <Box key={p.id} sx={{ mt: 1, p: 1, borderRadius: 1, background: '#FFF7E6' }}>
                    <Typography fontWeight={600}>{p.name}</Typography>
                    {p.description && <Typography color="text.secondary">{p.description}</Typography>}
                  </Box>
                ))}
              </Box>
            )}

            {/* 日期选择条 */}
            <Box className="date-bar" sx={{ mt: 2 }}>
              <Button className="date-item" onClick={() => setCalendarOpen(o => !o)}>
                <Typography>{checkIn ? fmt(checkIn) : '选择入住'}</Typography>
              </Button>
              <Typography className="date-sep">{nights ? `${nights}晚` : ''}</Typography>
              <Button className="date-item" onClick={() => setCalendarOpen(o => !o)}>
                <Typography>{checkOut ? fmt(checkOut) : '选择离店'}</Typography>
              </Button>
            </Box>
            {calendarOpen && (
              <DateRangeSheet
                open={calendarOpen}
                onClose={() => setCalendarOpen(false)}
                checkIn={checkIn}
                checkOut={checkOut}
                setCheckIn={(d) => setCheckIn(d)}
                setCheckOut={(d) => setCheckOut(d)}
                monthsShown={2}
              />
            )}

            <Box className="filter-bar" sx={{ mt: 2 }}>
              <Button className={`triangle-btn ${filterOpen ? 'open' : ''}`} size="small" onClick={() => setFilterOpen(o => !o)}>
                筛选
              </Button>
            </Box>
            {filterOpen && (
              <Box className="filter-panel">
                <Typography fontWeight={600} sx={{ mb: 1 }}>价格</Typography>
                <Box className="price-row">
                  <Slider
                    value={[
                      tempPriceMin != null ? tempPriceMin : priceBoundsMin,
                      tempPriceMax != null ? tempPriceMax : priceBoundsMax
                    ]}
                    min={priceBoundsMin}
                    max={priceBoundsMax}
                    onChange={(_, v) => {
                      const [a, b] = v as number[];
                      setTempPriceMin(a);
                      setTempPriceMax(b);
                    }}
                  />
                </Box>
                <Box className="range-chips">
                  {[
                    { label: '¥150以下', min: 0, max: 150 },
                    { label: '¥150-¥200', min: 150, max: 200 },
                    { label: '¥200-¥250', min: 200, max: 250 },
                    { label: '¥250-¥350', min: 250, max: 350 },
                    { label: '¥350-¥500', min: 350, max: 500 },
                    { label: '¥500-¥600', min: 500, max: 600 },
                    { label: '¥600-¥750', min: 600, max: 750 },
                    { label: '¥750以上', min: 750, max: priceBoundsMax }
                  ].map(o => (
                    <Chip key={o.label} label={o.label} onClick={() => { setTempPriceMin(o.min); setTempPriceMax(o.max); }} />
                  ))}
                </Box>

                {allTags.length > 0 && (
                  <Box className="tag-panel">
                    <Box className="tag-header">
                      <Typography variant="subtitle1">标签筛选</Typography>
                      <Button size="small" onClick={() => setShowAllTags(s => !s)}>
                        {showAllTags ? '收起 ▲' : '展开 ▼'}
                      </Button>
                    </Box>
                    <Box className="tag-list">
                      {(showAllTags ? allTags : allTags.slice(0, 8)).map(t => {
                        const active = tempSelectedTags.includes(t);
                        return (
                          <Chip
                            key={t}
                            label={t}
                            color={active ? 'primary' : 'default'}
                            onClick={() => {
                              setTempSelectedTags(prev => active ? prev.filter(x => x !== t) : [...prev, t]);
                            }}
                            className="tag-chip"
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}

                <Box className="filter-actions">
                  <Button variant="outlined" onClick={handleClearFilter}>清空</Button>
                  <Button variant="contained" onClick={handleApplyFilter}>完成</Button>
                </Box>
              </Box>
            )}

            {/* 房间列表 */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">房间列表</Typography>
              <Button className='booking_looking' onClick={() => navigate('/account/bookings')}>
                查看预约
              </Button>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {filteredRooms.map((r: any) => {
                  const tags = typeof r.amenities === 'string' ? r.amenities.split(',') : [];
                  return (
                    <Grid size={{ xs: 12 }} key={r.id}>
                      <Card className="room-card">
                        <Box className="room-left">
                          <img className="room-img" src={'https://dimg04.c-ctrip.com/images/1mc6k12000cgs6pupC960_W_1280_0_R50_Q90_Mht8_3.jpg'} alt={r.name} />
                        </Box>
                        <CardContent className="room-right">
                          <Typography fontWeight={600}>{r.name}</Typography>
                          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {tags.filter(Boolean).map((t: string, i: number) => (
                              <Chip key={i} label={t.trim()} size="small" />
                            ))}
                          </Box>
                          {r.description && <Typography sx={{ mt: 1 }} color="text.secondary">{r.description}</Typography>}
                          <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Typography color="text.secondary">剩余：{Number(r.capacity || 0)}</Typography>
                            {!userBookedQty[r.id] && Number(r.capacity || 0) > 0 && (
                              <>
                                <Select
                                  size="small"
                                  value={Math.max(1, Math.min(Number(tempQty[r.id] || 1), Number(r.capacity || 0)))}
                                  onChange={(e) => {
                                    const v = Math.max(1, Math.min(Number(e.target.value as number || 1), Number(r.capacity || 0)));
                                    setTempQty(prev => ({ ...prev, [r.id]: v }));
                                  }}
                                  sx={{ minWidth: 90 }}
                                >
                                  {Array.from({ length: Math.max(1, Number(r.capacity || 0)) }, (_, i) => i + 1).map(n => (
                                    <MenuItem key={n} value={n}>{n}间</MenuItem>
                                  ))}
                                </Select>
                                <Button variant="contained" size="small" onClick={() => handleBook(r)}>确定</Button>
                              </>
                            )}
                            {userBookedQty[r.id] && (
                              <>
                                <Typography color="text.secondary">已预订：{userBookedQty[r.id]}</Typography>
                                <Button variant="outlined" size="small" onClick={() => handleCancel(r)}>取消</Button>
                              </>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}
      {!loading && !hotel && <Typography>未找到该酒店</Typography>}
    </Container>
  );
};

export default HotelDetailPage;
