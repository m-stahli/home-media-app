// src/app/pages/sources/sources.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaSourceService } from '../../services/media-source.service';
import { MediaSource, SourceStatus } from '../../models/media-source.model';

@Component({
  selector: 'app-sources',
  standalone: true,
  imports: [CommonModule, FormsModule], // Retiré RouterLink car pas utilisé
  template: `
    <div class="sources-page">
      <div class="sources-header">
        <h1>📁 Gestion des sources multimédia</h1>
        <div class="header-actions">
          <button class="btn primary" (click)="showAddSourceModal()">
            ➕ Ajouter une source
          </button>
          <button class="btn" (click)="scanAllSources()" [disabled]="mediaSourceService.activeScanCount() > 0">
            🔄 Scanner tout
          </button>
          <button class="btn" (click)="toggleMonitoring()">
            {{ mediaSourceService.isMonitoring() ? '⏸️ Arrêter' : '▶️ Démarrer' }} monitoring
          </button>
        </div>
      </div>

      <!-- Statistiques globales -->
      <div class="stats-overview">
        <div class="stat-card">
          <h3>📊 Statistiques globales</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <label>Sources totales :</label>
              <span>{{ mediaSourceService.sources().length }}</span>
            </div>
            <div class="stat-item">
              <label>En ligne :</label>
              <span style="color: #4CAF50;">{{ mediaSourceService.onlineSources().length }}</span>
            </div>
            <div class="stat-item">
              <label>Hors ligne :</label>
              <span style="color: #f44336;">{{ mediaSourceService.offlineSources().length }}</span>
            </div>
            <div class="stat-item">
              <label>Médias totaux :</label>
              <span>{{ mediaSourceService.totalMediaCount() }}</span>
            </div>
            <div class="stat-item">
              <label>Scans actifs :</label>
              <span>{{ mediaSourceService.activeScanCount() }}</span>
            </div>
            <div class="stat-item">
              <label>Monitoring :</label>
              <span>{{ mediaSourceService.isMonitoring() ? '✅ Actif' : '❌ Inactif' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste des sources -->
      <div class="sources-list">
        <div *ngFor="let source of mediaSourceService.sources()" class="source-card" [attr.data-status]="source.status">
          <div class="source-header">
            <div class="source-info">
              <h3>
                {{ mediaSourceService.getSourceTypeIcon(source.type) }}
                {{ source.name }}
                <span class="status-badge" [style.background-color]="mediaSourceService.getStatusColor(source.status)">
                  {{ mediaSourceService.getStatusIcon(source.status) }} {{ mediaSourceService.getStatusLabel(source.status) }}
                </span>
              </h3>
              <p class="source-path">📂 {{ source.path }}</p>
            </div>
            <div class="source-actions">
              <button class="action-btn" 
                      (click)="scanSource(source.id)" 
                      [disabled]="source.status === 'scanning'"
                      title="Scanner cette source">
                🔍
              </button>
              <button class="action-btn" (click)="editSource(source)" title="Modifier">
                ✏️
              </button>
              <button class="action-btn danger" (click)="removeSource(source.id)" title="Supprimer">
                🗑️
              </button>
            </div>
          </div>

          <!-- Informations détaillées -->
          <div class="source-details">
            <div class="detail-grid">
              <div class="detail-item">
                <label>Médias :</label>
                <span>{{ source.mediaCount }} fichiers</span>
              </div>
              <div class="detail-item">
                <label>Taille :</label>
                <span>{{ mediaSourceService.formatFileSize(source.totalSize) }}</span>
              </div>
              <div class="detail-item">
                <label>Dernier scan :</label>
                <span>{{ formatDate(source.lastScan) }}</span>
              </div>
              <div class="detail-item">
                <label>Dernière vue :</label>
                <span>{{ formatDate(source.lastSeen) }}</span>
              </div>
              <div class="detail-item">
                <label>Auto-scan :</label>
                <span>{{ source.autoScan ? '✅' : '❌' }}</span>
              </div>
              <div class="detail-item">
                <label>Récursif :</label>
                <span>{{ source.recursive ? '✅' : '❌' }}</span>
              </div>
            </div>

            <!-- Informations du volume -->
            <div *ngIf="source.volumeInfo" class="volume-info">
              <h4>💾 Informations du volume</h4>
              <div class="volume-details">
                <span *ngIf="source.volumeInfo.label">📎 {{ source.volumeInfo.label }}</span>
                <span *ngIf="source.volumeInfo.fileSystem">🗃️ {{ source.volumeInfo.fileSystem }}</span>
                <span *ngIf="source.volumeInfo.totalSpace">
                  💽 {{ mediaSourceService.formatFileSize(source.volumeInfo.totalSpace) }}
                  <small *ngIf="source.volumeInfo.freeSpace">
                    ({{ mediaSourceService.formatFileSize(source.volumeInfo.freeSpace) }} libre)
                  </small>
                </span>
              </div>
            </div>

            <!-- Formats supportés -->
            <div class="supported-formats">
              <h4>🎬 Formats supportés</h4>
              <div class="format-tags">
                <span *ngFor="let format of source.fileTypes" class="format-tag">
                  {{ format.toUpperCase() }}
                </span>
              </div>
            </div>
          </div>

          <!-- Barre de progression du scan -->
          <div *ngIf="getScanProgress(source.id) as progress" class="scan-progress">
            <div class="progress-header">
              <span>{{ progress.status === 'scanning' ? '🔄 Scan en cours...' : '✅ Scan terminé' }}</span>
              <span>{{ progress.progress }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="progress.progress"></div>
            </div>
            <div class="progress-details">
              <span>{{ progress.filesScanned }} / {{ progress.totalFiles }} fichiers</span>
              <span *ngIf="progress.newMediaFound > 0">
                🆕 {{ progress.newMediaFound }} nouveaux médias
              </span>
              <span *ngIf="progress.currentFile">📄 {{ progress.currentFile }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Message si aucune source -->
      <div *ngIf="mediaSourceService.sources().length === 0" class="empty-state">
        <div class="empty-icon">📁</div>
        <h3>Aucune source configurée</h3>
        <p>Ajoutez votre première source pour commencer à gérer vos médias</p>
        <button class="btn primary" (click)="showAddSourceModal()">
          ➕ Ajouter une source
        </button>
      </div>

      <!-- Modal d'ajout de source -->
      <div *ngIf="showAddModal()" class="modal-overlay" (click)="hideAddSourceModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h2>➕ Ajouter une nouvelle source</h2>
          <form (ngSubmit)="addSource()" #sourceForm="ngForm">
            <div class="form-group">
              <label>Nom de la source :</label>
              <input type="text" 
                     [(ngModel)]="newSourceData().name" 
                     (ngModelChange)="updateNewSourceData('name', $event)"
                     name="name" 
                     placeholder="Ex: Disque externe Films"
                     required>
            </div>
            
            <div class="form-group">
              <label>Chemin :</label>
              <input type="text" 
                     [(ngModel)]="newSourceData().path" 
                     (ngModelChange)="updateNewSourceData('path', $event)"
                     name="path" 
                     placeholder="Ex: D:/Movies ou //192.168.1.100/media"
                     required>
            </div>
            
            <div class="form-group">
              <label>Type de source :</label>
              <select [(ngModel)]="newSourceData().type" 
                      (ngModelChange)="updateNewSourceData('type', $event)"
                      name="type">
                <option value="local">💾 Local (disque interne)</option>
                <option value="external">🔌 Externe (USB, disque externe)</option>
                <option value="network">🌐 Réseau (NAS, partage réseau)</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Formats de fichiers (séparés par des virgules) :</label>
              <input type="text" 
                     [value]="newSourceData().fileTypes.join(', ')" 
                     (input)="updateFileTypes($event)"
                     name="fileTypes" 
                     placeholder="mp4, avi, mkv, mp3, flac">
            </div>
            
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" 
                       [(ngModel)]="newSourceData().autoScan" 
                       (ngModelChange)="updateNewSourceData('autoScan', $event)"
                       name="autoScan">
                🔄 Scan automatique (scanner automatiquement quand la source est disponible)
              </label>
            </div>
            
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" 
                       [(ngModel)]="newSourceData().recursive" 
                       (ngModelChange)="updateNewSourceData('recursive', $event)"
                       name="recursive">
                📁 Scan récursif (inclure les sous-dossiers)
              </label>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn" (click)="hideAddSourceModal()">Annuler</button>
              <button type="submit" class="btn primary" [disabled]="!sourceForm.valid">Ajouter</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sources-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .sources-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .sources-header h1 {
      margin: 0;
      color: #333;
      font-size: 2rem;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s ease;
      background: #f5f5f5;
      color: #333;
      text-decoration: none;
      display: inline-block;
      text-align: center;
    }

    .btn.primary {
      background: #4CAF50;
      color: white;
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .stats-overview {
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .stat-card h3 {
      margin: 0 0 1rem 0;
      color: #333;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }

    .stat-item label {
      font-weight: 600;
      color: #666;
    }

    .stat-item span {
      font-weight: bold;
    }

    .sources-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .source-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .source-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }

    .source-card[data-status="offline"] {
      border-left: 4px solid #f44336;
    }

    .source-card[data-status="online"] {
      border-left: 4px solid #4CAF50;
    }

    .source-card[data-status="scanning"] {
      border-left: 4px solid #ff9800;
    }

    .source-card[data-status="outdated"] {
      border-left: 4px solid #ff5722;
    }

    .source-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .source-info h3 {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 1.3rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .source-path {
      margin: 0;
      color: #666;
      font-family: 'Courier New', monospace;
      background: #f8f8f8;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.9rem;
    }

    .status-badge {
      font-size: 0.8rem;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-weight: 600;
      white-space: nowrap;
    }

    .source-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      background: #f5f5f5;
      border: none;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1.2rem;
      transition: all 0.2s ease;
      min-width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .action-btn:hover:not(:disabled) {
      background: #e0e0e0;
      transform: scale(1.05);
    }

    .action-btn.danger:hover {
      background: #ffebee;
      color: #f44336;
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .source-details {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.5rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-item label {
      font-weight: 600;
      color: #666;
    }

    .volume-info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
    }

    .volume-info h4 {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 1rem;
    }

    .volume-details {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.9rem;
    }

    .volume-details span {
      background: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }

    .volume-details small {
      color: #666;
      font-size: 0.8rem;
    }

    .supported-formats h4 {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 1rem;
    }

    .format-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .format-tag {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .scan-progress {
      margin-top: 1rem;
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      transition: width 0.3s ease;
      border-radius: 4px;
    }

    .progress-details {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.9rem;
      color: #666;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: #666;
    }

    .empty-icon {
      font-size: 6rem;
      margin-bottom: 2rem;
    }

    .empty-state h3 {
      margin: 0 0 1rem 0;
      color: #333;
    }

    .empty-state p {
      margin: 0 0 2rem 0;
      font-size: 1.1rem;
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
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-content h2 {
      margin: 0 0 2rem 0;
      color: #333;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s ease;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #4CAF50;
    }

    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .checkbox-group input[type="checkbox"] {
      width: auto;
      margin: 0;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;
    }

    @media (max-width: 768px) {
      .sources-page {
        padding: 1rem;
      }

      .sources-header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-actions {
        justify-content: center;
      }

      .source-header {
        flex-direction: column;
        gap: 1rem;
      }

      .source-actions {
        justify-content: center;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }

      .volume-details {
        flex-direction: column;
        gap: 0.5rem;
      }

      .progress-details {
        flex-direction: column;
        gap: 0.5rem;
      }

      .modal-overlay {
        padding: 1rem;
      }

      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class SourcesComponent {
  mediaSourceService = inject(MediaSourceService);
  
  showAddModal = signal(false);
  newSourceData = signal({
    name: '',
    path: '',
    type: 'local' as 'local' | 'external' | 'network',
    autoScan: true,
    recursive: true,
    fileTypes: ['mp4', 'avi', 'mkv', 'mp3', 'flac']
  });

  showAddSourceModal(): void {
    this.showAddModal.set(true);
  }

  hideAddSourceModal(): void {
    this.showAddModal.set(false);
    // Reset form
    this.newSourceData.set({
      name: '',
      path: '',
      type: 'local',
      autoScan: true,
      recursive: true,
      fileTypes: ['mp4', 'avi', 'mkv', 'mp3', 'flac']
    });
  }

  updateNewSourceData(field: string, value: any): void {
    this.newSourceData.update(data => ({ ...data, [field]: value }));
  }

  async addSource(): Promise<void> {
    const sourceData = this.newSourceData();
    
    try {
      await this.mediaSourceService.addSource(sourceData);
      this.hideAddSourceModal();
      alert(`✅ Source "${sourceData.name}" ajoutée avec succès !`);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la source:', error);
      alert('❌ Erreur lors de l\'ajout de la source');
    }
  }

  updateFileTypes(event: Event): void {
    const target = event.target as HTMLInputElement;
    const fileTypes = target.value
      .split(',')
      .map(type => type.trim().toLowerCase())
      .filter(type => type.length > 0);
    
    this.updateNewSourceData('fileTypes', fileTypes);
  }

  scanSource(sourceId: string): void {
    this.mediaSourceService.scanSource(sourceId);
  }

  async scanAllSources(): Promise<void> {
    await this.mediaSourceService.scanAllSources();
  }

  toggleMonitoring(): void {
    if (this.mediaSourceService.isMonitoring()) {
      this.mediaSourceService.stopVolumeMonitoring();
    } else {
      this.mediaSourceService.startVolumeMonitoring();
    }
  }

  editSource(source: MediaSource): void {
    // TODO: Implémenter l'édition
    console.log('Éditer la source:', source);
    alert(`✏️ Édition de "${source.name}" - À implémenter`);
  }

  removeSource(sourceId: string): void {
    const source = this.mediaSourceService.sources().find(s => s.id === sourceId);
    if (source && confirm(`Êtes-vous sûr de vouloir supprimer la source "${source.name}" ?`)) {
      this.mediaSourceService.removeSource(sourceId);
      alert(`🗑️ Source "${source.name}" supprimée`);
    }
  }

  getScanProgress(sourceId: string) {
    return this.mediaSourceService.scanProgress().get(sourceId);
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Jamais';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
      return 'Il y a moins d\'1h';
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(date);
    }
  }
}