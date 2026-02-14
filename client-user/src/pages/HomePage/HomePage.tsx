// 酒店查询页（首页）
// 作用：提供城市/日期/人数/价格/星级等筛选，并跳转到列表页；顶部动态展示酒店图片，可点击进入详情
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Slider,
  Chip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import DateRangeSheet from '../../components/DateRangeSheet/DateRangeSheet';
import { searchHotels, fetchAmenities, fetchAllPromotions } from '../../services/hotelService';
import { HotelListItem } from '../../types';

const HomePage: React.FC = () => {
  // 城市/关键词（我的位置）
  const [keyword, setKeyword] = useState<string>('');
  const [locLabel, setLocLabel] = useState<string>('我的位置');
  const [locing, setLocing] = useState<boolean>(false);
  // 入住/退房日期
  const [checkIn, setCheckIn] = useState<Date | null>(new Date());
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  // 房间与人数（0 表示不限）
  const [rooms, setRooms] = useState<number>(0);
  const [guests, setGuests] = useState<number>(0);
  // 星级筛选
  const [stars, setStars] = useState<number | ''>('');
  // 价格区间
  const [priceRange, setPriceRange] = useState<number[]>([100, 750]);
  // 价格/星级弹层
  const [panelOpen, setPanelOpen] = useState<boolean>(false);
  const [tempMin, setTempMin] = useState<number>(priceRange[0]);
  const [tempMax, setTempMax] = useState<number>(priceRange[1]);
  const [tempStars, setTempStars] = useState<number>(stars === '' ? 0 : Number(stars));
  // 顶部酒店轮播
  const [heroHotels, setHeroHotels] = useState<HotelListItem[]>([]);
  const [heroIndex, setHeroIndex] = useState<number>(0);
  const heroTimerRef = useRef<number | null>(null);
  const draggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number | null>(null);
  const dragDeltaRef = useRef<number>(0);
  const heroImage = useMemo(() => {
    const h = heroHotels[heroIndex];
    return h?.primary_image || 'https://via.placeholder.com/640x240?text=Hotel';
  }, [heroHotels, heroIndex]);
  const [promotions, setPromotions] = useState<Array<{ id: number; hotel_id: number; name: string; discount_type: string; discount_value: number; start_date: string; end_date: string; description?: string }>>([]);
  const [promoIndex, setPromoIndex] = useState<number>(0);
  const promoTimerRef = useRef<number | null>(null);
  // 文字搜索与联想
  const [searchText, setSearchText] = useState<string>('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<HotelListItem[]>([]);
  const [showSuggest, setShowSuggest] = useState<boolean>(false);
  const [typingId, setTypingId] = useState<number | null>(null);
  const [homeCalOpen, setHomeCalOpen] = useState<boolean>(false);
  const [homeCalendarPhase, setHomeCalendarPhase] = useState<'start' | 'end'>('start');
  const [homeTempEnd, setHomeTempEnd] = useState<Date | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(1);
  const [tempDistanceKm, setTempDistanceKm] = useState<number>(1);
  const [showLocateDialog, setShowLocateDialog] = useState<boolean>(false);

  // 导航跳转
  const navigate = useNavigate();

  // 顶部酒店轮播数据
  useEffect(() => {
    (async () => {
      try {
        const resp = await searchHotels({ sort: 'starDesc', page: 1, pageSize: 5 });
        setHeroHotels(resp.items || []);
        const tags = await fetchAmenities();
        setAmenities(tags.amenities || []);
        const pr = await fetchAllPromotions();
        const now = new Date();
        const list = (pr.promotions || []).filter((p: any) => {
          const sd = p.start_date ? new Date(p.start_date) : null;
          const ed = p.end_date ? new Date(p.end_date) : null;
          return sd && ed && now >= sd && now <= ed;
        });
        setPromotions(list);
      } catch (_) {
        setHeroHotels([]);
        setAmenities([]);
        setPromotions([]);
      }
    })();
  }, []);
  useEffect(() => {
    const start = () => {
      const id = window.setInterval(() => {
        setHeroIndex(prev => {
          const n = heroHotels.length;
          if (n === 0) return 0;
          return (prev + 1) % n;
        });
      }, 3000);
      heroTimerRef.current = id;
    };
    start();
    return () => {
      if (heroTimerRef.current != null) {
        window.clearInterval(heroTimerRef.current);
        heroTimerRef.current = null;
      }
    };
  }, [heroHotels.length]);
  useEffect(() => {
    if (promoTimerRef.current != null) {
      window.clearInterval(promoTimerRef.current);
      promoTimerRef.current = null;
    }
    if (promotions.length > 0) {
      const id = window.setInterval(() => {
        setPromoIndex(prev => (prev + 1) % promotions.length);
      }, 3500);
      promoTimerRef.current = id;
    }
    return () => {
      if (promoTimerRef.current != null) {
        window.clearInterval(promoTimerRef.current);
        promoTimerRef.current = null;
      }
    };
  }, [promotions.length]);

  // 点击轮播进入详情
  const handleHeroClick = () => {
    const h = heroHotels[heroIndex];
    if (draggingRef.current) return;
    if (Math.abs(dragDeltaRef.current) > 5) return;
    if (h) navigate(`/hotels/${h.id}`);
  };
  const onHeroMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (heroTimerRef.current != null) {
      window.clearInterval(heroTimerRef.current);
      heroTimerRef.current = null;
    }
    draggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragDeltaRef.current = 0;
  };
  const onHeroMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current || dragStartXRef.current == null) return;
    dragDeltaRef.current = e.clientX - dragStartXRef.current;
  };
  const finalizeDrag = () => {
    if (!draggingRef.current) return;
    const dx = dragDeltaRef.current;
    const n = heroHotels.length;
    if (n > 0) {
      if (dx <= -50) {
        setHeroIndex(prev => (prev - 1 + n) % n);
      } else if (dx >= 50) {
        setHeroIndex(prev => (prev + 1) % n);
      }
    }
    draggingRef.current = false;
    dragStartXRef.current = null;
    dragDeltaRef.current = 0;
    if (heroTimerRef.current == null) {
      const id = window.setInterval(() => {
        setHeroIndex(prev => {
          const nn = heroHotels.length;
          if (nn === 0) return 0;
          return (prev + 1) % nn;
        });
      }, 3000);
      heroTimerRef.current = id;
    }
  };
  // 搜索联想
  useEffect(() => {
    if (typingId) window.clearTimeout(typingId);
    const id = window.setTimeout(async () => {
      const q = searchText.trim();
      if (!q) {
        setSuggestions([]);
        setShowSuggest(false);
        return;
      }
      try {
        const resp = await searchHotels({ keyword: q, page: 1, pageSize: 5, sort: 'starDesc' });
        setSuggestions(resp.items || []);
        setShowSuggest(true);
      } catch {
        setSuggestions([]);
        setShowSuggest(false);
      }
    }, 250);
    setTypingId(id as any);
    return () => window.clearTimeout(id);
  }, [searchText]);

  // 定位：显示省市（优先），失败时回退经纬度
  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocLabel('定位不可用');
      return;
    }
    setLocing(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude);
        setUserLng(longitude);
        try {
          const resp = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=zh`);
          console.log(resp);
          const data = await resp.json();
          const province = data.principalSubdivision || '';
          const city = data.city;
          const country = data.locality;
          const label = [province, city].filter(Boolean).join(' ');
          setLocLabel(label || '已定位');
          if (label) setSearchText(label);
        } catch (_) {
          setLocLabel('已定位');
        }
        setLocing(false);
      },
      () => {
        setLocLabel('定位失败');
        setLocing(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // 执行搜索：将筛选条件拼入查询参数并跳转列表页
  const handleSearch = () => {
    // 将日期格式化为 YYYY-MM-DD
    const fmt = (d: Date | null) =>
      d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : undefined;

    const params = new URLSearchParams();
    if (searchText) params.set('keyword', searchText);
    if (selectedTags.length) params.set('amenities', selectedTags.join(','));
    if (checkIn) params.set('check_in', fmt(checkIn)!);
    if (checkOut) params.set('check_out', fmt(checkOut)!);
    params.set('minPrice', String(priceRange[0]));
    params.set('maxPrice', String(priceRange[1]));
    if (stars !== '') params.set('stars', String(stars));
    if (rooms > 0) params.set('rooms', String(rooms));
    if (guests > 0) params.set('guests', String(guests));
    if (distanceKm > 0 && userLat != null && userLng != null) {
      params.set('userLat', String(userLat));
      params.set('userLng', String(userLng));
      params.set('maxDistanceKm', String(distanceKm));
    }
    params.set('sort', 'priceAsc');
    params.set('page', '1');
    params.set('pageSize', '5');

    // 跳转到酒店列表页
    navigate(`/hotels?${params.toString()}`);
  };

  return (
    <Container maxWidth="md" className="home-container">
      <Box className={`blur-wrap ${homeCalOpen || panelOpen ? 'blurred' : ''}`}>
        {/* 顶部动态酒店图片 */}
        <Box
          className="hero"
          onClick={handleHeroClick}
          onMouseDown={onHeroMouseDown}
          onMouseMove={onHeroMouseMove}
          onMouseUp={finalizeDrag}
          onMouseLeave={finalizeDrag}
          role="button"
          aria-label="推荐酒店"
        >
          {heroHotels.length === 0 ? (
            <Skeleton variant="rectangular" className="hero-img" />
          ) : (
            <img className="hero-img" src={heroImage} alt="推荐酒店" />
          )}
          <Box className="hero-dots" aria-hidden="true">
            {heroHotels.map((_, i) => (
              <span key={i} className={`dot ${i === heroIndex ? 'active' : ''}`} />
            ))}
          </Box>
        </Box>
        {promotions.length > 0 && (
          <Box className="promo-banner" onClick={() => navigate(`/hotels/${promotions[promoIndex].hotel_id}`)} role="button" aria-label="促销活动">
            <Box className="promo-item">
              <Typography className="promo-title">{promotions[promoIndex].name}</Typography>
              {promotions[promoIndex].description && (
                <Typography className="promo-desc" color="text.secondary">{promotions[promoIndex].description}</Typography>
              )}
              <Button className="promo-cta" variant="contained" size="small">去看看</Button>
            </Box>
            <Box className="promo-dots" aria-hidden="true">
              {promotions.map((_, i) => (
                <span key={`pd-${i}`} className={`dot ${i === promoIndex ? 'active' : ''}`} />
              ))}
            </Box>
          </Box>
        )}

        {/* 搜索区域：按截图结构 */}
        <Box className="search-card" p={2}>
          {/* 文字搜索框与联想 */}
          <Box className="row search-input-row" position="relative">
            <TextField
              fullWidth
              placeholder="输入城市/酒店"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={() => setShowSuggest(suggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            />
            {showSuggest && suggestions.length > 0 && (
              <Box className="suggest-panel">
                {suggestions.map(s => (
                  <Button
                    key={s.id}
                    className="suggest-item"
                    onMouseDown={() => {
                      setSearchText(s.name_zh);
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
          {/* 位置与定位按钮 */}
          <Box className="row location-row" display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Chip label={locLabel} color="default" />
              <Typography color="text.secondary">{searchText ? searchText : '位置/品牌/酒店'}</Typography>
            </Box>
            <Button size="small" variant="outlined" onClick={handleLocate} disabled={locing}>
              {locing ? '定位中...' : '定位'}
            </Button>
          </Box>
          {/* 入住/离店日期（底部弹出与二次点击选择） */}
          <Box className="row date-row" display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle2">日期</Typography>
              <Typography color="text.secondary">
                {(checkIn ? `${String(checkIn.getMonth() + 1).padStart(2, '0')}-${String(checkIn.getDate()).padStart(2, '0')}` : '--')}
                {' 至 '}
                {(checkOut ? `${String(checkOut.getMonth() + 1).padStart(2, '0')}-${String(checkOut.getDate()).padStart(2, '0')}` : '--')}
              </Typography>
            </Box>
            <Button variant="outlined" onClick={() => setHomeCalOpen(true)}>选择日期</Button>
          </Box>
          {/* 价格/星级 行，点击弹出面板 */}
          <Box className="row" display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2">价格/星级/距离</Typography>
            <Button variant="outlined" onClick={() => {
              setTempMin(priceRange[0]);
              setTempMax(priceRange[1]);
              setTempStars(stars === '' ? 0 : Number(stars));
              setTempDistanceKm(distanceKm);
              if (userLat == null || userLng == null) {
                setShowLocateDialog(true);
                return;
              }
              setPanelOpen(true);
            }}>
              选择
            </Button>
          </Box>
          {/* 快捷标签筛选 */}
          {amenities.length > 0 && (
            <Box className="row" display="flex" flexWrap="wrap" gap={1} mt={1}>
              {amenities.map(t => {
                const active = selectedTags.includes(t);
                return (
                  <Chip
                    key={t}
                    label={t}
                    color={active ? 'primary' : 'default'}
                    onClick={() => {
                      setSelectedTags(prev => active ? prev.filter(x => x !== t) : [...prev, t]);
                    }}
                    size="small"
                  />
                )
              })}
            </Box>
          )}
          {/* 搜索按钮 */}
          <Box mt={2}>
            <Button variant="contained" color="primary" fullWidth onClick={handleSearch}>
              查询
            </Button>
          </Box>
        </Box>
      </Box>

      {homeCalOpen && (
        <DateRangeSheet
          open={homeCalOpen}
          onClose={() => setHomeCalOpen(false)}
          checkIn={checkIn}
          checkOut={checkOut}
          setCheckIn={(d) => setCheckIn(d)}
          setCheckOut={(d) => setCheckOut(d)}
          monthsShown={2}
          onAutoConfirm={() => handleSearch()}
        />
      )}

      {/* 底部弹层：价格/星级；同时加上上方虚化处理 */}
      {panelOpen && (
        <Box className="bottom-sheet" role="dialog" aria-label="选择价格/星级">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1">选择价格/星级</Typography>
            <Button onClick={() => setPanelOpen(false)}>✕</Button>
          </Box>
          <Typography variant="subtitle2">价格</Typography>
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
          <Typography variant="subtitle2">距离（公里）</Typography>
          <Box px={1}>
            <Slider
              value={tempDistanceKm}
              onChange={(_, v) => setTempDistanceKm(v as number)}
              valueLabelDisplay="auto"
              min={0}
              max={30}
              step={1}
            />
          </Box>
          <Box display="flex" justifyContent="space-between" gap={2}>
            <Button variant="outlined" onClick={() => { setTempMin(0); setTempMax(0); setTempStars(0); }}>
              清空
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setPriceRange([tempMin, tempMax || 750]);
                setStars(tempStars === 0 ? '' : tempStars);
                setDistanceKm(tempDistanceKm);
                setPanelOpen(false);
              }}
            >
              完成
            </Button>
          </Box>
        </Box>
      )}

      <Dialog open={showLocateDialog} onClose={() => setShowLocateDialog(false)}>
        <DialogTitle>需要定位</DialogTitle>
        <DialogContent>
          <Typography>请先点击“定位”按钮获取当前位置，以便按距离筛选。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLocateDialog(false)}>取消</Button>
          <Button onClick={() => { setShowLocateDialog(false); handleLocate(); }} variant="contained">去定位</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HomePage;
