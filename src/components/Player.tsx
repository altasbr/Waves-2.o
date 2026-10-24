import React, { useRef } from 'react';
import { Track, RepeatMode } from '../types';
import {
  NoteIcon,
  HeartOutlineIcon,
  HeartFilledIcon,
  ShuffleIcon,
  PrevIcon,
  NextIcon,
  PlayMdIcon,
  PauseMdIcon,
  RepeatIcon,
  VolumeIcon,
  CollapseIcon,
} from './Icons';
import { formatTime, gradientFor } from '../utils';

interface PlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isExpanded: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleLike: (trackId: number) => void;
  onSeek: (seconds: number) => void;
  onChangeVolume: (vol: number) => void;
  onOpenExpanded: () => void;
  onCloseExpanded: () => void;
}

export const Player: React.FC<PlayerProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isShuffle,
  repeatMode,
  isExpanded,
  onTogglePlay,
  onPrev,
  onNext,
  onToggleShuffle,
  onCycleRepeat,
  onToggleLike,
  onSeek,
  onChangeVolume,
  onOpenExpanded,
  onCloseExpanded,
}) => {
  const seekBarRef = useRef<HTMLDivElement>(null);
  const volBarRef = useRef<HTMLDivElement>(null);

  const curDuration = duration || (currentTrack ? currentTrack.duration : 0) || 0;
  const seekPct = curDuration > 0 ? Math.min(100, Math.max(0, (currentTime / curDuration) * 100)) : 0;
  const volPct = Math.min(100, Math.max(0, volume * 100));

  const handleBarPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    barRef: React.RefObject<HTMLDivElement | null>,
    onCommitPct: (pct: number) => void
  ) => {
    e.preventDefault();
    const bar = barRef.current;
    if (!bar) return;

    const calcPct = (clientX: number) => {
      const rect = bar.getBoundingClientRect();
      const x = clientX - rect.left;
      return Math.min(1, Math.max(0, rect.width ? x / rect.width : 0));
    };

    onCommitPct(calcPct(e.clientX));

    const onPointerMove = (moveEvt: PointerEvent) => {
      onCommitPct(calcPct(moveEvt.clientX));
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const artStyle: React.CSSProperties = currentTrack
    ? currentTrack.picture
      ? { backgroundImage: `url('${currentTrack.picture}')` }
      : { backgroundImage: gradientFor(currentTrack.title + '-' + currentTrack.id) }
    : {};

  const controlsContent = (
    <div className="controls" id="controlsGroup">
      <div className="control-btns">
        <button
          className={`ctrl shuffle ${isShuffle ? 'active' : ''}`}
          onClick={onToggleShuffle}
          title="Shuffle"
          aria-label="Toggle shuffle"
        >
          <ShuffleIcon />
        </button>

        <button className="ctrl" onClick={onPrev} title="Previous" aria-label="Previous track">
          <PrevIcon />
        </button>

        <button
          className="play-btn"
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseMdIcon /> : <PlayMdIcon />}
        </button>

        <button className="ctrl" onClick={onNext} title="Next" aria-label="Next track">
          <NextIcon />
        </button>

        <button
          className={`ctrl repeat ${repeatMode !== 0 ? 'active' : ''}`}
          onClick={onCycleRepeat}
          title={
            repeatMode === 0
              ? 'Repeat'
              : repeatMode === 1
              ? 'Repeat all (tap for repeat one)'
              : 'Repeat this song on loop'
          }
          aria-label="Toggle repeat"
        >
          <RepeatIcon />
          {repeatMode === 2 && <span className="badge">1</span>}
        </button>
      </div>

      <div className="progress-row">
        <span className="time">{formatTime(currentTime)}</span>
        <div
          className="bar"
          ref={seekBarRef}
          role="slider"
          aria-label="Seek"
          onPointerDown={(e) =>
            handleBarPointerDown(e, seekBarRef, (pct) => {
              onSeek(pct * curDuration);
            })
          }
        >
          <div className="track">
            <div className="fill" style={{ width: `${seekPct}%` }}></div>
            <div className="knob" style={{ left: `${seekPct}%` }}></div>
          </div>
        </div>
        <span className="time">{formatTime(curDuration)}</span>
      </div>
    </div>
  );

  return (
    <>
      <footer className="player">
        <div
          className="now-playing"
          id="nowPlaying"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.np-like')) {
              onOpenExpanded();
            }
          }}
        >
          <div className="np-art" style={artStyle}>
            {(!currentTrack || !currentTrack.picture) && <NoteIcon />}
          </div>
          <div className="np-text">
            <div className="np-title">{currentTrack ? currentTrack.title : 'No song playing'}</div>
            <div className="np-artist">
              {currentTrack ? currentTrack.artist : 'Upload a song to get started'}
            </div>
          </div>
          <button
            className={`np-like ${currentTrack?.liked ? 'liked' : ''}`}
            title="Like"
            aria-label="Like current song"
            onClick={(e) => {
              e.stopPropagation();
              if (currentTrack) onToggleLike(currentTrack.id);
            }}
          >
            {currentTrack?.liked ? <HeartFilledIcon /> : <HeartOutlineIcon />}
          </button>
        </div>

        {controlsContent}

        <div className="extras">
          <div className="vol-wrap">
            <VolumeIcon />
            <div
              className="bar"
              ref={volBarRef}
              role="slider"
              aria-label="Volume"
              onPointerDown={(e) =>
                handleBarPointerDown(e, volBarRef, (pct) => {
                  onChangeVolume(pct);
                })
              }
            >
              <div className="track">
                <div className="fill" style={{ width: `${volPct}%` }}></div>
                <div className="knob" style={{ left: `${volPct}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Full-screen Now Playing view: slide-up modal */}
      <div className={`now-playing-expanded ${isExpanded ? 'open' : ''}`} id="expandedPlayer">
        <div className="exp-bg" style={artStyle}></div>
        <div className="exp-content">
          <div className="exp-header">
            <button className="exp-collapse" onClick={onCloseExpanded} aria-label="Minimize">
              <CollapseIcon />
            </button>
            <div className="exp-header-label">Now Playing</div>
            <div className="exp-header-spacer"></div>
          </div>

          <div className="exp-art-wrap">
            <div className="exp-art" style={artStyle}>
              {(!currentTrack || !currentTrack.picture) && <NoteIcon />}
            </div>
          </div>

          <div className="exp-meta">
            <div className="exp-text">
              <div className="exp-title">{currentTrack ? currentTrack.title : 'No song playing'}</div>
              <div className="exp-artist">
                {currentTrack ? currentTrack.artist : 'Upload a song to get started'}
              </div>
            </div>
            <button
              className={`exp-like ${currentTrack?.liked ? 'liked' : ''}`}
              aria-label="Like current song"
              onClick={() => {
                if (currentTrack) onToggleLike(currentTrack.id);
              }}
            >
              {currentTrack?.liked ? <HeartFilledIcon /> : <HeartOutlineIcon />}
            </button>
          </div>

          <div className="exp-controls-slot">
            {controlsContent}
          </div>
        </div>
      </div>
    </>
  );
};
