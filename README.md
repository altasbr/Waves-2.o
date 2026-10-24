# Waves — Your Music

A sleek, responsive music player built with React, Vite, and TypeScript. Waves provides offline on-device song storage (IndexedDB / Capacitor Filesystem / in-memory fallback), automatic ID3 metadata and album art extraction, custom playlists, liked songs collection, fluid drag-and-drop song upload, tactile seeking, equalizer animations, and lock-screen Media Session controls.

## Features

- **Personal Music Library**: Upload any audio file (MP3, WAV, M4A, FLAC, OGG, AAC, OPUS).
- **ID3 Tag & Album Art Extraction**: Reads titles, artists, and embedded cover art directly on-device.
- **Dynamic Mood Tinting**: Header and background smoothly adjust to matching colors for playlists and liked songs.
- **Custom Playlists**: Create, rename, reorder, and curate songs across playlists.
- **Liked Songs**: Heart tracks to easily access favorites and view total duration.
- **Playback Controls**: Shuffle, Repeat (All / One / Off), responsive seek bar with tactile knob, volume slider, and keyboard shortcuts (Space to Play/Pause).
- **Expanded Now Playing View**: Full-screen slide-up modal with blurred background and large album art.
- **Reorder Mode**: Drag-and-drop or pointer-based track reordering for playlists and library.
- **Cross-Platform Storage**: Automatically persists songs and state using IndexedDB in browsers or Capacitor on mobile.
- **Media Session Integration**: Background playback controls with notification shade / lock screen integration.

## Getting Started

```bash
npm install
npm run dev
```

Built with React 19, TypeScript, and Vite.
