'use client';

import { useEffect, useRef } from 'react';

// Ánh nước (shader caustics của bộ fx) làm nền hero trang chủ. Là Client Component vì WebGL cần window và canvas.
// Mặc định chỉ là khối brand-deep đặc (bản tĩnh, cũng là thứ server trả về); shader tải lười SAU khi trang đã load và
// trình duyệt rảnh, nên không chặn LCP. Không có WebGL, giảm chuyển động, hoặc bất kỳ lỗi nào thì ở nguyên bản tĩnh.
// Dừng vẽ khi tab ẩn hoặc hero ra khỏi màn hình, và giải phóng WebGL context khi gỡ: do bộ fx lo (lifecycle, teardown).

type Fx = { destroy(): void; info: { fallback: string | null } | null };
type FxKit = { mount(el: HTMLElement, id: string, opts: { seed: number; params: Record<string, number> }): Promise<Fx> };

const FX_URL = '/fx/fx.js';

export function HeroFx() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    const wide = window.matchMedia('(min-width: 1024px)').matches;
    let fx: Fx | null = null;
    let alive = true;
    let timer = 0;
    let idle = 0;

    // Bộ fx tự đặt nền CSS gradient khi không có WebGL hoặc shader lỗi: gỡ nó, trả về nền đặc.
    const watch = new MutationObserver(() => { if (el.dataset.fxFallback) stop(); });
    function stop() {
      watch.disconnect();
      fx?.destroy();
      fx = null;
      el!.style.background = '';
    }
    async function start() {
      if (!alive || fx || still.matches) return;
      try {
        const kit = (await import(/* webpackIgnore: true */ FX_URL)) as FxKit;
        if (!alive || still.matches) return;
        watch.observe(el!, { attributes: true, attributeFilter: ['data-fx-fallback'] });
        // calm: vùng chữ ở bên trái (desktop) hoặc phía trên (điện thoại) gần như không có vệt sáng, để chữ trắng đọc rõ.
        fx = await kit.mount(el!, 'caustics', {
          seed: 7,
          params: { scale: 4.5, speed: 0.12, intensity: 0.7, calm: 0.9, calmX: wide ? 0.27 : 0.5, calmY: wide ? 0.5 : 0.72 },
        });
        if (!alive || still.matches || fx.info?.fallback) stop();
      } catch {
        stop(); // tải hoặc khởi tạo lỗi: giữ bản tĩnh
      }
    }
    const go = () => {
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(() => void start(), { timeout: 2000 });
      else timer = window.setTimeout(() => void start(), 600);
    };
    const schedule = () => {
      if (document.readyState === 'complete') go();
      else window.addEventListener('load', go, { once: true });
    };
    const onMotion = () => { if (still.matches) stop(); else schedule(); };

    still.addEventListener('change', onMotion);
    if (!still.matches) schedule();
    return () => {
      alive = false;
      still.removeEventListener('change', onMotion);
      window.removeEventListener('load', go);
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
      stop();
    };
  }, []);

  // Màu của shader đọc từ biến CSS --fx-*, lấy từ token Tailwind (không viết hex).
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 bg-brand-deep [--fx-accent:theme(colors.accent.DEFAULT)] [--fx-bg:theme(colors.brand.deep)] [--fx-ink:theme(colors.white)]"
    />
  );
}
