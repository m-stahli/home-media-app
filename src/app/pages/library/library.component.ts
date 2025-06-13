// src/app/pages/library/library.component.ts - CORRECTION ULTIME ANTI-BOUCLE
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaService } from '../../services/media.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          <div class="purge-section">
            <button class="btn danger" 
                    (click)="showPurgeModal()" 
                    title="Nettoyer la bibliothèque">
              🗑️ Purger
            </button>
            <button class="btn secondary small" 
                    (click)="togglePurgeStats()"
                    title="Afficher/masquer les statistiques">
              📊 Stats
            </button>
          </div>
        </div>
      </div>

      <!-- 🔥 ✅ STATISTIQUES SANS BOUCLE -->
      <div class="purge-stats" *ngIf="showPurgeStats()">
        <div class="stats-card">
          <h3>📊 Statistiques de la bibliothèque</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <label>Total :</label>
              <span>{{ localStats.total }} médias</span>
            </div>
            <div class="stat-item">
              <label>Importés :</label>
              <span>{{ localStats.imported }} médias</span>
            </div>
            <div class="stat-item">
              <label>Échantillons :</label>
              <span>{{ localStats.samples }} médias</span>
            </div>
            <div class="stat-item">
              <label>Vidéos :</label>
              <span>{{ localStats.videos }}</span>
            </div>
            <div class="stat-item">
              <label>Audio :</label>
              <span>{{ localStats.audios }}</span>
            </div>
          </div>
          
          <!-- ✅ UTILISE VARIABLE LOCALE STATIQUE au lieu de méthode -->
          <div *ngIf="localSourceEntries.length > 0" class="source-breakdown">
            <h4>📁 Par source :</h4>
            <div class="source-stats">
              <div *ngFor="let source of localSourceEntries" class="source-stat">
                <span>Source {{ source[0] }}:</span>
                <span>{{ source[1] }} médias</span>
              </div>
            </div>
          </div>
          
          <button class="btn secondary small" (click)="togglePurgeStats()">
            🔼 Masquer statistiques
          </button>
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
            <div class="source-badge" *ngIf="media.sourceId" [title]="'Importé depuis source ' + media.sourceId">
              📥
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
            <p *ngIf="media.originalFilename" class="media-source" title="Nom du fichier original">
              📄 {{ media.originalFilename }}
            </p>
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
            <button class="action-btn danger" 
                    (click)="removeIndividualMedia(media, $event)" 
                    title="Supprimer ce média"
                    *ngIf="media.sourceId">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <div class="library-stats" *ngIf="filteredMedia().length > 0">
        <p>{{ filteredMedia().length }} média(s) • {{ getTotalDuration() }} de contenu</p>
      </div>

      <!-- 🔥 ✅ MODAL ENTIÈREMENT STATIQUE -->
      <div *ngIf="showPurgeModalFlag()" class="modal-overlay" (click)="hidePurgeModal()">
        <div class="modal-content purge-modal" (click)="$event.stopPropagation()">
          <h2>🗑️ Purger la bibliothèque</h2>
          <p>Choisissez les éléments à supprimer de votre bibliothèque :</p>
          
          <!-- Statistiques actuelles -->
          <div class="current-stats">
            <h3>📊 État actuel</h3>
            <div class="stats-summary">
              <div class="stat-box">
                <strong>{{ localStats.total }}</strong>
                <span>Total</span>
              </div>
              <div class="stat-box">
                <strong>{{ localStats.imported }}</strong>
                <span>Importés</span>
              </div>
              <div class="stat-box">
                <strong>{{ localStats.samples }}</strong>
                <span>Échantillons</span>
              </div>
            </div>
          </div>

          <!-- Options de purge -->
          <div class="purge-options">
            <h3>🎯 Options de suppression</h3>
            
            <div class="purge-option" *ngIf="localStats.imported > 0">
              <label class="option-header">
                <input type="checkbox" [(ngModel)]="localPurgeSelection.importedMedia">
                <strong>📥 Médias importés ({{ localStats.imported }})</strong>
              </label>
              <p class="option-description">
                Supprime tous les médias ajoutés via l'import automatique.
                Les échantillons de démonstration seront conservés.
              </p>
            </div>
            
            <div class="purge-option">
              <label class="option-header">
                <input type="checkbox" [(ngModel)]="localPurgeSelection.allMedia">
                <strong>🗑️ Tous les médias ({{ localStats.total }})</strong>
              </label>
              <p class="option-description">
                Supprime TOUS les médias, y compris les échantillons.
                La bibliothèque sera complètement vide.
              </p>
            </div>
            
            <div class="purge-option" *ngIf="localStats.videos > 0">
              <label class="option-header">
                <input type="checkbox" [(ngModel)]="localPurgeSelection.videosOnly">
                <strong>🎬 Vidéos uniquement ({{ localStats.videos }})</strong>
              </label>
              <p class="option-description">
                Supprime toutes les vidéos, conserve la musique et l'audio.
              </p>
            </div>
            
            <div class="purge-option" *ngIf="localStats.audios > 0">
              <label class="option-header">
                <input type="checkbox" [(ngModel)]="localPurgeSelection.audioOnly">
                <strong>🎵 Audio uniquement ({{ localStats.audios }})</strong>
              </label>
              <p class="option-description">
                Supprime toute la musique et l'audio, conserve les vidéos.
              </p>
            </div>

            <!-- ✅ UTILISE VARIABLE LOCALE STATIQUE -->
            <div *ngIf="localSourceEntries.length > 0" class="source-purge-options">
              <h4>📁 Par source spécifique</h4>
              <div *ngFor="let source of localSourceEntries" class="purge-option">
                <label class="option-header">
                  <input type="checkbox" 
                         [ngModel]="localPurgeSelection.sources.includes(source[0])"
                         (ngModelChange)="toggleSourceSelection(source[0], $event)">
                  <strong>Source {{ source[0] }} ({{ source[1] }} médias)</strong>
                </label>
                <p class="option-description">
                  Supprime uniquement les médias de cette source.
                </p>
              </div>
            </div>
          </div>

          <!-- Actions de confirmation -->
          <div class="purge-actions">
            <div class="warning-box" *ngIf="hasSelection()">
              <h4>⚠️ Attention</h4>
              <p>Cette action est <strong>irréversible</strong>. Les médias supprimés ne pourront pas être récupérés.</p>
              <p>Êtes-vous sûr de vouloir continuer ?</p>
            </div>
            
            <div class="action-buttons">
              <button class="btn secondary" (click)="hidePurgeModal()">
                Annuler
              </button>
              <button class="btn danger" 
                      (click)="executePurge()" 
                      [disabled]="!hasSelection()">
                🗑️ Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
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
      flex-wrap: wrap;
      gap: 1rem;
    }

    .library-header h1 {
      margin: 0;
      color: #333;
    }

    .library-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
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

    .purge-section {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .purge-stats {
      margin-bottom: 2rem;
    }

    .stats-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 12px;
      padding: 1.5rem;
    }

    .stats-card h3 {
      margin: 0 0 1rem 0;
      color: #495057;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #dee2e6;
    }

    .stat-item label {
      font-weight: 600;
      color: #6c757d;
    }

    .stat-item span {
      font-weight: bold;
      color: #495057;
    }

    .source-breakdown {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #dee2e6;
    }

    .source-breakdown h4 {
      margin: 0 0 0.5rem 0;
      color: #495057;
      font-size: 1rem;
    }

    .source-stats {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .source-stat {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: #6c757d;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 2rem;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .purge-modal h2 {
      margin: 0 0 1rem 0;
      color: #dc3545;
    }

    .current-stats {
      margin: 1.5rem 0;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .current-stats h3 {
      margin: 0 0 1rem 0;
      color: #495057;
    }

    .stats-summary {
      display: flex;
      gap: 1rem;
      justify-content: space-around;
    }

    .stat-box {
      text-align: center;
      padding: 0.5rem;
      background: white;
      border-radius: 6px;
      border: 1px solid #dee2e6;
      min-width: 80px;
    }

    .stat-box strong {
      display: block;
      font-size: 1.5rem;
      color: #495057;
    }

    .stat-box span {
      font-size: 0.9rem;
      color: #6c757d;
    }

    .purge-options {
      margin: 1.5rem 0;
    }

    .purge-options h3 {
      margin: 0 0 1rem 0;
      color: #495057;
    }

    .purge-option {
      margin-bottom: 1rem;
      padding: 1rem;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      transition: border-color 0.2s ease;
    }

    .purge-option:hover {
      border-color: #adb5bd;
    }

    .option-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      margin-bottom: 0.5rem;
    }

    .option-header input[type="checkbox"] {
      margin: 0;
      transform: scale(1.2);
    }

    .option-header strong {
      color: #495057;
    }

    .option-description {
      margin: 0;
      color: #6c757d;
      font-size: 0.9rem;
      line-height: 1.4;
      margin-left: 1.7rem;
    }

    .source-purge-options {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #dee2e6;
    }

    .source-purge-options h4 {
      margin: 0 0 1rem 0;
      color: #495057;
      font-size: 1rem;
    }

    .warning-box {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }

    .warning-box h4 {
      margin: 0 0 0.5rem 0;
      color: #856404;
    }

    .warning-box p {
      margin: 0.25rem 0;
      line-height: 1.4;
    }

    .action-buttons {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .source-badge {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: rgba(76, 175, 80, 0.9);
      color: white;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .media-source {
      margin: 0.5rem 0 0 0;
      color: #999;
      font-size: 0.8rem;
      font-family: 'Courier New', monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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

    .action-btn.danger:hover {
      background: rgba(244, 67, 54, 0.1);
      color: #f44336;
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
      text-decoration: none;
      display: inline-block;
      text-align: center;
    }

    .btn.primary {
      background: #4CAF50;
      color: white;
    }

    .btn.secondary {
      background: #6c757d;
      color: white;
    }

    .btn.danger {
      background: #dc3545;
      color: white;
    }

    .btn.small {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
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
      
      .library-actions {
        justify-content: center;
      }
      
      .media-container.grid {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
      }
      
      .filter-tabs {
        justify-content: center;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .stats-summary {
        flex-direction: column;
        gap: 0.5rem;
      }

      .action-buttons {
        flex-direction: column;
      }

      .modal-content {
        margin: 1rem;
        max-width: none;
      }
    }
  `]
})
export class LibraryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  mediaService = inject(MediaService);
  notificationService = inject(NotificationService);

  // Signals pour l'état local
  currentFilter = signal('all');
  viewMode = signal<'grid' | 'list'>('grid');
  searchQuery = signal('');
  sortBy = 'title';

  // Signals pour la purge
  showPurgeModalFlag = signal(false);
  showPurgeStats = signal(false);

  // ✅ VARIABLES LOCALES SIMPLES - PAS DE SIGNALS ! 
  localStats = {
    total: 0,
    imported: 0,
    samples: 0,
    videos: 0,
    audios: 0,
    bySource: {} as Record<string, number>
  };

  // ✅ VARIABLE LOCALE POUR LES ENTRÉES DES SOURCES - PAS DE MÉTHODE !
  localSourceEntries: [string, number][] = [];

  // ✅ VARIABLE LOCALE POUR LES SÉLECTIONS - PAS DE SIGNAL !
  localPurgeSelection = {
    importedMedia: false,
    allMedia: false,
    videosOnly: false,
    audioOnly: false,
    sources: [] as string[]
  };

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
        item.tags.some(tag => tag.toLowerCase().includes(query)) ||
        item.originalFilename?.toLowerCase().includes(query)
      );
    }

    // Trier
    return this.sortMedia(media);
  });

  ngOnInit(): void {
    // ✅ Charger les stats une seule fois au démarrage
    this.updateLocalStats();
    
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

  // ✅ MÉTHODE CRUCIALE - Met à jour TOUTES les variables locales
  private updateLocalStats(): void {
    try {
      this.localStats = this.mediaService.getPurgeStats();
      // ✅ METTRE À JOUR LA VARIABLE LOCALE STATIQUE
      this.localSourceEntries = Object.entries(this.localStats.bySource);
      console.log('📊 Stats mises à jour:', this.localStats);
      console.log('📁 Sources:', this.localSourceEntries);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour des stats:', error);
      this.localStats = {
        total: 0, imported: 0, samples: 0, videos: 0, audios: 0, bySource: {}
      };
      this.localSourceEntries = [];
    }
  }

  // === MÉTHODES EXISTANTES ===

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
    this.notificationService.showSuccess('Favoris', `${media.title} ajouté aux favoris`);
  }

  addToPlaylist(media: any, event: Event): void {
    event.stopPropagation();
    this.notificationService.showInfo('Playlist', `${media.title} ajouté à la playlist`);
  }

  showMediaInfo(media: any, event: Event): void {
    event.stopPropagation();
    const info = `Informations sur ${media.title}\nDurée: ${this.formatDuration(media.duration)}\nTaille: ${this.getFileSize(media.size)}\nFormat: ${media.format}`;
    if (media.originalFilename) {
      alert(info + `\nFichier: ${media.originalFilename}`);
    } else {
      alert(info);
    }
  }

  importMedia(): void {
    this.router.navigate(['/import']);
  }

  // === 🔥 MÉTHODES DE PURGE DÉFINITIVEMENT CORRIGÉES ===

  /**
   * ✅ Affiche/masque les statistiques de purge ET met à jour les stats
   */
  togglePurgeStats(): void {
    this.showPurgeStats.update(current => !current);
    if (this.showPurgeStats()) {
      this.updateLocalStats(); // ✅ Recharger les stats à l'affichage
    }
  }

  /**
   * ✅ Ouvre le modal de purge ET met à jour les stats
   */
  showPurgeModal(): void {
    this.updateLocalStats(); // ✅ Recharger les stats à l'ouverture
    this.showPurgeModalFlag.set(true);
    // ✅ Reset des sélections - VARIABLE LOCALE
    this.localPurgeSelection = {
      importedMedia: false,
      allMedia: false,
      videosOnly: false,
      audioOnly: false,
      sources: []
    };
  }

  /**
   * Ferme le modal de purge
   */
  hidePurgeModal(): void {
    this.showPurgeModalFlag.set(false);
  }

  /**
   * ✅ Gère la sélection/désélection d'une source - UTILISE VARIABLE LOCALE
   */
  toggleSourceSelection(sourceId: string, selected: boolean): void {
    if (selected) {
      if (!this.localPurgeSelection.sources.includes(sourceId)) {
        this.localPurgeSelection.sources.push(sourceId);
      }
    } else {
      const index = this.localPurgeSelection.sources.indexOf(sourceId);
      if (index > -1) {
        this.localPurgeSelection.sources.splice(index, 1);
      }
    }
  }

  /**
   * ✅ Vérifie si au moins une option est sélectionnée - UTILISE VARIABLE LOCALE
   */
  hasSelection(): boolean {
    return this.localPurgeSelection.importedMedia || 
           this.localPurgeSelection.allMedia || 
           this.localPurgeSelection.videosOnly || 
           this.localPurgeSelection.audioOnly || 
           this.localPurgeSelection.sources.length > 0;
  }

  /**
   * Supprime un média individuel
   */
  removeIndividualMedia(media: any, event: Event): void {
    event.stopPropagation();
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${media.title}" ?`)) {
      this.mediaService.removeMedia(media.id);
      this.updateLocalStats(); // ✅ Mettre à jour les stats après suppression
      this.notificationService.showSuccess(
        'Média supprimé', 
        `"${media.title}" a été supprimé de votre bibliothèque`
      );
    }
  }

  /**
   * ✅ Exécute la purge et met à jour les stats - UTILISE VARIABLE LOCALE
   */
  executePurge(): void {
    console.log('🚀 Début executePurge()');
    console.log('🔍 Sélection:', this.localPurgeSelection);
    
    if (!this.hasSelection()) {
      console.log('❌ Aucune sélection');
      this.notificationService.showWarning('Aucune sélection', 'Veuillez sélectionner au moins une option');
      return;
    }

    try {
      const beforeCount = this.mediaService.mediaItems().length;
      console.log('📊 Médias avant purge:', beforeCount);

      // Exécuter les suppressions selon la variable locale
      if (this.localPurgeSelection.allMedia) {
        console.log('🗑️ Suppression de tous les médias...');
        this.mediaService.clearAllMedia();
        this.notificationService.showSuccess('Purge terminée', `${beforeCount} médias supprimés (tous)`);
      } else if (this.localPurgeSelection.importedMedia) {
        console.log('🗑️ Suppression des médias importés...');
        this.mediaService.clearImportedMedia();
        const afterCount = this.mediaService.mediaItems().length;
        const deleted = beforeCount - afterCount;
        this.notificationService.showSuccess('Purge terminée', `${deleted} médias importés supprimés`);
      } else if (this.localPurgeSelection.videosOnly) {
        console.log('🗑️ Suppression des vidéos...');
        this.mediaService.clearMediaByType('video');
        const afterCount = this.mediaService.mediaItems().length;
        const deleted = beforeCount - afterCount;
        this.notificationService.showSuccess('Purge terminée', `${deleted} vidéos supprimées`);
      } else if (this.localPurgeSelection.audioOnly) {
        console.log('🗑️ Suppression de l\'audio...');
        this.mediaService.clearMediaByType('audio');
        const afterCount = this.mediaService.mediaItems().length;
        const deleted = beforeCount - afterCount;
        this.notificationService.showSuccess('Purge terminée', `${deleted} fichiers audio supprimés`);
      } else if (this.localPurgeSelection.sources.length > 0) {
        console.log('🗑️ Suppression par sources:', this.localPurgeSelection.sources);
        let totalDeleted = 0;
        
        this.localPurgeSelection.sources.forEach(sourceId => {
          const beforeSourceCount = this.mediaService.mediaItems().length;
          this.mediaService.clearMediaFromSource(sourceId);
          const afterSourceCount = this.mediaService.mediaItems().length;
          const deleted = beforeSourceCount - afterSourceCount;
          totalDeleted += deleted;
        });
        
        this.notificationService.showSuccess('Purge terminée', `${totalDeleted} médias supprimés des sources sélectionnées`);
      }

      // ✅ ESSENTIEL : Mettre à jour les stats après la purge
      this.updateLocalStats();

    } catch (error) {
      console.error('❌ Erreur lors de la purge:', error);
      this.notificationService.showError('Erreur de purge', 'Une erreur est survenue : ' + error);
    }

    console.log('✅ Fin executePurge()');
    
    // Fermer le modal
    this.hidePurgeModal();

    // Mettre à jour l'affichage si nécessaire
    if (this.mediaService.mediaItems().length === 0) {
      this.setFilter('all');
    }
  }
}