import React, { useState, useEffect, useRef } from 'react';
import { Playlist } from '../types';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  defaultValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  title,
  defaultValue = '',
  confirmLabel = 'Save',
  onConfirm,
  onCancel,
}) => {
  const [val, setVal] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setVal(defaultValue);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal">
        <h3>{title}</h3>
        <input
          ref={inputRef}
          type="text"
          value={val}
          maxLength={60}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm(val);
            if (e.key === 'Escape') onCancel();
          }}
        />
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="modal-confirm" onClick={() => onConfirm(val)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

interface PlaylistPickerModalProps {
  isOpen: boolean;
  trackId: number | null;
  playlists: Playlist[];
  onToggleTrackInPlaylist: (playlistId: number, trackId: number) => void;
  onCreateNewPlaylist: () => void;
  onClose: () => void;
}

export const PlaylistPickerModal: React.FC<PlaylistPickerModalProps> = ({
  isOpen,
  trackId,
  playlists,
  onToggleTrackInPlaylist,
  onCreateNewPlaylist,
  onClose,
}) => {
  if (!isOpen || trackId === null) return null;

  return (
    <div
      className="modal-overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h3>Add to Playlist</h3>
        <div className="pl-checklist">
          {playlists.length > 0 ? (
            playlists.map((p) => {
              const isChecked = p.trackIds.includes(trackId);
              return (
                <label key={p.id} className="pl-check-row">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleTrackInPlaylist(p.id, trackId)}
                  />
                  <span>{p.name}</span>
                </label>
              );
            })
          ) : (
            <div className="pl-empty">No playlists yet — create one below.</div>
          )}
        </div>
        <button className="pl-new-btn" onClick={onCreateNewPlaylist}>
          + New playlist
        </button>
        <div className="modal-actions">
          <button className="modal-confirm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
