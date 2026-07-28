import type { ReactNode } from 'react';
import './StageIcon.css';

/*
 * Workshop-tool stage icons for the order pipeline — hand-built inline SVG so
 * they inherit theme tokens (currentColor) and scale freely. Five stages, each
 * a thin jeweler-line drawing (32x32, stroke 1.6, round caps/joins, no fill).
 */

export type StageKey = 'sketch' | 'casting' | 'setting' | 'polish' | 'delivered';
export type StageStatus = 'done' | 'active' | 'pending';
export type StageSize = 'sm' | 'lg';

/* ---- Icon bodies (32x32) ---- */

function SketchBody(): ReactNode {
  return (
    <>
      {/* drafting baseline */}
      <line x1="5" y1="25" x2="19" y2="25" />
      {/* sketched arc rising from the baseline (drawn in) */}
      <path className="si-stroke" pathLength={1} d="M6 25 C10 15.5 15 12.5 20.5 11.5" />
      {/* pencil at the stroke's end (tip on the curve, body angled up-right) */}
      <g className="si-pencil">
        <path d="M20.5 11.5 L22.4 9" />
        <path d="M21.6 9.7 L25.4 5 L27.7 6.9 L23.9 11.6 Z" />
        <line x1="25.4" y1="5" x2="26.3" y2="3.9" />
      </g>
    </>
  );
}

function CastingBody(): ReactNode {
  return (
    <>
      {/* crucible (tapered vessel + pouring lip) — tips when active */}
      <g className="si-crucible">
        <path d="M6.5 6 L14.5 7 L13.4 13 L8.4 12.6 Z" />
        <path d="M14.5 7 L16.8 6.1" />
      </g>
      {/* molten droplet mid-fall */}
      <path className="si-droplet" d="M15 14.4 C15.9 15.4 15.9 16.6 15 17.2 C14.1 16.6 14.1 15.4 15 14.4 Z" />
      {/* open mold/flask below, rim glows */}
      <path d="M16.5 26 L18.5 18.5 L24.5 18.5 L26.5 26 Z" />
      <line className="si-rim" x1="18.2" y1="18.5" x2="24.8" y2="18.5" />
    </>
  );
}

function SettingBody(): ReactNode {
  return (
    <>
      {/* tweezers + gem descend together */}
      <g className="si-descend">
        <path d="M10.5 5 L15.2 13.2" />
        <path d="M21.5 5 L16.8 13.2" />
        <path className="si-gem" d="M12.8 15.2 L16 12 L19.2 15.2 L16 19.4 Z" />
        <line className="si-gem" x1="12.8" y1="15.2" x2="19.2" y2="15.2" />
      </g>
      {/* prong setting: shallow bowl + two prongs rising */}
      <path d="M9 24.5 C12.5 21.5 19.5 21.5 23 24.5" />
      <line x1="11.2" y1="22.7" x2="11.2" y2="19.2" />
      <line x1="20.8" y1="22.7" x2="20.8" y2="19.2" />
      {/* sparkle that pops in */}
      <g className="si-sparkle">
        <line x1="22.5" y1="7.5" x2="22.5" y2="11.5" />
        <line x1="20.5" y1="9.5" x2="24.5" y2="9.5" />
      </g>
    </>
  );
}

function PolishBody(): ReactNode {
  return (
    <>
      {/* spoked buffing wheel — rotates */}
      <g className="si-wheel">
        <circle cx="16" cy="11" r="6.2" />
        <circle cx="16" cy="11" r="1.5" />
        <line x1="16" y1="4.8" x2="16" y2="9.5" />
        <line x1="16" y1="12.5" x2="16" y2="17.2" />
        <line x1="9.8" y1="11" x2="14.5" y2="11" />
        <line x1="17.5" y1="11" x2="22.2" y2="11" />
        <line x1="11.6" y1="6.6" x2="14.9" y2="9.9" />
        <line x1="17.1" y1="12.1" x2="20.4" y2="15.4" />
      </g>
      {/* ring band arc below */}
      <path d="M7.5 25.5 C11.5 20.5 20.5 20.5 24.5 25.5" />
      {/* shine that fades in/out */}
      <line className="si-shine" x1="12.5" y1="23.2" x2="15.5" y2="21.9" />
    </>
  );
}

function DeliveredBody(): ReactNode {
  return (
    <>
      {/* box body */}
      <path d="M7 14.5 L25 14.5 L25 26 L7 26 Z" />
      {/* check mark inside (draws in) */}
      <path className="si-check" pathLength={1} d="M11 20.5 L14.7 24 L21 17.2" />
      {/* lid + ribbon bow (settles down) */}
      <g className="si-lid">
        <path d="M5.5 11 L26.5 11 L26.5 14.5 L5.5 14.5 Z" />
        <path d="M16 11 C13 8.5 13 6 16 8 C19 6 19 8.5 16 11" />
      </g>
    </>
  );
}

/** Single source of truth: stage key -> Uzbek label, order index, icon body. */
export const STAGE_META: Record<StageKey, { key: StageKey; label: string; index: number; Body: () => ReactNode }> = {
  sketch: { key: 'sketch', label: 'Eskiz', index: 0, Body: SketchBody },
  casting: { key: 'casting', label: 'Quyish', index: 1, Body: CastingBody },
  setting: { key: 'setting', label: "Tosh o'rnatish", index: 2, Body: SettingBody },
  polish: { key: 'polish', label: 'Sayqal', index: 3, Body: PolishBody },
  delivered: { key: 'delivered', label: 'Topshirildi', index: 4, Body: DeliveredBody },
};

export const STAGE_ORDER: StageKey[] = ['sketch', 'casting', 'setting', 'polish', 'delivered'];

interface StageIconProps {
  stage: StageKey;
  status: StageStatus;
  size?: StageSize;
  className?: string;
}

export function StageIcon({ stage, status, size = 'lg', className = '' }: StageIconProps) {
  const meta = STAGE_META[stage];
  // Motion only for an active icon at lg — animation in a data grid is noise.
  const animate = size === 'lg' && status === 'active';
  const iconPx = size === 'lg' ? 32 : 18;

  return (
    <span
      role="img"
      aria-label={meta.label}
      className={`stage-icon stage-icon--${size} stage-icon--${status} ${className}`}
    >
      <svg
        width={iconPx}
        height={iconPx}
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? 'si-anim' : undefined}
        data-stage={stage}
        aria-hidden
      >
        {meta.Body()}
      </svg>
    </span>
  );
}
