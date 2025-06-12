// src/app/pages/library/library.component.ts - Version corrigée
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaService } from '../../services/media.service';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule], // Retiré RouterLink car pas utilisé
  template: `
    <div class="library-page">
      <div class="library-header">
        <h1>📚 {{ getPageTitle() }}</h1>
        <div class="library-actions">
          <div class="view-toggle">
            <button 
              [class.active]="viewMode() === 'grid'" 
              (click)="setViewMode('grid')"
              title="Vue grille">
              ⊞
            </button>
            <button 
              [class.active]="viewMode() === 'list'" 
              (click)="setViewMode('list')"
              title="Vue liste">
              ☰
            </button>
          </div>
          <div class="sort-options">
            <select [value]="sortBy" (change)="setSortBy($event)">
              <option value="title">Titre</option>
              <option value="dateAdded">Date d'ajout</option>
              <option value="type">Type</option>
              <option value="duration">Durée</option>
            </select>
          </div>
        </div>
      </div>

      <div class="search-section">
        <div class="search-container">
          <input 
            type="text" 
            placeholder="Rechercher dans votre bibliothèque..."
            class="search-input"
            [value]="searchQuery()"
            (input)="onSearch($event)"
          />
          <span class="search-icon">🔍</span>
        </div>
      </div>

      <div class="filter-bar">
        <div class="filter-tabs">
          <button 
            *ngFor="let filter of availableFilters" 
            [class.active]="currentFilter() === filter.value"
            (click)="setFilter(filter.value)"
          >
            {{ filter.icon }} {{ filter.label }}
          </button>
        </div>
      </div>

      <div class="media-container" [class]="viewMode()">
        <div *ngIf="filteredMedia().length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>Aucun média trouvé</h3>
          <p *ngIf="searchQuery()">Aucun résultat pour "{{ searchQuery() }}"</p>
          <p *ngIf="!searchQuery()">Votre bibliothèque est vide</p>
          <button class="btn primary" (click)="importMedia()">
            📁 Importer des médias
          </button>
        </div>

        <div *ngFor="let media of filteredMedia()" 
             class="media-item" 
             (click)="playMedia(media)"
             [class.playing]="isCurrentMedia(media)">
          
          <div class="media-thumbnail">
            <img [src]="media.thumbnail || 'assets/default-thumbnail.jpg'" [alt]="media.title">
            <div class="play-overlay">
              <span class="play-icon">▶️</span>
            </div>
            <div class="media-type-badge">
              <span>{{ media.type === 'video' ? '🎬' : '🎵' }}</span>
            </div>
            <div class="duration-badge">
              {{ formatDuration(media.duration) }}
            </div>
          </div>

          <div class="media-details">
            <h4 class="media-title">{{ media.title }}</h4>
            <p class="media-info">
              {{ formatDuration(media.duration) }} • {{ getFileSize(media.size) }}
            </p>
            <div class="media-tags" *ngIf="media.tags.length > 0">
              <span *ngFor="let tag of media.tags" class="tag">{{ tag }}</span>
            </div>
            <p class="media-date">Ajouté le {{ formatDate(media.dateAdded) }}</p>
          </div>

          <div class="media-actions">
            <button class="action-btn" (click)="addToFavorites(media, $event)" title="Favoris">
              ❤️
            </button>
            <button class="action-btn" (click)="addToPlaylist(media, $event)" title="Ajouter à une playlist">
              📄
            </button>
            <button class="action-btn" (click)="showMediaInfo(media, $event)" title="Informations">
              ℹ️
            </button>
          </div>
        </div>
      </div>

      <div class="library-stats" *ngIf="filteredMedia().length > 0">
        <p>{{ filteredMedia().length }} média(s) • {{ getTotalDuration() }} de contenu</p>
      </div>
    </div>
  `,
  styles: [`
    .library-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .library-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .library-header h1 {
      margin: 0;
      color: #333;
    }

    .library-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .view-toggle {
      display: flex;
      background: #f0f0f0;
      border-radius: 6px;
      overflow: hidden;
    }

    .view-toggle button {
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .view-toggle button.active {
      background: #4CAF50;
      color: white;
    }

    .sort-options select {
      padding: 0.5rem 1rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
    }

    .search-section {
      margin-bottom: 1.5rem;
    }

    .search-container {
      position: relative;
      max-width: 500px;
    }

    .search-input {
      width: 100%;
      padding: 1rem 3rem 1rem 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 25px;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s ease;
    }

    .search-input:focus {
      border-color: #4CAF50;
    }

    .search-icon {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #666;
    }

    .filter-bar {
      margin-bottom: 2rem;
    }

    .filter-tabs {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-tabs button {
      padding: 0.75rem 1.5rem;
      border: 2px solid #e0e0e0;
      border-radius: 25px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.9rem;
    }

    .filter-tabs button.active {
      background: #4CAF50;
      color: white;
      border-color: #4CAF50;
    }

    .filter-tabs button:hover:not(.active) {
      border-color: #4CAF50;
      color: #4CAF50;
    }

    .media-container {
      margin-bottom: 2rem;
    }

    .media-container.grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .media-container.list .media-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .media-container.list .media-thumbnail {
      width: 120px;
      height: 80px;
      flex-shrink: 0;
    }

    .media-item {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
    }

    .media-item:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .media-item.playing {
      border: 3px solid #4CAF50;
    }

    .media-thumbnail {
      position: relative;
      width: 100%;
      height: 160px;
      overflow: hidden;
    }

    .media-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
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

    .media-item:hover .play-overlay {
      opacity: 1;
    }

    .play-icon {
      font-size: 2.5rem;
    }

    .media-type-badge {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .duration-badge {
      position: absolute;
      bottom: 0.5rem;
      right: 0.5rem;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .media-details {
      padding: 1rem;
      flex-grow: 1;
    }

    .media-title {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .media-info {
      margin: 0 0 0.5rem 0;
      color: #666;
      font-size: 0.9rem;
    }

    .media-date {
      margin: 0.5rem 0 0 0;
      color: #999;
      font-size: 0.8rem;
    }

    .media-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin: 0.5rem 0;
    }

    .tag {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.2rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
    }

    .media-actions {
      display: flex;
      gap: 0.5rem;
      padding: 0 1rem 1rem 1rem;
    }

    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 50%;
      transition: background-color 0.2s ease;
      font-size: 1.2rem;
    }

    .action-btn:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .library-stats {
      text-align: center;
      padding: 1rem;
      background: #f9f9f9;
      border-radius: 8px;
      color: #666;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s ease;
    }

    .btn.primary {
      background: #4CAF50;
      color: white;
    }

    .btn.primary:hover {
      background: #45a049;
    }

    @media (max-width: 768px) {
      .library-page {
        padding: 1rem;
      }

      .library-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .media-container.grid {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
      }

      .filter-tabs {
        justify-content: center;
      }
    }
  `]
})
export class LibraryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  mediaService = inject(MediaService);

  // Signals pour l'état local
  currentFilter = signal('all');
  viewMode = signal<'grid' | 'list'>('grid');
  searchQuery = signal('');
  sortBy = 'title';

  availableFilters = [
    { label: 'Tout', value: 'all', icon: '📁' },
    { label: 'Vidéos', value: 'videos', icon: '🎬' },
    { label: 'Audio', value: 'music', icon: '🎵' },
    { label: 'Favoris', value: 'favorites', icon: '❤️' },
    { label: 'Récents', value: 'recent', icon: '🕒' }
  ];

  // Computed pour les médias filtrés
  filteredMedia = computed(() => {
    let media = [...this.mediaService.mediaItems()];
    
    // Filtrer par type
    const filter = this.currentFilter();
    if (filter === 'videos') {
      media = media.filter(m => m.type === 'video');
    } else if (filter === 'music') {
      media = media.filter(m => m.type === 'audio');
    } else if (filter === 'recent') {
      media = media.slice(-10).reverse();
    }

    // Filtrer par recherche
    const query = this.searchQuery().toLowerCase();
    if (query) {
      media = media.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Trier
    return this.sortMedia(media);
  });

  ngOnInit(): void {
    // Écouter les paramètres de l'URL
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.currentFilter.set(params['type'] === 'video' ? 'videos' : 'music');
      }
      if (params['search']) {
        this.searchQuery.set(params['search']);
      }
      if (params['filter']) {
        this.currentFilter.set(params['filter']);
      }
    });
  }

  getPageTitle(): string {
    const titles: {[key: string]: string} = {
      'all': 'Bibliothèque complète',
      'videos': 'Vidéos',
      'music': 'Musique',
      'favorites': 'Favoris',
      'recent': 'Récemment ajoutés'
    };
    return titles[this.currentFilter()] || 'Bibliothèque';
  }

  setFilter(filter: string): void {
    this.currentFilter.set(filter);
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  onSearch(event: any): void {
    this.searchQuery.set(event.target.value);
  }

  setSortBy(event: any): void {
    this.sortBy = event.target.value;
  }

  private sortMedia(media: any[]): any[] {
    return media.sort((a, b) => {
      switch (this.sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'dateAdded':
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        case 'type':
          return a.type.localeCompare(b.type);
        case 'duration':
          return b.duration - a.duration;
        default:
          return 0;
      }
    });
  }


playMedia(media: any): void {
  this.mediaService.setCurrentMedia(media);
  // Navigation vers le lecteur avec l'ID du média
  this.router.navigate(['/player', media.id]);
}

  isCurrentMedia(media: any): boolean {
    return this.mediaService.currentMedia()?.id === media.id;
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(date));
  }

  getTotalDuration(): string {
    const totalSeconds = this.filteredMedia().reduce((sum, media) => sum + media.duration, 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }

  addToFavorites(media: any, event: Event): void {
    event.stopPropagation();
    console.log('Ajouter aux favoris:', media.title);
    alert(`❤️ ${media.title} ajouté aux favoris`);
  }

  addToPlaylist(media: any, event: Event): void {
    event.stopPropagation();
    console.log('Ajouter à une playlist:', media.title);
    alert(`📄 ${media.title} ajouté à la playlist`);
  }

  showMediaInfo(media: any, event: Event): void {
    event.stopPropagation();
    console.log('Infos média:', media);
    alert(`ℹ️ Informations sur ${media.title}\nDurée: ${this.formatDuration(media.duration)}\nTaille: ${this.getFileSize(media.size)}\nFormat: ${media.format}`);
  }

  importMedia(): void {
    console.log('Import de médias');
    alert('📁 Fonction d\'import à implémenter');
  }
}