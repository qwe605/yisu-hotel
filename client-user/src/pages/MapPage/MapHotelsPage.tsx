import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Container, Typography, Card, CardMedia, CardContent, Snackbar, Alert } from '@mui/material';
import { Map as BMapGLMap, Marker, NavigationControl, InfoWindow, MapApiLoaderHOC } from 'react-bmapgl';
import '../HotelListPage/HotelListPage.css';
import DatePicker from 'react-datepicker';
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
  const [nights, setNights] = useState<number>(() => {
    const ms = (new Date(checkOut).getTime() - new Date(checkIn).getTime());
    return Math.max(1, Math.round(ms / (24 * 3600 * 1000)));
  });
  const [coreCalOpen, setCoreCalOpen] = useState<boolean>(false);
  const [calendarPhase, setCalendarPhase] = useState<'start' | 'end'>('start');
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  const [justSelectedEnd, setJustSelectedEnd] = useState<boolean>(false);
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
  const [dragEnabled, setDragEnabled] = useState<boolean>(false);
  const [wheelEnabled, setWheelEnabled] = useState<boolean>(false);
  const [diagMsg, setDiagMsg] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string>('');
  const [wheelSeen, setWheelSeen] = useState<boolean>(false);
  const mapWrapRef = useRef<HTMLDivElement | null>(null);
  const [debugOpen, setDebugOpen] = useState<boolean>(true);
  const [methodInfo, setMethodInfo] = useState<Record<string, boolean>>({});
  const [overlayInfo, setOverlayInfo] = useState<Array<{ name: string; visible: boolean; pointerEvents: string; zIndex: string; interceptsCenter: boolean; rect: string }>>([]);
  const [lastTarget, setLastTarget] = useState<string>('');
  const [centerXY, setCenterXY] = useState<{ x: number; y: number } | null>(null);
  const bottomCardRef = useRef<HTMLDivElement | null>(null);
  const calendarMaskRef = useRef<HTMLDivElement | null>(null);
  const [centerHit, setCenterHit] = useState<string>('');

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

    const fetchList = async () => {
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
      setHotels(Array.isArray((resp as any)?.items) ? (resp as any).items : []);
    };
    fetchList();
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

  const galleryImages = useMemo(() => {
    const imgs = Array.isArray(selectedImages) ? selectedImages : [];
    if (imgs.length > 0) return imgs;
    return [];
  }, [selectedImages]);

  const priceLabelsRef = useRef<Map<number, any>>(new Map<number, any>());
  useEffect(() => {
    const map = mapRef.current;
    const B = (window as any).BMapGL;
    if (!map || !B || !Array.isArray(hotels)) return;
    priceLabelsRef.current.forEach((overlay: any) => {
      try { map.removeOverlay(overlay); } catch (_) { }
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
      priceLabelsRef.current.set(h.id, label);
      if (typeof label.addEventListener === 'function') {
        label.addEventListener('click', () => {
          setSelectedId(h.id);
          if (h.longitude && h.latitude) setCenter({ lng: h.longitude, lat: h.latitude });
        });
      }
    });
  }, [hotels, mapReady]);
  useEffect(() => {
    const selected = selectedId;
    priceLabelsRef.current.forEach((label: any, id: number) => {
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
      { enableHighAccuracy: true, timeout: 8000 }
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
    return () => window.removeEventListener('error', onWindowError);
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
    const onWheel = () => {
      setWheelSeen(true);
      setLastEvent('wheel');
    };
    const onPointerDown = (e: any) => {
      setLastEvent('pointerdown');
      const t = e.target as HTMLElement;
      setLastTarget(`${t.tagName.toLowerCase()}${t.id ? `#${t.id}` : ''}${t.className ? `.${String(t.className).split(' ').join('.')}` : ''}`);
    };
    wrap.addEventListener('wheel', onWheel, { passive: true });
    wrap.addEventListener('pointerdown', onPointerDown, { passive: true });
    const rect = wrap.getBoundingClientRect();
    setCenterXY({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    return () => {
      wrap.removeEventListener('wheel', onWheel as any);
      wrap.removeEventListener('pointerdown', onPointerDown as any);
    };
  }, []);

  useEffect(() => {
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
    const map = mapRef.current;
    const methods = [
      'enableDragging',
      'disableDragging',
      'enableScrollWheelZoom',
      'disableScrollWheelZoom',
      'enableContinuousZoom',
      'addEventListener',
      'removeEventListener',
      'setCenter',
      'getCenter',
      'setZoom',
      'getZoom'
    ];
    if (map) {
      const info: Record<string, boolean> = {};
      methods.forEach((m) => {
        info[m] = typeof (map as any)[m] === 'function';
      });
      setMethodInfo(info);

    }
  }, [mapRef.current, mapReady]);

  useEffect(() => {
    const collect = () => {
      const res: Array<{ name: string; visible: boolean; pointerEvents: string; zIndex: string; interceptsCenter: boolean; rect: string }> = [];
      const pushInfo = (el: HTMLElement | null, name: string) => {
        if (!el) {
          res.push({ name, visible: false, pointerEvents: 'n/a', zIndex: 'n/a', interceptsCenter: false, rect: 'n/a' });
          return;
        }
        const cs = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const pt = centerXY;
        const hit = !!pt && rect.left <= pt.x && pt.x <= rect.right && rect.top <= pt.y && pt.y <= rect.bottom && cs.pointerEvents !== 'none' && cs.visibility !== 'hidden' && cs.display !== 'none';
        res.push({
          name,
          visible: cs.visibility !== 'hidden' && cs.display !== 'none',
          pointerEvents: cs.pointerEvents,
          zIndex: cs.zIndex,
          interceptsCenter: hit,
          rect: `${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.right)},${Math.round(rect.bottom)}`
        });
      };
      const header = document.querySelector('.top-controls-sticky') as HTMLElement | null;
      const pill = document.querySelector('.core-header.pill') as HTMLElement | null;
      const diag = null;
      pushInfo(header, 'header');
      pushInfo(pill, 'pill');
      pushInfo(bottomCardRef.current, 'bottom-card');
      pushInfo(calendarMaskRef.current, 'calendar-mask');
      pushInfo(diag, 'diag-panel');
      setOverlayInfo(res);
      const pt = centerXY;
      if (pt) {
        const el = document.elementFromPoint(pt.x, pt.y) as HTMLElement | null;
        const desc = el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className ? `.${String(el.className).split(' ').join('.')}` : ''}` : 'null';
        setCenterHit(desc);

      }

    };
    collect();
  }, [coreCalOpen, selectedDetail, centerXY]);

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
              <Card sx={{ borderRadius: 2, cursor: 'pointer', position: 'relative' }} onClick={() => navigate(`/hotels/${selectedDetail.id}`)}>
                <Box className="card-top-right">
                  <Button
                    variant="outlined"
                    size="small"
                    aria-label="收藏"
                    onClick={(e) => { e.stopPropagation(); if (selectedDetail) handleToggleFavorite(selectedDetail.id); }}
                    sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}
                  >
                    <img src={selectedDetail && favorites[selectedDetail.id] ? favOn : favOff} alt="收藏" style={{ width: 24, height: 24 }} />
                    <Typography variant="caption">收藏</Typography>
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    aria-label="分享"
                    onClick={(e) => { e.stopPropagation(); if (selectedDetail) handleShare(selectedDetail.id); }}
                    sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}
                  >
                    <img src={shareIcon} alt="分享" style={{ width: 24, height: 24 }} />
                    <Typography variant="caption">分享</Typography>
                  </Button>
                </Box>
                {galleryImages.length > 0 && (
                  <Box className="gallery-row">
                    {galleryImages.map((img: any, idx: number) => {
                      const src = typeof img === 'string'
                        ? img
                        : (img?.image_url || img?.url || img?.src || '');
                      return <CardMedia key={idx} component="img" className="gallery-img" image={src} />;
                    })}
                  </Box>
                )}
                <CardContent>
                  <Typography variant="h6">{selectedDetail.name_zh}</Typography>
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
        {/* 调试面板移除 */}
        {
          coreCalOpen && (
            <>
              <div
                ref={calendarMaskRef}
                className="sheet-mask"
                onClick={() => setCoreCalOpen(false)}
                aria-hidden="true"
              />
              <Box className="bottom-sheet" role="dialog" aria-label="选择日期">
                <Box className="sheet-header">
                  <span className="handle-bar" aria-hidden="true" />
                  <Typography variant="subtitle1">选择日期</Typography>
                  <Button onClick={() => setCoreCalOpen(false)} aria-label="关闭">✕</Button>
                </Box>
                <Typography color="text.secondary" sx={{ px: 1, mb: 1 }}>
                  {calendarPhase === 'start' ? '请选择入住日期' : '请选择离店日期'}
                </Typography>
                <DatePicker
                  inline
                  selectsRange
                  monthsShown={2}
                  startDate={checkIn}
                  endDate={tempEnd ?? checkOut}
                  onChange={(range) => {
                    const [start, end] = range as [Date | null, Date | null];
                    const norm = (d: Date | null) => {
                      if (!d) return null;
                      const nd = new Date(d);
                      nd.setHours(0, 0, 0, 0);
                      return nd;
                    };
                    const s = norm(start);
                    const e = norm(end);
                    if (calendarPhase === 'start' && s) {
                      setCheckIn(s as Date);
                      setTempEnd(null);
                      setCalendarPhase('end');
                      return;
                    }
                    if (calendarPhase === 'end') {
                      const clicked = e ?? s;
                      const target = norm(clicked);
                      if (!target) return;
                      if (target.getTime() > checkIn.getTime()) {
                        setTempEnd(target as Date);
                        setJustSelectedEnd(true);
                        const ms = (target.getTime() - checkIn.getTime());
                        setNights(Math.max(1, Math.round(ms / (24 * 3600 * 1000))));
                      } else if (target.getTime() < checkIn.getTime()) {
                        setCheckIn(target as Date);
                        const endBase = tempEnd ?? checkOut;
                        if (endBase && endBase.getTime() > target.getTime()) {
                          const ms = (endBase.getTime() - target.getTime());
                          setNights(Math.max(1, Math.round(ms / (24 * 3600 * 1000))));
                        } else {
                          setNights(1);
                        }
                      }
                    }
                  }}
                  minDate={(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })()}
                />
                <Box className="sheet-footer">
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={() => {
                      if (tempEnd && tempEnd.getTime() > checkIn.getTime()) {
                        setCheckOut(tempEnd as Date);
                        setCalendarPhase('start');
                        setCoreCalOpen(false);
                        const ms = (tempEnd.getTime() - checkIn.getTime());
                        setNights(Math.max(1, Math.round(ms / (24 * 3600 * 1000))));
                      } else {
                        setCoreCalOpen(false);
                      }
                    }}
                  >
                    确认选择 · 共 {nights} 晚
                  </Button>
                </Box>
              </Box>
            </>
          )
        }
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
