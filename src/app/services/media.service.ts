// src/app/services/media.service.ts - CORRECTION CRITIQUE DE LA PURGE
import { Injectable, signal, computed } from '@angular/core';
import { MediaDetectionResult, MediaType } from './media-detection.service';

export interface MediaItem {
  id: string;
  title: string;
  type: 'video' | 'audio';
  url: string;
  thumbnail?: string;
  duration: number;
  size: number;
  format: string;
  dateAdded: Date;
  lastPlayed?: Date;
  tags: string[];
  description?: string;
  originalFilename?: string;
  sourcePath?: string;
  sourceId?: string;
  confidence?: number;
  seriesInfo?: {
    seriesTitle: string;
    seasonNumber: number;
    episodeNumber: number;
    episodeTitle?: string;
  };
  sagaInfo?: {
    sagaTitle: string;
    movieNumber?: number;
    phase?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  // ✅ Signals principaux
  private mediaItemsSignal = signal<MediaItem[]>([]);
  private currentMediaSignal = signal<MediaItem | null>(null);
  private loadingSignal = signal<boolean>(false);
  private isInitialized = false;

  // ✅ Signals en lecture seule
  mediaItems = this.mediaItemsSignal.asReadonly();
  currentMedia = this.currentMediaSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();

  // ✅ Computed signals optimisés (pas de side effects)
  videoCount = computed(() => this.mediaItemsSignal().filter(m => m.type === 'video').length);
  audioCount = computed(() => this.mediaItemsSignal().filter(m => m.type === 'audio').length);
  totalCount = computed(() => this.mediaItemsSignal().length);
  recentMedia = computed(() => {
    return this.mediaItemsSignal()
      .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
      .slice(0, 6);
  });

  constructor() {
    console.log('🚀 Initialisation MediaService...');
    this.initializeService();
  }

  private initializeService(): void {
    try {
      if (this.isInitialized) {
        console.log('⚠️ Service déjà initialisé');
        return;
      }

      console.log('📂 Chargement depuis localStorage...');
      this.loadFromStorage();
      
      if (this.mediaItemsSignal().length === 0) {
        console.log('📝 Chargement des données d\'exemple...');
        this.loadSampleData();
      }
      
      this.isInitialized = true;
      console.log('✅ MediaService initialisé avec', this.mediaItemsSignal().length, 'médias');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
    }
  }

  private loadSampleData(): void {
    const sampleMedia: MediaItem[] = [
      {
        id: 'sample-1',
        title: 'Big Buck Bunny',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnail: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
        duration: 596,
        size: 158000000,
        format: 'mp4',
        dateAdded: new Date(Date.now() - 86400000),
        tags: ['animation', 'court-métrage']
      },
      {
        id: 'sample-2',
        title: 'Elephant Dream',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnail: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg',
        duration: 653,
        size: 140000000,
        format: 'mp4',
        dateAdded: new Date(Date.now() - 172800000),
        tags: ['animation', 'sci-fi']
      }
    ];
    
    this.mediaItemsSignal.set(sampleMedia);
    console.log('📝 Données d\'exemple chargées:', sampleMedia.length);
  }

 /**
 * ✅ Stats SANS computed (accès direct au signal)
 */
getPurgeStats() {
  try {
    // ✅ Accès DIRECT au signal (pas via computed)
    const allMedia = this.mediaItemsSignal();
    const imported = allMedia.filter(m => m.sourceId && m.sourceId !== 'sample');
    const samples = allMedia.filter(m => !m.sourceId || m.sourceId === 'sample');
    
    const sourceStats: Record<string, number> = {};
    imported.forEach(m => {
      if (m.sourceId && m.sourceId !== 'sample') {
        sourceStats[m.sourceId] = (sourceStats[m.sourceId] || 0) + 1;
      }
    });
    
    return {
      total: allMedia.length,
      imported: imported.length,
      samples: samples.length,
      // ✅ Calcul direct, PAS via this.videoCount()
      videos: allMedia.filter(m => m.type === 'video').length,
      audios: allMedia.filter(m => m.type === 'audio').length,
      bySource: sourceStats
    };
  } catch (error) {
    console.error('❌ Erreur dans getPurgeStats:', error);
    return {
      total: 0, imported: 0, samples: 0, videos: 0, audios: 0, bySource: {}
    };
  }
}

/**
 * ✅ Purge des médias importés SANS boucle
 */
clearImportedMedia(): void {
  try {
    console.log('🔍 Début clearImportedMedia');
    
    // ✅ Accès DIRECT au signal
    const currentMedia = this.mediaItemsSignal();
    console.log('📊 Médias avant:', currentMedia.length);
    
    // ✅ Garder seulement les échantillons
    const samples = currentMedia.filter(m => !m.sourceId || m.sourceId === 'sample');
    console.log('📊 Échantillons conservés:', samples.length);
    
    // ✅ Mise à jour atomique
    this.mediaItemsSignal.set(samples);
    this.saveToStorage();
    
    console.log('✅ clearImportedMedia terminé');
  } catch (error) {
    console.error('❌ Erreur dans clearImportedMedia:', error);
  }
}

/**
 * ✅ Purge complète SANS boucle
 */
clearAllMedia(): void {
  try {
    console.log('🔍 Début clearAllMedia');
    // ✅ Mise à jour directe
    this.mediaItemsSignal.set([]);
    this.saveToStorage();
    console.log('✅ clearAllMedia terminé');
  } catch (error) {
    console.error('❌ Erreur dans clearAllMedia:', error);
  }
}

/**
 * ✅ Purge par source SANS boucle
 */
clearMediaFromSource(sourceId: string): void {
  try {
    console.log('🔍 Début clearMediaFromSource:', sourceId);
    
    // ✅ Accès DIRECT au signal
    const currentMedia = this.mediaItemsSignal();
    const filtered = currentMedia.filter(m => m.sourceId !== sourceId);
    
    console.log(`📊 Médias filtrés: ${currentMedia.length} -> ${filtered.length}`);
    
    // ✅ Mise à jour atomique
    this.mediaItemsSignal.set(filtered);
    this.saveToStorage();
    
    console.log('✅ clearMediaFromSource terminé');
  } catch (error) {
    console.error('❌ Erreur dans clearMediaFromSource:', error);
  }
}

/**
 * ✅ Purge par type SANS boucle
 */
clearMediaByType(type: 'video' | 'audio'): void {
  try {
    console.log('🔍 Début clearMediaByType:', type);
    
    // ✅ Accès DIRECT au signal
    const currentMedia = this.mediaItemsSignal();
    const filtered = currentMedia.filter(m => m.type !== type);
    
    console.log(`📊 Médias filtrés: ${currentMedia.length} -> ${filtered.length}`);
    
    // ✅ Mise à jour atomique
    this.mediaItemsSignal.set(filtered);
    this.saveToStorage();
    
    console.log('✅ clearMediaByType terminé');
  } catch (error) {
    console.error('❌ Erreur dans clearMediaByType:', error);
  }
}

  // ✅ MÉTHODES UTILITAIRES SÉCURISÉES

  private saveToStorage(): void {
    try {
      const mediaData = this.mediaItemsSignal();
      localStorage.setItem('homeMediaApp_mediaItems', JSON.stringify(mediaData));
      console.log('💾 Sauvegarde effectuée:', mediaData.length, 'médias');
    } catch (error) {
      console.warn('❌ Erreur lors de la sauvegarde:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const savedData = localStorage.getItem('homeMediaApp_mediaItems');
      if (savedData) {
        const mediaItems = JSON.parse(savedData);
        const processedItems = mediaItems.map((item: any) => ({
          ...item,
          dateAdded: new Date(item.dateAdded),
          lastPlayed: item.lastPlayed ? new Date(item.lastPlayed) : undefined
        }));
        this.mediaItemsSignal.set(processedItems);
        console.log('📂 Chargement effectué:', processedItems.length, 'médias');
      }
    } catch (error) {
      console.warn('❌ Erreur lors du chargement:', error);
    }
  }

  // ✅ MÉTHODES PUBLIQUES (conservées pour compatibilité)

  removeMedia(id: string): void {
    try {
      const currentMedia = this.mediaItemsSignal();
      const filtered = currentMedia.filter(m => m.id !== id);
      this.mediaItemsSignal.set(filtered);
      this.saveToStorage();
      console.log('🗑️ Média supprimé:', id);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
    }
  }

  updateMedia(id: string, updates: Partial<MediaItem>): void {
    try {
      const currentMedia = this.mediaItemsSignal();
      const updatedMedia = currentMedia.map(media => 
        media.id === id ? { ...media, ...updates } : media
      );
      this.mediaItemsSignal.set(updatedMedia);
      this.saveToStorage();
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
    }
  }

  addMedia(mediaItem: MediaItem): void {
    try {
      const currentMedia = this.mediaItemsSignal();
      this.mediaItemsSignal.set([...currentMedia, mediaItem]);
      this.saveToStorage();
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout:', error);
    }
  }

  setCurrentMedia(media: MediaItem): void {
    this.currentMediaSignal.set(media);
    this.updateMedia(media.id, { lastPlayed: new Date() });
  }

  getMediaById(id: string): MediaItem | undefined {
    return this.mediaItemsSignal().find(item => item.id === id);
  }

  searchMedia(query: string): MediaItem[] {
    const searchTerm = query.toLowerCase();
    return this.mediaItemsSignal().filter(item =>
      item.title.toLowerCase().includes(searchTerm) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      item.originalFilename?.toLowerCase().includes(searchTerm)
    );
  }

  filterByType(type: 'video' | 'audio'): MediaItem[] {
    return this.mediaItemsSignal().filter(item => item.type === type);
  }

  // ✅ IMPORT (version simplifiée et sécurisée)
  
  importDetectedMedia(detectionResults: MediaDetectionResult[], sourceId: string, sourcePath: string): MediaItem[] {
    try {
      const importedMedia: MediaItem[] = [];
      
      detectionResults.forEach(result => {
        const mediaItem = this.createMediaItemFromDetection(result, sourceId, sourcePath);
        importedMedia.push(mediaItem);
      });
      
      const currentMedia = this.mediaItemsSignal();
      const existing = new Set(currentMedia.map(m => m.originalFilename));
      const newItems = importedMedia.filter(item => !existing.has(item.originalFilename));
      
      this.mediaItemsSignal.set([...currentMedia, ...newItems]);
      this.saveToStorage();
      
      console.log(`✅ Import terminé : ${newItems.length} médias ajoutés`);
      return newItems;
    } catch (error) {
      console.error('❌ Erreur lors de l\'import:', error);
      return [];
    }
  }

  private createMediaItemFromDetection(result: MediaDetectionResult, sourceId: string, sourcePath: string): MediaItem {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const isVideo = this.isVideoFile(result.originalFilename);
    const fileExtension = this.getFileExtension(result.originalFilename);
    
    return {
      id,
      title: result.extractedTitle,
      type: isVideo ? 'video' : 'audio',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnail: isVideo ? this.generateVideoPlaceholder(result.originalFilename) : undefined,
      duration: isVideo ? Math.floor(Math.random() * 7200) + 1800 : Math.floor(Math.random() * 300) + 180,
      size: isVideo ? 1500000000 : 50000000,
      format: fileExtension,
      dateAdded: new Date(),
      tags: this.generateTags(result),
      originalFilename: result.originalFilename,
      sourcePath,
      sourceId
    };
  }

  private isVideoFile(filename: string): boolean {
    const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg'];
    const extension = this.getFileExtension(filename).toLowerCase();
    return videoExtensions.includes(extension);
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop() || '';
  }

  private generateTags(result: MediaDetectionResult): string[] {
    const tags: string[] = [];
    
    switch (result.detectedType) {
      case MediaType.MOVIE:
        tags.push('film', 'cinéma');
        break;
      case MediaType.SAGA_MOVIE:
        tags.push('film', 'saga');
        break;
      case MediaType.TV_EPISODE:
        tags.push('série', 'épisode');
        break;
    }
    
    return tags;
  }

  private generateVideoPlaceholder(filename: string): string {
    const title = filename.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' ');
    const shortTitle = title.length > 25 ? title.substring(0, 25) + '...' : title;
    
    const svg = `
      <svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="300" height="200" fill="url(#bg)"/>
        <circle cx="150" cy="80" r="30" fill="rgba(255,255,255,0.2)"/>
        <polygon points="135,65 135,95 170,80" fill="white"/>
        <text x="150" y="130" fill="white" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" font-weight="bold">
          ${shortTitle}
        </text>
        <text x="150" y="150" fill="rgba(255,255,255,0.8)" text-anchor="middle" font-size="11" font-family="Arial, sans-serif">
          Fichier importé
        </text>
      </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }
}