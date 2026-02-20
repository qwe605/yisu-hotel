// 酒店列表页
// 作用：根据首页的筛选条件展示酒店列表，支持排序与分页
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './HotelListPage.css';
import {
  Container,
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Chip,
  Skeleton,
  Slider,
  Drawer,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
// MUI v7 使用 Grid（稳定版），使用 size 指定列宽
import Grid from '@mui/material/Grid';
import Rating from '@mui/material/Rating';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchHotels, fetchHotelListByFilter } from '../../services/hotelService';
import { HotelListItem, HotelSearchResult } from '../../types';
import DateRangeSheet from '../../components/DateRangeSheet/DateRangeSheet';
import favOff from '../../image/收藏-0.svg';
import favOn from '../../image/收藏-1.svg';
import { getMyProfile, updateMyCollect } from '../../services/userService';
import shareIcon from '../../image/分享.svg';
import mapIcon from '../../image/地图.svg';
import searchIcon from '../../image/搜索.svg';

// 读取查询字符串并转换为对象
function useQueryParams() {
  const { search } = useLocation();
  return useMemo(() => Object.fromEntries(new URLSearchParams(search)), [search]);
}

const HotelListPage: React.FC = () => {
  // 查询参数
  const q = useQueryParams();
  // 排序
  const [sort, setSort] = useState<string>(q.sort || 'priceAsc');
  // 数据与分页
  const [data, setData] = useState<HotelSearchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const page = Number(q.page || 1);
  const pageSize = Number(q.pageSize || 5);
  const navigate = useNavigate();
  // 核心条件筛选头状态
  const [cityName, setCityName] = useState<string>(q.city_name || '');
  const [cityId, setCityId] = useState<string>(q.city_id || '');
  const [cityInput, setCityInput] = useState<string>(q.city_name || '');
  const [citySuggest, setCitySuggest] = useState<string[]>([]);
  const [cityLoading, setCityLoading] = useState<boolean>(false);
  const [cityError, setCityError] = useState<string>('');
  const hotCities = ['北京', '上海', '广州', '深圳', '杭州', '武汉', '成都', '重庆', '西安', '南京', '天津', '苏州', '厦门', '青岛', '长沙', '郑州', '济南', '合肥', '福州', '宁波', '无锡', '南昌', '昆明', '大理', '桂林', '丽江', '海口', '三亚', '珠海', '佛山', '东莞', '沈阳', '大连', '哈尔滨', '长春', '呼和浩特', '乌鲁木齐', '南宁', '贵阳', '兰州', '西宁', '拉萨', '香港', '澳门'];
  const cityTypingRef = useRef<number | null>(null);
  const [suggestItems, setSuggestItems] = useState<HotelListItem[]>([]);
  const [showSuggest, setShowSuggest] = useState<boolean>(false);
  const [cityMatches, setCityMatches] = useState<string[]>([]);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const [selectedCities, setSelectedCities] = useState<string[]>(() => (q.cities ? String(q.cities).split(',').filter(Boolean) : []));
  const [checkIn, setCheckIn] = useState<Date>(() => {
    const d = q.check_in ? new Date(q.check_in) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [checkOut, setCheckOut] = useState<Date>(() => {
    const next = q.check_out ? new Date(q.check_out) : new Date(Date.now() + 24 * 3600 * 1000);
    next.setHours(0, 0, 0, 0);
    return next;
  });
  const [nights, setNights] = useState<number>(() => {
    const ms = (new Date(checkOut).getTime() - new Date(checkIn).getTime());
    return Math.max(1, Math.round(ms / (24 * 3600 * 1000)));
  });
  const [dateError, setDateError] = useState<string>('');
  const [nightsError, setNightsError] = useState<string>('');
  const [tabValue, setTabValue] = useState<string>('智能排序');
  const [tabLoading, setTabLoading] = useState<boolean>(false);
  const [panelOpen, setPanelOpen] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [tempMin, setTempMin] = useState<number>(q.minPrice ? Number(q.minPrice) : 0);
  const [tempMax, setTempMax] = useState<number>(q.maxPrice ? Number(q.maxPrice) : 0);
  const [tempStars, setTempStars] = useState<number>(q.stars ? Number(q.stars) : 0);
  const [tempRooms, setTempRooms] = useState<number>(q.rooms ? Number(q.rooms) : 0);
  const [tempGuests, setTempGuests] = useState<number>(q.guests ? Number(q.guests) : 0);
  const [tempDistanceKm, setTempDistanceKm] = useState<number>(q.maxDistanceKm ? Number(q.maxDistanceKm) : 0);
  const [titleOpacity, setTitleOpacity] = useState(0);
  const tabOptions = ['智能排序', '价格/星级/距离'];
  const [coreCalOpen, setCoreCalOpen] = useState<boolean>(false);
  const [calendarPhase, setCalendarPhase] = useState<'start' | 'end'>('start');
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  const searchDelayRef = useRef<number | null>(null);
  const [justSelectedEnd, setJustSelectedEnd] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const [collectIds, setCollectIds] = useState<number[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'info' | 'error'>('success');
  const [userLatState, setUserLatState] = useState<number | null>(q.userLat ? Number(q.userLat) : null);
  const [userLngState, setUserLngState] = useState<number | null>(q.userLng ? Number(q.userLng) : null);
  const watchIdRef = useRef<number | null>(null);
  const [selectedAmenityTags, setSelectedAmenityTags] = useState<string[]>(
    () => (q.amenities ? String(q.amenities).split(',').filter(Boolean) : [])
  );
  const handleToggleFavorite = (id: number) => {
    const next = !favorites[id];
    const before = collectIds;
    const after = next ? Array.from(new Set([...before, id])) : before.filter(x => x !== id);
    setFavorites(prev => ({ ...prev, [id]: next }));
    setCollectIds(after);
    const collectStr = after.join(',');
    updateMyCollect(collectStr)
      .then(() => {
        if (next) {
          setSnackbarMsg('收藏成功');
          setSnackbarSeverity('success');
        } else {
          setSnackbarMsg('已取消收藏');
          setSnackbarSeverity('info');
        }
        setSnackbarOpen(true);
      })
      .catch(() => {
        setFavorites(prev => ({ ...prev, [id]: !next }));
        setCollectIds(before);
        setSnackbarMsg('操作失败，请稍后重试');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      });
  };
  const handleShare = async (id: number) => {
    const url = `${window.location.origin}/hotels/${id}`;
    let ok = false;
    try {
      if (navigator.share) {
        await navigator.share({ title: '酒店', url });
        ok = true;
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        ok = true;
      }
    } catch (_) { ok = false; }
    setSnackbarMsg(ok ? '分享链接已复制' : '分享失败');
    setSnackbarSeverity(ok ? 'success' : 'error');
    setSnackbarOpen(true);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setSnackbarMsg('此浏览器不支持定位');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    setSnackbarMsg('正在定位...');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setUserLatState(latitude);
        setUserLngState(longitude);
        const params = new URLSearchParams(window.location.search);
        params.set('userLat', String(latitude));
        params.set('userLng', String(longitude));
        params.set('page', '1');
        params.set('pageSize', String(pageSize));
        navigate(`/hotels?${params.toString()}`);
        setSnackbarMsg('定位成功');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        try {
          const wid = navigator.geolocation.watchPosition(
            p => {
              setUserLatState(p.coords.latitude);
              setUserLngState(p.coords.longitude);
            },
            () => { },
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
          );
          watchIdRef.current = wid as any;
        } catch (_) { }
      },
      () => {
        setSnackbarMsg('定位失败');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // 吸顶透明度滚动监听（仅绑定一次）
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const t = Math.min(1, y / 160);
      setTitleOpacity(t);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const initCollect = async () => {
      try {
        const me = await getMyProfile();
        const ids = String(me.collect || '')
          .split(',')
          .map(x => Number(x))
          .filter(n => Number.isFinite(n));
        setCollectIds(ids);
        if (ids.length) {
          const map: Record<number, boolean> = {};
          ids.forEach(i => { map[i] = true; });
          setFavorites(map);
        }
      } catch {
      }
    };
    initCollect();
  }, []);
  // 卸载时清理定位监听
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current);
        } catch (_) { }
      }
    };
  }, []);

  // 恢复核心条件筛选头状态自 URL
  useEffect(() => {
    if (q.city_name) setCityName(q.city_name);
    if (q.city_id) setCityId(q.city_id);
    if (q.city_name) setCityInput(q.city_name);
    if (q.check_in) {
      const ci = new Date(q.check_in);
      ci.setHours(0, 0, 0, 0);
      setCheckIn(ci);
    }
    if (q.check_out) {
      const co = new Date(q.check_out);
      co.setHours(0, 0, 0, 0);
      setCheckOut(co);
    }
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    setNights(Math.max(1, Math.round(ms / (24 * 3600 * 1000))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (q.userLat && q.userLng) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const params = new URLSearchParams(window.location.search);
        params.set('userLat', String(latitude));
        params.set('userLng', String(longitude));
        params.set('page', '1');
        params.set('pageSize', String(pageSize));
        navigate(`/hotels?${params.toString()}`);
      },
      () => { },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // 进入页面不再重新定位，直接使用首页传入的查询参数
  // 城市防抖搜索
  useEffect(() => {
    if (cityTypingRef.current) window.clearTimeout(cityTypingRef.current);
    const id = window.setTimeout(async () => {
      const qtext = cityInput.trim();
      if (!qtext) {
        setSuggestItems([]);
        setShowSuggest(true);
        setCityMatches(hotCities);
        return;
      }
      setCityLoading(true);
      try {
        const resp = await searchHotels({ keyword: qtext, page: 1, pageSize: 6, sort: 'starDesc' });
        const items: HotelListItem[] = resp.items || [];
        setSuggestItems(items);
        setShowSuggest(items.length > 0);
        const cities = new Set<string>();
        items.forEach(it => {
          const addr = it.address || '';
          const m = addr.match(/([\u4e00-\u9fa5]{2,})(?:市|州|县|区)/);
          if (m && m[1]) cities.add(m[1]);
        });
        const fromHot = hotCities.filter(c => c.includes(qtext));
        setCityMatches([...Array.from(cities), ...fromHot]);
      } catch (_) {
        setSuggestItems([]);
        setShowSuggest(false);
        setCityMatches(hotCities.filter(c => c.includes(qtext)));
      } finally {
        setCityLoading(false);
      }
    }, 250);
    cityTypingRef.current = id as any;
    return () => window.clearTimeout(id);
  }, [cityInput]);
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!showSuggest) return;
      const el = searchWrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [showSuggest]);

  // 校验并更新离店日期
  useEffect(() => {
    if (checkOut.getTime() <= checkIn.getTime()) {
      const fixed = new Date(checkIn.getTime() + 24 * 3600 * 1000);
      fixed.setHours(0, 0, 0, 0);
      setCheckOut(fixed);
      setDateError('离店日期必须晚于入住日期');
    } else {
      setDateError('');
    }
    const ms = checkOut.getTime() - checkIn.getTime();
    setNights(Math.max(1, Math.round(ms / (24 * 3600 * 1000))));
  }, [checkIn, checkOut]);

  // 间夜数变化时同步离店日期
  useEffect(() => {
    if (nights < 1 || nights > 30) {
      setNightsError('间夜数范围为 1–30');
    } else {
      setNightsError('');
      const co = new Date(checkIn.getTime() + nights * 24 * 3600 * 1000);
      co.setHours(0, 0, 0, 0);
      setCheckOut(co);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nights]);
  // 卸载时清理延迟搜索定时器
  useEffect(() => {
    return () => {
      if (searchDelayRef.current) {
        window.clearTimeout(searchDelayRef.current);
      }
    };
  }, []);
  // 第二次点击（选择离店）后延迟触发搜索
  useEffect(() => {
    if (justSelectedEnd) {
      if (searchDelayRef.current) window.clearTimeout(searchDelayRef.current);
      searchDelayRef.current = window.setTimeout(() => {
        handleCoreSearch();
        setJustSelectedEnd(false);
      }, 1000) as any;
    }
  }, [justSelectedEnd, checkOut]);

  // 拉取数据（依赖查询参数与排序变化）
  useEffect(() => {
    const fetchData = async () => {
      console.log('查询参数:', q);
      setLoading(true);
      try {
        let resp = await searchHotels({
          keyword: q.keyword,
          check_in: q.check_in,
          check_out: q.check_out,
          minPrice: q.minPrice ? Number(q.minPrice) : undefined,
          maxPrice: q.maxPrice ? Number(q.maxPrice) : undefined,
          stars: q.stars ? Number(q.stars) : undefined,
          rooms: q.rooms ? Number(q.rooms) : undefined,
          guests: q.guests ? Number(q.guests) : undefined,
          userLat: q.userLat ? Number(q.userLat) : undefined,
          userLng: q.userLng ? Number(q.userLng) : undefined,
          maxDistanceKm: q.maxDistanceKm ? Number(q.maxDistanceKm) : undefined,
          amenities: q.amenities ? String(q.amenities) : undefined,
          sort: sort as any,
          page,
          pageSize
        });
        if (q.cities) {
          const arr = String(q.cities).split(',').filter(Boolean);
          resp = {
            ...resp,
            items: (resp.items || []).filter(it => {
              const addr = it.address || '';
              const name = it.name_zh || '';
              return arr.some(c => addr.includes(c) || name.includes(c));
            })
          };
        }
        if (q.amenities) {
          const need = String(q.amenities).split(',').filter(Boolean);
          if (need.length) {
            resp = {
              ...resp,
              items: (resp.items || []).filter(it => {
                const tags = it.amenities || [];
                return need.every(t => tags.includes(t));
              })
            };
          }
        }
        console.log('获取酒店列表成功:', resp);
        setData(resp);
      } catch (error) {
        console.error('获取酒店列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [q.keyword, q.check_in, q.check_out, q.minPrice, q.maxPrice, q.stars, q.rooms, q.guests, q.maxDistanceKm, q.amenities, sort, page, pageSize]);

  const amenityOptions = useMemo(() => {
    const set = new Set<string>();
    (data?.items || []).forEach(it => {
      (it.amenities || []).forEach(t => set.add(t));
    });
    return Array.from(set).slice(0, 20);
  }, [data?.items]);

  // 顶部 Tab 点击事件
  const handleTabClick = (tab: string) => {
    setTabValue(tab);
    setPanelOpen(prev => (prev === tab ? null : tab));
  };
  const handleClearParam = (key: string) => {
    const params = new URLSearchParams(window.location.search);
    params.delete(key);
    params.set('page', '1');
    params.set('pageSize', String(pageSize));
    navigate(`/hotels?${params.toString()}`);
  };

  const handleClearAll = () => {
    const keep = ['sort', 'page', 'pageSize'];
    const params = new URLSearchParams();
    params.set('sort', sort);
    params.set('page', '1');
    params.set('pageSize', String(pageSize));
    if (q.userLat) params.set('userLat', String(q.userLat));
    if (q.userLng) params.set('userLng', String(q.userLng));
    navigate(`/hotels?${params.toString()}`);
  };

  // 去掉列表页定位功能，直接使用首页传入的 city_name 与经纬度参数

  // 核心条件：执行搜索并更新 URL
  const handleCoreSearch = () => {
    let valid = true;
    if (!cityName && !cityInput.trim()) { setCityError('城市或关键词不能为空'); valid = false; }
    if (checkOut.getTime() <= checkIn.getTime()) { setDateError('离店日期必须晚于入住日期'); valid = false; }
    if (nights < 1) { setNightsError('间夜数需≥1'); valid = false; }
    if (!valid) return;
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const params = new URLSearchParams(window.location.search);
    if (cityName) {
      params.set('city_name', cityName);
      params.set('city_id', cityId || cityName);
    } else {
      params.delete('city_name');
      params.delete('city_id');
    }
    if (cityInput.trim()) {
      params.set('keyword', cityInput.trim());
    } else {
      params.delete('keyword');
    }
    if (selectedCities.length) {
      params.set('cities', selectedCities.join(','));
    } else {
      params.delete('cities');
    }
    params.set('check_in', fmt(checkIn));
    params.set('check_out', fmt(checkOut));
    params.set('nights', String(nights));
    params.set('page', '1');
    params.set('pageSize', String(pageSize));
    navigate(`/hotels?${params.toString()}`);
  };

  // 渲染单个酒店卡片
  const renderCard = (h: HotelListItem) => {
    { console.log(h); }
    return (
      <Grid size={{ xs: 12, sm: 12 }} key={h.id}>
        <Card className="hotel-card" onClick={() => navigate(`/hotels/${h.id}`)} sx={{ cursor: 'pointer' }}>
          <Box className="card-top-right">
            <Button
              variant="outlined"
              size="small"
              aria-label="收藏"
              onClick={(e) => { e.stopPropagation(); handleToggleFavorite(h.id); }}
              sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}
            >
              <img src={favorites[h.id] ? favOn : favOff} alt="收藏" style={{ width: 24, height: 24 }} />
              <Typography variant="caption">收藏</Typography>
            </Button>
            <Button
              variant="outlined"
              size="small"
              aria-label="分享"
              onClick={(e) => { e.stopPropagation(); handleShare(h.id); }}
              sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}
            >
              <img src={shareIcon} alt="分享" style={{ width: 24, height: 24 }} />
              <Typography variant="caption">分享</Typography>
            </Button>
          </Box>
          <CardMedia
            className="hotel-image"
            component="img"
            loading="lazy"
            src={h.primary_image || 'https://via.placeholder.com/280x200?text=Hotel'}
            alt={`${h.name_zh} 图片`}
          />
          <CardContent className="hotel-content">
            <Typography variant="h6">
              {h.name_zh} <Typography component="span" color="text.secondary">({h.name_en})</Typography>
            </Typography>
            <Typography color="text.secondary" className="hotel-address">{h.address}</Typography>
            <Box className="hotel-star">
              <Rating value={Number(h.star_rating) || 0} precision={0.5} readOnly aria-label={`星级 ${h.star_rating}`} />
              <Typography component="span">{Number(h.star_rating).toFixed(1)} 星</Typography>
            </Box>
            {!!h.amenities?.length && (
              <Box className="amenities-row">
                {h.amenities.slice(0, 6).map((t, idx) => (
                  <Chip key={`${h.id}-am-${idx}-${t}`} label={t} size="small" className="amenity-chip" />
                ))}
              </Box>
            )}
            {(q.userLat && q.userLng && h.distance_km != null) && (
              <Typography color="text.secondary">距你{Number(h.distance_km).toFixed(1)} km</Typography>
            )}
          </CardContent>
          <CardActions className="hotel-actions">
            <Box className="hotel-actions-right">
              <Box className="price-block">
                <Box className="price-row">
                  <span className="price-currency">¥</span>
                  <span className="price-value">{h.min_price ?? '--'}</span>
                  <span className="price-suffix">起</span>
                </Box>
              </Box>
            </Box>
          </CardActions>
        </Card>
      </Grid>
    );
  };

  return (
    <Container maxWidth="md" className="list-container">
      <Box className="top-controls-sticky">
        {/* 核心条件筛选头 */}
        <Box className="core-header pill" sx={{ p: 1.5, mb: 1 }}>
          <Box className="core-row">
            <Button className="back-icon" aria-label="返回" onClick={() => navigate('/home')} sx={{ minWidth: 24, p: 0 }} />
            <Button
              className="loc-link"
              onClick={handleLocateMe}
              aria-label={`我的位置：${(userLatState != null && userLngState != null) ? `${userLatState.toFixed(4)},${userLngState.toFixed(4)}` : '未知'}`}
            >
              位置
            </Button>
            <span className="divider" aria-hidden="true" />
            <Button
              className="date-pill"
              onClick={() => { setCalendarPhase('start'); setCoreCalOpen(true); }}
              aria-label="选择入住与离店日期"
            >
              <div className="date-col">
                <div className="date-row">
                  <span className="date-label">住</span>
                  <span className="date-value">{String(checkIn.getMonth() + 1).padStart(2, '0')}-{String(checkIn.getDate()).padStart(2, '0')}</span>
                </div>
                <div className="date-row">
                  <span className="date-label">离</span>
                  <span className="date-value">{String(checkOut.getMonth() + 1).padStart(2, '0')}-{String(checkOut.getDate()).padStart(2, '0')}</span>
                </div>
              </div>
              <div className="nights-col">
                <span className="night-badge">{nights}晚</span>
              </div>
            </Button>
            <span className="divider" aria-hidden="true" />
            <Box className="search-wrap" ref={searchWrapRef}>
              <img src={searchIcon} alt="搜索" style={{ width: 24, height: 24 }} />
              <input
                className="search-input"
                placeholder="城市/酒店/地标"
                aria-label="城市输入"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCoreSearch(); }}
              />
              {!!cityInput && (
                <button className="clear-btn" aria-label="清空" onClick={() => setCityInput('')}>×</button>
              )}
              {showSuggest && (
                <Box className="suggest-panel">
                  <Box className="suggest-section">
                    <div className="suggest-title">{cityInput.trim() ? '城市' : '热门城市'}</div>
                    <div className="suggest-cities">
                      {(cityInput.trim() ? cityMatches : hotCities).slice(0, 8).map(c => (
                        <Button
                          key={`c-${c}`}
                          className="suggest-city"
                          onMouseDown={() => {
                            setCityName(c);
                            setCityId(c);
                            setCityInput(c);
                            setShowSuggest(false);
                          }}
                        >
                          {c}
                        </Button>
                      ))}
                    </div>
                  </Box>
                  {suggestItems.map(s => (
                    <Button
                      key={s.id}
                      className="suggest-item"
                      onMouseDown={() => {
                        const text = s.name_zh || s.address || '';
                        setCityInput(text);
                        setShowSuggest(false);
                      }}
                    >
                      <span className="suggest-name">{s.name_zh}</span>
                      <span className="suggest-addr">{s.address}</span>
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
            <Box
              className="map-group"
              role="button"
              tabIndex={0}
              aria-label="地图"
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                navigate(`/map?${params.toString()}`);
              }}
            >
              <img src={mapIcon} alt="地图" style={{ width: 24, height: 24 }} />
              <span className="map-label">地图</span>
            </Box>
            <Button className="search-btn" variant="contained" onClick={handleCoreSearch} aria-label="搜索">搜索</Button>
          </Box>
          {cityError && <Typography color="error" variant="caption" sx={{ mt: .5 }}>{cityError}</Typography>}
          {dateError && <Typography color="error" variant="caption" sx={{ mt: .5 }}>{dateError}</Typography>}
          {nightsError && <Typography color="error" variant="caption" sx={{ mt: .5 }}>{nightsError}</Typography>}
        </Box>

        {coreCalOpen && (
          <DateRangeSheet
            open={coreCalOpen}
            onClose={() => setCoreCalOpen(false)}
            checkIn={checkIn}
            checkOut={checkOut}
            setCheckIn={(d) => setCheckIn(d as Date)}
            setCheckOut={(d) => setCheckOut(d as Date)}
            monthsShown={2}
            onAutoConfirm={() => handleCoreSearch()}
          />
        )}
        {/* 顶部筛选与排序区 */}
        {/* 顶部选项筛选 Tab */}
        <Box className="tab-bar" role="tablist" aria-label="筛选项">
          {tabOptions.map(t => (
            <Button
              key={t}
              role="tab"
              aria-selected={panelOpen === t}
              className={`tab-item ${panelOpen === t ? 'active' : ''}`}
              onClick={() => handleTabClick(t)}
            >
              <span>{t}</span>
              <span className={`tab-arrow ${panelOpen === t ? 'up' : 'down'}`} aria-hidden="true">▾</span>
            </Button>
          ))}
          <Button className="tab-item" onClick={() => setAdvancedOpen(true)}>高级筛选</Button>
        </Box>
        {/* 当前筛选标签（吸顶区域内） */}
        <Box className="filter-tags-wrap">
          <Box display="flex" flexWrap="wrap" gap={1} mb={1} aria-label="当前筛选">
            {q.keyword && <Chip label={`关键词：${q.keyword}`} onDelete={() => handleClearParam('keyword')} />}
            {q.cities && String(q.cities).split(',').filter(Boolean).map((c) => (
              <Chip key={`city-${c}`} label={`城市：${c}`} onDelete={() => {
                const arr = String(q.cities).split(',').filter(Boolean).filter(x => x !== c);
                const params = new URLSearchParams(window.location.search);
                if (arr.length) params.set('cities', arr.join(',')); else params.delete('cities');
                params.set('page', '1');
                params.set('pageSize', String(pageSize));
                navigate(`/hotels?${params.toString()}`);
              }} />
            ))}
            {q.amenities && String(q.amenities).split(',').filter(Boolean).map((t) => (
              <Chip key={`amenity-${t}`} label={`标签：${t}`} onDelete={() => {
                const arr = String(q.amenities).split(',').filter(Boolean).filter(x => x !== t);
                const params = new URLSearchParams(window.location.search);
                if (arr.length) params.set('amenities', arr.join(',')); else params.delete('amenities');
                params.set('page', '1');
                params.set('pageSize', String(pageSize));
                navigate(`/hotels?${params.toString()}`);
              }} />
            ))}
            {q.check_in && <Chip label={`入住：${q.check_in}`} onDelete={() => handleClearParam('check_in')} />}
            {q.check_out && <Chip label={`离店：${q.check_out}`} onDelete={() => handleClearParam('check_out')} />}
            {q.minPrice && <Chip label={`最低价：${q.minPrice}`} onDelete={() => handleClearParam('minPrice')} />}
            {q.maxPrice && <Chip label={`最高价：${q.maxPrice}`} onDelete={() => handleClearParam('maxPrice')} />}
            {q.stars && <Chip label={`星级≥：${q.stars}`} onDelete={() => handleClearParam('stars')} />}
            {q.rooms && <Chip label={`房型数≥：${q.rooms}`} onDelete={() => handleClearParam('rooms')} />}
            {q.guests && <Chip label={`人数≥：${q.guests}`} onDelete={() => handleClearParam('guests')} />}
            {q.maxDistanceKm && q.userLat && q.userLng && <Chip label={`距离≤：${q.maxDistanceKm} km`} onDelete={() => handleClearParam('maxDistanceKm')} />}
            {(q.keyword || q.cities || q.amenities || q.check_in || q.check_out || q.minPrice || q.maxPrice || q.stars || q.rooms || q.guests || q.maxDistanceKm) && (
              <Chip color="primary" variant="outlined" label="清空所有" onClick={handleClearAll} />
            )}
          </Box>
        </Box>
      </Box>
      {tabLoading && <div className="tab-progress" aria-hidden="true" />}
      {/* 下拉面板：智能排序 */}
      {panelOpen === '智能排序' && (
        <Box className="filter-panel" aria-label="智能排序选项">
          <Box className="panel-list">
            <Button fullWidth variant={sort === 'priceAsc' ? 'contained' : 'text'} onClick={() => { setSort('priceAsc'); setPanelOpen(null); }}>
              低价优先
            </Button>
            <Button fullWidth variant={sort === 'priceDesc' ? 'contained' : 'text'} onClick={() => { setSort('priceDesc'); setPanelOpen(null); }}>
              高价优先
            </Button>
            <Button fullWidth variant={sort === 'starDesc' ? 'contained' : 'text'} onClick={() => { setSort('starDesc'); setPanelOpen(null); }}>
              高星优先
            </Button>
            {(q.userLat && q.userLng) && (
              <Button fullWidth variant={sort === 'distanceAsc' ? 'contained' : 'text'} onClick={() => { setSort('distanceAsc'); setPanelOpen(null); }}>
                距离优先
              </Button>
            )}
          </Box>
        </Box>
      )}
      <Drawer anchor="right" open={advancedOpen} onClose={() => setAdvancedOpen(false)}>
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6">高级筛选</Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2">距离（km）</Typography>
          <Box px={1} mb={1}>
            <Slider
              value={tempDistanceKm}
              onChange={(_, v) => setTempDistanceKm(v as number)}
              valueLabelDisplay="auto"
              min={0}
              max={30}
              step={1}
              disabled={!(q.userLat && q.userLng)}
            />
          </Box>
          <Typography variant="subtitle2">价格范围</Typography>
          <Box px={1} mb={1}>
            <Slider
              value={[tempMin, tempMax || 750]}
              onChange={(_, v) => {
                const [min, max] = v as number[];
                setTempMin(min);
                setTempMax(max === 750 ? 0 : max);
              }}
              valueLabelDisplay="auto"
              min={0}
              max={750}
              step={50}
            />
          </Box>
          <Typography variant="subtitle2">星级</Typography>
          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            {[0, 3, 4, 5].map(s => (
              <Button key={`as-${s}`} variant={tempStars === s ? 'contained' : 'outlined'} size="small" onClick={() => setTempStars(s)}>
                {s === 0 ? '不限' : `${s}★及以上`}
              </Button>
            ))}
          </Box>
          <Typography variant="subtitle2">人数</Typography>
          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            {[0, 1, 2, 3, 4].map(n => (
              <Button key={`ag-${n}`} variant={tempGuests === n ? 'contained' : 'outlined'} size="small" onClick={() => setTempGuests(n)}>
                {n === 0 ? '不限' : `${n}人及以上`}
              </Button>
            ))}
          </Box>
          <Typography variant="subtitle2">房型数量</Typography>
          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            {[0, 1, 2, 3].map(n => (
              <Button key={`ar-${n}`} variant={tempRooms === n ? 'contained' : 'outlined'} size="small" onClick={() => setTempRooms(n)}>
                {n === 0 ? '不限' : `${n}种及以上`}
              </Button>
            ))}
          </Box>
          <Typography variant="subtitle2">城市</Typography>
          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            {hotCities.map(c => {
              const active = selectedCities.includes(c);
              return (
                <Button
                  key={`adv-city-${c}`}
                  variant={active ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setSelectedCities(prev => active ? prev.filter(x => x !== c) : [...prev, c])}
                >
                  {c}
                </Button>
              );
            })}
          </Box>
          <Typography variant="subtitle2">标签</Typography>
          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            {amenityOptions.map(t => {
              const active = selectedAmenityTags.includes(t);
              return (
                <Button
                  key={`adv-am-${t}`}
                  variant={active ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setSelectedAmenityTags(prev => active ? prev.filter(x => x !== t) : [...prev, t])}
                >
                  {t}
                </Button>
              );
            })}
          </Box>
          <Box display="flex" gap={1}>
            <Button variant="outlined" onClick={() => { setTempMin(0); setTempMax(0); setTempStars(0); setTempGuests(0); setTempRooms(0); setTempDistanceKm(0); setSelectedCities([]); setSelectedAmenityTags([]); }}>
              重置
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                if (tempMin) params.set('minPrice', String(tempMin)); else params.delete('minPrice');
                if (tempMax) params.set('maxPrice', String(tempMax)); else params.delete('maxPrice');
                if (tempStars) params.set('stars', String(tempStars)); else params.delete('stars');
                if (tempRooms) params.set('rooms', String(tempRooms)); else params.delete('rooms');
                if (tempGuests) params.set('guests', String(tempGuests)); else params.delete('guests');
                if (selectedCities.length) params.set('cities', selectedCities.join(',')); else params.delete('cities');
                if (q.userLat && q.userLng) {
                  if (tempDistanceKm) params.set('maxDistanceKm', String(tempDistanceKm));
                  else params.delete('maxDistanceKm');
                }
                if (selectedAmenityTags.length) params.set('amenities', selectedAmenityTags.join(',')); else params.delete('amenities');
                params.set('page', '1');
                params.set('pageSize', String(pageSize));
                navigate(`/hotels?${params.toString()}`);
                setAdvancedOpen(false);
              }}
            >
              应用
            </Button>
          </Box>
        </Box>
      </Drawer>
      {/* 下拉面板：价格/星级 */}
      {panelOpen === '价格/星级/距离' && (
        <Box className="filter-panel" aria-label="价格与星级">
          <Typography variant="subtitle2">价格范围</Typography>
          <Box px={1}>
            <Slider
              value={[tempMin, tempMax || 750]}
              onChange={(_, v) => {
                const [min, max] = v as number[];
                setTempMin(min);
                setTempMax(max === 750 ? 0 : max);
              }}
              valueLabelDisplay="auto"
              min={0}
              max={750}
              step={50}
            />
          </Box>
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            {[
              [0, 150], [150, 200], [200, 250], [250, 300], [300, 450], [450, 600], [600, 750], [750, 0]
            ].map(([min, max]) => (
              <Button key={`${min}-${max}`} variant="outlined" size="small" onClick={() => { setTempMin(min); setTempMax(max); }}>
                {max === 0 ? '¥750以上' : `¥${min}-${max}`}
              </Button>
            ))}
          </Box>
          <Typography variant="subtitle2">星级</Typography>
          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            {[0, 3, 4, 5].map(s => (
              <Button key={s} variant={tempStars === s ? 'contained' : 'outlined'} size="small" onClick={() => setTempStars(s)}>
                {s === 0 ? '不限' : `${s}★及以上`}
              </Button>
            ))}
          </Box>
          <Typography variant="subtitle2">距离（km）</Typography>
          <Box px={1} mb={1}>
            <Slider
              value={tempDistanceKm}
              onChange={(_, v) => setTempDistanceKm(v as number)}
              valueLabelDisplay="auto"
              min={0}
              max={30}
              step={1}
              disabled={!(q.userLat && q.userLng)}
            />
          </Box>
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            {[0, 1, 3, 5, 10, 20, 30].map(d => (
              <Button
                key={`d-${d}`}
                variant={tempDistanceKm === d ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setTempDistanceKm(d)}
                disabled={!(q.userLat && q.userLng)}
              >
                {d === 0 ? '不限' : `${d} km`}
              </Button>
            ))}
          </Box>
          <Box className="panel-actions">
            <Button variant="outlined" onClick={() => { setTempMin(0); setTempMax(0); setTempStars(0); setTempDistanceKm(0); }}>
              清空
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                if (tempMin) params.set('minPrice', String(tempMin)); else params.delete('minPrice');
                if (tempMax) params.set('maxPrice', String(tempMax)); else params.delete('maxPrice');
                if (tempStars) params.set('stars', String(tempStars)); else params.delete('stars');
                if (q.userLat && q.userLng) {
                  if (tempDistanceKm) params.set('maxDistanceKm', String(tempDistanceKm));
                  else params.delete('maxDistanceKm');
                }
                params.set('page', '1');
                params.set('pageSize', String(pageSize));
                navigate(`/hotels?${params.toString()}`);
                setPanelOpen(null);
              }}
            >
              完成
            </Button>
          </Box>
        </Box>
      )}

      {/* 列表区 */}
      <Box>
        {loading && (
          <>
            <Typography>加载中...</Typography>
            <Grid container spacing={2} mt={1}>
              {[...Array(4)].map((_, i) => (
                <Grid size={{ xs: 12, sm: 6 }} key={i}>
                  <Card className="hotel-card">
                    <Skeleton variant="rectangular" className="hotel-image" />
                    <CardContent className="hotel-content">
                      <Skeleton variant="text" height={28} />
                      <Skeleton variant="text" height={20} />
                      <Skeleton variant="text" height={20} width="60%" />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
        {!loading && data && data.items.length === 0 && (
          <Box className="empty-state" aria-live="polite">
            <div className="empty-illustration" />
            <Typography className="empty-text">暂无数据</Typography>
          </Box>
        )}
        <Grid container spacing={2}>
          {data?.items.map(renderCard)}
          {!loading && data && data.total > 0 && (
            <Typography>共 {data.total} 家酒店</Typography>
          )}
        </Grid>
      </Box>

      {/* 分页区 */}
      {!loading && data && data.total > 0 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={Math.ceil(data.total / data.pageSize)}
            page={data.page}
            onChange={(_, value) => {
              const params = new URLSearchParams(window.location.search);
              params.set('page', String(value));
              params.set('pageSize', String(pageSize));
              navigate(`/hotels?${params.toString()}`);
            }}
            color="primary"
          />
        </Box>
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbarSeverity} onClose={() => setSnackbarOpen(false)} sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default HotelListPage;
