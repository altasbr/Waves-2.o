export interface Track {
  id: number;
  title: string;
  artist: string;
  picture: string | null;
  duration: number;
  liked: boolean;
  ref?: string | number | null;
  url: string;
}

export interface Playlist {
  id: number;
  name: string;
  trackIds: number[];
}

export interface SavedTrackMeta {
  id: number;
  title: string;
  artist: string;
  picture: string | null;
  duration: number;
  liked: boolean;
  ref?: string | number | null;
}

export interface LibraryData {
  nextId: number;
  nextPlaylistId: number;
  playlists: Playlist[];
  tracks: SavedTrackMeta[];
  nowPlaying: {
    trackId: number;
    position: number;
    wasPlaying: boolean;
  } | null;
}

export interface StorageBackend {
  mode: 'capacitor' | 'indexeddb' | 'memory';
  saveAudio: (id: number, file: File) => Promise<{ ref: string | number | null; url: string }>;
  resolveUrl: (ref: string | number | null) => Promise<string | null>;
  deleteAudio: (ref: string | number | null, url?: string) => Promise<void>;
  saveMeta: (data: LibraryData) => Promise<void>;
  loadMeta: () => Promise<LibraryData | null>;
}

export type ViewType = 'home' | 'liked' | 'playlist';
export type RepeatMode = 0 | 1 | 2; // 0 off, 1 all, 2 one
