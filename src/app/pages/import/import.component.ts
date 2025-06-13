// src/app/pages/import/import.component.ts - Version finale connectée
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MediaSourceService } from '../../services/media-source.service';
import { MediaDetectionService, MediaDetectionResult, MediaType, DetectionStats } from '../../services/media-detection.service';
import { MediaService } from '../../services/media.service';
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

interface ImportOptions {
  skipExisting: boolean;
  autoGroup: boolean;
  downloadMetadata: boolean;
  generateThumbnails: boolean;
}

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
                {{ getSourceIcon(source.type) }}
                {{ source.name }}
              </h3>
              <span class="source-status" [style.color]="getStatusColor(source.status)">
                {{ getStatusIcon(source.status) }}
                {{ getStatusLabel(source.status) }}
              </span>
            </div>
            
            <div class="source-info">
              <p><strong>📂 Chemin :</strong> {{ source.path }}</p>
              <p><strong>📊 Médias :</strong> {{ source.mediaCount }} fichiers</p>
              <p><strong>💾 Taille :</strong> {{ formatFileSize(source.totalSize) }}</p>
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
                <div *ngFor="let saga of getSagasList()" class="saga-group">
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
                <div *ngFor="let series of getSeriesList()" class="series-group">
                  <div class="series-header">
                    <h5>{{ series.title }}</h5>
                    <span class="episode-count">{{ series.totalEpisodes }} épisodes, {{ series.totalSeasons }} saisons</span>
                  </div>
                  <div class="series-episodes">
                    <div *ngFor="let result of getSeriesResults(series.title, session)" class="detection-item compact">
                      <div class="detection-info">
                        <span class="episode-title">
                          S{{ (result.extractedSeason || 0).toString().padStart(2, '0') }}E{{ (result.extractedEpisode || 0).toString().padStart(2, '0') }}
                          {{ result.extractedEpisodeTitle || 'Episode ' + (result.extractedEpisode || 0) }}
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
          <p>Import des {{ session.validatedResults.length }} éléments validés dans votre bibliothèque</p>
          <div class="import-details">
            <p>🎯 Conversion des données...</p>
            <p>💾 Sauvegarde en cours...</p>
            <p>🔄 Mise à jour de la bibliothèque...</p>
          </div>
        </div>

        <!-- Import terminé -->
        <div class="completion-section" *ngIf="session.status === 'completed'">
          <h3>🎉 Import terminé avec succès !</h3>
          <div class="completion-stats">
            <div class="stat-card success">
              <h4>✅ Importés</h4>
              <span class="big-number">{{ importedCount() }}</span>
              <p>Médias ajoutés à votre bibliothèque</p>
            </div>
            <div class="stat-card warning">
              <h4>⏭️ Ignorés</h4>
              <span class="big-number">{{ session.rejectedResults.length }}</span>
              <p>Fichiers non importés</p>
            </div>
            <div class="stat-card info">
              <h4>⏱️ Durée</h4>
              <span class="big-number">{{ getImportDuration(session) }}</span>
              <p>Temps total</p>
            </div>
          </div>
          
          <div class="completion-breakdown" *ngIf="importedCount() > 0">
            <h4>📊 Détails de l'import</h4>
            <div class="breakdown-grid">
              <div class="breakdown-item">
                <span class="breakdown-icon">🎬</span>
                <span class="breakdown-label">Films :</span>
                <span class="breakdown-value">{{ getImportBreakdown().movies }}</span>
              </div>
              <div class="breakdown-item">
                <span class="breakdown-icon">📺</span>
                <span class="breakdown-label">Épisodes :</span>
                <span class="breakdown-value">{{ getImportBreakdown().episodes }}</span>
              </div>
              <div class="breakdown-item">
                <span class="breakdown-icon">🎭</span>
                <span class="breakdown-label">Sagas :</span>
                <span class="breakdown-value">{{ getImportBreakdown().sagas }}</span>
              </div>
            </div>
          </div>
          
          <div class="completion-actions">
            <button class="btn primary large" (click)="goToLibrary()">
              📚 Voir la bibliothèque mise à jour
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
  styleUrls: ['./import.component.scss']
})
export class ImportComponent {
  private router = inject(Router);
  mediaSourceService = inject(MediaSourceService);
  detectionService = inject(MediaDetectionService);
  mediaService = inject(MediaService); // 🔥 AJOUT DU MEDIASERVICE

  // Signals
  currentImportSession = signal<ImportSession | null>(null);
  activeReviewTab = signal<string>('movies');
  importedCount = signal<number>(0); // 🔥 NOUVEAU : compte des médias importés
  importOptions = signal<ImportOptions>({
    skipExisting: true,
    autoGroup: true,
    downloadMetadata: true,
    generateThumbnails: false
  });

  // Configuration des onglets de révision
  reviewTabs = [
    { id: 'movies', label: 'Films', icon: '🎬' },
    { id: 'sagas', label: 'Sagas', icon: '🎭' },
    { id: 'series', label: 'Séries', icon: '📺' }
  ];

  // Computed values
  availableSources = computed(() => 
    this.mediaSourceService.sources().filter(s => s.status === SourceStatus.ONLINE)
  );

  /**
   * Démarre l'import pour une source
   */
  startImport(source: MediaSource): void {
    this.selectSource(source);
  }

  /**
   * Sélectionne une source et démarre le processus
   */
  selectSource(source: MediaSource): void {
    if (source.status !== SourceStatus.ONLINE) return;

    const session: ImportSession = {
      id: Date.now().toString(),
      sourceId: source.id,
      sourceName: source.name,
      status: 'scanning',
      startTime: new Date(),
      overallProgress: 0,
      currentPhase: 'Initialisation...',
      scannedFiles: [],
      detectionResults: [],
      validatedResults: [],
      rejectedResults: [],
      stats: {
        standaloneMovies: 0,
        sagaMovies: 0,
        episodes: 0,
        series: 0,
        sagas: 0,
        totalFiles: 0,
        confidence: {
          high: 0,
          medium: 0,
          low: 0
        }
      },
      messages: []
    };

    this.currentImportSession.set(session);
    this.addMessage(session, 'info', `Début du scan de la source "${source.name}"`);
    this.simulateScanProcess(session);
  }

  /**
   * Simulation du processus de scan
   */
  private async simulateScanProcess(session: ImportSession): Promise<void> {
    // Phase 1: Scan des fichiers
    session.currentPhase = 'Scan des fichiers...';
    session.status = 'scanning';
    this.currentImportSession.set({ ...session });

    const mockFiles = [
      'Iron.Man.2008.1080p.BluRay.x264.mp4',
      'Iron.Man.2.2010.1080p.BluRay.x264.mp4',
      'Thor.2011.1080p.BluRay.x264.mp4',
      'Captain.America.The.First.Avenger.2011.1080p.mp4',
      'The.Avengers.2012.1080p.BluRay.x264.mp4',
      'Breaking.Bad.S01E01.Pilot.1080p.mp4',
      'Breaking.Bad.S01E02.Cat.in.the.Bag.1080p.mp4',
      'Breaking.Bad.S01E03.And.the.Bags.in.the.River.1080p.mp4',
      'Star.Wars.Episode.IV.A.New.Hope.1977.1080p.mp4',
      'Star.Wars.Episode.V.The.Empire.Strikes.Back.1980.1080p.mp4',
      'Inception.2010.1080p.BluRay.x264.mp4',
      'The.Matrix.1999.1080p.BluRay.x264.mp4'
    ];

    this.addMessage(session, 'info', `Exploration du répertoire ${this.getSelectedSource()?.path}`);

    // Simulation du scan progressif
    for (let i = 0; i <= mockFiles.length; i++) {
      session.overallProgress = Math.floor((i / mockFiles.length) * 30); // 30% pour le scan
      session.scannedFiles = mockFiles.slice(0, i);
      this.currentImportSession.set({ ...session });
      await this.delay(300);
    }

    this.addMessage(session, 'success', `${mockFiles.length} fichiers trouvés`);

    // Phase 2: Analyse et détection
    session.currentPhase = 'Analyse et détection...';
    session.status = 'analyzing';
    this.currentImportSession.set({ ...session });

    this.addMessage(session, 'info', 'Début de l\'analyse intelligente des fichiers');

    const results: MediaDetectionResult[] = [];
    for (let i = 0; i < mockFiles.length; i++) {
      const filename = mockFiles[i];
      const result = this.detectionService.analyzeFilename(filename);
      results.push(result);
      
      session.detectionResults = [...results];
      session.overallProgress = 30 + Math.floor(((i + 1) / mockFiles.length) * 40); // 30-70%
      this.currentImportSession.set({ ...session });
      
      await this.delay(200);
    }

    // Mise à jour des statistiques
    session.stats = this.calculateStats(results);
    session.overallProgress = 70;
    session.currentPhase = 'Groupement des médias...';
    this.currentImportSession.set({ ...session });

    this.addMessage(session, 'success', `Analyse terminée : ${results.length} fichiers analysés`);
    this.addMessage(session, 'info', `Détectés : ${session.stats.standaloneMovies} films, ${session.stats.episodes} épisodes, ${session.stats.sagaMovies} films de saga`);

    await this.delay(1000);

    // Phase 3: Révision
    session.status = 'reviewing';
    session.currentPhase = 'En attente de validation...';
    session.overallProgress = 80;
    this.currentImportSession.set({ ...session });

    this.addMessage(session, 'info', 'Prêt pour la révision - Vérifiez les détections avant l\'import');
  }

  /**
   * 🔥 NOUVELLE MÉTHODE : Import réel dans MediaService
   */
  private async simulateImportProcess(session: ImportSession): Promise<void> {
    this.addMessage(session, 'info', `Début de l'import de ${session.validatedResults.length} médias`);
    
    // Étape 1: Préparation
    session.currentPhase = 'Préparation de l\'import...';
    session.overallProgress = 90;
    this.currentImportSession.set({ ...session });
    await this.delay(500);

    // Étape 2: Import réel via MediaService
    try {
      const selectedSource = this.getSelectedSource();
      if (!selectedSource) {
        throw new Error('Source introuvable');
      }

      this.addMessage(session, 'info', 'Conversion des données de détection...');
      session.currentPhase = 'Conversion des données...';
      session.overallProgress = 92;
      this.currentImportSession.set({ ...session });
      await this.delay(300);

      // 🔥 IMPORT RÉEL VIA MEDIASERVICE
      const importedMedia = this.mediaService.importDetectedMedia(
        session.validatedResults,
        selectedSource.id,
        selectedSource.path
      );

      this.importedCount.set(importedMedia.length);
      
      this.addMessage(session, 'success', `${importedMedia.length} médias importés avec succès`);
      this.addMessage(session, 'info', 'Mise à jour de la bibliothèque...');
      
      session.currentPhase = 'Finalisation...';
      session.overallProgress = 98;
      this.currentImportSession.set({ ...session });
      await this.delay(300);

    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      this.addMessage(session, 'error', `Erreur lors de l'import : ${error}`);
      session.status = 'error';
      this.currentImportSession.set({ ...session });
      return;
    }

    // Étape 3: Finalisation
    session.status = 'completed';
    session.currentPhase = 'Import terminé !';
    session.overallProgress = 100;
    this.currentImportSession.set({ ...session });
    
    this.addMessage(session, 'success', 'Import terminé avec succès !');
    this.addMessage(session, 'info', 'Vos médias sont maintenant disponibles dans la bibliothèque');
  }

  /**
   * 🔥 NOUVELLE MÉTHODE : Obtient le détail de l'import
   */
  getImportBreakdown() {
    const session = this.currentImportSession();
    if (!session) return { movies: 0, episodes: 0, sagas: 0 };

    const validated = session.validatedResults;
    return {
      movies: validated.filter(r => r.detectedType === MediaType.MOVIE).length,
      episodes: validated.filter(r => r.detectedType === MediaType.TV_EPISODE).length,
      sagas: validated.filter(r => r.detectedType === MediaType.SAGA_MOVIE).length
    };
  }

  /**
   * 🔥 NAVIGATION VERS BIBLIOTHÈQUE
   */
  goToLibrary(): void {
    this.router.navigate(['/library']);
  }

  /**
   * Ajoute un message de log
   */
  private addMessage(session: ImportSession, type: ImportMessage['type'], message: string, details?: string): void {
    session.messages.push({
      type,
      message,
      timestamp: new Date(),
      details
    });
    
    // Garder seulement les 50 derniers messages
    if (session.messages.length > 50) {
      session.messages = session.messages.slice(-50);
    }
  }

  /**
   * Calcule les statistiques de détection
   */
  private calculateStats(results: MediaDetectionResult[]): DetectionStats {
    const stats: DetectionStats = {
      standaloneMovies: 0,
      sagaMovies: 0,
      episodes: 0,
      series: 0,
      sagas: 0,
      totalFiles: results.length,
      confidence: {
        high: 0,
        medium: 0,
        low: 0
      }
    };

    const seriesSet = new Set<string>();
    const sagasSet = new Set<string>();

    results.forEach(result => {
      // Calcul des statistiques de confiance
      if (result.confidence >= 0.8) {
        stats.confidence.high++;
      } else if (result.confidence >= 0.6) {
        stats.confidence.medium++;
      } else {
        stats.confidence.low++;
      }

      // Calcul des types de médias
      if (result.detectedType === MediaType.MOVIE) {
        stats.standaloneMovies++;
      } else if (result.detectedType === MediaType.SAGA_MOVIE) {
        stats.sagaMovies++;
        if (result.extractedSagaHint) {
          sagasSet.add(result.extractedSagaHint);
        }
      } else if (result.detectedType === MediaType.TV_EPISODE) {
        stats.episodes++;
        if (result.extractedTitle) {
          seriesSet.add(result.extractedTitle);
        }
      }
    });

    stats.series = seriesSet.size;
    stats.sagas = sagasSet.size;

    return stats;
  }

  // === MÉTHODES DE GESTION DE LA RÉVISION ===

  setActiveReviewTab(tabId: string): void {
    this.activeReviewTab.set(tabId);
  }

  getTabCount(tabId: string, session: ImportSession): number {
    switch (tabId) {
      case 'movies':
        return session.detectionResults.filter(r => 
          r.detectedType === MediaType.MOVIE
        ).length;
      case 'sagas':
        return new Set(session.detectionResults
          .filter(r => r.detectedType === MediaType.SAGA_MOVIE && r.extractedSagaHint)
          .map(r => r.extractedSagaHint)
        ).size;
      case 'series':
        return new Set(session.detectionResults
          .filter(r => r.detectedType === MediaType.TV_EPISODE)
          .map(r => r.extractedTitle)
        ).size;
      default:
        return 0;
    }
  }

  getMovieResults(session: ImportSession): MediaDetectionResult[] {
    return session.detectionResults.filter(r => 
      r.detectedType === MediaType.MOVIE
    );
  }

  getSagasList(): any[] {
    const session = this.currentImportSession();
    if (!session) return [];

    const sagasMap = new Map<string, any>();
    
    session.detectionResults
      .filter(r => r.detectedType === MediaType.SAGA_MOVIE && r.extractedSagaHint)
      .forEach(result => {
        const sagaName = result.extractedSagaHint!;
        if (!sagasMap.has(sagaName)) {
          sagasMap.set(sagaName, {
            title: sagaName,
            totalMovies: 0,
            movies: []
          });
        }
        const saga = sagasMap.get(sagaName)!;
        saga.totalMovies++;
        saga.movies.push(result);
      });

    return Array.from(sagasMap.values());
  }

  getSagaResults(sagaTitle: string, session: ImportSession): MediaDetectionResult[] {
    return session.detectionResults.filter(r => 
      r.detectedType === MediaType.SAGA_MOVIE && r.extractedSagaHint === sagaTitle
    );
  }

  getSeriesList(): any[] {
    const session = this.currentImportSession();
    if (!session) return [];

    const seriesMap = new Map<string, any>();
    
    session.detectionResults
      .filter(r => r.detectedType === MediaType.TV_EPISODE)
      .forEach(result => {
        const seriesName = result.extractedTitle!;
        if (!seriesMap.has(seriesName)) {
          seriesMap.set(seriesName, {
            title: seriesName,
            totalEpisodes: 0,
            totalSeasons: new Set<number>(),
            episodes: []
          });
        }
        const series = seriesMap.get(seriesName)!;
        series.totalEpisodes++;
        if (result.extractedSeason) {
          series.totalSeasons.add(result.extractedSeason);
        }
        series.episodes.push(result);
      });

    return Array.from(seriesMap.values()).map(series => ({
      ...series,
      totalSeasons: series.totalSeasons.size
    }));
  }

  getSeriesResults(seriesTitle: string, session: ImportSession): MediaDetectionResult[] {
    return session.detectionResults.filter(r => 
      r.detectedType === MediaType.TV_EPISODE && r.extractedTitle === seriesTitle
    );
  }

  // === ACTIONS DE VALIDATION ===

  validateResult(result: MediaDetectionResult): void {
    const session = this.currentImportSession();
    if (!session) return;

    if (!session.validatedResults.includes(result)) {
      session.validatedResults.push(result);
    }
    session.rejectedResults = session.rejectedResults.filter(r => r !== result);
    this.currentImportSession.set({ ...session });
  }

  rejectResult(result: MediaDetectionResult): void {
    const session = this.currentImportSession();
    if (!session) return;

    if (!session.rejectedResults.includes(result)) {
      session.rejectedResults.push(result);
    }
    session.validatedResults = session.validatedResults.filter(r => r !== result);
    this.currentImportSession.set({ ...session });
  }

  editResult(result: MediaDetectionResult): void {
    // TODO: Ouvrir un modal d'édition
    console.log('Édition de:', result);
  }

  validateAllResults(): void {
    const session = this.currentImportSession();
    if (!session) return;

    session.validatedResults = [...session.detectionResults];
    session.rejectedResults = [];
    this.currentImportSession.set({ ...session });
    
    this.addMessage(session, 'info', `${session.validatedResults.length} éléments validés pour l'import`);
  }

  rejectAllResults(): void {
    const session = this.currentImportSession();
    if (!session) return;

    session.rejectedResults = [...session.detectionResults];
    session.validatedResults = [];
    this.currentImportSession.set({ ...session });
    
    this.addMessage(session, 'info', `${session.rejectedResults.length} éléments rejetés`);
  }

  proceedToImport(): void {
    const session = this.currentImportSession();
    if (!session || session.validatedResults.length === 0) return;

    session.status = 'importing';
    session.currentPhase = 'Import en cours...';
    session.overallProgress = 90;
    this.currentImportSession.set({ ...session });

    this.simulateImportProcess(session);
  }

  // === MÉTHODES UTILITAIRES ===

  canCancelImport(session: ImportSession): boolean {
    return ['scanning', 'analyzing', 'reviewing'].includes(session.status);
  }

  cancelImport(): void {
    this.currentImportSession.set(null);
    this.importedCount.set(0);
  }

  startNewImport(): void {
    this.currentImportSession.set(null);
    this.importedCount.set(0);
  }

  getSelectedSource(): MediaSource | undefined {
    const session = this.currentImportSession();
    if (!session) return undefined;
    
    return this.mediaSourceService.sources()
      .find(s => s.id === session.sourceId);
  }

  getImportDuration(session: ImportSession): string {
    const duration = Date.now() - session.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  getRecentMessages(session: ImportSession): ImportMessage[] {
    return session.messages.slice(-10); // 10 derniers messages
  }

  toggleMessageDetails(message: ImportMessage): void {
    // TODO: Implémenter l'affichage des détails
    console.log('Détails du message:', message);
  }

  // === MÉTHODES DE FORMATAGE ===

  formatDate(date: Date | null | undefined): string {
    if (!date) return 'Jamais';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  formatTime(timestamp: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getSourceIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'local': '💾',
      'external': '🔌',
      'network': '🌐',
      'usb': '🔌',
      'nas': '🏠'
    };
    return icons[type] || '📁';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'online': '🟢',
      'offline': '🔴',
      'scanning': '🟡',
      'error': '❌',
      'idle': '⚪',
      'analyzing': '🔍',
      'reviewing': '👀',
      'importing': '📥',
      'completed': '✅'
    };
    return icons[status] || '❓';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'online': 'En ligne',
      'offline': 'Hors ligne',
      'scanning': 'Scan en cours',
      'error': 'Erreur',
      'idle': 'Inactif',
      'analyzing': 'Analyse en cours',
      'reviewing': 'En révision',
      'importing': 'Import en cours',
      'completed': 'Terminé'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'online': '#4CAF50',
      'offline': '#f44336',
      'scanning': '#ff9800',
      'error': '#f44336',
      'idle': '#9e9e9e',
      'analyzing': '#2196F3',
      'reviewing': '#FF9800',
      'importing': '#4CAF50',
      'completed': '#4CAF50'
    };
    return colors[status] || '#666';
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}