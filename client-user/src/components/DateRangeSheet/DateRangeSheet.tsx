import React, { useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './DateRangeSheet.css';
import { trackEvent } from '../../services/analyticsService';

type Props = {
  open: boolean;
  onClose: () => void;
  checkIn: Date | null;
  checkOut: Date | null;
  setCheckIn: (d: Date | null) => void;
  setCheckOut: (d: Date | null) => void;
  nights?: number;
  setNights?: (n: number) => void;
  monthsShown?: number;
  minDate?: Date;
  holidayData?: Record<string, string>;
  onAutoConfirm?: () => void;
};

export default function DateRangeSheet(props: Props) {
  const { open, onClose, checkIn, checkOut, setCheckIn, setCheckOut, nights, setNights, monthsShown = 2, minDate, holidayData = {}, onAutoConfirm } = props;
  const [phase, setPhase] = useState<'start' | 'end'>('start');
  const [tempEnd, setTempEnd] = useState<Date | null>(null);

  const todayMin = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  if (!open) return null;

  return (
    <>
      <div className="sheet-mask" onClick={onClose} aria-hidden="true" />
      <Box className="bottom-sheet" role="dialog" aria-label="选择日期">
        <Box className="sheet-header">
          <span className="handle-bar" aria-hidden="true" />
          <Typography variant="subtitle1">选择日期</Typography>
          <Button onClick={onClose} aria-label="关闭">✕</Button>
        </Box>
        <Typography color="text.secondary" sx={{ px: 1, mb: 1 }}>
          {phase === 'start' ? '请选择入住日期' : '请选择离店日期'}
        </Typography>
        <DatePicker
          inline
          selectsRange
          monthsShown={monthsShown}
          startDate={checkIn || undefined}
          endDate={(tempEnd ?? checkOut) || undefined}
          minDate={minDate || todayMin}
          calendarClassName="modern-hotel-calendar"
          renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => {
            const y = date.getFullYear();
            const m = date.getMonth() + 1;
            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px' }}>
                <button aria-label="上一月" onClick={decreaseMonth} style={{ border: 'none', background: 'transparent', fontSize: 18 }}>‹</button>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{y}年{m}月</div>
                <button aria-label="下一月" onClick={increaseMonth} style={{ border: 'none', background: 'transparent', fontSize: 18 }}>›</button>
              </div>
            );
          }}
          formatWeekDay={(day: string) => {
            const map: Record<string, string> = {
              Sun: '日', Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六',
              Su: '日', Mo: '一', Tu: '二', We: '三', Th: '四', Fr: '五', Sa: '六',
              Sunday: '日', Monday: '一', Tuesday: '二', Wednesday: '三', Thursday: '四', Friday: '五', Saturday: '六'
            };
            return map[day] ?? day;
          }}
          dayClassName={(date) => {
            const day = date.getDay();
            return (day === 0 || day === 6) ? 'is-weekend' : '';
          }}
          renderDayContents={(dayOfMonth, date) => {
            if (!date) return dayOfMonth;
            const dateStr = date.toISOString().split('T')[0];
            const isStart = !!(checkIn && date.toDateString() === checkIn.toDateString());
            const currentEnd = tempEnd ?? checkOut;
            const isEnd = !!(currentEnd && date.toDateString() === currentEnd.toDateString());
            const topLabel = isStart ? '今天' : holidayData[dateStr];
            const bottomLabel = isStart ? '入住' : (isEnd ? '离店' : '');
            return (
              <div className="custom-day-cell">
                <span className={`holiday-tag ${holidayData[dateStr]?.includes('班') ? 'work-tag' : ''}`}>
                  {topLabel}
                </span>
                <span className="day-num">{dayOfMonth}</span>
                <span className="status-tag">{bottomLabel}</span>
              </div>
            );
          }}
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
            if (phase === 'start' && s) {
              setCheckIn(s);
              setTempEnd(null);
              setPhase('end');
              return;
            }
            if (phase === 'end' && s) {
              const target = e ?? s;
              const finalEnd = norm(target);
              if (finalEnd && checkIn && finalEnd.getTime() > checkIn.getTime()) {
                setTempEnd(finalEnd);
                setCheckOut(finalEnd);
                const ms = finalEnd.getTime() - checkIn.getTime();
                const n = Math.max(1, Math.round(ms / (24 * 3600 * 1000)));
                setNights && setNights(n);
                const fmt = (d: Date) => {
                  const y = d.getFullYear();
                  const m = d.getMonth() + 1;
                  const day = d.getDate();
                  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                };
                trackEvent('date_confirm', { check_in: fmt(checkIn), check_out: fmt(finalEnd), nights: n });
                setTimeout(() => {
                  onClose();
                  setPhase('start');
                  onAutoConfirm && onAutoConfirm();
                }, 1000);
              } else if (finalEnd && checkIn && finalEnd.getTime() < checkIn.getTime()) {
                setCheckIn(finalEnd);
                setTempEnd(null);
              }
            }
          }}
        />
      </Box>
    </>
  );
}
