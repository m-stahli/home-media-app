// src/app/services/streaming.service.ts
import { Injectable, signal, computed } from '@angular/core';

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  quality: string;
  buffered: number;
}

@Injectable({
  providedIn: 'root'
})
export class StreamingService {
  private playerStateSignal = signal<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    playbackRate: 1,
    quality: 'auto',
    buffered: 0
  });

  playerState = this.playerStateSignal.asReadonly();
  
  // Computed values
  progressPercentage = computed(() => {
    const state = this.playerState();
    return state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  });

  formattedCurrentTime = computed(() => this.formatTime(this.playerState().currentTime));
  formattedDuration = computed(() => this.formatTime(this.playerState().duration));

  updatePlayerState(partialState: Partial<PlayerState>): void {
    this.playerStateSignal.update(state => ({ ...state, ...partialState }));
  }

  play(): void {
    this.updatePlayerState({ isPlaying: true });
  }

  pause(): void {
    this.updatePlayerState({ isPlaying: false });
  }

  setVolume(volume: number): void {
    this.updatePlayerState({ volume, isMuted: volume === 0 });
  }

  toggleMute(): void {
    const currentState = this.playerState();
    this.updatePlayerState({ 
      isMuted: !currentState.isMuted,
      volume: currentState.isMuted ? 1 : 0
    });
  }

  seek(time: number): void {
    this.updatePlayerState({ currentTime: time });
  }

  setPlaybackRate(rate: number): void {
    this.updatePlayerState({ playbackRate: rate });
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}