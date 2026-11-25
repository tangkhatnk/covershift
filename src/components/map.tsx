'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw } from 'lucide-react';
import type { AddLayerObject, Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
import { JOB_LABEL } from '@/lib/constants';
import { fmtTime } from '@/lib/format';
import type { Shift } from '@/lib/types';
import { Alert, Badge, btn, Field, ShiftCard, inputCls } from './ui';

// Bản đồ: MapLibre (nạp động, chỉ trang có bản đồ mới tải) + nền OpenFreeMap. Không lưu hay gửi vị trí người dùng đi đâu.
// Tile và chữ bản đồ tải từ tiles.openfreemap.org (kết nối ngoài đã được chủ dự án duyệt).

export type MapTone = 'open' | 'urgent' | 'full' | 'pending' | 'removed';
/** text = chữ trên pin (giờ bắt đầu hoặc tên ngắn); label = aria-label đầy đủ (loại việc, giờ, tên quán). */
export type MapPoint = { id: string; lat: number; lng: number; text: string; label: string; href?: string; tone: MapTone };

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const VT_CENTER: [number, number] = [107.09, 10.36];
const MAX_BOUNDS: [[number, number], [number, number]] = [[106.9, 10.2], [107.7, 10.9]];
// Khung hợp lệ phía database (migration 0002); phía client chỉ để cảnh báo sớm.
const VT_BOX = { lat: [10.3, 10.8], lng: [107.0, 107.6] } as const;

// Chỗ duy nhất được viết mã màu hex: bảng paint ghi đè lên nền positron cho hợp bảng màu "Biển & Nắng".
// Tương phản đã tính (DESIGN.md): nhãn bản đồ >= 5,9:1 trên nền của chúng; viền pin >= 3:1 với land, water, park, road, major.
const MAP_COLOR = {
  land: '#F1EEE3', park: '#D6E4CE', water: '#BDDCEA', building: '#E6E1D0',
  road: '#FFFFFF', roadEdge: '#D9D4C1', major: '#FFD97A', majorEdge: '#D9A532',
  label: '#24343F', waterLabel: '#16526F',
} as const;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Ghi đè màu lên style positron. Lớp nào không có hoặc lỗi thì bỏ qua. */
function restyle(map: MapLibreMap) {
  const C = MAP_COLOR;
  const set = (id: string, prop: 'background-color' | 'fill-color' | 'fill-outline-color' | 'line-color' | 'text-color' | 'text-halo-color', value: string) => {
    try { if (map.getLayer(id)) map.setPaintProperty(id, prop, value); } catch { /* lớp lạ: bỏ qua */ }
  };
  set('background', 'background-color', C.land);
  set('landuse_residential', 'fill-color', C.land);
  set('park', 'fill-color', C.park);
  set('landcover_wood', 'fill-color', C.park);
  set('water', 'fill-color', C.water);
  set('waterway', 'line-color', C.water);
  set('building', 'fill-color', C.building);
  set('building', 'fill-outline-color', C.roadEdge);
  set('highway_minor', 'line-color', C.road);
  set('highway_path', 'line-color', C.road);
  for (const id of ['highway_major_casing', 'highway_motorway_casing', 'tunnel_motorway_casing', 'highway_motorway_bridge_casing']) set(id, 'line-color', C.majorEdge);
  for (const id of ['highway_major_inner', 'highway_major_subtle', 'highway_motorway_inner', 'highway_motorway_subtle', 'tunnel_motorway_inner', 'highway_motorway_bridge_inner']) set(id, 'line-color', C.major);
  // Đường thường không có lớp viền sẵn: thêm một lớp viền ngay dưới.
  try {
    const layers = map.getStyle().layers;
    for (const [id, w1, w2] of [['highway_minor', 3.2, 24], ['highway_path', 2.2, 13]] as const) {
      const base = layers.find((l) => l.id === id);
      if (!base || base.type !== 'line') continue;
      map.addLayer({
        ...base, id: `${id}_casing`,
        paint: { 'line-color': C.roadEdge, 'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 13, w1, 20, w2] },
      } as AddLayerObject, id);
    }
  } catch { /* không thêm được viền: giữ đường trắng */ }
  for (const l of map.getStyle().layers) {
    if (l.type !== 'symbol') continue;
    set(l.id, 'text-color', l.id.startsWith('water') ? C.waterLabel : C.label);
    set(l.id, 'text-halo-color', C.land);
  }
}

type Ctx = { map: MapLibreMap; lib: typeof import('maplibre-gl') };

/** Tạo bản đồ nền khi `lazy` đã gần vào khung nhìn. Lỗi / không có WebGL: status = 'error'. */
function useBaseMap(lazy: boolean) {
  const frame = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(!lazy);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (near || !frame.current) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setNear(true); }, { rootMargin: '200px' });
    io.observe(frame.current);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    if (!near) return;
    let dead = false;
    let loaded = false;
    let map: MapLibreMap | undefined;
    let ro: ResizeObserver | undefined;
    import('maplibre-gl')
      .then((lib) => {
        if (dead || !box.current) return;
        // Sau khi đóng gói, MapLibre không tự tìm được file worker (nó suy từ import.meta.url): chỉ rõ đường dẫn tới bản đã phát hành.
        lib.setWorkerUrl(new URL('../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);
        const m = new lib.Map({
          container: box.current, style: STYLE_URL, center: VT_CENTER, zoom: 12.5, maxBounds: MAX_BOUNDS,
          attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false,
          // Một ngón tay cuộn trang, hai ngón mới kéo bản đồ: bản đồ không "nuốt" cuộn trang trên điện thoại.
          cooperativeGestures: true,
          locale: {
            'CooperativeGesturesHandler.MobileHelpText': 'Dùng hai ngón tay để di chuyển bản đồ',
            'CooperativeGesturesHandler.WindowsHelpText': 'Giữ Ctrl và cuộn để phóng to bản đồ',
            'CooperativeGesturesHandler.MacHelpText': 'Giữ ⌘ và cuộn để phóng to bản đồ',
          },
        });
        map = m;
        // Khung bản đồ đổi cỡ (vd. nằm trong <details> vừa mở) thì bản đồ dựng lại cho đúng kích thước.
        ro = new ResizeObserver(() => m.resize());
        ro.observe(box.current);
        m.touchZoomRotate.disableRotation();
        m.addControl(new lib.NavigationControl({ showCompass: false }), 'top-right');
        m.addControl(new lib.AttributionControl({ compact: false }), 'bottom-right');
        m.on('style.load', () => restyle(m));
        // Lỗi tile lẻ sau khi đã tải không làm hỏng bản đồ; chỉ lỗi tải style (không kèm tile/source) mới là lỗi.
        m.on('error', (e) => { if (!loaded && !('tile' in e) && !('sourceId' in e)) setFailed(true); });
        m.once('load', () => { loaded = true; if (!dead) setCtx({ map: m, lib }); });
      })
      .catch(() => { if (!dead) setFailed(true); });
    return () => { dead = true; ro?.disconnect(); map?.remove(); };
  }, [near]);

  return { frame, box, ctx, status: ctx ? 'ready' : failed ? 'error' : 'loading' } as const;
}

function MapFrame({ base, className, label, failText, children }: {
  base: ReturnType<typeof useBaseMap>; className: string; label: string; failText: string; children?: ReactNode;
}) {
  return (
    <div ref={base.frame} role="group" aria-label={label}
      className={`relative overflow-hidden rounded-ui border border-rule bg-chalk ${className} [&_.maplibregl-ctrl-attrib-inner]:!text-sm [&_.maplibregl-ctrl-group_button]:!h-12 [&_.maplibregl-ctrl-group_button]:!w-12`}>
      <div ref={base.box} className="h-full w-full" />
      {base.status !== 'ready' ? (
        <div role="status" className="absolute inset-0 grid place-items-center bg-chalk p-4 text-center text-base text-ink-soft">
          {base.status === 'error' ? failText : 'Đang tải bản đồ…'}
        </div>
      ) : null}
      {children}
    </div>
  );
}

// Lề an toàn: tránh nút +/- ở góc trên phải (rộng ~58px kể cả lề) và attribution ở góc dưới phải (cao ~50px); pin rộng ~80px, cao ~46px phía trên điểm.
const FIT_PAD = { top: 64, bottom: 64, left: 56, right: 100 };

/** Điểm (lng, lat) còn nằm trọn trong khung nhìn (chừa lề cho pin)? */
function inView(map: MapLibreMap, lng: number, lat: number) {
  const { x, y } = map.project([lng, lat]);
  const el = map.getContainer();
  return x > FIT_PAD.left && x < el.clientWidth - FIT_PAD.right && y > FIT_PAD.top && y < el.clientHeight - FIT_PAD.bottom;
}

const PIN: Record<MapTone, { bg: string; fg: string; bd: string }> = {
  open: { bg: 'bg-brand', fg: 'text-white', bd: 'border-brand' },
  urgent: { bg: 'bg-danger', fg: 'text-white', bd: 'border-danger' },
  full: { bg: 'bg-white', fg: 'text-brand', bd: 'border-brand' },
  pending: { bg: 'bg-accent', fg: 'text-ink', bd: 'border-brand-deep' },
  removed: { bg: 'bg-rule', fg: 'text-ink-soft', bd: 'border-ink-soft' },
};
const PIN_ON = { bg: 'bg-accent', fg: 'text-ink', bd: 'border-brand-deep' };

// Chữ rút gọn cho pin chồng nhau: giờ "18:00" -> "18h"; nhiều từ -> từ cuối ("Phê La Vũng Tàu" -> "Tàu"); còn lại cắt 3 ký tự.
// Tên đầy đủ vẫn ở aria-label, và hiện lại khi pin được chọn.
function shortText(t: string) {
  const h = /^(\d{1,2}):\d{2}$/.exec(t);
  if (h) return `${h[1]}h`;
  const w = t.trim().split(/\s+/);
  return (w.length > 1 ? w[w.length - 1] : t).slice(0, 3);
}
const PIN_W = 63; // min-w-[3.5rem] ở cỡ chữ gốc 18px
const PIN_W_NARROW = 45; // min-w-[2.5rem]
const isNum = (t: string) => /^\d{1,2}$/.test(t);
const PIN_H = 46; // cao pin + đuôi, phía trên điểm

// Biển giờ chữ nhật. Vùng chạm mở rộng bằng ::after để đủ 48px mà biển vẫn gọn.
function Pin({ p, selected, lit, crowded, onPick }: { p: MapPoint; selected: boolean; lit: boolean; crowded: boolean; onPick: () => void }) {
  const on = selected || lit;
  // Chữ số ngắn ("1", "2") đã gọn, không rút thêm; pin hẹp nhưng vẫn cao 2rem+ (chữ 20px) và vùng chạm >= 48px nhờ ::after.
  const compact = crowded && !on && !isNum(p.text);
  const narrow = compact || isNum(p.text);
  const c = on ? PIN_ON : PIN[p.tone];
  return (
    <div className={`flex flex-col items-center ${on ? '-translate-y-1' : ''}`}>
      <button type="button" aria-label={p.label} aria-pressed={selected} onClick={onPick}
        className={`relative z-10 ${narrow ? 'min-w-[2.5rem]' : 'min-w-[3.5rem]'} rounded-ui px-2 py-1 font-num text-lg font-bold leading-6 tabular after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[''] ${c.bg} ${c.fg} ${c.bd} ${
          on ? 'border-[3px] shadow-lg' : 'border-2 shadow-md'
        }`}>
        {compact ? shortText(p.text) : p.text}
      </button>
      <span aria-hidden="true" className={`-mt-1.5 h-3 w-3 rotate-45 border-b-2 border-r-2 ${c.bg} ${c.bd}`} />
    </div>
  );
}

export function ShiftMap({ points, selectedId, onSelect, highlightId, fitIds, className = 'h-80', lazy = true, caption }: {
  points: MapPoint[]; selectedId?: string | null; onSelect?: (id: string) => void;
  /** Thêm so với hợp đồng gốc: pin chỉ sáng lên (không chọn, không kéo bản đồ). */
  highlightId?: string | null;
  /** Khung nhìn ban đầu chỉ ôm các điểm có id này (các điểm khác vẫn hiện, kéo bản đồ để xem). */
  fitIds?: string[];
  className?: string; lazy?: boolean; caption?: string;
}) {
  const base = useBaseMap(lazy);
  const { ctx } = base;
  const [inner, setInner] = useState<string | null>(null);
  const [els, setEls] = useState<Record<string, HTMLElement>>({});
  const [crowded, setCrowded] = useState('');
  const markers = useRef(new Map<string, MapLibreMarker>());
  const moved = useRef(false);
  // onSelect('') = bỏ chọn (bấm lại pin đang chọn, hoặc Esc).
  const sel = onSelect ? selectedId ?? null : inner;
  const pick = (id: string) => (onSelect ? onSelect(id) : setInner(id || null));
  const selected = points.find((p) => p.id === sel) ?? null;
  const crowdedSet = new Set(crowded ? crowded.split('|') : []);
  const sig = points.map((p) => `${p.id}@${p.lat},${p.lng}`).join('|');

  // Đồng bộ marker theo danh sách điểm: giữ marker cũ, chỉ thêm/bớt/dời.
  useEffect(() => {
    if (!ctx) return;
    const { map, lib } = ctx;
    let changed = false;
    const ids = new Set(points.map((p) => p.id));
    for (const [id, m] of markers.current) if (!ids.has(id)) { m.remove(); markers.current.delete(id); changed = true; }
    // Nhiều ca cùng một quán (cùng tọa độ): xếp pin chồng dọc, cách nhau 60px (đủ vùng chạm 48px và đuôi không đè pin kế), ca đầu ở trên cùng.
    // Offset tính bằng pixel nên không đổi khi zoom; pin dưới cùng vẫn chỉ đúng điểm.
    const group = new Map<string, MapPoint[]>();
    for (const p of points) {
      const k = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
      group.set(k, [...(group.get(k) ?? []), p]);
    }
    for (const g of group.values()) {
      g.forEach((p, i) => {
        const offset: [number, number] = [0, -(g.length - 1 - i) * 60];
        const m = markers.current.get(p.id);
        if (m) m.setLngLat([p.lng, p.lat]).setOffset(offset);
        else {
          markers.current.set(p.id, new lib.Marker({ element: document.createElement('div'), anchor: 'bottom', offset }).setLngLat([p.lng, p.lat]).addTo(map));
          changed = true;
        }
      });
    }
    if (changed) setEls(Object.fromEntries([...markers.current].map(([id, m]) => [id, m.getElement()])));
  }, [ctx, points]);
  useEffect(() => () => { markers.current.forEach((m) => m.remove()); markers.current.clear(); }, [ctx]);
  useEffect(() => {
    markers.current.forEach((m, id) => { m.getElement().style.zIndex = id === sel || id === highlightId ? '2' : ''; });
  }, [sel, highlightId, els]);

  // Pin của các quán khác nhau mà chồng nhau trên màn hình (đo khi bản đồ dừng zoom/di chuyển): rút gọn chữ cho tới khi được chọn hoặc zoom đủ gần.
  useEffect(() => {
    if (!ctx) return;
    const { map } = ctx;
    const measure = () => {
      const at = points.map((p) => ({ p, ...map.project([p.lng, p.lat]) }));
      const ids = new Set<string>();
      for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) {
        const a = at[i], b = at[j];
        if (a.p.lat === b.p.lat && a.p.lng === b.p.lng) continue; // cùng quán: đã xếp dọc
        const w = (t: string) => Math.max(isNum(t) ? PIN_W_NARROW : PIN_W, t.length * 11 + 20);
        const wa = w(a.p.text), wb = w(b.p.text);
        if (Math.abs(a.x - b.x) < (wa + wb) / 2 && Math.abs(a.y - b.y) < PIN_H) { ids.add(a.p.id); ids.add(b.p.id); }
      }
      setCrowded([...ids].sort().join('|'));
    };
    measure();
    map.on('moveend', measure);
    map.on('zoomend', measure);
    return () => { map.off('moveend', measure); map.off('zoomend', measure); };
  }, [ctx, sig]);

  // Khung nhìn: ôm các điểm; người dùng đã tự kéo/phóng thì không giật lại.
  useEffect(() => {
    if (!ctx) return;
    const { map } = ctx;
    const mark = (e: { originalEvent?: unknown }) => { if (e.originalEvent) moved.current = true; };
    map.on('movestart', mark);
    return () => { map.off('movestart', mark); };
  }, [ctx]);
  useEffect(() => {
    if (!ctx || !points.length || moved.current) return;
    const { map, lib } = ctx;
    const b = new lib.LngLatBounds();
    const ids = fitIds?.length ? new Set(fitIds) : null;
    const target = ids && points.some((p) => ids.has(p.id)) ? points.filter((p) => ids.has(p.id)) : points;
    target.forEach((p) => b.extend([p.lng, p.lat]));
    // Có fitIds: cho zoom gần hơn (tới 16) để các quán sát nhau tách ra.
    map.fitBounds(b, { padding: FIT_PAD, maxZoom: ids ? 16 : 15, animate: !reduced() });
  }, [ctx, sig, fitIds?.join('|')]);

  // Chọn từ ngoài: pin sáng lên và, nếu ngoài khung nhìn, bản đồ dời tới.
  useEffect(() => {
    if (!ctx || !selected || inView(ctx.map, selected.lng, selected.lat)) return;
    const center: [number, number] = [selected.lng, selected.lat];
    if (reduced()) ctx.map.jumpTo({ center });
    else ctx.map.easeTo({ center });
  }, [ctx, sel]);

  // Esc bỏ chọn. Nghe ở document (không dựa vào React bubbling qua portal / marker của MapLibre), trừ khi đang gõ ở ô nhập.
  const pickRef = useRef(pick);
  pickRef.current = pick;
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (e.key === 'Escape' && !t?.closest('input, textarea, select, [contenteditable], dialog')) pickRef.current('');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sel]);

  return (
    <div>
      <MapFrame base={base} className={className} label={caption ?? 'Bản đồ các ca'}
        failText="Chưa tải được bản đồ. Danh sách ca vẫn ở bên dưới.">
        {points.map((p) => {
          const el = els[p.id];
          return el ? createPortal(
            <Pin key={p.id} p={p} selected={p.id === sel} lit={p.id === highlightId} crowded={crowdedSet.has(p.id)}
              onPick={() => pick(p.id === sel ? '' : p.id)} />, el, p.id) : null;
        })}
      </MapFrame>
      {caption ? <p className="mt-2 text-sm text-ink-soft">{caption}</p> : null}
      {selected ? (
        <div role="status" className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-ui border border-rule bg-white p-4">
          <p className="min-w-0 flex-1 text-base text-ink">{selected.label}</p>
          {selected.href ? <Link href={selected.href} className={btn('primary', false)}>Xem ca</Link> : null}
        </div>
      ) : null}
    </div>
  );
}

function toPoint(s: Shift): MapPoint | null {
  if (s.lat == null || s.lng == null) return null;
  const full = s.primary_count >= s.headcount;
  const time = fmtTime(s.starts_at);
  return {
    id: s.id, lat: s.lat, lng: s.lng, text: time, href: `/shifts/${s.id}`,
    label: `${JOB_LABEL[s.job_type]} ${time} ${s.facility_name}`,
    tone: full ? 'full' : s.urgent && s.status === 'open' ? 'urgent' : 'open',
  };
}

/** `now` (ms) do server tính một lần: render ở server và hydrate dùng cùng mốc giờ, tránh lệch trạng thái ca (React #418). */
export function ShiftExplorer({ shifts, now }: { shifts: Shift[]; now: number }) {
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [tab, setTab] = useState<'list' | 'map'>('list');
  const points = shifts.map(toPoint).filter((p): p is MapPoint => p !== null);
  const mapped = new Set(points.map((p) => p.id));
  const unmapped = shifts.length - points.length;
  const hasMap = points.length > 0;

  // Chọn pin thì cuộn thẻ tương ứng vào tầm nhìn; quay lại tab danh sách cũng vậy.
  useEffect(() => {
    if (sel) document.getElementById(`ca-${sel}`)?.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
  }, [sel, tab]);

  return (
    <div className="space-y-4">
      {unmapped > 0 ? <p className="text-base text-ink-soft">{unmapped} ca chưa có vị trí trên bản đồ.</p> : null}
      {hasMap ? (
        <div role="group" aria-label="Cách xem" className="grid grid-cols-2 gap-2 lg:hidden">
          <button type="button" aria-pressed={tab === 'list'} onClick={() => setTab('list')} className={`${btn(tab === 'list' ? 'primary' : 'secondary')} !px-2`}>Danh sách</button>
          <button type="button" aria-pressed={tab === 'map'} onClick={() => setTab('map')} className={`${btn(tab === 'map' ? 'primary' : 'secondary')} !px-2`}>Bản đồ</button>
        </div>
      ) : null}
      <div className={hasMap ? 'lg:grid lg:grid-cols-2 lg:items-start lg:gap-6' : ''}>
        <ul aria-label="Danh sách ca" className={`space-y-4 ${tab === 'map' ? 'hidden lg:block' : ''}`}>
          {shifts.map((s) => (
            <li key={s.id} id={`ca-${s.id}`}
              onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}
              onFocusCapture={() => setHover(s.id)} onBlurCapture={() => setHover(null)}>
              <div className={`rounded-ui ${s.id === sel ? 'ring-2 ring-brand-deep ring-offset-2 ring-offset-chalk' : ''}`}>
                <ShiftCard shift={s} href={`/shifts/${s.id}`} now={now}
                  extra={s.my_role ? (
                    <Badge tone={s.my_role === 'primary' ? 'green' : 'amber'}>
                      Bạn là {s.my_role === 'primary' ? 'người chính' : 'người dự phòng'}
                    </Badge>
                  ) : undefined} />
              </div>
              {mapped.has(s.id) ? (
                <button type="button" onClick={() => { setSel(s.id); setTab('map'); }} className={`${btn('ghost', false)} mt-1`}>
                  Xem vị trí trên bản đồ
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {hasMap ? (
          <div className={`${tab === 'list' ? 'hidden lg:block' : ''} lg:sticky lg:top-8`}>
            <ShiftMap points={points} selectedId={sel} highlightId={hover} caption="Bản đồ các ca"
              onSelect={(id) => setSel(id || null)}
              className="h-[28rem] lg:h-[min(36rem,calc(100dvh_-_8rem))]" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Tự làm mới dữ liệu trang theo chu kỳ (chỉ khi tab đang hiện) và có nút làm mới tay. */
export function LiveRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [last, setLast] = useState<number | null>(null);
  // router.refresh() không cho biết khi nào xong, nên ghi mốc ngay lúc yêu cầu làm mới.
  const run = () => { setLast(Date.now()); start(() => router.refresh()); };
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => setLast(Date.now()), []);
  // Chỉ làm mới khi tab đang hiện; tab ẩn thì bỏ qua, và khi quay lại mà đã quá một chu kỳ thì làm mới một lần.
  const lastRef = useRef(0);
  lastRef.current = last ?? lastRef.current;
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') runRef.current(); };
    const onVisible = () => { if (document.visibilityState === 'visible' && Date.now() - lastRef.current >= intervalMs) runRef.current(); };
    const t = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [intervalMs]);
  return (
    // Nằm dưới tiêu đề, một dòng gọn, cao cố định 3rem (đúng vùng chạm của nút) và giờ dùng chữ số bảng:
    // đổi "--:--" thành giờ thật không làm đổi chiều cao. Nút là ghost để không tranh với hành động chính của trang.
    <div className="flex h-12 items-center justify-between gap-2">
      <p aria-live="off" className="min-w-0 flex-1 text-sm leading-snug text-ink-soft">
        Tự cập nhật · <span className="tabular">{last ? fmtTime(new Date(last).toISOString()) : '--:--'}</span>
      </p>
      <button type="button" onClick={run} disabled={pending} className={`${btn('ghost', false)} !px-2`}>
        <RefreshCw className={`h-5 w-5 ${pending ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
        Làm mới
      </button>
    </div>
  );
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const inBox = (p: { lat: number; lng: number }) =>
  p.lat >= VT_BOX.lat[0] && p.lat <= VT_BOX.lat[1] && p.lng >= VT_BOX.lng[0] && p.lng <= VT_BOX.lng[1];
const PIN_DOT = 'h-6 w-6 rounded-full border-[3px] border-white bg-danger shadow-md';

/** Chọn vị trí: bấm bản đồ hoặc kéo ghim, hoặc dùng vị trí hiện tại, hoặc nhập tọa độ. Tọa độ chỉ nằm trong input ẩn và chỉ gửi khi form được Lưu. */
export function LocationPicker({ lat, lng, latName = 'lat', lngName = 'lng' }: {
  lat: number | null; lng: number | null; latName?: string; lngName?: string;
}) {
  const base = useBaseMap(true);
  const { ctx } = base;
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(lat != null && lng != null ? { lat, lng } : null);
  const [text, setText] = useState({ lat: lat != null ? String(lat) : '', lng: lng != null ? String(lng) : '' });
  const [note, setNote] = useState('');
  const [locating, setLocating] = useState(false);
  const dot = useRef<MapLibreMarker | null>(null);
  const initial = useRef(pos);

  const put = (la: number, ln: number) => {
    const p = { lat: round6(la), lng: round6(ln) };
    setPos(p);
    setText({ lat: String(p.lat), lng: String(p.lng) });
    setNote('');
  };
  const clear = () => { setPos(null); setText({ lat: '', lng: '' }); setNote(''); };

  // Bấm bản đồ để đặt ghim; khung nhìn ban đầu ở ghim có sẵn.
  useEffect(() => {
    if (!ctx) return;
    const { map } = ctx;
    const onClick = (e: { lngLat: { lat: number; lng: number } }) => put(e.lngLat.lat, e.lngLat.lng);
    map.on('click', onClick);
    if (initial.current) map.jumpTo({ center: [initial.current.lng, initial.current.lat], zoom: 15 });
    return () => { map.off('click', onClick); };
  }, [ctx]);

  // Ghim kéo được, bám theo `pos`.
  useEffect(() => {
    if (!ctx) return;
    const { map, lib } = ctx;
    if (!pos) { dot.current?.remove(); dot.current = null; return; }
    if (!dot.current) {
      const el = document.createElement('div');
      el.className = PIN_DOT;
      el.setAttribute('aria-hidden', 'true');
      const m = new lib.Marker({ element: el, draggable: true }).setLngLat([pos.lng, pos.lat]).addTo(map);
      m.on('dragend', () => { const ll = m.getLngLat(); put(ll.lat, ll.lng); });
      dot.current = m;
    } else dot.current.setLngLat([pos.lng, pos.lat]);
    if (!inView(map, pos.lng, pos.lat)) {
      if (reduced()) map.jumpTo({ center: [pos.lng, pos.lat] });
      else map.easeTo({ center: [pos.lng, pos.lat] });
    }
  }, [ctx, pos]);
  useEffect(() => () => { dot.current?.remove(); dot.current = null; }, [ctx]);

  const useHere = () => {
    if (!navigator.geolocation) { setNote('Thiết bị này không hỗ trợ lấy vị trí. Hãy bấm vào bản đồ để ghim.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (g) => { setLocating(false); put(g.coords.latitude, g.coords.longitude); },
      (err) => {
        setLocating(false);
        setNote(err.code === err.PERMISSION_DENIED
          ? 'Trình duyệt chưa cho phép dùng vị trí. Hãy bấm vào bản đồ để ghim, hoặc nhập tọa độ.'
          : 'Chưa lấy được vị trí. Hãy thử lại, hoặc bấm vào bản đồ để ghim.');
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  };
  const applyText = () => {
    const la = Number(text.lat), ln = Number(text.lng);
    if (!text.lat.trim() || !text.lng.trim() || !Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) {
      setNote('Tọa độ chưa đúng. Nhập số, ví dụ vĩ độ 10.346 và kinh độ 107.084.');
      return;
    }
    put(la, ln);
  };
  const onEnter = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); applyText(); } };

  return (
    <div className="space-y-2">
      <input type="hidden" name={latName} value={pos ? pos.lat : ''} />
      <input type="hidden" name={lngName} value={pos ? pos.lng : ''} />
      <MapFrame base={base} className="h-72" label="Bản đồ chọn vị trí. Bấm vào bản đồ hoặc kéo ghim để chọn."
        failText="Chưa tải được bản đồ. Anh/chị vẫn nhập được tọa độ ở mục bên dưới." />
      <p aria-live="polite" className="text-base text-ink">
        {pos ? `Đã ghim: ${pos.lat}, ${pos.lng}` : 'Chưa ghim vị trí'}
      </p>
      {pos && !inBox(pos) ? <Alert tone="red">Vị trí phải nằm trong khu vực Vũng Tàu.</Alert> : null}
      {note ? <Alert tone="amber">{note}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={useHere} disabled={locating} className={btn('secondary', false)}>
          {locating ? 'Đang lấy vị trí…' : 'Dùng vị trí hiện tại'}
        </button>
        {pos ? <button type="button" onClick={clear} className={btn('ghost', false)}>Xóa ghim</button> : null}
      </div>
      <details className="rounded-ui border border-rule bg-white">
        <summary className="flex min-h-[3rem] cursor-pointer items-center px-4 text-base font-semibold text-ink">Nhập tọa độ</summary>
        <div className="space-y-4 border-t border-rule p-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vĩ độ">
              <input type="number" inputMode="decimal" step="any" value={text.lat} onChange={(e) => setText({ ...text, lat: e.target.value })} onKeyDown={onEnter} className={inputCls} />
            </Field>
            <Field label="Kinh độ">
              <input type="number" inputMode="decimal" step="any" value={text.lng} onChange={(e) => setText({ ...text, lng: e.target.value })} onKeyDown={onEnter} className={inputCls} />
            </Field>
          </div>
          <button type="button" onClick={applyText} className={btn('secondary', false)}>Đặt ghim theo tọa độ</button>
        </div>
      </details>
    </div>
  );
}
