import { Track } from './types';

export function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

export function titleFromFilename(name: string): string {
  let base = name.replace(/\.[^/.]+$/, '');
  base = base.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base || 'Untitled';
}

export function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function gradientFor(str: string): string {
  const h1 = hashStr(str) % 360;
  const h2 = (h1 + 45) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 60%, 42%), hsl(${h2}, 65%, 22%))`;
}

export function colorFor(str: string): string {
  return `hsl(${hashStr(str) % 360}, 55%, 32%)`;
}

export function moodColorFor(str: string): string {
  return `hsl(${hashStr(str) % 360}, 38%, 16%)`;
}

export function formatTotalDuration(totalSeconds: number): string {
  if (!totalSeconds) return '0 min';
  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) return mins + ' min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h + ' hr' + (m ? ' ' + m + ' min' : '');
}

export function coverStyleForList(list: Track[], seedStr: string): React.CSSProperties {
  const withArt = list.find((t) => !!t.picture);
  if (withArt && withArt.picture) {
    return { backgroundImage: `url('${withArt.picture}')` };
  }
  return { backgroundImage: gradientFor(seedStr) };
}

export function isAudioFile(file: File): boolean {
  if (file.type && file.type.indexOf('audio/') === 0) return true;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus', 'weba'].includes(ext);
}
