import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert } from '@mui/material';

type HotelItem = { id: number; name_zh: string; name_en: string; address: string; star_rating: number };

export default function AuditPage() {
  const [items, setItems] = useState<HotelItem[]>([]);
  const [open, setOpen] = useState<HotelItem | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | 'offline' | ''>('');
  const [reason, setReason] = useState('');
  const [snack, setSnack] = useState<{ open: boolean; msg: string; type: 'success' | 'error' | 'info' }>({ open: false, msg: '', type: 'success' });

  useEffect(() => {
    const run = async () => {
      try {
        const resp = await fetch('http://localhost:3001/api/hotels/search?pageSize=20');
        const data = await resp.json();
        const list = (data?.items || []).map((r: any) => ({
          id: r.id,
          name_zh: r.name_zh,
          name_en: r.name_en,
          address: r.address,
          star_rating: r.star_rating
        }));
        setItems(list);
      } catch {
        setItems([]);
      }
    };
    run();
  }, []);

  const handleDo = () => {
    if (!open || !action) return;
    setSnack({ open: true, msg: '操作成功', type: 'success' });
    setOpen(null);
    setAction('');
    setReason('');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight={700}>酒店信息审核</Typography>
        <Button variant="outlined" onClick={() => window.location.reload()}>刷新</Button>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>中文名</TableCell>
            <TableCell>英文名</TableCell>
            <TableCell>星级</TableCell>
            <TableCell>地址</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map(it => (
            <TableRow key={it.id}>
              <TableCell>{it.id}</TableCell>
              <TableCell>{it.name_zh}</TableCell>
              <TableCell>{it.name_en}</TableCell>
              <TableCell>{it.star_rating}</TableCell>
              <TableCell>{it.address}</TableCell>
              <TableCell align="right">
                <Button onClick={() => setOpen(it)}>审核</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!open} onClose={() => setOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle>审核操作</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" gap={1}>
            <Button variant={action === 'approve' ? 'contained' : 'outlined'} onClick={() => setAction('approve')}>通过</Button>
            <Button variant={action === 'reject' ? 'contained' : 'outlined'} color="error" onClick={() => setAction('reject')}>拒绝</Button>
            <Button variant={action === 'offline' ? 'contained' : 'outlined'} color="warning" onClick={() => setAction('offline')}>下线</Button>
          </Box>
          <TextField sx={{ mt: 2 }} fullWidth multiline minRows={3} label="审核意见" value={reason} onChange={e => setReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(null)}>取消</Button>
          <Button variant="contained" onClick={handleDo} disabled={!action}>提交</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={2000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.type} sx={{ width: '100%' }}>{snack.msg}</Alert>
      </Snackbar>
    </Container>
  );
}
