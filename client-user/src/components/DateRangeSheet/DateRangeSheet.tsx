// 日期范围底部抽屉组件
// 职责：提供“先选入住，再选离店”的两步选择，自动延时关闭并回传结果；样式适配移动端
import React, { useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './DateRangeSheet.css';
import { trackEvent } from '../../services/analyticsService';

// 组件入参：
// - open: 抽屉是否打开
// - onClose: 关闭回调（含遮罩点击与右上角关闭）
// - checkIn/checkOut: 当前外部持有的入住/离店日期
// - setCheckIn/setCheckOut: 变更外部日期的 setter
// - nights/setNights: 可选，用于外部显示晚数
// - monthsShown: 显示的月份数量（默认 2）
// - minDate: 最小可选日期（默认今天）
// - holidayData: 节假日映射（yyyy-mm-dd -> 标签文案）
// - onAutoConfirm: 完成选择后自动回调（用于触发搜索等）
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
  // 解构 props，提供默认值与节假日数据回退
  const { open, onClose, checkIn, checkOut, setCheckIn, setCheckOut, nights, setNights, monthsShown = 2, minDate, holidayData = {}, onAutoConfirm } = props;
  // 选择阶段：start=选择入住；end=选择离店
  const [phase, setPhase] = useState<'start' | 'end'>('start');
  // 临时离店日期：用于在完成选择前的中间高亮
  const [tempEnd, setTempEnd] = useState<Date | null>(null);

  // 最小日期统一归零到当天 00:00，避免时区与时分秒影响
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
        {/* 日历主体：内联展示、范围选择、双月视图、中文头部与周标题、最小日期限制 */}
        <DatePicker
          inline
          selectsRange
          monthsShown={monthsShown}
          startDate={checkIn || undefined}
          endDate={(tempEnd ?? checkOut) || undefined}
          minDate={minDate || todayMin}
          calendarClassName="modern-hotel-calendar"
          // 自定义头部：中文“年/月”+左右切换
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
          // 中文周标题：兼容不同缩写与全称，默认回退原始值
          formatWeekDay={(day: string) => {
            const map: Record<string, string> = {
              Sun: '日', Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六',
              Su: '日', Mo: '一', Tu: '二', We: '三', Th: '四', Fr: '五', Sa: '六',
              Sunday: '日', Monday: '一', Tuesday: '二', Wednesday: '三', Thursday: '四', Friday: '五', Saturday: '六'
            };
            return map[day] ?? day;
          }}
          // 周末标记：用于 CSS 微调（如着色）
          dayClassName={(date) => {
            const day = date.getDay();
            return (day === 0 || day === 6) ? 'is-weekend' : '';
          }}
          // 自定义日期内容：顶部节假日/调休标记，中部日期数字，底部“入住/离店”状态
          renderDayContents={(dayOfMonth, date) => {
            if (!date) return dayOfMonth;
            const dateStr = date.toISOString().split('T')[0];
            const isStart = !!(checkIn && date.toDateString() === checkIn.toDateString());
            const currentEnd = tempEnd ?? checkOut;
            const isEnd = !!(currentEnd && date.toDateString() === currentEnd.toDateString());
            const topLabel = isStart ? '' : holidayData[dateStr];
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
          // 选择逻辑：
          // - 第一次点击记录入住并切换到离店阶段
          // - 第二次点击校验离店晚于入住，计算晚数、埋点并延时关闭；若点到更早日期则重置为新的入住
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
