import React from 'react';
import { ViewType, Playlist, Track } from '../types';
import { BrandIcon, HomeIcon, HeartFilledIcon, PlusIcon, UploadIcon } from './Icons';
import { colorFor } from '../utils';

interface SidebarProps {
  currentView: ViewType;
  currentPlaylistId: number | null;
  playlists: Playlist[];
  tracks: Track[];
  onSelectView: (view: ViewType, playlistId?: number | null) => void;
  onNewPlaylist: () => void;
  onUploadClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  currentPlaylistId,
  playlists,
  tracks,
  onSelectView,
  onNewPlaylist,
  onUploadClick,
}) => {
  const likedCount = tracks.filter((t) => t.liked).length;

  return (
    <nav className="sidebar" id="sidebar">
      <div className="brand">
        <BrandIcon />
        <span>Waves</span>
      </div>

      <button
        className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
        onClick={() => onSelectView('home')}
        aria-label="Home"
      >
        <HomeIcon />
        <span>Home</span>
      </button>

      <button
        className={`nav-item ${currentView === 'liked' ? 'active' : ''}`}
        onClick={() => onSelectView('liked')}
        aria-label="Liked Songs"
      >
        <HeartFilledIcon />
        <span>Liked Songs</span>
        <span className="count">{likedCount}</span>
      </button>

      <div className="nav-divider"></div>
      <div className="nav-section-label">Playlists</div>

      <div id="playlistNav">
        {playlists.map((p) => {
          const letter = (p.name.trim()[0] || '?').toUpperCase();
          const isActive = currentView === 'playlist' && currentPlaylistId === p.id;
          const count = p.trackIds.filter((id) => tracks.some((t) => t.id === id)).length;

          return (
            <button
              key={p.id}
              className={`nav-item playlist-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectView('playlist', p.id)}
            >
              <span className="pl-badge" style={{ background: colorFor(p.name) }}>
                {letter}
              </span>
              <span>{p.name}</span>
              <span className="count">{count}</span>
            </button>
          );
        })}
      </div>

      <button className="nav-item" onClick={onNewPlaylist} aria-label="New playlist">
        <PlusIcon />
        <span>New Playlist</span>
      </button>

      <label className="upload-zone" id="uploadZone" onClick={onUploadClick}>
        <UploadIcon />
        <strong>Upload songs</strong>
        <span className="desc">MP3, WAV, M4A, FLAC…</span>
      </label>

      <div className="sidebar-footer" id="libCount">
        {tracks.length === 0
          ? 'Your library is empty'
          : `${tracks.length} song${tracks.length !== 1 ? 's' : ''} in your library`}
      </div>
    </nav>
  );
};
