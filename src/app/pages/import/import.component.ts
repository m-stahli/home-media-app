
// src/app/pages/import/import.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MediaSourceService } from '../../services/media-source.service';
import { MediaDetectionService, MediaDetectionResult, MediaType, DetectionStats } from '../../services/media-detection.service';
import { MediaSource, SourceStatus } from '../../models/media-source.model';

export interface ImportSession {
  id: string;
  sourceId: string;
  sourceName: string;
  status: 'idle' | 'scanning' | 'analyzing' | 'reviewing' | 'importing' | 'completed' | 'error';
  startTime: Date;
  
  // Progression
  overallProgress: number;
  currentPhase: string;
  
  // Résultats du scan
  scannedFiles: string[];
  detectionResults: MediaDetectionResult[];
  
  // Validation utilisateur
  validatedResults: MediaDetectionResult[];
  rejectedResults: MediaDetectionResult[];
  
  // Statistiques
  stats: DetectionStats;
  
  // Messages
  messages: ImportMessage[];
}

export interface ImportMessage {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  details?: string;
}

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="import-page">
      <div class="import-header">
        <h1>📥 Import de médias</h1>
        <p>Scannez vos sources et organisez automatiquement vos films, séries et sagas</p>
      </div>

      <!-- Sélection de source -->
      <div class="source-selection" *ngIf="!currentImportSession()">
        <h2>🎯 Choisir une source à importer</h2>
        <div class="sources-grid">
          <div *ngFor="let source of availableSources()" 
               class="source-card" 
               [class.disabled]="source.status !== 'online'"
               (click)="selectSource(source)">
            <div class="source-header">
              <h3>
                {{ mediaSourceService.getSourceTypeIcon(source.type) }}
                {{ source.name }}
              </h3>
              <span class="source-status" [style.color]="mediaSourceService.getStatusColor(source.status)">
                {{ mediaSourceService.getStatusIcon(source.status) }}
                {{ mediaSourceService.getStatusLabel(source.status) }}
              </span>
            </div>
            
            <div class="source-info">
              <p><strong>📂 Chemin :</strong> {{ source.path }}</p>
              <p><strong>📊 Médias :</strong> {{ source.mediaCount }} fichiers</p>
              <p><strong>💾 Taille :</strong> {{ mediaSourceService.formatFileSize(source.totalSize) }}</p>
              <p><strong>🔄 Dernier scan :</strong> {{ formatDate(source.lastScan) }}</p>
            </div>
            
            <div class="source-formats">
              <span *ngFor="let format of source.fileTypes" class="format-tag">
                {{ format.toUpperCase() }}
              </span>
            </div>
            
            <button class="import-btn" 
                    [disabled]="source.status !== 'online'"
                    (click)="startImport(source); $event.stopPropagation()">
              {{ source.status === 'online' ? '📥 Importer' : '❌ Indisponible' }}
            </button>
          </div>
        </div>
        
        <div class="import-options">
          <h3>⚙️ Options d'import</h3>
          <div class="options-grid">
            <label class="option-item">
              <input type="checkbox" [(ngModel)]="importOptions().skipExisting">
              <span>⏭️ Ignorer les fichiers déjà importés</span>
            </label>
            <label class="option-item">
              <input type="checkbox" [(ngModel)]="importOptions().autoGroup">
              <span>🔗 Grouper automatiquement les séries et sagas</span>
            </label>
            <label class="option-item">
              <input type="checkbox" [(ngModel)]="importOptions().downloadMetadata">
              <span>🌟 Télécharger les métadonnées enrichies</span>
            </label>
            <label class="option-item">
              <input type="checkbox" [(ngModel)]="importOptions().generateThumbnails">
              <span>🖼️ Générer les miniatures automatiquement</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Session d'import en cours -->
      <div class="import-session" *ngIf="currentImportSession() as session">
        <div class="session-header">
          <h2>📥 Import en cours : {{ session.sourceName }}</h2>
          <div class="session-status">
            <span class="status-badge" [attr.data-status]="session.status">
              {{ getStatusIcon(session.status) }} {{ getStatusLabel(session.status) }}
            </span>
            <button class="btn secondary" (click)="cancelImport()" *ngIf="canCancelImport(session)">
              ❌ Annuler
            </button>
          </div>
        </div>

        <!-- Barre de progression globale -->
        <div class="progress-section">
          <div class="progress-info">
            <span>{{ session.currentPhase }}</span>
            <span>{{ session.overallProgress }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="session.overallProgress"></div>
          </div>
        </div>

        <!-- Phase de scan -->
        <div class="phase-section" *ngIf="session.status === 'scanning'">
          <h3>🔍 Scan des fichiers en cours...</h3>
          <div class="scan-info">
            <p>📁 Exploration du répertoire : <code>{{ getSelectedSource()?.path }}</code></p>
            <p>📄 Fichiers trouvés : <strong>{{ session.scannedFiles.length }}</strong></p>
          </div>
        </div>

        <!-- Phase d'analyse -->
        <div class="phase-section" *ngIf="session.status === 'analyzing'">
          <h3>🤖 Analyse et détection en cours...</h3>
          <div class="analysis-preview" *ngIf="session.detectionResults.length > 0">
            <h4>📊 Aperçu de la détection :</h4>
            <div class="detection-stats">
              <div class="stat-item">
                <span class="stat-label">🎬 Films :</span>
                <span class="stat-value">{{ session.stats.standaloneMovies }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">🎭 Films de saga :</span>
                <span class="stat-value">{{ session.stats.sagaMovies }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">📺 Épisodes :</span>
                <span class="stat-value">{{ session.stats.episodes }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">📚 Séries :</span>
                <span class="stat-value">{{ session.stats.series }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">🎯 Sagas :</span>
                <span class="stat-value">{{ session.stats.sagas }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Phase de révision -->
        <div class="review-section" *ngIf="session.status === 'reviewing'">
          <h3>👁️ Révision des résultats de détection</h3>
          <p>Vérifiez et corrigez la détection automatique avant l'import final.</p>
          
          <div class="review-tabs">
            <button *ngFor="let tab of reviewTabs" 
                    [class.active]="activeReviewTab() === tab.id"
                    (click)="setActiveReviewTab(tab.id)"
                    class="tab-btn">
              {{ tab.icon }} {{ tab.label }} ({{ getTabCount(tab.id, session) }})
            </button>
          </div>

          <div class="review-content">
            <!-- Onglet Films -->
            <div *ngIf="activeReviewTab() === 'movies'" class="review-tab-content">
              <h4>🎬 Films détectés</h4>
              <div class="detection-list">
                <div *ngFor="let result of getMovieResults(session)" class="detection-item">
                  <div class="detection-info">
                    <h5>{{ result.extractedTitle }}</h5>
                    <p class="filename">📄 {{ result.originalFilename }}</p>
                    <span class="confidence" [class]="getConfidenceClass(result.confidence)">
                      Confiance : {{ (result.confidence * 100).toFixed(0) }}%
                    </span>
                  </div>
                  <div class="detection-actions">
                    <button class="btn small success" (click)="validateResult(result)">
                      ✅ Valider
                    </button>
                    <button class="btn small secondary" (click)="editResult(result)">
                      ✏️ Modifier
                    </button>
                    <button class="btn small danger" (click)="rejectResult(result)">
                      ❌ Rejeter
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Onglet Sagas -->
            <div *ngIf="activeReviewTab() === 'sagas'" class="review-tab-content">
              <h4>🎭 Sagas détectées</h4>
              <div class="saga-groups">
                <div *ngFor="let saga of detectionService.sagasList()" class="saga-group">
                  <div class="saga-header">
                    <h5>{{ saga.title }}</h5>
                    <span class="movie-count">{{ saga.totalMovies }} films</span>
                  </div>
                  <div class="saga-movies">
                    <div *ngFor="let result of getSagaResults(saga.title, session)" class="detection-item compact">
                      <div class="detection-info">
                        <span class="movie-title">{{ result.extractedTitle }}</span>
                        <span class="sequence-number" *ngIf="result.extractedSequenceNumber">
                          #{{ result.extractedSequenceNumber }}
                        </span>
                        <span class="confidence" [class]="getConfidenceClass(result.confidence)">
                          {{ (result.confidence * 100).toFixed(0) }}%
                        </span>
                      </div>
                      <div class="detection-actions">
                        <button class="btn small success" (click)="validateResult(result)">✅</button>
                        <button class="btn small secondary" (click)="editResult(result)">✏️</button>
                        <button class="btn small danger" (click)="rejectResult(result)">❌</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Onglet Séries -->
            <div *ngIf="activeReviewTab() === 'series'" class="review-tab-content">
              <h4>📺 Séries détectées</h4>
              <div class="series-groups">
                <div *ngFor="let series of detectionService.seriesList()" class="series-group">
                  <div class="series-header">
                    <h5>{{ series.title }}</h5>
                    <span class="episode-count">{{ series.totalEpisodes }} épisodes, {{ series.totalSeasons }} saisons</span>
                  </div>
                  <div class="series-episodes">
                    <div *ngFor="let result of getSeriesResults(series.title, session)" class="detection-item compact">
                      <div class="detection-info">
                        <span class="episode-title">
                          S{{ result.extractedSeason?.toString().padStart(2, '0') }}E{{ result.extractedEpisode?.toString().padStart(2, '0') }}
                          {{ result.extractedEpisodeTitle || 'Episode ' + result.extractedEpisode }}
                        </span>
                        <span class="confidence" [class]="getConfidenceClass(result.confidence)">
                          {{ (result.confidence * 100).toFixed(0) }}%
                        </span>
                      </div>
                      <div class="detection-actions">
                        <button class="btn small success" (click)="validateResult(result)">✅</button>
                        <button class="btn small secondary" (click)="editResult(result)">✏️</button>
                        <button class="btn small danger" (click)="rejectResult(result)">❌</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="review-actions">
            <button class="btn primary large" 
                    (click)="proceedToImport()"
                    [disabled]="session.validatedResults.length === 0">
              📥 Importer {{ session.validatedResults.length }} éléments validés
            </button>
            <button class="btn secondary" (click)="validateAllResults()">
              ✅ Tout valider
            </button>
            <button class="btn secondary" (click)="rejectAllResults()">
              ❌ Tout rejeter
            </button>
          </div>
        </div>

        <!-- Phase d'import -->
        <div class="phase-section" *ngIf="session.status === 'importing'">
          <h3>📥 Import en cours...</h3>
          <p>Import des {{ session.validatedResults.length }} éléments validés</p>
        </div>

        <!-- Import terminé -->
        <div class="completion-section" *ngIf="session.status === 'completed'">
          <h3>🎉 Import terminé avec succès !</h3>
          <div class="completion-stats">
            <div class="stat-card success">
              <h4>✅ Importés</h4>
              <span class="big-number">{{ session.validatedResults.length }}</span>
            </div>
            <div class="stat-card warning">
              <h4>⏭️ Ignorés</h4>
              <span class="big-number">{{ session.rejectedResults.length }}</span>
            </div>
            <div class="stat-card info">
              <h4>⏱️ Durée</h4>
              <span class="big-number">{{ getImportDuration(session) }}</span>
            </div>
          </div>
          
          <div class="completion-actions">
            <button class="btn primary" routerLink="/library">
              📚 Voir la bibliothèque
            </button>
            <button class="btn secondary" (click)="startNewImport()">
              📥 Nouveau scan
            </button>
          </div>
        </div>

        <!-- Messages de log -->
        <div class="messages-section" *ngIf="session.messages.length > 0">
          <h4>📋 Journal des opérations</h4>
          <div class="messages-list">
            <div *ngFor="let message of getRecentMessages(session)" 
                 class="message-item" 
                 [attr.data-type]="message.type">
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              <span class="message-text">{{ message.message }}</span>
              <button *ngIf="message.details" 
                      class="details-btn"
                      (click)="toggleMessageDetails(message)">
                ℹ️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .import-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
      min-height: 100vh;
    }

    .import-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .import-header h1 {
      font-size: 2.5rem;
      margin: 0 0 1rem 0;
      color: #333;
    }

    .import-header p {
      font-size: 1.2rem;
      color: #666;
      margin: 0;
    }

    /* Source Selection */
    .source-selection h2 {
      margin: 0 0 2rem 0;
      color: #333;
    }

    .sources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .source-card {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .source-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
    }

    .source-card.offline {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .source-icon {
      font-size: 3rem;
      min-width: 60px;
      text-align: center;
    }

    .source-info {
      flex: 1;
    }

    .source-info h3 {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 1.3rem;
    }

    .source-info p {
      margin: 0 0 1rem 0;
      color: #666;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }

    .source-stats {
      color: #888;
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }

    .source-status {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .empty-sources {
      text-align: center;
      padding:// src/app/pages/import/import.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MediaSourceService } from '../../services/media-source.service';
import { MediaDetectionService, MediaDetectionResult, MediaType } from '../../services/media-detection.service';
import { MediaSource, SourceStatus } from '../../models/media-source.model';

interface ImportSession {
  id: string;
  sourceId: string;
  sourceName: string;
  phase: 'select' | 'scanning' | 'analysis' | 'review' | 'importing' | 'completed';
  startTime: Date;
  
  // Données du scan
  scannedFiles: string[];
  detectionResults: MediaDetectionResult[];
  
  // Groupements détectés
  detectedSeries: any[];
  detectedSagas: any[];
  standaloneMovies: MediaDetectionResult[];
  
  // Statistiques
  totalFiles: number;
  processedFiles: number;
  progress: number;
  
  // État de révision
  userValidations: Map<string, 'accept' | 'reject' | 'modify'>;
  userModifications: Map<string, Partial<MediaDetectionResult>>;
}

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="import-page">
      <div class="import-header">
        <h1>📥 Import de médias</h1>
        <p>Analysez et importez vos fichiers multimédia avec détection automatique</p>
      </div>

      <!-- Sélection de source -->
      <div *ngIf="!currentSession()" class="source-selection">
        <h2>🗂️ Choisir une source à analyser</h2>
        <div class="sources-grid">
          <div *ngFor="let source of availableSources()" 
               class="source-card" 
               [class.offline]="source.status !== 'online'"
               (click)="selectSource(source)">
            <div class="source-icon">
              {{ getSourceIcon(source.type) }}
            </div>
            <div class="source-info">
              <h3>{{ source.name }}</h3>
              <p>{{ source.path }}</p>
              <div class="source-stats">
                <span>{{ source.mediaCount }} médias • {{ formatSize(source.totalSize) }}</span>
              </div>
              <div class="source-status" [style.color]="getStatusColor(source.status)">
                {{ getStatusLabel(source.status) }}
              </div>
            </div>
            <div class="source-action">
              <button class="btn primary" 
                      [disabled]="source.status !== 'online'"
                      (click)="selectSource(source); $event.stopPropagation()">
                {{ source.status === 'online' ? 'Analyser' : 'Indisponible' }}
              </button>
            </div>
          </div>
        </div>
        
        <div *ngIf="availableSources().length === 0" class="empty-sources">
          <div class="empty-icon">📁</div>
          <h3>Aucune source disponible</h3>
          <p>Configurez d'abord vos sources de médias</p>
          <button class="btn primary" routerLink="/sources">
            Gérer les sources
          </button>
        </div>
      </div>

      <!-- Session d'import active -->
      <div *ngIf="currentSession() as session" class="import-session">
        
        <!-- Phase : Scan en cours -->
        <div *ngIf="session.phase === 'scanning'" class="phase-scanning">
          <div class="phase-header">
            <h2>🔍 Scan de {{ session.sourceName }}</h2>
            <p>Recherche de fichiers multimédia...</p>
          </div>
          
          <div class="progress-section">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="session.progress"></div>
            </div>
            <div class="progress-stats">
              <span>{{ session.processedFiles }} / {{ session.totalFiles }} fichiers traités</span>
              <span>{{ session.progress }}%</span>
            </div>
          </div>
          
          <div class="scanning-info">
            <p>⏱️ Temps écoulé : {{ getElapsedTime(session.startTime) }}</p>
            <p>📄 Fichiers trouvés : {{ session.scannedFiles.length }}</p>
          </div>
        </div>

        <!-- Phase : Analyse -->
        <div *ngIf="session.phase === 'analysis'" class="phase-analysis">
          <div class="phase-header">
            <h2>🤖 Analyse intelligente</h2>
            <p>Détection automatique des films, séries et sagas...</p>
          </div>
          
          <div class="analysis-progress">
            <div class="progress-ring">
              <svg class="progress-ring-svg" width="120" height="120">
                <circle class="progress-ring-circle-bg" 
                        cx="60" cy="60" r="54"></circle>
                <circle class="progress-ring-circle" 
                        cx="60" cy="60" r="54"
                        [style.stroke-dashoffset]="getCircleOffset(session.progress)"></circle>
              </svg>
              <div class="progress-text">{{ session.progress }}%</div>
            </div>
            
            <div class="analysis-stats">
              <div class="stat-item">
                <span class="stat-value">{{ session.detectionResults.length }}</span>
                <span class="stat-label">Fichiers analysés</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ getDetectionStats().series }}</span>
                <span class="stat-label">Séries détectées</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ getDetectionStats().sagas }}</span>
                <span class="stat-label">Sagas détectées</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Phase : Révision -->
        <div *ngIf="session.phase === 'review'" class="phase-review">
          <div class="phase-header">
            <h2>👀 Révision des détections</h2>
            <p>Vérifiez et corrigez les groupements automatiques</p>
            
            <div class="review-stats">
              <div class="stat-card confidence-high">
                <h3>{{ getDetectionStats().confidence.high }}</h3>
                <p>Détections fiables</p>
              </div>
              <div class="stat-card confidence-medium">
                <h3>{{ getDetectionStats().confidence.medium }}</h3>
                <p>À vérifier</p>
              </div>
              <div class="stat-card confidence-low">
                <h3>{{ getDetectionStats().confidence.low }}</h3>
                <p>Incertaines</p>
              </div>
            </div>
          </div>

          <div class="review-tabs">
            <button class="tab-btn" 
                    [class.active]="reviewTab() === 'sagas'"
                    (click)="setReviewTab('sagas')">
              🎬 Sagas ({{ session.detectedSagas.length }})
            </button>
            <button class="tab-btn" 
                    [class.active]="reviewTab() === 'series'"
                    (click)="setReviewTab('series')">
              📺 Séries ({{ session.detectedSeries.length }})
            </button>
            <button class="tab-btn" 
                    [class.active]="reviewTab() === 'movies'"
                    (click)="setReviewTab('movies')">
              🎭 Films ({{ session.standaloneMovies.length }})
            </button>
          </div>

          <!-- Onglet Sagas -->
          <div *ngIf="reviewTab() === 'sagas'" class="review-content">
            <div *ngFor="let saga of session.detectedSagas" class="group-card saga-card">
              <div class="group-header">
                <h3>🎬 {{ saga.title }}</h3>
                <div class="group-stats">
                  {{ saga.totalMovies }} films
                  <span *ngIf="saga.suggestedPhases.length > 0">
                    • {{ saga.suggestedPhases.length }} phases
                  </span>
                </div>
              </div>
              
              <div class="group-items">
                <div *ngFor="let movie of saga.movies" 
                     class="item-card" 
                     [class.low-confidence]="movie.confidence < 0.6">
                  <div class="item-info">
                    <h4>{{ movie.extractedTitle }}</h4>
                    <p>{{ movie.originalFilename }}</p>
                    <div class="item-meta">
                      <span class="confidence" [class]="getConfidenceClass(movie.confidence)">
                        {{ (movie.confidence * 100).toFixed(0) }}% de confiance
                      </span>
                      <span *ngIf="movie.extractedSequenceNumber" class="sequence">
                        #{{ movie.extractedSequenceNumber }}
                      </span>
                      <span *ngIf="movie.extractedPhaseHint" class="phase">
                        {{ movie.extractedPhaseHint }}
                      </span>
                    </div>
                  </div>
                  
                  <div class="item-actions">
                    <button class="action-btn accept" 
                            [class.active]="getValidation(movie.originalFilename) === 'accept'"
                            (click)="setValidation(movie.originalFilename, 'accept')"
                            title="Accepter">
                      ✅
                    </button>
                    <button class="action-btn modify" 
                            [class.active]="getValidation(movie.originalFilename) === 'modify'"
                            (click)="setValidation(movie.originalFilename, 'modify')"
                            title="Modifier">
                      ✏️
                    </button>
                    <button class="action-btn reject" 
                            [class.active]="getValidation(movie.originalFilename) === 'reject'"
                            (click)="setValidation(movie.originalFilename, 'reject')"
                            title="Rejeter">
                      ❌
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Onglet Séries -->
          <div *ngIf="reviewTab() === 'series'" class="review-content">
            <div *ngFor="let series of session.detectedSeries" class="group-card series-card">
              <div class="group-header">
                <h3>📺 {{ series.title }}</h3>
                <div class="group-stats">
                  {{ series.totalEpisodes }} épisodes • {{ series.totalSeasons }} saisons
                </div>
              </div>
              
              <div class="group-items">
                <div *ngFor="let episode of series.episodes" 
                     class="item-card"
                     [class.low-confidence]="episode.confidence < 0.6">
                  <div class="item-info">
                    <h4>{{ episode.extractedEpisodeTitle || 'Episode ' + episode.extractedEpisode }}</h4>
                    <p>{{ episode.originalFilename }}</p>
                    <div class="item-meta">
                      <span class="confidence" [class]="getConfidenceClass(episode.confidence)">
                        {{ (episode.confidence * 100).toFixed(0) }}% de confiance
                      </span>
                      <span class="episode-info">
                        S{{ episode.extractedSeason }}E{{ episode.extractedEpisode }}
                      </span>
                    </div>
                  </div>
                  
                  <div class="item-actions">
                    <button class="action-btn accept" 
                            [class.active]="getValidation(episode.originalFilename) === 'accept'"
                            (click)="setValidation(episode.originalFilename, 'accept')">
                      ✅
                    </button>
                    <button class="action-btn modify" 
                            [class.active]="getValidation(episode.originalFilename) === 'modify'"
                            (click)="setValidation(episode.originalFilename, 'modify')">
                      ✏️
                    </button>
                    <button class="action-btn reject" 
                            [class.active]="getValidation(episode.originalFilename) === 'reject'"
                            (click)="setValidation(episode.originalFilename, 'reject')">
                      ❌
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Onglet Films -->
          <div *ngIf="reviewTab() === 'movies'" class="review-content">
            <div class="group-card movies-card">
              <div class="group-header">
                <h3>🎭 Films autonomes</h3>
                <div class="group-stats">{{ session.standaloneMovies.length }} films</div>
              </div>
              
              <div class="group-items">
                <div *ngFor="let movie of session.standaloneMovies" 
                     class="item-card"
                     [class.low-confidence]="movie.confidence < 0.6">
                  <div class="item-info">
                    <h4>{{ movie.extractedTitle }}</h4>
                    <p>{{ movie.originalFilename }}</p>
                    <div class="item-meta">
                      <span class="confidence" [class]="getConfidenceClass(movie.confidence)">
                        {{ (movie.confidence * 100).toFixed(0) }}% de confiance
                      </span>
                      <span *ngIf="movie.extractedYear" class="year">
                        {{ movie.extractedYear }}
                      </span>
                    </div>
                  </div>
                  
                  <div class="item-actions">
                    <button class="action-btn accept" 
                            [class.active]="getValidation(movie.originalFilename) === 'accept'"
                            (click)="setValidation(movie.originalFilename, 'accept')">
                      ✅
                    </button>
                    <button class="action-btn modify" 
                            [class.active]="getValidation(movie.originalFilename) === 'modify'"
                            (click)="setValidation(movie.originalFilename, 'modify')">
                      ✏️
                    </button>
                    <button class="action-btn reject" 
                            [class.active]="getValidation(movie.originalFilename) === 'reject'"
                            (click)="setValidation(movie.originalFilename, 'reject')">
                      ❌
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="review-actions">
            <button class="btn secondary" (click)="cancelImport()">
              Annuler
            </button>
            <button class="btn" (click)="goBackToAnalysis()">
              ← Retour à l'analyse
            </button>
            <button class="btn primary" 
                    (click)="startImport()"
                    [disabled]="!hasValidItems()">
              Importer {{ getValidItemsCount() }} éléments
            </button>
          </div>
        </div>

        <!-- Phase : Import en cours -->
        <div *ngIf="session.phase === 'importing'" class="phase-importing">
          <div class="phase-header">
            <h2>📥 Import en cours</h2>
            <p>Ajout des médias à votre bibliothèque...</p>
          </div>
          
          <div class="import-progress">
            <div class="progress-bar">
              <div class="progress-fill animated" [style.width.%]="session.progress"></div>
            </div>
            <div class="progress-stats">
              <span>{{ session.processedFiles }} / {{ session.totalFiles }} fichiers importés</span>
              <span>{{ session.progress }}%</span>
            </div>
          </div>
        </div>

        <!-- Phase : Terminé -->
        <div *ngIf="session.phase === 'completed'" class="phase-completed">
          <div class="success-header">
            <div class="success-icon">🎉</div>
            <h2>Import terminé !</h2>
            <p>{{ session.processedFiles }} médias ont été ajoutés à votre bibliothèque</p>
          </div>
          
          <div class="completion-stats">
            <div class="stat-card">
              <h3>{{ getImportStats().series }}</h3>
              <p>Séries ajoutées</p>
            </div>
            <div class="stat-card">
              <h3>{{ getImportStats().sagas }}</h3>
              <p>Sagas ajoutées</p>
            </div>
            <div class="stat-card">
              <h3>{{ getImportStats().movies }}</h3>
              <p>Films ajoutés</p>
            </div>
          </div>
          
          <div class="completion-actions">
            <button class="btn secondary" (click)="startNewImport()">
              Importer une autre source
            </button>
            <button class="btn primary" routerLink="/library">
              Voir la bibliothèque
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [/* Styles CSS complets à venir */]
})
export class ImportComponent {
  mediaSourceService = inject(MediaSourceService);
  detectionService = inject(MediaDetectionService);

  currentSession = signal<ImportSession | null>(null);
  reviewTab = signal<'sagas' | 'series' | 'movies'>('sagas');

  // Computed values
  availableSources = computed(() => 
    this.mediaSourceService.sources().filter(s => s.status === SourceStatus.ONLINE)
  );

  /**
   * Démarre une session d'import pour une source
   */
  selectSource(source: MediaSource): void {
    if (source.status !== SourceStatus.ONLINE) return;

    const session: ImportSession = {
      id: Date.now().toString(),
      sourceId: source.id,
      sourceName: source.name,
      phase: 'scanning',
      startTime: new Date(),
      scannedFiles: [],
      detectionResults: [],
      detectedSeries: [],
      detectedSagas: [],
      standaloneMovies: [],
      totalFiles: 0,
      processedFiles: 0,
      progress: 0,
      userValidations: new Map(),
      userModifications: new Map()
    };

    this.currentSession.set(session);
    this.simulateScan(session);
  }

  /**
   * Simulation du scan de fichiers
   */
  private async simulateScan(session: ImportSession): Promise<void> {
    // Simulation de fichiers trouvés
    const mockFiles = [
      'Iron.Man.2008.1080p.mp4',
      'Iron.Man.2.2010.1080p.mp4',
      'Thor.2011.1080p.mp4',
      'Captain.America.The.First.Avenger.2011.mp4',
      'The.Avengers.2012.1080p.mp4',
      'Breaking.Bad.S01E01.Pilot.mp4',
      'Breaking.Bad.S01E02.Cat.in.the.Bag.mp4',
      'Breaking.Bad.S01E03.And.the.Bags.in.the.River.mp4',
      'Star.Wars.Episode.IV.A.New.Hope.1977.mp4',
      'Star.Wars.Episode.V.The.Empire.Strikes.Back.1980.mp4',
      'Inception.2010.1080p.mp4',
      'The.Matrix.1999.1080p.mp4',
      'Pulp.Fiction.1994.1080p.mp4'
    ];

    session.scannedFiles = mockFiles;
    session.totalFiles = mockFiles.length;

    // Simulation du scan progressif
    for (let i = 0; i <= mockFiles.length; i++) {
      session.processedFiles = i;
      session.progress = Math.floor((i / mockFiles.length) * 100);
      this.currentSession.set({ ...session });
      await this.delay(200);
    }

    // Passer à l'analyse
    session.phase = 'analysis';
    session.progress = 0;
    this.currentSession.set({ ...session });
    this.simulateAnalysis(session);
  }

  /**
   * Simulation de l'analyse
   */
  private async simulateAnalysis(session: ImportSession): Promise<void> {
    const results: MediaDetectionResult[] = [];
    
    for (let i = 0; i < session.scannedFiles.length; i++) {
      const filename = session.scannedFiles[i];
      const result = this.detectionService.analyzeFilename(filename);
      results.push(result);
      
      session.detectionResults = [...results];
      session.progress = Math.floor(((i + 1) / session.scannedFiles.length) * 100);
      this.currentSession.set({ ...session });
      
      await this.delay(150);
    }

    // Grouper les résultats
    this.detectionService.groupDetectedMedia(results);
    
    session.detectedSeries = this.detectionService.seriesList();
    session.detectedSagas = this.detectionService.sagasList();
    session.standaloneMovies = results.filter(r => r.detectedType === MediaType.MOVIE);

    // Passer à la révision
    session.phase = 'review';
    this.currentSession.set({ ...session });
  }

  // Méthodes utilitaires et de gestion...
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getSourceIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'local': '💾',
      'external': '🔌',
      'network': '🌐'
    };
    return icons[type] || '📁';
  }

  formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'online': '#4CAF50',
      'offline': '#f44336',
      'scanning': '#ff9800'
    };
    return colors[status] || '#666';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'online': 'En ligne',
      'offline': 'Hors ligne',
      'scanning': 'En cours de scan'
    };
    return labels[status] || status;
  }

  getElapsedTime(startTime: Date): string {
    const elapsed = Date.now() - startTime.getTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  }

  getDetectionStats() {
    return this.detectionService.getDetectionStats();
  }

  getCircleOffset(progress: number): number {
    const circumference = 2 * Math.PI * 54;
    return circumference - (progress / 100) * circumference;
  }

  setReviewTab(tab: 'sagas' | 'series' | 'movies'): void {
    this.reviewTab.set(tab);
  }

  getValidation(filename: string): string | undefined {
    return this.currentSession()?.userValidations.get(filename);
  }

  setValidation(filename: string, validation: 'accept' | 'reject' | 'modify'): void {
    const session = this.currentSession();
    if (session) {
      session.userValidations.set(filename, validation);
      this.currentSession.set({ ...session });
    }
  }

  getConfidenceClass(confidence: number): string {
    if (confidence > 0.7) return 'high';
    if (confidence > 0.4) return 'medium';
    return 'low';
  }

  hasValidItems(): boolean {
    const session = this.currentSession();
    if (!session) return false;
    
    return Array.from(session.userValidations.values()).some(v => v === 'accept');
  }

  getValidItemsCount(): number {
    const session = this.currentSession();
    if (!session) return 0;
    
    return Array.from(session.userValidations.values()).filter(v => v === 'accept').length;
  }

  startImport(): void {
    const session = this.currentSession();
    if (!session) return;
    
    session.phase = 'importing';
    session.progress = 0;
    this.currentSession.set({ ...session });
    this.simulateImport(session);
  }

  private async simulateImport(session: ImportSession): Promise<void> {
    const validItems = Array.from(session.userValidations.entries())
      .filter(([, validation]) => validation === 'accept');
    
    for (let i = 0; i <= validItems.length; i++) {
      session.processedFiles = i;
      session.progress = Math.floor((i / validItems.length) * 100);
      this.currentSession.set({ ...session });
      await this.delay(300);
    }
    
    session.phase = 'completed';
    this.currentSession.set({ ...session });
  }

  getImportStats() {
    const session = this.currentSession();
    if (!session) return { series: 0, sagas: 0, movies: 0 };
    
    return {
      series: session.detectedSeries.length,
      sagas: session.detectedSagas.length,
      movies: session.standaloneMovies.length
    };
  }

  cancelImport(): void {
    this.currentSession.set(null);
  }

  goBackToAnalysis(): void {
    const session = this.currentSession();
    if (session) {
      session.phase = 'analysis';
      this.currentSession.set({ ...session });
    }
  }

  startNewImport(): void {
    this.currentSession.set(null);
  }
}