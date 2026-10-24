import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Track, Playlist, ViewType, RepeatMode, StorageBackend, LibraryData } from './types';
import { detectStorage, bytesToBase64 } from './storage';
import { titleFromFilename, isAudioFile } from './utils';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { Player } from './components/Player';
import { PromptModal, PlaylistPickerModal } from './components/Modals';

export const App: React.FC = () => {
  const [storage, setStorage] = useState<StorageBackend | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(0);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [currentPlaylistId, setCurrentPlaylistId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals state
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    title: string;
    defaultValue: string;
    confirmLabel: string;
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    defaultValue: '',
    confirmLabel: 'Save',
    onConfirm: () => {},
  });

  const [pickerTrackId, setPickerTrackId] = useState<number | null>(null);

  // IDs trackers
  const nextIdRef = useRef<number>(1);
  const nextPlaylistIdRef = useRef<number>(1);
  const tracksRef = useRef<Track[]>(tracks);
  tracksRef.current = tracks;
  const playlistsRef = useRef<Playlist[]>(playlists);
  playlistsRef.current = playlists;
  const currentIndexRef = useRef<number>(currentTrackIndex);
  currentIndexRef.current = currentTrackIndex;
  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;
  const isShuffleRef = useRef<boolean>(isShuffle);
  isShuffleRef.current = isShuffle;
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  repeatModeRef.current = repeatMode;
  const storageRef = useRef<StorageBackend | null>(null);
  storageRef.current = storage;

  // Audio elements
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<any>(null);
  const pendingPlayRef = useRef<boolean>(false);
  const autoAdvancingRef = useRef<boolean>(false);
  const lastPositionSaveRef = useRef<number>(0);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2400);
  }, []);

  const buildLibraryData = useCallback((): LibraryData => {
    const curIdx = currentIndexRef.current;
    const curTrack = curIdx > -1 && tracksRef.current[curIdx] ? tracksRef.current[curIdx] : null;
    return {
      nextId: nextIdRef.current,
      nextPlaylistId: nextPlaylistIdRef.current,
      playlists: playlistsRef.current,
      tracks: tracksRef.current.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        picture: t.picture,
        duration: t.duration,
        liked: t.liked,
        ref: t.ref,
      })),
      nowPlaying: curTrack
        ? {
            trackId: curTrack.id,
            position: audioRef.current?.currentTime || 0,
            wasPlaying: isPlayingRef.current,
          }
        : null,
    };
  }, []);

  const persistLibrary = useCallback(() => {
    const store = storageRef.current;
    if (!store || store.mode === 'memory') return;
    store.saveMeta(buildLibraryData()).catch((e) => {
      console.error('Waves: could not save library', e);
    });
  }, [buildLibraryData]);

  // Derived visible tracks
  const getVisibleTracks = useCallback((): Track[] => {
    let list: Track[] = [];
    if (currentView === 'liked') {
      list = tracks.filter((t) => t.liked);
    } else if (currentView === 'playlist') {
      const pl = playlists.find((p) => p.id === currentPlaylistId);
      list = pl
        ? pl.trackIds.map((id) => tracks.find((t) => t.id === id)).filter((t): t is Track => !!t)
        : [];
    } else {
      list = [...tracks];
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      );
    }
    return list;
  }, [currentView, currentPlaylistId, tracks, playlists, searchQuery]);

  const visibleTracks = getVisibleTracks();

  // Media session update
  const updateMediaSession = useCallback((track: Track | null) => {
    if (!('mediaSession' in navigator) || !track) return;
    const artwork = track.picture
      ? [{ src: track.picture, sizes: '512x512' }]
      : [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'Waves',
        artwork: artwork,
      });
    } catch (e) {
      // safe to ignore
    }
  }, []);

  // Preload next track
  const preloadNext = useCallback(() => {
    const curIdx = currentIndexRef.current;
    const repMode = repeatModeRef.current;
    const shuffle = isShuffleRef.current;
    if (curIdx < 0 || shuffle || repMode === 2) return;

    const list = getVisibleTracks();
    const order = list.length
      ? list.map((t) => tracksRef.current.indexOf(t))
      : tracksRef.current.map((_, i) => i);
    const pos = order.indexOf(curIdx);
    let nextPos = pos + 1;
    if (nextPos >= order.length) {
      if (repMode !== 1) return;
      nextPos = 0;
    }
    const nextIdx = order[nextPos];
    const nextTrack = nextIdx > -1 && tracksRef.current[nextIdx] ? tracksRef.current[nextIdx] : null;
    if (nextAudioRef.current) {
      if (nextTrack && nextTrack.url) {
        if (nextAudioRef.current.src !== nextTrack.url) {
          nextAudioRef.current.src = nextTrack.url;
          nextAudioRef.current.load();
        }
      } else {
        nextAudioRef.current.removeAttribute('src');
      }
    }
  }, [getVisibleTracks]);

  const playWithRetry = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const p = audio.play();
    if (p && p.catch) {
      p.catch((err) => {
        if (autoAdvancingRef.current) {
          pendingPlayRef.current = true;
          console.log('Waves: browser blocked automatic next-track play; will resume on next user action', err);
        }
      });
    }
  }, []);

  const resumePendingPlay = useCallback(() => {
    if (!pendingPlayRef.current) return;
    pendingPlayRef.current = false;
    if (currentIndexRef.current > -1) {
      playWithRetry();
    }
  }, [playWithRetry]);

  const playTrackByIndex = useCallback(
    (idx: number) => {
      const allTracks = tracksRef.current;
      if (idx < 0 || idx >= allTracks.length) return;
      const track = allTracks[idx];
      const audio = audioRef.current;
      if (!audio) return;

      if (currentIndexRef.current !== idx) {
        setCurrentTrackIndex(idx);
        audio.src = track.url;
      }
      updateMediaSession(track);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      playWithRetry();
      preloadNext();
    },
    [updateMediaSession, playWithRetry, preloadNext]
  );

  const togglePlay = useCallback(() => {
    const curIdx = currentIndexRef.current;
    const audio = audioRef.current;
    if (!audio) return;

    if (curIdx === -1) {
      if (tracksRef.current.length > 0) playTrackByIndex(0);
      return;
    }

    if (audio.paused) {
      pendingPlayRef.current = false;
      playWithRetry();
    } else {
      audio.pause();
    }
  }, [playTrackByIndex, playWithRetry]);

  const nextTrack = useCallback(
    (userInitiated = false) => {
      const allTracks = tracksRef.current;
      if (!allTracks.length) return;
      const curIdx = currentIndexRef.current;
      if (curIdx === -1) {
        playTrackByIndex(0);
        return;
      }
      const list = getVisibleTracks();
      const order = list.length
        ? list.map((t) => allTracks.indexOf(t))
        : allTracks.map((_, i) => i);

      if (isShuffleRef.current) {
        let choices = order.filter((i) => i !== curIdx);
        if (!choices.length) choices = order;
        playTrackByIndex(choices[Math.floor(Math.random() * choices.length)]);
        return;
      }

      const pos = order.indexOf(curIdx);
      let nextPos = pos + 1;
      if (nextPos >= order.length) {
        if (repeatModeRef.current === 1 || userInitiated) {
          nextPos = 0;
        } else {
          audioRef.current?.pause();
          return;
        }
      }
      playTrackByIndex(order[nextPos]);
    },
    [getVisibleTracks, playTrackByIndex]
  );

  const prevTrack = useCallback(() => {
    const allTracks = tracksRef.current;
    if (!allTracks.length) return;
    const curIdx = currentIndexRef.current;
    const audio = audioRef.current;
    if (curIdx === -1) {
      playTrackByIndex(0);
      return;
    }
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const list = getVisibleTracks();
    const order = list.length
      ? list.map((t) => allTracks.indexOf(t))
      : allTracks.map((_, i) => i);
    const pos = order.indexOf(curIdx);
    const prevPos = pos - 1 < 0 ? order.length - 1 : pos - 1;
    playTrackByIndex(order[prevPos]);
  }, [getVisibleTracks, playTrackByIndex]);

  // ID3 metadata reader
  const readTags = useCallback((track: Track, file: File) => {
    if (window.jsmediatags) {
      try {
        window.jsmediatags.read(file, {
          onSuccess: (tag: any) => {
            const t = tag.tags || {};
            let changed = false;
            if (t.title) {
              track.title = t.title;
              changed = true;
            }
            if (t.artist) {
              track.artist = t.artist;
              changed = true;
            }
            if (t.picture) {
              try {
                const b64 = bytesToBase64(t.picture.data);
                track.picture = `data:${t.picture.format};base64,${b64}`;
                changed = true;
              } catch (e) {
                // ignore
              }
            }
            if (changed) {
              setTracks((prev) => prev.map((item) => (item.id === track.id ? { ...track } : item)));
              persistLibrary();
            }
          },
          onError: () => {},
        });
      } catch (e) {
        // ignore
      }
    }
  }, [persistLibrary]);

  const probeDuration = useCallback((track: Track) => {
    const tmp = new Audio();
    tmp.preload = 'metadata';
    tmp.addEventListener('loadedmetadata', () => {
      track.duration = tmp.duration;
      setTracks((prev) => prev.map((item) => (item.id === track.id ? { ...item, duration: tmp.duration } : item)));
      persistLibrary();
    });
    tmp.src = track.url;
  }, [persistLibrary]);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!fileList || !fileList.length || !storage) return;
      const files = Array.from(fileList).filter(isAudioFile);
      if (!files.length) return;

      let added = 0;
      const newTracks: Track[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = nextIdRef.current++;
        const track: Track = {
          id,
          title: titleFromFilename(file.name),
          artist: 'Unknown Artist',
          picture: null,
          duration: 0,
          liked: false,
          url: '',
        };
        try {
          const saved = await storage.saveAudio(id, file);
          track.ref = saved.ref;
          track.url = saved.url;
          newTracks.push(track);
          added++;
          readTags(track, file);
          probeDuration(track);
        } catch (e) {
          console.error('Waves: could not save file', e);
          showToast(`Could not save "${track.title}".`);
        }
      }

      if (added > 0) {
        setTracks((prev) => [...prev, ...newTracks]);
        showToast(added === 1 ? 'Uploaded 1 song to your library' : `Uploaded ${added} songs to your library`);
        setTimeout(() => persistLibrary(), 100);
      }
    },
    [storage, readTags, probeDuration, showToast, persistLibrary]
  );

  const handleToggleLike = useCallback(
    (trackId: number) => {
      setTracks((prev) =>
        prev.map((t) => {
          if (t.id === trackId) {
            return { ...t, liked: !t.liked };
          }
          return t;
        })
      );
      setTimeout(() => persistLibrary(), 50);
    },
    [persistLibrary]
  );

  const handleDeleteTrack = useCallback(
    async (track: Track) => {
      if (!window.confirm(`Remove "${track.title}" from your library? This can't be undone.`)) return;
      const store = storageRef.current;
      if (store) {
        try {
          await store.deleteAudio(track.ref, track.url);
        } catch (e) {
          // ignore
        }
      }
      const curIdx = currentIndexRef.current;
      const wasCurrent = curIdx > -1 && tracksRef.current[curIdx]?.id === track.id;

      setTracks((prev) => prev.filter((t) => t.id !== track.id));
      setPlaylists((prev) =>
        prev.map((p) => ({
          ...p,
          trackIds: p.trackIds.filter((id) => id !== track.id),
        }))
      );

      if (wasCurrent) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute('src');
        }
        setCurrentTrackIndex(-1);
        setIsPlaying(false);
      } else {
        const deletedIdx = tracksRef.current.findIndex((t) => t.id === track.id);
        if (deletedIdx > -1 && deletedIdx < curIdx) {
          setCurrentTrackIndex(curIdx - 1);
        }
      }
      setTimeout(() => persistLibrary(), 50);
    },
    [persistLibrary]
  );

  const handleRemoveFromPlaylist = useCallback(
    (playlistId: number, trackId: number) => {
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === playlistId) {
            return {
              ...p,
              trackIds: p.trackIds.filter((id) => id !== trackId),
            };
          }
          return p;
        })
      );
      setTimeout(() => persistLibrary(), 50);
    },
    [persistLibrary]
  );

  const handleCreatePlaylist = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const id = nextPlaylistIdRef.current++;
      const pl: Playlist = { id, name: trimmed, trackIds: [] };
      setPlaylists((prev) => [...prev, pl]);
      setTimeout(() => persistLibrary(), 50);
      return pl;
    },
    [persistLibrary]
  );

  const handleRenamePlaylist = useCallback(
    (playlistId: number, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlistId ? { ...p, name: trimmed } : p))
      );
      setTimeout(() => persistLibrary(), 50);
    },
    [persistLibrary]
  );

  const handleDeletePlaylist = useCallback(
    (playlistId: number) => {
      const pl = playlistsRef.current.find((p) => p.id === playlistId);
      if (!pl) return;
      if (!window.confirm(`Delete "${pl.name}"? This won't delete the songs themselves.`)) return;

      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      if (currentView === 'playlist' && currentPlaylistId === playlistId) {
        setCurrentView('home');
        setCurrentPlaylistId(null);
      }
      setTimeout(() => persistLibrary(), 50);
    },
    [currentView, currentPlaylistId, persistLibrary]
  );

  const handleToggleTrackInPlaylist = useCallback(
    (playlistId: number, trackId: number) => {
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === playlistId) {
            const has = p.trackIds.includes(trackId);
            return {
              ...p,
              trackIds: has
                ? p.trackIds.filter((id) => id !== trackId)
                : [...p.trackIds, trackId],
            };
          }
          return p;
        })
      );
      setTimeout(() => persistLibrary(), 50);
    },
    [persistLibrary]
  );

  // Initialize storage & library
  useEffect(() => {
    let mounted = true;
    (async () => {
      const store = await detectStorage();
      if (!mounted) return;
      setStorage(store);
      document.body.setAttribute('data-storage', store.mode);

      if (store.mode === 'memory') return;

      const data = await store.loadMeta();
      if (data && mounted) {
        nextIdRef.current = data.nextId || 1;
        nextPlaylistIdRef.current = data.nextPlaylistId || 1;
        const savedPlaylists = data.playlists || [];
        const savedTracks = data.tracks || [];
        const resolved: Track[] = [];

        for (const t of savedTracks) {
          try {
            const url = await store.resolveUrl(t.ref);
            if (url) {
              resolved.push({ ...t, url });
            }
          } catch (e) {
            // file missing
          }
        }

        const validIds = new Set(resolved.map((t) => t.id));
        const cleanedPlaylists = savedPlaylists.map((p) => ({
          ...p,
          trackIds: p.trackIds.filter((id) => validIds.has(id)),
        }));

        setPlaylists(cleanedPlaylists);
        setTracks(resolved);

        if (data.nowPlaying) {
          const npIdx = resolved.findIndex((t) => t.id === data.nowPlaying?.trackId);
          if (npIdx > -1 && audioRef.current) {
            setCurrentTrackIndex(npIdx);
            audioRef.current.src = resolved[npIdx].url;
            audioRef.current.currentTime = data.nowPlaying.position || 0;
            if (data.nowPlaying.wasPlaying) {
              showToast('Picked up where you left off — tap play to continue');
            }
          }
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [showToast]);

  // Audio setup & events
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const nextAudio = new Audio();
    nextAudio.preload = 'auto';
    nextAudioRef.current = nextAudio;

    const onPlay = () => {
      setIsPlaying(true);
      document.body.classList.add('is-playing');
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      persistLibrary();
    };

    const onPause = () => {
      setIsPlaying(false);
      document.body.classList.remove('is-playing');
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      persistLibrary();
    };

    const onEnded = () => {
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      if (repeatModeRef.current === 2) {
        audio.currentTime = 0;
        autoAdvancingRef.current = true;
        playWithRetry();
        autoAdvancingRef.current = false;
        return;
      }
      autoAdvancingRef.current = true;
      nextTrack(false);
      autoAdvancingRef.current = false;
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const d = audio.duration || 0;
      if (d) setDuration(d);

      if (
        'mediaSession' in navigator &&
        'setPositionState' in navigator.mediaSession &&
        d &&
        isFinite(d)
      ) {
        try {
          navigator.mediaSession.setPositionState({
            duration: d,
            playbackRate: audio.playbackRate || 1,
            position: Math.min(audio.currentTime, d),
          });
        } catch (e) {}
      }

      const now = Date.now();
      if (now - lastPositionSaveRef.current > 5000) {
        lastPositionSaveRef.current = now;
        persistLibrary();
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      const curIdx = currentIndexRef.current;
      if (curIdx > -1 && tracksRef.current[curIdx]) {
        tracksRef.current[curIdx].duration = audio.duration;
      }
      preloadNext();
    };

    const onError = () => {
      const curIdx = currentIndexRef.current;
      if (curIdx > -1 && tracksRef.current[curIdx]) {
        showToast(`Your browser can't play "${tracksRef.current[curIdx].title}". Try a different file.`);
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);

    // Media session action handlers
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (pendingPlayRef.current) {
            resumePendingPlay();
            return;
          }
          togglePlay();
        });
        navigator.mediaSession.setActionHandler('pause', () => togglePlay());
        navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack(true));
        navigator.mediaSession.setActionHandler('stop', () => {
          audio.pause();
          audio.currentTime = 0;
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset || 10));
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const d = audio.duration || 0;
          audio.currentTime = Math.min(d, audio.currentTime + (details.seekOffset || 10));
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime != null) {
            if (details.fastSeek && (audio as any).fastSeek) {
              (audio as any).fastSeek(details.seekTime);
            } else {
              audio.currentTime = details.seekTime;
            }
          }
        });
      } catch (e) {}
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        persistLibrary();
      } else {
        resumePendingPlay();
      }
    };

    const onPageHide = () => persistLibrary();
    const onPointerDownDoc = () => resumePendingPlay();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('pointerdown', onPointerDownDoc, { passive: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlay();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('pointerdown', onPointerDownDoc);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [nextTrack, prevTrack, togglePlay, playWithRetry, resumePendingPlay, preloadNext, persistLibrary, showToast]);

  const currentTrack =
    currentTrackIndex > -1 && tracks[currentTrackIndex] ? tracks[currentTrackIndex] : null;

  return (
    <div className="app">
      <Sidebar
        currentView={currentView}
        currentPlaylistId={currentPlaylistId}
        playlists={playlists}
        tracks={tracks}
        onSelectView={(view, playlistId) => {
          setCurrentView(view);
          setCurrentPlaylistId(playlistId || null);
        }}
        onNewPlaylist={() => {
          setPromptModal({
            isOpen: true,
            title: 'New Playlist',
            defaultValue: '',
            confirmLabel: 'Create',
            onConfirm: (val) => {
              const pl = handleCreatePlaylist(val);
              if (pl) {
                setCurrentView('playlist');
                setCurrentPlaylistId(pl.id);
              }
              setPromptModal((prev) => ({ ...prev, isOpen: false }));
            },
          });
        }}
        onUploadClick={() => fileInputRef.current?.click()}
      />

      <MainContent
        currentView={currentView}
        currentPlaylistId={currentPlaylistId}
        playlists={playlists}
        tracks={tracks}
        visibleTracks={visibleTracks}
        currentTrackId={currentTrack ? currentTrack.id : null}
        isPlaying={isPlaying}
        searchQuery={searchQuery}
        isShuffle={isShuffle}
        onSearchChange={setSearchQuery}
        onUploadClick={() => fileInputRef.current?.click()}
        onPlayTrack={(t) => {
          const idx = tracks.indexOf(t);
          if (idx > -1) playTrackByIndex(idx);
        }}
        onTogglePlay={togglePlay}
        onShuffleList={(list) => {
          if (!list.length) return;
          setIsShuffle(true);
          const rand = list[Math.floor(Math.random() * list.length)];
          const idx = tracks.indexOf(rand);
          if (idx > -1) playTrackByIndex(idx);
        }}
        onToggleLike={handleToggleLike}
        onAddToPlaylist={(trackId) => setPickerTrackId(trackId)}
        onRemoveTrack={(t) => {
          if (currentView === 'playlist' && currentPlaylistId != null) {
            handleRemoveFromPlaylist(currentPlaylistId, t.id);
          } else {
            handleDeleteTrack(t);
          }
        }}
        onOpenPlaylist={(plId) => {
          setCurrentView('playlist');
          setCurrentPlaylistId(plId);
        }}
        onRenamePlaylist={(plId) => {
          const pl = playlists.find((p) => p.id === plId);
          if (!pl) return;
          setPromptModal({
            isOpen: true,
            title: 'Rename Playlist',
            defaultValue: pl.name,
            confirmLabel: 'Save',
            onConfirm: (val) => {
              handleRenamePlaylist(plId, val);
              setPromptModal((prev) => ({ ...prev, isOpen: false }));
            },
          });
        }}
        onDeletePlaylist={handleDeletePlaylist}
        onReorderTracks={(reordered) => {
          if (currentView === 'playlist' && currentPlaylistId != null) {
            const newIds = reordered.map((t) => t.id);
            setPlaylists((prev) =>
              prev.map((p) => (p.id === currentPlaylistId ? { ...p, trackIds: newIds } : p))
            );
          } else if (currentView === 'home') {
            const reorderedFull = [...reordered];
            tracks.forEach((t) => {
              if (!reorderedFull.some((x) => x.id === t.id)) {
                reorderedFull.push(t);
              }
            });
            const curId = currentTrack?.id;
            setTracks(reorderedFull);
            if (curId != null) {
              const newIdx = reorderedFull.findIndex((t) => t.id === curId);
              setCurrentTrackIndex(newIdx);
            }
          }
          setTimeout(() => persistLibrary(), 50);
        }}
        onFilesDrop={handleFiles}
      />

      <Player
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isExpanded={isExpanded}
        onTogglePlay={togglePlay}
        onPrev={prevTrack}
        onNext={() => nextTrack(true)}
        onToggleShuffle={() => setIsShuffle((prev) => !prev)}
        onCycleRepeat={() => setRepeatMode((prev) => ((prev + 1) % 3) as RepeatMode)}
        onToggleLike={handleToggleLike}
        onSeek={(seconds) => {
          if (audioRef.current) {
            audioRef.current.currentTime = seconds;
            setCurrentTime(seconds);
          }
        }}
        onChangeVolume={(vol) => {
          setVolume(vol);
          if (audioRef.current) audioRef.current.volume = vol;
        }}
        onOpenExpanded={() => {
          if (currentTrack) setIsExpanded(true);
        }}
        onCloseExpanded={() => setIsExpanded(false)}
      />

      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.aac,.opus"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className={`toast ${toastMsg ? 'show' : ''}`} id="toast">
        {toastMsg}
      </div>

      <PromptModal
        isOpen={promptModal.isOpen}
        title={promptModal.title}
        defaultValue={promptModal.defaultValue}
        confirmLabel={promptModal.confirmLabel}
        onConfirm={promptModal.onConfirm}
        onCancel={() => setPromptModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <PlaylistPickerModal
        isOpen={pickerTrackId !== null}
        trackId={pickerTrackId}
        playlists={playlists}
        onToggleTrackInPlaylist={handleToggleTrackInPlaylist}
        onCreateNewPlaylist={() => {
          setPromptModal({
            isOpen: true,
            title: 'New Playlist',
            defaultValue: '',
            confirmLabel: 'Create',
            onConfirm: (val) => {
              const pl = handleCreatePlaylist(val);
              if (pl && pickerTrackId !== null) {
                handleToggleTrackInPlaylist(pl.id, pickerTrackId);
              }
              setPromptModal((prev) => ({ ...prev, isOpen: false }));
            },
          });
        }}
        onClose={() => setPickerTrackId(null)}
      />
    </div>
  );
};
