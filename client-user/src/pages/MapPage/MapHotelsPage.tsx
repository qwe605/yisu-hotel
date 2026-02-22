/** 
 * 地图酒店页（MapHotelsPage）
 * 
 * 功能概览：
 * - 顶部胶囊控件：返回、定位、日期选择、搜索
 * - 百度地图展示：用户位置、酒店价格标签、选中酒店的信息窗
 * - 底部酒店卡片：展示当前选中的酒店详情、图片轮播、收藏与分享
 * - 收藏同步：与个人收藏（用户表中的 collect 列）保持一致
 * 
 * 主要数据流：
 * - URL 查询参数（useLocation）→ useQuery：驱动搜索与初始中心点
 * - 地图交互（BMapGL）→ 更新中心点、价格标签、选中状态
 * - 选中酒店（selectedId）→ 拉取详情（getHotelDetail）→ 显示卡片与图片
 * - 收藏按钮 → 调用 updateMyCollect，成功后提示并更新本地 favorites/collectIds
 * 
 * 关键交互点：
 * - 图片区域支持单张轮播，自动轮播+左右切换；收藏/分享按钮位于图片下方，防止遮挡
 * - 地图价格标签可点击以切换选中酒店
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Container, Typography, Card, CardMedia, CardContent, Snackbar, Alert } from '@mui/material';
import { Map as BMapGLMap, Marker, NavigationControl, InfoWindow, MapApiLoaderHOC } from 'react-bmapgl';
import '../HotelListPage/HotelListPage.css';
import DateRangeSheet from '../../components/DateRangeSheet/DateRangeSheet';
import 'react-datepicker/dist/react-datepicker.css';
import { searchHotels, getHotelDetail } from '../../services/hotelService';
import { HotelDetail, HotelListItem } from '../../types';
import favOff from '../../image/收藏-0.svg';
import favOn from '../../image/收藏-1.svg';
import shareIcon from '../../image/分享.svg';
import searchIcon from '../../image/搜索.svg';
import { getMyProfile, updateMyCollect } from '../../services/userService';
import './MapHotelsPage.css';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => Object.fromEntries(new URLSearchParams(search)), [search]);
}

function getAK(): string {
  const envAK = (process.env as any).REACT_APP_BAIDU_MAP_AK;
  const lsAK = localStorage.getItem('BAIDU_MAP_AK');
  return (lsAK || envAK || 'dummy-ak') as string;
}

const MapHotelsPageInner: React.FC = () => {
  const q = useQuery();
  const navigate = useNavigate();
  const [userLat, setUserLat] = useState<number | null>(q.userLat ? Number(q.userLat) : null);
  const [userLng, setUserLng] = useState<number | null>(q.userLng ? Number(q.userLng) : null);
  const [center, setCenter] = useState<{ lng: number; lat: number } | null>(userLat && userLng ? { lng: userLng, lat: userLat } : null);
  const [keyword, setKeyword] = useState<string>(q.keyword || '');
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
  const nights = useMemo<number>(() => {
    const ms = (new Date(checkOut).getTime() - new Date(checkIn).getTime());
    return Math.max(1, Math.round(ms / (24 * 3600 * 1000)));
  }, [checkIn, checkOut]);
  const [coreCalOpen, setCoreCalOpen] = useState<boolean>(false);
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(q.selectedId ? Number(q.selectedId) : null);
  const [selectedDetail, setSelectedDetail] = useState<HotelDetail | null>(null);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const [collectIds, setCollectIds] = useState<number[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'info' | 'error'>('success');
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [akMissing, setAkMissing] = useState<boolean>(() => {
    const envAK = (process.env as any).REACT_APP_BAIDU_MAP_AK;
    const lsAK = localStorage.getItem('BAIDU_MAP_AK');
    return !(lsAK || envAK);
  });
  const mapRef = useRef<any>(null);
  const [wheelEnabled, setWheelEnabled] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<string>('');
  const [wheelSeen, setWheelSeen] = useState<boolean>(false);
  const mapWrapRef = useRef<HTMLDivElement | null>(null);
  const [methodInfo, setMethodInfo] = useState<Record<string, boolean>>({});
  const [overlayInfo, setOverlayInfo] = useState<Array<{ name: string; visible: boolean; pointerEvents: string; zIndex: string; interceptsCenter: boolean; rect: string }>>([]);
  const [lastTarget, setLastTarget] = useState<string>('');
  const [centerXY, setCenterXY] = useState<{ x: number; y: number } | null>(null);
  const bottomCardRef = useRef<HTMLDivElement | null>(null);
  const calendarMaskRef = useRef<HTMLDivElement | null>(null);
  const [centerHit, setCenterHit] = useState<string>('');
  const [imgIndex, setImgIndex] = useState<number>(0);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const doLocate = () => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          setUserLat(latitude);
          setUserLng(longitude);
          setCenter({ lng: longitude, lat: latitude });
        },
        () => { },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    };
    if (!userLat || !userLng) doLocate();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchList = async () => {
      try {
        const resp = await searchHotels({
          keyword: q.keyword,
          check_in: q.check_in,
          check_out: q.check_out,
          minPrice: q.minPrice ? Number(q.minPrice) : undefined,
          maxPrice: q.maxPrice ? Number(q.maxPrice) : undefined,
          stars: q.stars ? Number(q.stars) : undefined,
          rooms: q.rooms ? Number(q.rooms) : undefined,
          guests: q.guests ? Number(q.guests) : undefined,
          userLat: userLat || (q.userLat ? Number(q.userLat) : undefined),
          userLng: userLng || (q.userLng ? Number(q.userLng) : undefined),
          maxDistanceKm: q.maxDistanceKm ? Number(q.maxDistanceKm) : undefined,
          sort: 'distanceAsc',
          page: 1,
          pageSize: 100
        });
        if (cancelled) return;
        setHotels(Array.isArray((resp as any)?.items) ? (resp as any).items : []);
      } catch {
        if (cancelled) return;
      }
    };
    fetchList();
    return () => { cancelled = true; };
  }, [q.keyword, q.check_in, q.check_out, q.minPrice, q.maxPrice, q.stars, q.rooms, q.guests, q.userLat, q.userLng, q.maxDistanceKm, userLat, userLng]);

  useEffect(() => {
    const sid = q.selectedId ? Number(q.selectedId) : null;
    if (sid && hotels.length > 0) {
      const h = hotels.find(x => Number(x.id) === Number(sid));
      if (h && h.longitude != null && h.latitude != null) {
        setCenter({ lng: Number(h.longitude), lat: Number(h.latitude) });
      }
      setSelectedId(sid);
    }
  }, [q.selectedId, hotels]);

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
  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedId) return;
      try {
        const resp = await getHotelDetail(selectedId);
        setSelectedDetail(resp.hotel);
        setSelectedImages(resp.images || []);
        setSelectedFeatures((resp.features || []).map((f: any) => f?.name || String(f)).filter(Boolean));
      } catch {
        setSelectedDetail(null);
        setSelectedImages([]);
        setSelectedFeatures([]);
      }
    };
    loadDetail();
  }, [selectedId]);

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

  const userIcon = useMemo(() => {
    const B = (window as any).BMapGL;
    if (!B) return null;
    const svg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">
        <defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/><feOffset in="blur" dx="0" dy="2" result="offset"/>
          <feMerge><feMergeNode in="offset"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <path d="M13 0c6.075 0 11 4.925 11 11 0 7.5-11 21-11 21S2 18.5 2 11C2 4.925 6.925 0 13 0z" fill="#1677ff" filter="url(#s)"/>
        <circle cx="13" cy="11" r="6" fill="#1677ff" stroke="#ffffff" stroke-width="4"/>
      </svg>`
    );
    const url = `data:image/svg+xml;charset=utf-8,${svg}`;
    const icon = new B.Icon(url, new B.Size(26, 34), { imageSize: new B.Size(26, 34) });
    return icon;
  }, [mapReady]);

  // 图片画廊：以后台返回的 images 为数据源，缺失时降级为空数组
  const galleryImages = useMemo(() => {
    const imgs = Array.isArray(selectedImages) ? selectedImages : [];
    if (imgs.length > 0) return imgs;
    return [];
  }, [selectedImages]);
  // 切换选中酒店时，将轮播索引复位为第一张
  useEffect(() => { setImgIndex(0); }, [selectedImages]);
  // 当前展示图片：兼容后端返回的不同字段名（image_url/url/src）
  const currentImageSrc = useMemo(() => {
    const imgs = galleryImages;
    if (!imgs.length) return '';
    const img = imgs[Math.max(0, Math.min(imgIndex, imgs.length - 1))];
    return typeof img === 'string' ? img : (img?.image_url || img?.url || img?.src || '');
  }, [galleryImages, imgIndex]);
  // 轮播：上一张/下一张
  const gotoPrev = () => setImgIndex((i) => (galleryImages.length ? (i - 1 + galleryImages.length) % galleryImages.length : 0));
  const gotoNext = () => setImgIndex((i) => (galleryImages.length ? (i + 1) % galleryImages.length : 0));
  // 自动轮播：有多张图片时，每 3 秒切换一张
  useEffect(() => {
    if (!galleryImages.length || galleryImages.length <= 1) return;
    const t = setInterval(() => gotoNext(), 3000);
    return () => clearInterval(t);
  }, [galleryImages, selectedId]);

  const priceLabelsRef = useRef<Map<number, { label: any; click?: (e?: any) => void }>>(new Map());
  useEffect(() => {
    const map = mapRef.current;
    const B = (window as any).BMapGL;
    if (!map || !B || !Array.isArray(hotels)) return;
    priceLabelsRef.current.forEach(({ label, click }) => {
      try { if (click) label.removeEventListener?.('click', click); } catch (_) { }
      try { map.removeOverlay(label); } catch (_) { }
    });
    priceLabelsRef.current.clear();
    hotels.forEach((h) => {
      if (!h.latitude || !h.longitude) return;
      const pt = new B.Point(h.longitude, h.latitude);
      const label = new B.Label(`¥${Math.round(h.min_price || 0)}`, { position: pt, offset: new B.Size(0, -20) });
      label.setStyle({
        backgroundColor: '#ffffff',
        color: '#1677ff',
        border: '1px solid #1677ff',
        borderRadius: '16px',
        padding: '2px 6px',
        fontSize: '12px',
        fontWeight: '600',
        lineHeight: '16px'
      });
      map.addOverlay(label);
      let click: (e?: any) => void | undefined;
      if (typeof label.addEventListener === 'function') {
        click = () => {
          setSelectedId(h.id);
          if (h.longitude && h.latitude) setCenter({ lng: h.longitude, lat: h.latitude });
        };
        label.addEventListener('click', click);
      }
      priceLabelsRef.current.set(h.id, { label, click });
    });
  }, [hotels, mapReady]);
  useEffect(() => {
    const selected = selectedId;
    priceLabelsRef.current.forEach(({ label }, id: number) => {
      const sel = id === selected;
      const style = sel ? {
        backgroundColor: '#1677ff',
        color: '#ffffff',
        border: '1px solid #1677ff',
        borderRadius: '16px',
        padding: '2px 6px',
        fontSize: '13px',
        fontWeight: '700',
        transform: 'scale(1.1)'
      } : {
        backgroundColor: '#ffffff',
        color: '#1677ff',
        border: '1px solid #1677ff',
        borderRadius: '16px',
        padding: '2px 6px',
        fontSize: '12px',
        fontWeight: '600',
        transform: 'scale(1.0)'
      };
      try { label.setStyle(style); } catch (_) { }
      try { label.setZIndex(sel ? 1000 : 0); } catch (_) { }
    });
  }, [selectedId]);
  const handleRelocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude);
        setUserLng(longitude);
        setCenter({ lng: longitude, lat: latitude });
      },
      () => { },
      { enableHighAccuracy: true, timeout: 1000 }
    );
  };
  const handleSearch = () => {
    const kw = keyword.trim();
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const params = new URLSearchParams(window.location.search);
    if (kw) params.set('keyword', kw); else params.delete('keyword');
    params.set('check_in', fmt(checkIn));
    params.set('check_out', fmt(checkOut));
    params.set('nights', String(nights));
    navigate(`/map?${params.toString()}`);
    const B = (window as any).BMapGL;
    const map = mapRef.current;
    if (B && map && kw) {
      try {
        const local = new B.LocalSearch(map, {
          onSearchComplete: (res: any) => {
            try {
              const poi = typeof res.getPoi === 'function' ? res.getPoi(0) : null;
              const pt = poi && poi.point ? poi.point : null;
              if (pt) {
                setCenter({ lng: pt.lng, lat: pt.lat });
                try { map.setCenter(pt); } catch (_) { }
                try { map.setZoom(13); } catch (_) { }
              }
            } catch (_) { }
          }
        });
        local.search(kw);
      } catch (_) { }
    }
  };

  const getSafeCenter = () => {
    const lng = center?.lng ?? userLng ?? 116.404;
    const lat = center?.lat ?? userLat ?? 39.915;
    return {
      lng: Number.isFinite(Number(lng)) ? Number(lng) : 116.404,
      lat: Number.isFinite(Number(lat)) ? Number(lat) : 39.915
    };
  };
  const getSafeCenterPoint = () => {
    const c = getSafeCenter();
    const B = (window as any).BMapGL;
    if (B && typeof B.Point === 'function') {
      try {
        return new B.Point(c.lng, c.lat);
      } catch (_) {
        return c;
      }
    }
    return c;
  };

  useEffect(() => {
    if (akMissing) {

      return;
    }
    const t = setTimeout(() => {
      if (!mapReady) {

      }
    }, 5000);
    return () => clearTimeout(t);
  }, [akMissing, mapReady]);

  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      const msg = String(event.message || '');
      if (msg === 'Script error.' || msg.includes('Script error')) {
        event.preventDefault?.();
        return false;
      }
      return undefined;
    };
    window.addEventListener('error', onWindowError);
    const hide = () => {
      ['#webpack-dev-server-client-overlay', 'iframe#webpack-dev-server-client-overlay', '.react-error-overlay', 'div[aria-label="Runtime error"]'].forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          const h = el as HTMLElement;
          h.style.display = 'none';
          h.style.pointerEvents = 'none';
        });
      });
    };
    hide();
    const mo = new MutationObserver(() => hide());
    mo.observe(document.documentElement, { childList: true, subtree: true });
    (window as any).__map_overlay_mo = mo;
    return () => {
      window.removeEventListener('error', onWindowError);
      try { (window as any).__map_overlay_mo?.disconnect?.(); } catch (_) { }
    };
  }, []);

  useEffect(() => {
    const m = (window as any).BMapGL;
    if (m && mapRef.current && !mapReady) {
      setMapReady(true);
    }
  }, [mapReady]);

  useEffect(() => {
    const wrap = mapWrapRef.current;
    if (!wrap) return;
    return () => { };
  }, []);

  useEffect(() => {
    // 地图事件绑定：拖拽/缩放开始与结束，便于调试与交互提示
    const map = mapRef.current;
    if (!map) return;
    const onDragStart = () => setLastEvent('dragstart');
    const onDragEnd = () => setLastEvent('dragend');
    const onZoomStart = () => setLastEvent('zoomstart');
    const onZoomEnd = () => setLastEvent('zoomend');
    try {
      map.addEventListener('dragstart', onDragStart);
      map.addEventListener('dragend', onDragEnd);
      map.addEventListener('zoomstart', onZoomStart);
      map.addEventListener('zoomend', onZoomEnd);
    } catch (_) { }
    return () => {
      try {
        map.removeEventListener('dragstart', onDragStart);
        map.removeEventListener('dragend', onDragEnd);
        map.removeEventListener('zoomstart', onZoomStart);
        map.removeEventListener('zoomend', onZoomEnd);
      } catch (_) { }
    };
  }, [mapRef.current]);

  useEffect(() => {

  }, [wheelSeen, wheelEnabled]);

  useEffect(() => {
  }, [mapRef.current, mapReady]);

  useEffect(() => {
  }, [coreCalOpen, selectedDetail]);

  return (
    <>
      <Container maxWidth={false} className="map-container">
        <Box className="top-controls-sticky">
          <Box className="core-header pill">
            <Box className="core-row">
              <Button className="back-icon" aria-label="返回" onClick={() => navigate(`/hotels?${new URLSearchParams(window.location.search).toString()}`)} sx={{ minWidth: 24, p: 0 }} />
              <Button className="loc-link" onClick={handleRelocate} aria-label="我的位置">我的位置</Button>
              <span className="divider" aria-hidden="true" />
              <Button
                className="date-pill"
                onClick={() => { setCoreCalOpen(true); }}
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
              <Box className="search-wrap">
                <img src={searchIcon} alt="搜索" className="search-icon-img" />
                <input
                  aria-label="搜索"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="位置/品牌/酒店"
                  className="search-input"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                />
                <Button className="search-btn" variant="contained" onClick={handleSearch} aria-label="搜索">搜索</Button>
              </Box>
            </Box>
          </Box>
        </Box>
        {!akMissing && (
          <Box ref={mapWrapRef} className="map-wrap">
            <BMapGLMap
              style={{ height: '100%', width: '100%' }}
              center={getSafeCenterPoint()}
              zoom={13}
              enableDragging
              enableScrollWheelZoom
              enableDoubleClickZoom
              enableRotate
              enableTilt
              heading={0}
              tilt={40}
              onClick={(_e: any) => { setSelectedId(null); setSelectedDetail(null); setSelectedImages([]); setSelectedFeatures([]); }}
              ref={(ref: any) => {
                if (ref && ref.map) {
                  mapRef.current = ref.map;
                  try {
                    if (typeof ref.map.enableDragging === 'function') {
                      ref.map.enableDragging();
                    } else {

                    }
                    if (typeof ref.map.enableScrollWheelZoom === 'function') {
                      ref.map.enableScrollWheelZoom(true);
                    } else {

                    }
                    if (typeof ref.map.enableContinuousZoom === 'function') {
                      try { ref.map.enableContinuousZoom(true); } catch (_) { }
                    }
                  } catch (e) {

                  }
                }
              }}
              onReady={() => {
                setMapReady(true);
                // 延迟确保百度地图内部异步逻辑执行完毕
                setTimeout(() => {
                  const map = mapRef.current;
                  if (map) {
                    (window as any).map = map; // 成功暴露后，控制台将不再是 undefined
                    if (typeof map.enableDragging === 'function') map.enableDragging();
                    if (typeof map.enableScrollWheelZoom === 'function') map.enableScrollWheelZoom(true);
                    console.log("地图交互已强制开启");
                  }
                }, 300);
              }}>
              <NavigationControl />
              {
                userLat && userLng && (
                  <Marker position={{ lng: userLng, lat: userLat }} icon={userIcon || undefined} />
                )
              }
              {
                selectedDetail && selectedDetail.latitude && selectedDetail.longitude && (
                  <InfoWindow
                    position={{ lng: selectedDetail.longitude as number, lat: selectedDetail.latitude as number }}
                    text={`¥${(selectedDetail.min_price || 0)}`}
                    title={selectedDetail.name_zh}
                  />
                )
              }
            </BMapGLMap>
          </Box>
        )
        }
        {
          akMissing && (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography>缺少百度地图 AK，设置 localStorage 键 BAIDU_MAP_AK 后刷新</Typography>
            </Box>
          )
        }
        {
          selectedDetail && (
            <Box ref={bottomCardRef} className="bottom-card-wrap">
              <Card className="hotel-card" sx={{ borderRadius: 2, cursor: 'pointer', position: 'relative' }} onClick={() => navigate(`/hotels/${selectedDetail.id}`)}>
                {/* 图片区域：单张轮播（自动+左右切换），防穿透点击 */}
                {galleryImages.length > 0 && (
                  <Box className="gallery-wrap" onClick={(e) => e.stopPropagation()}>
                    <Button className="gallery-nav prev" aria-label="上一张" onClick={gotoPrev}>‹</Button>
                    <CardMedia component="img" className="gallery-img" image={currentImageSrc} />
                    <Button className="gallery-nav next" aria-label="下一张" onClick={gotoNext}>›</Button>
                    <Box className="gallery-actions">
                      <Button
                        variant="outlined"
                        size="small"
                        aria-label="收藏"
                        onClick={() => { if (selectedDetail) handleToggleFavorite(selectedDetail.id); }}
                        sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}
                      >
                        <img src={selectedDetail && favorites[selectedDetail.id] ? favOn : favOff} alt="收藏" style={{ width: 24, height: 24 }} />
                        <Typography variant="caption">收藏</Typography>
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        aria-label="分享"
                        onClick={() => { if (selectedDetail) handleShare(selectedDetail.id); }}
                        sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}
                      >
                        <img src={shareIcon} alt="分享" style={{ width: 24, height: 24 }} />
                        <Typography variant="caption">分享</Typography>
                      </Button>
                    </Box>
                  </Box>
                )}
                <CardContent sx={{ pt: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>{selectedDetail.name_zh}</Typography>
                  <Typography color="primary">⭐ {selectedDetail.star_rating}</Typography>
                  {selectedFeatures.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {selectedFeatures.slice(0, 12).map((t, i) => (
                        <Box key={i} sx={{ border: '1px solid #e5e5e5', borderRadius: 1, px: 1, py: 0.5, fontSize: '12px', color: '#555' }}>{t}</Box>
                      ))}
                    </Box>
                  )}
                  {selectedDetail.description && <Typography sx={{ mt: 1 }} color="text.secondary">{selectedDetail.description}</Typography>}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="h6" color="primary">¥{selectedDetail.min_price || 0} 起</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )
        }

        {coreCalOpen && (
          <DateRangeSheet
            open={coreCalOpen}
            onClose={() => setCoreCalOpen(false)}
            checkIn={checkIn}
            checkOut={checkOut}
            setCheckIn={(d) => setCheckIn(d as Date)}
            setCheckOut={(d) => setCheckOut(d as Date)}
            monthsShown={2}
            onAutoConfirm={() => handleSearch()}
          />
        )}
      </Container >
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
    </>
  );
};

export default MapApiLoaderHOC({ ak: getAK() })(MapHotelsPageInner as any);
