import React, { useRef } from 'react';
import { Track } from '../types';
import {
  NoteIcon,
  PlaySmallIcon,
  HeartFilledIcon,
  HeartOutlineIcon,
  PlaylistAddIcon,
  TrashIcon,
  RemoveIcon,
  GripIcon,
} from './Icons';
import { formatTime, gradientFor } from '../utils';

interface TrackRowProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isPlaylistView: boolean;
  isReorderMode: boolean;
  onPlay: () => void;
  onToggleLike: () => void;
  onAddToPlaylist: () => void;
  onRemove: () => void;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDragEnd?: () => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  isCurrent,
  isPlaylistView,
  isReorderMode,
  onPlay,
  onToggleLike,
  onAddToPlaylist,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const artStyle: React.CSSProperties = track.picture
    ? { backgroundImage: `url('${track.picture}')` }
    : { backgroundImage: gradientFor(track.title + '-' + track.id) };

  if (isReorderMode) {
    return (
      <div
        ref={rowRef}
        className="track-row reorder"
        draggable
        onDragStart={() => onDragStart && onDragStart(index)}
        onDragOver={(e) => {
          e.preventDefault();
          if (onDragOver) onDragOver(index);
        }}
        onDragEnd={() => onDragEnd && onDragEnd()}
      >
        <button className="drag-handle" aria-label="Drag to reorder">
          <GripIcon />
        </button>
        <div className="t-info">
          <div className="t-art" style={artStyle}>
            {!track.picture && <NoteIcon />}
          </div>
          <div className="t-text">
            <div className="t-title">{track.title}</div>
            <div className="t-artist">{track.artist}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      className={`track-row ${isCurrent ? 'current' : ''}`}
      onClick={onPlay}
    >
      <div className="t-idx">
        <span className="num">{index + 1}</span>
        <span className="ic-play">
          <PlaySmallIcon />
        </span>
        <div className="eq">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <div className="t-info">
        <div className="t-art" style={artStyle}>
          {!track.picture && <NoteIcon />}
        </div>
        <div className="t-text">
          <div className="t-title">{track.title}</div>
          <div className="t-artist">{track.artist}</div>
        </div>
      </div>

      <div className="t-dur">{formatTime(track.duration)}</div>

      <button
        className={`t-like ${track.liked ? 'liked' : ''}`}
        aria-label="Like"
        title="Like"
        onClick={(e) => {
          e.stopPropagation();
          onToggleLike();
        }}
      >
        {track.liked ? <HeartFilledIcon /> : <HeartOutlineIcon />}
      </button>

      <button
        className="t-plus"
        aria-label="Add to playlist"
        title="Add to playlist"
        onClick={(e) => {
          e.stopPropagation();
          onAddToPlaylist();
        }}
      >
        <PlaylistAddIcon />
      </button>

      <button
        className="t-del"
        aria-label={isPlaylistView ? 'Remove from playlist' : 'Remove from library'}
        title={isPlaylistView ? 'Remove from playlist' : 'Remove from library'}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        {isPlaylistView ? <RemoveIcon /> : <TrashIcon />}
      </button>
    </div>
  );
};
