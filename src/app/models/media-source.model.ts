// src/app/models/media-source.model.ts
export interface MediaSource {
  id: string;
  name: string;
  path: string;
  type: 'local' | 'external' | 'network';
  status: SourceStatus;
  lastScan?: Date;
  lastSeen?: Date;
  mediaCount: number;
  totalSize: number;
  isWatched: boolean;
  autoScan: boolean;
  recursive: boolean;
  fileTypes: string[];
  // Métadonnées du disque/volume
  volumeInfo?: VolumeInfo;
}

export interface VolumeInfo {
  label?: string;
  serialNumber?: string;
  fileSystem?: string;
  totalSpace?: number;
  freeSpace?: number;
  mountPoint?: string;
}

export enum SourceStatus {
  ONLINE = 'online',           // Accessible et opérationnel
  OFFLINE = 'offline',         // Disque/réseau déconnecté
  SCANNING = 'scanning',       // Scan en cours
  ERROR = 'error',            // Erreur d'accès
  PENDING = 'pending',        // En attente de scan
  OUTDATED = 'outdated'       // Nécessite un rescan
}

export interface ScanProgress {
  sourceId: string;
  status: 'idle' | 'scanning' | 'completed' | 'error';
  progress: number; // 0-100
  currentFile?: string;
  filesScanned: number;
  totalFiles: number;
  newMediaFound: number;
  errors: string[];
  startTime?: Date;
  estimatedTimeRemaining?: number;
}