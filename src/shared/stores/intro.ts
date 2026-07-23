import { create } from 'zustand';

/*
 * One-time post-login intro choreography state.
 *
 * 'pending'  — a login just succeeded; the overlay should play when the app
 *              shell mounts.
 * 'playing'  — the timeline is running (page-transition ring is suppressed,
 *              the sidebar logo slot hides its own ring until landing).
 * 'done'/'idle' — nothing to show.
 *
 * The sessionStorage flag makes the run once-per-login: a full refresh or
 * token-restore boots to 'idle' (nothing requests the intro), and a repeated
 * StrictMode mount can't replay a finished run within the same login.
 */

const PLAYED_KEY = 'almaz-intro-played';

export type IntroStage = 'idle' | 'pending' | 'playing' | 'done';

interface IntroState {
  stage: IntroStage;
  /** Call on successful login mutation only. */
  request: () => void;
  begin: () => void;
  finish: () => void;
}

export const useIntroStore = create<IntroState>((set) => ({
  stage: 'idle',
  request: () => {
    sessionStorage.removeItem(PLAYED_KEY); // new login -> fresh run
    set({ stage: 'pending' });
  },
  begin: () =>
    // Only the pending -> playing transition acts; StrictMode's double effect
    // invocation makes this run twice, so it must be idempotent.
    set((s) => {
      if (s.stage !== 'pending') return s;
      if (sessionStorage.getItem(PLAYED_KEY)) return { stage: 'done' };
      return { stage: 'playing' };
    }),
  finish: () => {
    sessionStorage.setItem(PLAYED_KEY, '1');
    set({ stage: 'done' });
  },
}));

/** True while the page-transition ring must stay quiet. */
export function isIntroActive(): boolean {
  const s = useIntroStore.getState().stage;
  return s === 'pending' || s === 'playing';
}
