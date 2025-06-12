// src/app/services/media-source.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { MediaSource, SourceStatus, ScanProgress } from '../models/media-source.model';

@Injectable({
  providedIn: 'root'
})
export class MediaSourceService {
  private sourcesSignal = signal<MediaSource[]>([]);
  private scanProgressSignal = signal<Map<string, ScanProgress>>(new Map());
  private isMonitoringSignal = signal<boolean>(false);

  sources = this.sourcesSignal.asReadonly();
  scanProgress = this.scanProgressSignal.asReadonly();
  isMonitoring = this.isMonitoringSignal.asReadonly();

  // Computed values
  onlineSources = computed(() => 
    this.sources().filter(s => s.status === SourceStatus.ONLINE)
  );
  
  offlineSources = computed(() => 
    this.sources().filter(s => s.status === SourceStatus.OFFLINE)
  );
  
  totalMediaCount = computed(() => 
    this.sources().reduce((sum, s) => sum + s.mediaCount, 0)
  );

  activeScanCount = computed(() => 
    Array.from(this.scanProgress().values())
      .filter(p => p.status === 'scanning').length
  );

  constructor() {
    this.loadSampleSources();
    this.startVolumeMonitoring();
  }

  private loadSampleSources(): void {
    const sampleSources: MediaSource[] = [
      {
        id: '1',
        name: 'Disque principal (C:)',
        path: 'C:/Users/Media/Videos',
        type: 'local',
        status: SourceStatus.ONLINE,
        lastScan: new Date(Date.now() - 86400000), // Il y a 1 jour
        lastSeen: new Date(),
        mediaCount: 125,
        totalSize: 850000000000, // 850 GB
        isWatched: true,
        autoScan: true,
        recursive: true,
        fileTypes: ['mp4', 'avi', 'mkv', 'mov'],
        volumeInfo: {
          label: 'Windows (C:)',
          serialNumber: 'ABC123',
          fileSystem: 'NTFS',
          totalSpace: 1000000000000,
          freeSpace: 150000000000
        }
      },
      {
        id: '2',
        name: 'Disque externe Films',
        path: 'E:/Movies',
        type: 'external',
        status: SourceStatus.OFFLINE,
        lastScan: new Date(Date.now() - 172800000), // Il y a 2 jours
        lastSeen: new Date(Date.now() - 43200000), // Il y a 12h
        mediaCount: 87,
        totalSize: 2000000000000, // 2 TB
        isWatched: true,
        autoScan: true,
        recursive: true,
        fileTypes: ['mp4', 'mkv', 'avi'],
        volumeInfo: {
          label: 'Movies_HD',
          serialNumber: 'DEF456',
          fileSystem: 'exFAT'
        }
      },
      {
        id: '3',
        name: 'NAS Musique',
        path: '//192.168.1.100/music',
        type: 'network',
        status: SourceStatus.ONLINE,
        lastScan: new Date(Date.now() - 604800000), // Il y a 1 semaine
        lastSeen: new Date(),
        mediaCount: 3450,
        totalSize: 500000000000, // 500 GB
        isWatched: true,
        autoScan: false,
        recursive: true,
        fileTypes: ['mp3', 'flac', 'wav', 'm4a']
      },
      {
        id: '4',
        name: 'USB Séries TV',
        path: 'F:/TV Shows',
        type: 'external',
        status: SourceStatus.OUTDATED,
        lastScan: new Date(Date.now() - 1209600000), // Il y a 2 semaines
        lastSeen: new Date(),
        mediaCount: 234,
        totalSize: 1500000000000, // 1.5 TB
        isWatched: true,
        autoScan: true,
        recursive: true,
        fileTypes: ['mp4', 'mkv'],
        volumeInfo: {
          label: 'TV_SHOWS',
          serialNumber: 'GHI789'
        }
      }
    ];

    this.sourcesSignal.set(sampleSources);
  }

  // Gestion des sources
  addSource(sourceData: Partial<MediaSource>): Promise<MediaSource> {
    return new Promise((resolve) => {
      const newSource: MediaSource = {
        id: Date.now().toString(),
        name: sourceData.name || 'Nouvelle source',
        path: sourceData.path || '',
        type: sourceData.type || 'local',
        status: SourceStatus.PENDING,
        mediaCount: 0,
        totalSize: 0,
        isWatched: false,
        autoScan: true,
        recursive: true,
        fileTypes: sourceData.fileTypes || ['mp4', 'avi', 'mkv', 'mp3', 'flac'],
        ...sourceData
      };

      this.sourcesSignal.update(sources => [...sources, newSource]);
      resolve(newSource);
    });
  }

  updateSource(id: string, updates: Partial<MediaSource>): void {
    this.sourcesSignal.update(sources =>
      sources.map(source =>
        source.id === id ? { ...source, ...updates } : source
      )
    );
  }

  removeSource(id: string): void {
    this.sourcesSignal.update(sources =>
      sources.filter(source => source.id !== id)
    );
  }

  // Scan et monitoring
  async scanSource(sourceId: string): Promise<void> {
    const source = this.sources().find(s => s.id === sourceId);
    if (!source) return;

    // Vérifier la disponibilité
    const isAvailable = await this.checkSourceAvailability(source);
    if (!isAvailable) {
      this.updateSource(sourceId, { status: SourceStatus.OFFLINE });
      return;
    }

    // Démarrer le scan
    this.updateSource(sourceId, { status: SourceStatus.SCANNING });
    
    const progress: ScanProgress = {
      sourceId,
      status: 'scanning',
      progress: 0,
      filesScanned: 0,
      totalFiles: 0,
      newMediaFound: 0,
      errors: [],
      startTime: new Date()
    };

    this.updateScanProgress(sourceId, progress);

    // Simulation du scan
    await this.simulateScan(sourceId, progress);
  }

  private async simulateScan(sourceId: string, progress: ScanProgress): Promise<void> {
    const totalFiles = Math.floor(Math.random() * 500) + 100;
    progress.totalFiles = totalFiles;

    for (let i = 0; i <= totalFiles; i++) {
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulation
      
      progress.filesScanned = i;
      progress.progress = Math.floor((i / totalFiles) * 100);
      progress.currentFile = `file_${i}.mp4`;
      
      if (Math.random() < 0.1) { // 10% chance de nouveau média
        progress.newMediaFound++;
      }

      this.updateScanProgress(sourceId, { ...progress });
    }

    // Finaliser le scan
    this.updateSource(sourceId, {
      status: SourceStatus.ONLINE,
      lastScan: new Date(),
      lastSeen: new Date(),
      mediaCount: Math.floor(Math.random() * 200) + 50
    });

    progress.status = 'completed';
    this.updateScanProgress(sourceId, progress);
  }

  async scanAllSources(): Promise<void> {
    const availableSources = this.sources().filter(s => 
      s.status === SourceStatus.ONLINE || s.status === SourceStatus.OUTDATED
    );

    for (const source of availableSources) {
      if (source.autoScan) {
        await this.scanSource(source.id);
      }
    }
  }

  async checkSourceAvailability(source: MediaSource): Promise<boolean> {
    // Simulation - en réalité, cela ferait un appel API au backend
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulation : 90% de chance d'être disponible pour les sources locales
        const isAvailable = source.type === 'local' ? 
          Math.random() > 0.1 : Math.random() > 0.3;
        resolve(isAvailable);
      }, 1000);
    });
  }

  // Monitoring des volumes
  startVolumeMonitoring(): void {
    if (this.isMonitoring()) return;
    
    this.isMonitoringSignal.set(true);
    this.monitorVolumes();
  }

  stopVolumeMonitoring(): void {
    this.isMonitoringSignal.set(false);
  }

  private async monitorVolumes(): Promise<void> {
    if (!this.isMonitoring()) return;

    // Vérifier périodiquement la disponibilité des sources
    for (const source of this.sources()) {
      if (source.type === 'external') {
        const isAvailable = await this.checkSourceAvailability(source);
        
        if (isAvailable && source.status === SourceStatus.OFFLINE) {
          // Disque reconnecté !
          this.updateSource(source.id, { 
            status: SourceStatus.OUTDATED,
            lastSeen: new Date()
          });
          
          // Auto-scan si activé
          if (source.autoScan) {
            setTimeout(() => this.scanSource(source.id), 2000);
          }
        } else if (!isAvailable && source.status === SourceStatus.ONLINE) {
          // Disque déconnecté
          this.updateSource(source.id, { 
            status: SourceStatus.OFFLINE
          });
        }
      }
    }

    // Répéter dans 30 secondes
    setTimeout(() => this.monitorVolumes(), 30000);
  }

  private updateScanProgress(sourceId: string, progress: Partial<ScanProgress>): void {
    this.scanProgressSignal.update(progressMap => {
      const newMap = new Map(progressMap);
      const currentProgress = newMap.get(sourceId) || {
        sourceId,
        status: 'idle',
        progress: 0,
        filesScanned: 0,
        totalFiles: 0,
        newMediaFound: 0,
        errors: []
      };
      
      newMap.set(sourceId, { ...currentProgress, ...progress });
      return newMap;
    });
  }

  // Utilitaires
  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getStatusColor(status: SourceStatus): string {
    const colors = {
      [SourceStatus.ONLINE]: '#4CAF50',
      [SourceStatus.OFFLINE]: '#f44336',
      [SourceStatus.SCANNING]: '#ff9800',
      [SourceStatus.ERROR]: '#f44336',
      [SourceStatus.PENDING]: '#9e9e9e',
      [SourceStatus.OUTDATED]: '#ff5722'
    };
    return colors[status];
  }

  getStatusIcon(status: SourceStatus): string {
    const icons = {
      [SourceStatus.ONLINE]: '✅',
      [SourceStatus.OFFLINE]: '❌',
      [SourceStatus.SCANNING]: '🔄',
      [SourceStatus.ERROR]: '⚠️',
      [SourceStatus.PENDING]: '⏳',
      [SourceStatus.OUTDATED]: '🔄'
    };
    return icons[status];
  }

  getStatusLabel(status: SourceStatus): string {
    const labels = {
      [SourceStatus.ONLINE]: 'En ligne',
      [SourceStatus.OFFLINE]: 'Hors ligne',
      [SourceStatus.SCANNING]: 'Scan en cours',
      [SourceStatus.ERROR]: 'Erreur',
      [SourceStatus.PENDING]: 'En attente',
      [SourceStatus.OUTDATED]: 'À mettre à jour'
    };
    return labels[status];
  }

  getSourceTypeIcon(type: 'local' | 'external' | 'network'): string {
    const icons = {
      'local': '💾',
      'external': '🔌',
      'network': '🌐'
    };
    return icons[type];
  }
}