// src/app/pages/player/player.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MediaService } from '../../services/media.service';
import { StreamingService } from '../../services/streaming.service';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="player-page" *ngIf="currentMedia(); else noMedia">
      <!-- Header du lecteur -->
      <div class="player-header">
        <button class="back-btn" routerLink="/library">
          ← Retour à la bibliothèque
        </button>
        <h1>{{ currentMedia()?.title }}</h1>
        <div class="player-actions">
          <button class="action-btn" (click)="toggleFullscreen()" title="Plein écran">
            📺
          </button>
          <button class="action-btn" (click)="shareMedia()" title="Partager">
            📤
          </button>
        </div>
      </div>

      <!-- Zone du lecteur principal -->
      <div class="player-container">
        <div class="media-player" #playerContainer>
          <!-- Lecteur vidéo -->
          <video 
            *ngIf="currentMedia()?.type === 'video'"
            #videoPlayer
            [src]="currentMedia()?.url"
            [poster]="currentMedia()?.thumbnail"
            class="video-player"
            (loadedmetadata)="onMediaLoaded()"
            (timeupdate)="onTimeUpdate()"
            (ended)="onMediaEnded()"
            (play)="onPlay()"
            (pause)="onPause()"
            preload="metadata"
            crossorigin="anonymous">
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
          
          <!-- Lecteur audio -->
          <div *ngIf="currentMedia()?.type === 'audio'" class="audio-player-container">
            <div class="audio-visualization">
              <img 
                [src]="currentMedia()?.thumbnail || 'assets/default-audio.jpg'" 
                [alt]="currentMedia()?.title"
                class="audio-cover">
              <div class="audio-info">
                <h2>{{ currentMedia()?.title }}</h2>
                <p>Fichier audio • {{ formatDuration(currentMedia()?.duration || 0) }}</p>
              </div>
            </div>
            <audio 
              #audioPlayer
              [src]="currentMedia()?.url"
              class="audio-player"
              (loadedmetadata)="onMediaLoaded()"
              (timeupdate)="onTimeUpdate()"
              (ended)="onMediaEnded()"
              (play)="onPlay()"
              (pause)="onPause()"
              preload="metadata">
              Votre navigateur ne supporte pas la lecture audio.
            </audio>
          </div>

          <!-- Contrôles personnalisés -->
          <div class="custom-controls" [class.visible]="showControls()">
            <!-- Barre de progression -->
            <div class="progress-container">
              <div class="progress-bar" (click)="seekTo($event)" #progressBar>
                <div class="progress-buffer" [style.width.%]="bufferedPercentage()"></div>
                <div class="progress-fill" [style.width.%]="progressPercentage()"></div>
                <div class="progress-handle" [style.left.%]="progressPercentage()"></div>
              </div>
              <div class="time-display">
                <span class="current-time">{{ streamingService.formattedCurrentTime() }}</span>
                <span class="duration">{{ streamingService.formattedDuration() }}</span>
              </div>
            </div>

            <!-- Contrôles principaux -->
            <div class="main-controls">
              <div class="controls-left">
                <button class="control-btn" (click)="skipBackward()" title="Reculer de 10s">
                  ⏪
                </button>
                <button class="control-btn play-pause" (click)="togglePlayPause()" [title]="isPlaying() ? 'Pause' : 'Lecture'">
                  {{ isPlaying() ? '⏸️' : '▶️' }}
                </button>
                <button class="control-btn" (click)="skipForward()" title="Avancer de 10s">
                  ⏩
                </button>
              </div>

              <div class="controls-center">
                <span class="media-title">{{ currentMedia()?.title }}</span>
              </div>

              <div class="controls-right">
                <div class="volume-control">
                  <button class="control-btn" (click)="toggleMute()" [title]="isMuted() ? 'Activer le son' : 'Couper le son'">
                    {{ getVolumeIcon() }}
                  </button>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1"
                    [value]="volume()"
                    (input)="setVolume($event)"
                    class="volume-slider"
                    title="Volume"
                  />
                </div>
                
                <select class="playback-rate" [value]="playbackRate()" (change)="setPlaybackRate($event)" title="Vitesse de lecture">
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>

                <button class="control-btn" (click)="toggleFullscreen()" title="Plein écran">
                  🔍
                </button>
              </div>
            </div>
          </div>

          <!-- Overlay de chargement -->
          <div class="loading-overlay" *ngIf="isLoading()">
            <div class="spinner">⟳</div>
            <p>Chargement...</p>
          </div>
        </div>
      </div>

      <!-- Panneau d'informations -->
      <div class="media-info-panel">
        <div class="info-section">
          <h3>📋 Informations</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Type :</label>
              <span>{{ currentMedia()?.type === 'video' ? '🎬 Vidéo' : '🎵 Audio' }}</span>
            </div>
            <div class="info-item">
              <label>Durée :</label>
              <span>{{ formatDuration(currentMedia()?.duration || 0) }}</span>
            </div>
            <div class="info-item">
              <label>Format :</label>
              <span>{{ currentMedia()?.format?.toUpperCase() }}</span>
            </div>
            <div class="info-item">
              <label>Taille :</label>
              <span>{{ getFileSize(currentMedia()?.size || 0) }}</span>
            </div>
            <div class="info-item">
              <label>Ajouté le :</label>
              <span>{{ formatDate(currentMedia()?.dateAdded) }}</span>
            </div>
          </div>
        </div>
        
        <div class="info-section" *ngIf="currentMedia()?.tags?.length">
          <h3>🏷️ Tags</h3>
          <div class="tags-container">
            <span *ngFor="let tag of currentMedia()?.tags" class="tag">{{ tag }}</span>
          </div>
        </div>

        <div class="info-section">
          <h3>⚡ Actions</h3>
          <div class="actions-container">
            <button class="action-button" (click)="addToFavorites()">
              ❤️ Ajouter aux favoris
            </button>
            <button class="action-button" (click)="addToPlaylist()">
              📄 Ajouter à une playlist
            </button>
            <button class="action-button" (click)="downloadMedia()">
              💾 Télécharger
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- État vide -->
    <ng-template #noMedia>
      <div class="empty-player">
        <div class="empty-content">
          <div class="empty-icon">🎬</div>
          <h2>Aucun média sélectionné</h2>
          <p>Choisissez un média dans votre bibliothèque pour commencer la lecture</p>
          <button class="btn primary" routerLink="/library">
            📚 Parcourir la bibliothèque
          </button>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .player-page {
      min-height: 100vh;
      background: #000;
      color: white;
      display: flex;
      flex-direction: column;
    }

    .player-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 2rem;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .back-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: background 0.2s ease;
    }

    .back-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .player-header h1 {
      margin: 0;
      font-size: 1.5rem;
      flex: 1;
      text-align: center;
      padding: 0 2rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .player-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1.2rem;
      transition: background 0.2s ease;
    }

    .action-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .player-container {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
    }

    .media-player {
      position: relative;
      width: 100%;
      height: 100%;
      max-width: 1200px;
      max-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .video-player {
      width: 100%;
      height: 100%;
      max-height: 80vh;
      object-fit: contain;
      background: #000;
    }

    .audio-player-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
      text-align: center;
    }

    .audio-visualization {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 2rem;
    }

    .audio-cover {
      width: 300px;
      height: 300px;
      border-radius: 12px;
      object-fit: cover;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      margin-bottom: 1rem;
    }

    .audio-info h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.8rem;
    }

    .audio-info p {
      margin: 0;
      color: rgba(255, 255, 255, 0.7);
    }

    .audio-player {
      display: none;
    }

    .custom-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
      padding: 2rem 1rem 1rem;
      transform: translateY(100%);
      transition: transform 0.3s ease;
    }

    .custom-controls.visible {
      transform: translateY(0);
    }

    .media-player:hover .custom-controls {
      transform: translateY(0);
    }

    .progress-container {
      margin-bottom: 1rem;
    }

    .progress-bar {
      position: relative;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      cursor: pointer;
      margin-bottom: 0.5rem;
    }

    .progress-buffer {
      position: absolute;
      height: 100%;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
      transition: width 0.1s ease;
    }

    .progress-fill {
      position: absolute;
      height: 100%;
      background: #4CAF50;
      border-radius: 3px;
      transition: width 0.1s ease;
    }

    .progress-handle {
      position: absolute;
      top: -4px;
      width: 14px;
      height: 14px;
      background: #4CAF50;
      border-radius: 50%;
      transform: translateX(-50%);
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .progress-bar:hover .progress-handle {
      opacity: 1;
    }

    .time-display {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.8);
    }

    .main-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .controls-left,
    .controls-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .controls-center {
      flex: 1;
      text-align: center;
      padding: 0 1rem;
    }

    .media-title {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .control-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      padding: 0.75rem;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.2rem;
      transition: all 0.2s ease;
      min-width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .control-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
    }

    .control-btn.play-pause {
      background: #4CAF50;
      font-size: 1.5rem;
      min-width: 56px;
      height: 56px;
    }

    .control-btn.play-pause:hover {
      background: #45a049;
    }

    .volume-control {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .volume-slider {
      width: 80px;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      outline: none;
      border-radius: 2px;
      appearance: none;
    }

    .volume-slider::-webkit-slider-thumb {
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #4CAF50;
      cursor: pointer;
    }

    .volume-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #4CAF50;
      cursor: pointer;
      border: none;
    }

    .playback-rate {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 0.9rem;
    }

    .playback-rate option {
      background: #333;
      color: white;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .spinner {
      font-size: 3rem;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .media-info-panel {
      background: rgba(0, 0, 0, 0.9);
      padding: 2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .info-section {
      margin-bottom: 2rem;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
    }

    .info-section h3 {
      margin: 0 0 1rem 0;
      color: #4CAF50;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .info-item label {
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tag {
      background: rgba(76, 175, 80, 0.2);
      color: #4CAF50;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.9rem;
      border: 1px solid rgba(76, 175, 80, 0.3);
    }

    .actions-container {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .action-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-button:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }

    .empty-player {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .empty-content {
      text-align: center;
      max-width: 500px;
      padding: 2rem;
    }

    .empty-icon {
      font-size: 6rem;
      margin-bottom: 2rem;
    }

    .empty-content h2 {
      margin: 0 0 1rem 0;
      font-size: 2rem;
    }

    .empty-content p {
      margin: 0 0 2rem 0;
      font-size: 1.2rem;
      opacity: 0.9;
    }

    .btn {
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      text-decoration: none;
      display: inline-block;
      transition: all 0.2s ease;
    }

    .btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .player-header {
        padding: 1rem;
        flex-direction: column;
        gap: 1rem;
      }

      .player-header h1 {
        font-size: 1.2rem;
        padding: 0;
      }

      .main-controls {
        flex-direction: column;
        gap: 1rem;
      }

      .controls-center {
        order: -1;
      }

      .volume-control {
        display: none;
      }

      .audio-cover {
        width: 200px;
        height: 200px;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .actions-container {
        flex-direction: column;
      }
    }
  `]
})
export class PlayerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  mediaService = inject(MediaService);
  streamingService = inject(StreamingService);

  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;
  @ViewChild('playerContainer') playerContainer!: ElementRef<HTMLDivElement>;

  // Signals pour l'état local
  currentMedia = this.mediaService.currentMedia;
  showControls = signal(true);
  isLoading = signal(false);
  bufferedPercentage = signal(0);

  // Computed values depuis le service de streaming
  isPlaying = computed(() => this.streamingService.playerState().isPlaying);
  volume = computed(() => this.streamingService.playerState().volume);
  isMuted = computed(() => this.streamingService.playerState().isMuted);
  playbackRate = computed(() => this.streamingService.playerState().playbackRate);
  progressPercentage = this.streamingService.progressPercentage;

  private hideControlsTimeout?: number;

  ngOnInit(): void {
    // Charger le média depuis l'URL
    this.route.params.subscribe(params => {
    if (params['id']) {
      console.log('🔍 ID reçu:', params['id']); // DEBUG
      const media = this.mediaService.getMediaById(params['id']);
      console.log('🎬 Média trouvé:', media); // DEBUG
      
      if (media) {
        console.log('🔗 URL du média:', media.url); // DEBUG
        this.mediaService.setCurrentMedia(media);
      } else {
        console.log('❌ Média non trouvé'); // DEBUG
        this.router.navigate(['/library']);
      }
    }
  });

    // Auto-hide des contrôles
    this.setupControlsAutoHide();
  }

  ngOnDestroy(): void {
    if (this.hideControlsTimeout) {
      clearTimeout(this.hideControlsTimeout);
    }
  }

  private setupControlsAutoHide(): void {
    // Logique pour cacher les contrôles automatiquement
    this.resetControlsTimer();
  }

  private resetControlsTimer(): void {
    this.showControls.set(true);
    if (this.hideControlsTimeout) {
      clearTimeout(this.hideControlsTimeout);
    }
    this.hideControlsTimeout = window.setTimeout(() => {
      if (this.isPlaying()) {
        this.showControls.set(false);
      }
    }, 3000);
  }

  // Événements du lecteur
  onMediaLoaded(): void {
    const player = this.getCurrentPlayer();
    if (player) {
      this.streamingService.updatePlayerState({
        duration: player.duration
      });
    }
    this.isLoading.set(false);
  }

  onTimeUpdate(): void {
    const player = this.getCurrentPlayer();
    if (player) {
      this.streamingService.updatePlayerState({
        currentTime: player.currentTime
      });
      
      // Mettre à jour le buffer
      if (player.buffered.length > 0) {
        const buffered = (player.buffered.end(player.buffered.length - 1) / player.duration) * 100;
        this.bufferedPercentage.set(buffered);
      }
    }
  }

  onPlay(): void {
    this.streamingService.play();
  }

  onPause(): void {
    this.streamingService.pause();
  }

  onMediaEnded(): void {
    this.streamingService.pause();
    // Optionnel : passer au média suivant
  }

  // Contrôles
  togglePlayPause(): void {
    const player = this.getCurrentPlayer();
    if (!player) return;

    if (this.isPlaying()) {
      player.pause();
    } else {
      player.play();
    }
    this.resetControlsTimer();
  }

  skipForward(): void {
    const player = this.getCurrentPlayer();
    if (player) {
      player.currentTime = Math.min(player.currentTime + 10, player.duration);
    }
    this.resetControlsTimer();
  }

  skipBackward(): void {
    const player = this.getCurrentPlayer();
    if (player) {
      player.currentTime = Math.max(player.currentTime - 10, 0);
    }
    this.resetControlsTimer();
  }

  seekTo(event: MouseEvent): void {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const percentage = (event.clientX - rect.left) / rect.width;
    
    const player = this.getCurrentPlayer();
    if (player) {
      player.currentTime = percentage * player.duration;
    }
    this.resetControlsTimer();
  }

  setVolume(event: Event): void {
    const target = event.target as HTMLInputElement;
    const volume = parseFloat(target.value);
    
    const player = this.getCurrentPlayer();
    if (player) {
      player.volume = volume;
    }
    
    this.streamingService.setVolume(volume);
    this.resetControlsTimer();
  }

  toggleMute(): void {
    const player = this.getCurrentPlayer();
    if (player) {
      player.muted = !player.muted;
    }
    
    this.streamingService.toggleMute();
    this.resetControlsTimer();
  }

  setPlaybackRate(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const rate = parseFloat(target.value);
    
    const player = this.getCurrentPlayer();
    if (player) {
      player.playbackRate = rate;
    }
    
    this.streamingService.setPlaybackRate(rate);
    this.resetControlsTimer();
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.playerContainer?.nativeElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    this.resetControlsTimer();
  }

  // Utilitaires
  private getCurrentPlayer(): HTMLVideoElement | HTMLAudioElement | null {
    const media = this.currentMedia();
    if (!media) return null;
    
    if (media.type === 'video' && this.videoPlayer) {
      return this.videoPlayer.nativeElement;
    } else if (media.type === 'audio' && this.audioPlayer) {
      return this.audioPlayer.nativeElement;
    }
    return null;
  }

  getVolumeIcon(): string {
    if (this.isMuted() || this.volume() === 0) {
      return '🔇';
    } else if (this.volume() < 0.5) {
      return '🔉';
    } else {
      return '🔊';
    }
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Inconnue';
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(date));
  }

  // Actions sur le média
  addToFavorites(): void {
    const media = this.currentMedia();
    if (media) {
      console.log('Ajouter aux favoris:', media.title);
      alert(`❤️ ${media.title} ajouté aux favoris`);
    }
  }

  addToPlaylist(): void {
    const media = this.currentMedia();
    if (media) {
      console.log('Ajouter à une playlist:', media.title);
      alert(`📄 ${media.title} ajouté à la playlist`);
    }
  }

  downloadMedia(): void {
    const media = this.currentMedia();
    if (media) {
      console.log('Télécharger:', media.title);
      alert(`💾 Téléchargement de ${media.title} - Fonction à implémenter`);
    }
  }

  shareMedia(): void {
    const media = this.currentMedia();
    if (media) {
      console.log('Partager:', media.title);
      alert(`📤 Partage de ${media.title} - Fonction à implémenter`);
    }
  }
}