import React, { useMemo, useState } from 'react';
import { Container, Box, Typography, TextField, Grid, Button, Chip, Divider, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText } from '@mui/material';

type RoomType = { id: number; name: string; base_price: number; capacity: number; amenities: string };
type Feature = { id: number; name: string; type: 'attraction' | 'transport' | 'mall'; distance?: string };
type Promotion = { id: number; name: string; discount_type: 'percentage' | 'fixed' | 'package'; discount_value?: number; start_date?: string; end_date?: string };

export default function HotelFormPage() {
  const [nameZh, setNameZh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [address, setAddress] = useState('');
  const [star, setStar] = useState<number | ''>('');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [images, setImages] = useState<string[]>([]);
  const [imgInput, setImgInput] = useState('');
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; type: 'success' | 'error' | 'info' }>({ open: false, msg: '', type: 'success' });
  const [previewOpen, setPreviewOpen] = useState(false);

  const basicValid = useMemo(() => !!nameZh && !!nameEn && !!address && Number(star) > 0, [nameZh, nameEn, address, star]);

  const addImage = () => {
    const u = imgInput.trim();
    if (!u) return;
    setImages(prev => Array.from(new Set([...prev, u])));
    setImgInput('');
  };
  const removeImage = (u: string) => setImages(prev => prev.filter(x => x !== u));

  const addRoomType = () => {
    const id = Date.now();
    setRoomTypes(prev => [...prev, { id, name: `房型${prev.length + 1}`, base_price: 0, capacity: 2, amenities: '' }]);
  };
  const updateRoomType = (id: number, patch: Partial<RoomType>) => setRoomTypes(prev => prev.map(rt => (rt.id === id ? { ...rt, ...patch } : rt)));
  const removeRoomType = (id: number) => setRoomTypes(prev => prev.filter(rt => rt.id !== id));

  const addFeature = () => {
    const id = Date.now();
    setFeatures(prev => [...prev, { id, name: `特色${prev.length + 1}`, type: 'attraction' }]);
  };
  const updateFeature = (id: number, patch: Partial<Feature>) => setFeatures(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  const removeFeature = (id: number) => setFeatures(prev => prev.filter(f => f.id !== id));

  const addPromotion = () => {
    const id = Date.now();
    setPromotions(prev => [...prev, { id, name: `促销${prev.length + 1}`, discount_type: 'percentage' }]);
  };
  const updatePromotion = (id: number, patch: Partial<Promotion>) => setPromotions(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  const removePromotion = (id: number) => setPromotions(prev => prev.filter(p => p.id !== id));

  const handleSave = () => {
    if (!basicValid) {
      setSnack({ open: true, msg: '请完善必填信息', type: 'error' });
      return;
    }
    const payload = {
      name_zh: nameZh, name_en: nameEn, address, star_rating: Number(star),
      latitude: Number(latitude) || null, longitude: Number(longitude) || null,
      images, room_types: roomTypes, features, promotions
    };
    localStorage.setItem('hotel_draft', JSON.stringify(payload));
    setSnack({ open: true, msg: '已保存草稿', type: 'success' });
  };

  const handleSubmit = () => {
    if (!basicValid) {
      setSnack({ open: true, msg: '请完善必填信息', type: 'error' });
      return;
    }
    setSnack({ open: true, msg: '已提交，等待审核', type: 'info' });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h5" fontWeight={700}>酒店信息录入/编辑</Typography>
      <Box mt={2}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="酒店名称(中文)" value={nameZh} onChange={e => setNameZh(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="酒店名称(英文)" value={nameEn} onChange={e => setNameEn(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField fullWidth label="地址" value={address} onChange={e => setAddress(e.target.value)} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField fullWidth label="星级(1-5)" value={star} onChange={e => setStar(Number(e.target.value))} />
          </Grid>
          <Grid item xs={6} md={1.5}>
            <TextField fullWidth label="纬度" value={latitude} onChange={e => setLatitude(Number(e.target.value))} />
          </Grid>
          <Grid item xs={6} md={1.5}>
            <TextField fullWidth label="经度" value={longitude} onChange={e => setLongitude(Number(e.target.value))} />
          </Grid>
        </Grid>
      </Box>

      <Box mt={3}>
        <Typography fontWeight={600}>图片</Typography>
        <Box display="flex" gap={1} mt={1}>
          <TextField fullWidth label="图片URL" value={imgInput} onChange={e => setImgInput(e.target.value)} />
          <Button variant="outlined" onClick={addImage}>添加</Button>
        </Box>
        <Box mt={1} display="flex" gap={1} flexWrap="wrap">
          {images.map(u => <Chip key={u} label={u} onDelete={() => removeImage(u)} />)}
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography fontWeight={600}>房型管理</Typography>
          <Button variant="outlined" onClick={addRoomType}>新增房型</Button>
        </Box>
        <Grid container spacing={2} mt={1}>
          {roomTypes.map(rt => (
            <Grid item xs={12} md={6} key={rt.id}>
              <Box border="1px solid #ddd" borderRadius={1} p={2} display="flex" flexDirection="column" gap={1}>
                <TextField label="房型名称" value={rt.name} onChange={e => updateRoomType(rt.id, { name: e.target.value })} />
                <TextField label="基础价格" value={rt.base_price} onChange={e => updateRoomType(rt.id, { base_price: Number(e.target.value) })} />
                <TextField label="容纳人数" value={rt.capacity} onChange={e => updateRoomType(rt.id, { capacity: Number(e.target.value) })} />
                <TextField label="设施标签(逗号分隔)" value={rt.amenities} onChange={e => updateRoomType(rt.id, { amenities: e.target.value })} />
                <Box display="flex" justifyContent="flex-end" gap={1}>
                  <Button color="error" onClick={() => removeRoomType(rt.id)}>删除</Button>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography fontWeight={600}>特色信息</Typography>
          <Button variant="outlined" onClick={addFeature}>新增特色</Button>
        </Box>
        <Grid container spacing={2} mt={1}>
          {features.map(f => (
            <Grid item xs={12} md={6} key={f.id}>
              <Box border="1px solid #ddd" borderRadius={1} p={2} display="flex" flexDirection="column" gap={1}>
                <TextField label="名称" value={f.name} onChange={e => updateFeature(f.id, { name: e.target.value })} />
                <TextField label="类型(attraction/transport/mall)" value={f.type} onChange={e => updateFeature(f.id, { type: e.target.value as any })} />
                <TextField label="距离" value={f.distance || ''} onChange={e => updateFeature(f.id, { distance: e.target.value })} />
                <Box display="flex" justifyContent="flex-end" gap={1}>
                  <Button color="error" onClick={() => removeFeature(f.id)}>删除</Button>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography fontWeight={600}>促销活动</Typography>
          <Button variant="outlined" onClick={addPromotion}>新增促销</Button>
        </Box>
        <Grid container spacing={2} mt={1}>
          {promotions.map(p => (
            <Grid item xs={12} md={6} key={p.id}>
              <Box border="1px solid #ddd" borderRadius={1} p={2} display="flex" flexDirection="column" gap={1}>
                <TextField label="名称" value={p.name} onChange={e => updatePromotion(p.id, { name: e.target.value })} />
                <TextField label="类型(percentage/fixed/package)" value={p.discount_type} onChange={e => updatePromotion(p.id, { discount_type: e.target.value as any })} />
                <TextField label="折扣值" value={p.discount_value ?? ''} onChange={e => updatePromotion(p.id, { discount_value: Number(e.target.value) })} />
                <TextField label="开始日期" value={p.start_date || ''} onChange={e => updatePromotion(p.id, { start_date: e.target.value })} />
                <TextField label="结束日期" value={p.end_date || ''} onChange={e => updatePromotion(p.id, { end_date: e.target.value })} />
                <Box display="flex" justifyContent="flex-end" gap={1}>
                  <Button color="error" onClick={() => removePromotion(p.id)}>删除</Button>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box mt={3} display="flex" gap={2}>
        <Button variant="outlined" onClick={() => setPreviewOpen(true)}>预览</Button>
        <Button variant="contained" onClick={handleSave}>保存</Button>
        <Button variant="contained" color="success" onClick={handleSubmit}>提交审核</Button>
      </Box>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>预览</DialogTitle>
        <DialogContent dividers>
          <List>
            <ListItem><ListItemText primary="中文名" secondary={nameZh} /></ListItem>
            <ListItem><ListItemText primary="英文名" secondary={nameEn} /></ListItem>
            <ListItem><ListItemText primary="地址" secondary={address} /></ListItem>
            <ListItem><ListItemText primary="星级" secondary={String(star)} /></ListItem>
            <ListItem><ListItemText primary="坐标" secondary={`${latitude || ''}, ${longitude || ''}`} /></ListItem>
            <ListItem><ListItemText primary="图片" secondary={images.join('\n')} /></ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={2000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.type} sx={{ width: '100%' }}>{snack.msg}</Alert>
      </Snackbar>
    </Container>
  );
}
