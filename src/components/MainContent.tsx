import React, { useState } from 'react';
import { ViewType, Playlist, Track } from '../types';
import { TrackRow } from './TrackRow';
import {
  SearchIcon,
  PlusIcon,
  NoteIcon,
  PlayMdIcon,
  PauseMdIcon,
  ShuffleIcon,
  SortIcon,
  CheckIcon,
  EditIcon,
  TrashIcon,
  HeartFilledIcon,
  HeartOutlineIcon,
  PlaylistAddIcon,
} from './Icons';
import { formatTotalDuration, coverStyleForList, moodColorFor } from '../utils';

interface MainContentProps {
  currentView: ViewType;
  currentPlaylistId: number | null;
  playlists: Playlist[];
  tracks: Track[];
  visibleTracks: Track[];
  currentTrackId: number | null;
  isPlaying: boolean;
  searchQuery: string;
  isShuffle: boolean;
  onSearchChange: (q: string) => void;
  onUploadClick: () => void;
  onPlayTrack: (track: Track) => void;
  onTogglePlay: () => void;
  onShuffleList: (list: Track[]) => void;
  onToggleLike: (trackId: number) => void;
  onAddToPlaylist: (trackId: number) => void;
  onRemoveTrack: (track: Track) => void;
  onOpenPlaylist: (playlistId: number) => void;
  onRenamePlaylist: (playlistId: number) => void;
  onDeletePlaylist: (playlistId: number) => void;
  onReorderTracks: (reordered: Track[]) => void;
  onFilesDrop: (files: FileList) => void;
}

export const MainContent: React.FC<MainContentProps> = ({
  currentView,
  currentPlaylistId,
  playlists,
  tracks,
  visibleTracks,
  currentTrackId,
  isPlaying,
  searchQuery,
  isShuffle,
  onSearchChange,
  onUploadClick,
  onPlayTrack,
  onTogglePlay,
  onShuffleList,
  onToggleLike,
  onAddToPlaylist,
  onRemoveTrack,
  onOpenPlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onReorderTracks,
  onFilesDrop,
}) => {
  const [reorderMode, setReorderMode] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId) || null;

  // Determine mood color
  let moodColor = '#202020';
  if (currentView === 'liked') moodColor = '#2c2049';
  else if (currentView === 'playlist' && currentPlaylist) {
    moodColor = moodColorFor(currentPlaylist.name);
  }

  const canReorder = (currentView === 'home' || currentView === 'playlist') && !searchQuery;

  // Hero calculations
  const totalDuration = visibleTracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const heroIsPlayingThis = isPlaying && currentTrackId != null && visibleTracks.some((t) => t.id === currentTrackId);

  const handleHeroPlay = () => {
    if (!visibleTracks.length) return;
    if (currentTrackId != null && visibleTracks.some((t) => t.id === currentTrackId)) {
      onTogglePlay();
    } else {
      onPlayTrack(visibleTracks[0]);
    }
  };

  const handleHeroShuffle = () => {
    if (!visibleTracks.length) return;
    onShuffleList(visibleTracks);
  };

  const handleDragStart = (index: number) => {
    setDraggedIdx(index);
  };

  const handleDragOver = (targetIndex: number) => {
    if (draggedIdx === null || draggedIdx === targetIndex) return;
    const reordered = [...visibleTracks];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIndex, 0, moved);
    setDraggedIdx(targetIndex);
    onReorderTracks(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const handleMainDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleMainDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files) {
      onFilesDrop(e.dataTransfer.files);
    }
  };

  return (
    <main
      className="main"
      id="main"
      style={{ '--mood-color': moodColor } as React.CSSProperties}
      onDragOver={handleMainDragOver}
      onDrop={handleMainDrop}
    >
      <div className="topbar">
        <div className="search-wrap">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search your songs"
            aria-label="Search your songs"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (e.target.value) setReorderMode(false);
            }}
          />
        </div>
        <button className="btn-primary" onClick={onUploadClick}>
          <PlusIcon />
          Upload
        </button>
      </div>

      <div className="content anim-in" id="content">
        {tracks.length === 0 ? (
          <div className="empty">
            <div className="empty-icon-wrap">
              <NoteIcon />
            </div>
            <h2>Your library is empty</h2>
            <p>Upload MP3, WAV, M4A or FLAC files from your device to start listening.</p>
            <button className="btn-primary" onClick={onUploadClick}>
              <PlusIcon />
              Upload songs
            </button>
          </div>
        ) : (
          <>
            {/* Hero Header for Liked Songs / Playlist */}
            {(currentView === 'liked' || currentView === 'playlist') && (
              <>
                <div className="detail-hero">
                  <div
                    className={`hero-art ${currentView === 'liked' ? 'liked-gradient' : ''}`}
                    style={
                      currentView === 'playlist' && currentPlaylist
                        ? coverStyleForList(visibleTracks, currentPlaylist.name)
                        : undefined
                    }
                  >
                    {currentView === 'liked' ? (
                      <HeartFilledIcon />
                    ) : (
                      !visibleTracks.some((t) => !!t.picture) && <NoteIcon />
                    )}
                  </div>
                  <div className="hero-info">
                    <h1 className="hero-title">
                      {currentView === 'liked' ? 'Liked Songs' : currentPlaylist?.name || 'Playlist'}
                    </h1>
                    <div className="hero-meta">
                      {visibleTracks.length} song{visibleTracks.length !== 1 ? 's' : ''}
                      {visibleTracks.length > 0 && ` • ${formatTotalDuration(totalDuration)}`}
                    </div>
                  </div>
                </div>

                <div className="hero-actions">
                  {visibleTracks.length > 0 && !reorderMode && (
                    <>
                      <button
                        className={`hero-play ${heroIsPlayingThis ? 'is-playing' : ''}`}
                        title={heroIsPlayingThis ? 'Pause' : 'Play'}
                        aria-label={heroIsPlayingThis ? 'Pause' : 'Play'}
                        onClick={handleHeroPlay}
                      >
                        {heroIsPlayingThis ? <PauseMdIcon /> : <PlayMdIcon />}
                      </button>
                      <button
                        className={`hero-shuffle ${isShuffle ? 'active' : ''}`}
                        title="Shuffle"
                        aria-label="Shuffle this list"
                        onClick={handleHeroShuffle}
                      >
                        <ShuffleIcon />
                      </button>
                    </>
                  )}

                  {currentView === 'playlist' && currentPlaylist && (
                    <div className="header-actions">
                      {canReorder && visibleTracks.length > 1 && (
                        <button
                          className={`icon-btn ${reorderMode ? 'active' : ''}`}
                          title={reorderMode ? 'Done reordering' : 'Reorder songs'}
                          aria-label={reorderMode ? 'Done reordering' : 'Reorder songs'}
                          onClick={() => setReorderMode(!reorderMode)}
                        >
                          {reorderMode ? <CheckIcon /> : <SortIcon />}
                        </button>
                      )}
                      <button
                        className="icon-btn"
                        title="Rename playlist"
                        aria-label="Rename playlist"
                        onClick={() => onRenamePlaylist(currentPlaylist.id)}
                      >
                        <EditIcon />
                      </button>
                      <button
                        className="icon-btn danger"
                        title="Delete playlist"
                        aria-label="Delete playlist"
                        onClick={() => onDeletePlaylist(currentPlaylist.id)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Header for Home view */}
            {currentView === 'home' && (
              <div className="content-header">
                <h1>Your Library</h1>
                {canReorder && visibleTracks.length > 1 && (
                  <div className="header-actions">
                    <button
                      className={`icon-btn ${reorderMode ? 'active' : ''}`}
                      title={reorderMode ? 'Done reordering' : 'Reorder songs'}
                      aria-label={reorderMode ? 'Done reordering' : 'Reorder songs'}
                      onClick={() => setReorderMode(!reorderMode)}
                    >
                      {reorderMode ? <CheckIcon /> : <SortIcon />}
                    </button>
                  </div>
                )}
              </div>
            )}
            {currentView === 'home' && (
              <div className="sub">
                {tracks.length} song{tracks.length !== 1 ? 's' : ''}
              </div>
            )}

            {/* Home: visual playlist cards grid */}
            {currentView === 'home' && !searchQuery && playlists.length > 0 && !reorderMode && (
              <>
                <div className="section-heading">Your Playlists</div>
                <div className="pl-grid">
                  {playlists.map((p) => {
                    const plTracks = p.trackIds
                      .map((id) => tracks.find((t) => t.id === id))
                      .filter((t): t is Track => !!t);
                    const plHasArt = plTracks.some((t) => !!t.picture);

                    return (
                      <div
                        key={p.id}
                        className="pl-card"
                        onClick={() => onOpenPlaylist(p.id)}
                      >
                        <div
                          className="pl-card-art"
                          style={coverStyleForList(plTracks, p.name)}
                        >
                          {!plHasArt && <NoteIcon />}
                          <button
                            className="pl-card-play"
                            aria-label={`Play ${p.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (plTracks.length > 0) {
                                onPlayTrack(plTracks[0]);
                              }
                            }}
                          >
                            <PlayMdIcon />
                          </button>
                        </div>
                        <div className="pl-card-name">{p.name}</div>
                        <div className="pl-card-count">
                          {plTracks.length} song{plTracks.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Tracklist Body */}
            {visibleTracks.length > 0 ? (
              <div id="trackList">
                {(!reorderMode || !canReorder) && (
                  <div className="track-header">
                    <div></div>
                    <div>Title</div>
                    <div style={{ textAlign: 'right' }}>Duration</div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                )}
                {visibleTracks.map((t, idx) => (
                  <TrackRow
                    key={t.id}
                    track={t}
                    index={idx}
                    isCurrent={currentTrackId === t.id}
                    isPlaying={isPlaying}
                    isPlaylistView={currentView === 'playlist'}
                    isReorderMode={reorderMode && canReorder}
                    onPlay={() => {
                      if (currentTrackId === t.id) {
                        onTogglePlay();
                      } else {
                        onPlayTrack(t);
                      }
                    }}
                    onToggleLike={() => onToggleLike(t.id)}
                    onAddToPlaylist={() => onAddToPlaylist(t.id)}
                    onRemove={() => onRemoveTrack(t)}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
            ) : (
              <div className="empty">
                <div className="empty-icon-wrap">
                  {currentView === 'liked' ? (
                    <HeartOutlineIcon />
                  ) : currentView === 'playlist' ? (
                    <PlaylistAddIcon />
                  ) : (
                    <SearchIcon />
                  )}
                </div>
                <h2>
                  {currentView === 'liked'
                    ? 'Songs you like will show up here'
                    : currentView === 'playlist'
                    ? 'This playlist is empty'
                    : 'No songs found'}
                </h2>
                <p>
                  {currentView === 'liked'
                    ? 'Tap the heart on any song to save it here.'
                    : currentView === 'playlist'
                    ? 'Add songs to this playlist with the list-plus button on any track.'
                    : 'Try a different search.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};
