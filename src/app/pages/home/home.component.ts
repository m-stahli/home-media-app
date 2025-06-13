// src/app/pages/home/home.component.ts - Version finale nettoyée
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { MediaService } from '../../services/media.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home-page">
      <div class="welcome-section">
        <h1>🎬 Bienvenue dans votre Home Media</h1>
        <p>Découvrez et profitez de votre collection multimédia</p>
      </div>

      <div class="quick-stats">
        <div class="stat-card">
          <h3>🎬 Vidéos</h3>
          <span class="stat-number">{{ mediaService.videoCount() }}</span>
        </div>
        <div class="stat-card">
          <h3>🎵 Audio</h3>
          <span class="stat-number">{{ mediaService.audioCount() }}</span>
        </div>
        <div class="stat-card">
          <h3>📁 Total</h3>
          <span class="stat-number">{{ mediaService.totalCount() }}</span>
        </div>
        <div class="stat-card">
          <h3>❤️ Favoris</h3>
          <span class="stat-number">0</span>
        </div>
      </div>

      <div class="recent-section" *ngIf="mediaService.recentMedia().length > 0">
        <h2>📺 Récemment ajoutés</h2>
        <div class="media-grid">
          <div *ngFor="let media of mediaService.recentMedia()" 
               class="media-card" 
               (click)="playMedia(media)">
            <img [src]="media.thumbnail || 'assets/default-thumbnail.jpg'" 
                 [alt]="media.title"
                 class="media-thumbnail">
            <div class="media-info">
              <h4>{{ media.title }}</h4>
              <p>{{ media.type === 'video' ? '🎬' : '🎵' }} {{ formatDuration(media.duration) }}</p>
              <div class="media-tags" *ngIf="media.tags.length > 0">
                <span *ngFor="let tag of media.tags" class="tag">{{ tag }}</span>
              </div>
            </div>
            <div class="play-overlay">
              <span class="play-icon">▶️</span>
            </div>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <button class="action-btn primary" routerLink="/library">
          📚 Explorer la bibliothèque
        </button>
        <button class="action-btn" (click)="importMedia()">
          📁 Importer des médias
        </button>
        <button class="action-btn" (click)="scanFolders()">
          🔄 Scanner les dossiers
        </button>
      </div>
    </div>
  `,
  styles: [`
    .home-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .welcome-section {
      text-align: center;
      margin-bottom: 3rem;
    }

    .welcome-section h1 {
      font-size: 2.5rem;
      color: #333;
      margin-bottom: 1rem;
    }

    .welcome-section p {
      font-size: 1.2rem;
      color: #666;
    }

    .quick-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
    }

    .stat-card h3 {
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
    }

    .stat-number {
      font-size: 2.5rem;
      font-weight: bold;
    }

    .recent-section h2 {
      margin-bottom: 1.5rem;
      color: #333;
    }

    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .media-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
    }

    .media-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .media-thumbnail {
      width: 100%;
      height: 140px;
      object-fit: cover;
    }

    .media-info {
      padding: 1rem;
    }

    .media-info h4 {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 1.1rem;
    }

    .media-info p {
      margin: 0 0 0.5rem 0;
      color: #666;
      font-size: 0.9rem;
    }

    .media-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .tag {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.2rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
    }

    .play-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .media-card:hover .play-overlay {
      opacity: 1;
    }

    .play-icon {
      font-size: 3rem;
    }

    .quick-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .action-btn {
      padding: 1rem 2rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s ease;
      background: #f5f5f5;
      color: #333;
      text-decoration: none;
      display: inline-block;
      text-align: center;
    }

    .action-btn.primary {
      background: #4CAF50;
      color: white;
    }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    @media (max-width: 768px) {
      .home-page {
        padding: 1rem;
      }
      
      .welcome-section h1 {
        font-size: 2rem;
      }
      
      .quick-stats {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .media-grid {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
      }
    }
  `]
})
export class HomeComponent {
  mediaService = inject(MediaService);
  private router = inject(Router); 

playMedia(media: any): void {
  console.log('▶️ Lecture de:', media.title);
  this.mediaService.setCurrentMedia(media);
  // Navigation vers le lecteur avec l'ID du média
  this.router.navigate(['/player', media.id]);
}

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  importMedia(): void {
  console.log('Redirection vers import');
  this.router.navigate(['/import']);
  }

  scanFolders(): void {
  console.log('Redirection vers sources');
  this.router.navigate(['/sources']);
}
}