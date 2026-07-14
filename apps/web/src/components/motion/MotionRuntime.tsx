import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const REVEAL_SELECTOR = [
  '[data-motion]',
  'main section',
  'main article',
  'main aside',
  'main form',
  'main table',
  'main [role="dialog"]',
  'main .nowen-card',
  'main .nowen-surface',
  'main .grid > a',
  'main .grid > article',
  'main .grid > div[class*="rounded"]',
].join(',');

const INTERACTIVE_SELECTOR = [
  '.nowen-card',
  '.nowen-surface[data-interactive="true"]',
  '[data-motion-tilt="true"]',
].join(',');

const RIPPLE_SELECTOR = [
  'button:not([data-motion-ripple="false"])',
  'a.nowen-button-primary',
  'a.nowen-button-secondary',
  'a.nowen-icon-button',
  '[data-motion-ripple="true"]',
].join(',');

type ScanMotionNodes = (scope: ParentNode) => void;

function revealVariant(element: HTMLElement, index: number): string {
  if (element.dataset.motionVariant) return element.dataset.motionVariant;
  if (element.matches('[role="dialog"]')) return 'scale';
  if (element.matches('table, form')) return 'soft';
  return ['up', 'up', 'left', 'right'][index % 4];
}

function siblingIndex(element: HTMLElement): number {
  if (!element.parentElement) return 0;
  return Array.from(element.parentElement.children).indexOf(element);
}

export function MotionRuntime() {
  const location = useLocation();
  const scanRef = useRef<ScanMotionNodes | null>(null);

  useEffect(() => {
    const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointerMedia = window.matchMedia('(pointer: fine)');
    const root = document.documentElement;
    const updateMotionPreference = () => root.classList.toggle('motion-enabled', !motionMedia.matches);
    updateMotionPreference();
    motionMedia.addEventListener('change', updateMotionPreference);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          element.dataset.motionVisible = 'true';
          observer.unobserve(element);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    const prepareElement = (element: HTMLElement, index: number) => {
      if (element.dataset.motionReady === 'true') return;
      if (element.closest('[data-motion-ignore="true"]')) return;
      if (element.matches('.nowen-skeleton, .animate-pulse')) return;
      if (element.hidden || element.getAttribute('aria-hidden') === 'true') return;

      element.dataset.motionReady = 'true';
      element.dataset.motionVariant = revealVariant(element, index);
      const delay = Math.min(Math.max(siblingIndex(element), 0) * 48, 288);
      element.style.setProperty('--motion-delay', `${delay}ms`);
      observer.observe(element);
    };

    const scan: ScanMotionNodes = (scope) => {
      if (scope instanceof HTMLElement && scope.matches(REVEAL_SELECTOR)) prepareElement(scope, 0);
      Array.from(scope.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)).forEach(prepareElement);
    };
    scanRef.current = scan;

    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) scan(node);
        });
      });
    });

    scan(document.body);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    let activeInteractive: HTMLElement | null = null;
    const clearInteractive = (element: HTMLElement | null) => {
      if (!element) return;
      element.style.removeProperty('--spotlight-x');
      element.style.removeProperty('--spotlight-y');
      element.style.removeProperty('--motion-tilt-x');
      element.style.removeProperty('--motion-tilt-y');
      element.removeAttribute('data-motion-pointer');
    };

    const onPointerMove = (event: PointerEvent) => {
      if (motionMedia.matches || !finePointerMedia.matches) return;
      const source = event.target instanceof Element ? event.target : null;
      const target = source?.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
      if (!target) {
        clearInteractive(activeInteractive);
        activeInteractive = null;
        return;
      }

      if (activeInteractive && activeInteractive !== target) clearInteractive(activeInteractive);
      activeInteractive = target;
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
      const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
      target.dataset.motionPointer = 'true';
      target.style.setProperty('--spotlight-x', `${x * 100}%`);
      target.style.setProperty('--spotlight-y', `${y * 100}%`);
      target.style.setProperty('--motion-tilt-x', `${(0.5 - y) * 3.2}deg`);
      target.style.setProperty('--motion-tilt-y', `${(x - 0.5) * 3.2}deg`);
    };

    const onPointerLeave = () => {
      clearInteractive(activeInteractive);
      activeInteractive = null;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (motionMedia.matches || event.button !== 0) return;
      const source = event.target instanceof Element ? event.target : null;
      const host = source?.closest(RIPPLE_SELECTOR) as HTMLElement | null;
      if (!host || host.matches(':disabled, [aria-disabled="true"]')) return;

      const rect = host.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.8;
      const ripple = document.createElement('span');
      ripple.className = 'nowen-ripple';
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      host.classList.add('nowen-ripple-host');
      host.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    };

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);

    return () => {
      scanRef.current = null;
      mutationObserver.disconnect();
      observer.disconnect();
      clearInteractive(activeInteractive);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerdown', onPointerDown);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      motionMedia.removeEventListener('change', updateMotionPreference);
      root.classList.remove('motion-enabled');
    };
  }, []);

  useEffect(() => {
    const firstScan = window.requestAnimationFrame(() => scanRef.current?.(document.body));
    const delayedScan = window.setTimeout(() => scanRef.current?.(document.body), 140);
    return () => {
      window.cancelAnimationFrame(firstScan);
      window.clearTimeout(delayedScan);
    };
  }, [location.pathname, location.search]);

  return <div key={location.key} className="nowen-route-progress" aria-hidden="true" />;
}
