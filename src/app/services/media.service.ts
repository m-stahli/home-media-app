// src/app/services/media.service.ts
import { Injectable, signal, computed } from '@angular/core';

// Interface simplifiée temporaire
interface MediaItem {
  id: string;
  title: string;
  type: 'video' | 'audio';
  url: string;
  thumbnail?: string;
  duration: number;
  size: number;
  format: string;
  dateAdded: Date;
  tags: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  // Signals pour Angular 17+
  private mediaItemsSignal = signal<MediaItem[]>([]);
  private currentMediaSignal = signal<MediaItem | null>(null);
  private loadingSignal = signal<boolean>(false);
  
  // Computed signals
  mediaItems = this.mediaItemsSignal.asReadonly();
  currentMedia = this.currentMediaSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();
  
  videoCount = computed(() => this.mediaItems().filter(m => m.type === 'video').length);
  audioCount = computed(() => this.mediaItems().filter(m => m.type === 'audio').length);
  totalCount = computed(() => this.mediaItems().length);
  recentMedia = computed(() => this.mediaItems().slice(-6));

  constructor() {
    this.loadSampleData();
  }

  private loadSampleData(): void {
    const sampleMedia: MediaItem[] = [
      {
        id: '1',
        title: 'Big Buck Bunny',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnail: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
        duration: 596,
        size: 158000000,
        format: 'mp4',
        dateAdded: new Date(),
        tags: ['animation', 'court-métrage']
      },
      {
        id: '2',
        title: 'Elephant Dream',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnail: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg',
        duration: 653,
        size: 140000000,
        format: 'mp4',
        dateAdded: new Date(),
        tags: ['animation', 'sci-fi']
      }
    ];
    
    this.mediaItemsSignal.set(sampleMedia);
  }

  // Méthodes principales
  setCurrentMedia(media: MediaItem): void {
    this.currentMediaSignal.set(media);
  }

  getMediaById(id: string): MediaItem | undefined {
    return this.mediaItems().find(item => item.id === id);
  }

  searchMedia(query: string): MediaItem[] {
    const searchTerm = query.toLowerCase();
    return this.mediaItems().filter(item =>
      item.title.toLowerCase().includes(searchTerm) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  filterByType(type: 'video' | 'audio'): MediaItem[] {
    return this.mediaItems().filter(item => item.type === type);
  }
}