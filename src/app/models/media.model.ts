// src/app/services/media-detection.service.ts - Version corrigée
import { Injectable, signal, computed } from '@angular/core';

// Types temporaires pour éviter les erreurs d'import
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
  mediaType?: MediaType;
  seriesInfo?: SeriesInfo;
  sagaInfo?: SagaInfo;
  movieInfo?: MovieInfo;
}

export enum MediaType {
  MOVIE = 'movie',
  SAGA_MOVIE = 'saga_movie',
  TV_EPISODE = 'tv_episode',
  TV_SPECIAL = 'tv_special',
  DOCUMENTARY = 'documentary',
  MUSIC_VIDEO = 'music_video',
  AUDIO_TRACK = 'audio_track',
  AUDIO_ALBUM = 'audio_album',
  OTHER = 'other'
}

export interface SeriesInfo {
  seriesId: string;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle?: string;
  airDate?: Date;
  seriesThumbnail?: string;
  seasonThumbnail?: string;
  totalSeasons?: number;
  totalEpisodes?: number;
  isSpecial?: boolean;
  network?: string;
}

export interface SagaInfo {
  sagaId: string;
  sagaTitle: string;
  movieNumber: number;
  movieTitle: string;
  releaseOrder?: number;
  chronologicalOrder?: number;
  phase?: string;
  totalMovies?: number;
  sagaThumbnail?: string;
  phaseThumbnail?: string;
  isMainTimeline?: boolean;
  connections?: string[];
  watchOrder?: 'release' | 'chronological' | 'custom';
}

export interface MovieInfo {
  movieId: string;
  releaseDate?: Date;
  isStandalone: boolean;
  budget?: number;
  boxOffice?: number;
  studio?: string;
  franchise?: string;
}

export interface Series {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  totalSeasons: number;
  totalEpisodes: number;
  status: 'ongoing' | 'completed' | 'cancelled' | 'hiatus';
  firstAired?: Date;
  lastAired?: Date;
  network?: string;
  genre?: string[];
  episodes: MediaItem[];
  seasons: Season[];
  spinoffs?: string[];
  universe?: string;
}

export interface Season {
  seasonNumber: number;
  seasonTitle?: string;
  episodeCount: number;
  thumbnail?: string;
  airDate?: Date;
  finaleDate?: Date;
  episodes: MediaItem[];
  isSpecialSeason?: boolean;
}

export interface Saga {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  totalMovies: number;
  completedMovies: number;
  status: 'ongoing' | 'completed' | 'cancelled' | 'planned';
  firstMovie?: Date;
  lastMovie?: Date;
  studio?: string;
  genre?: string[];
  movies: MediaItem[];
  phases: SagaPhase[];
  watchOrders: WatchOrder[];
  universe?: string;
}

export interface SagaPhase {
  phaseNumber: number;
  phaseTitle: string;
  description?: string;
  movieCount: number;
  thumbnail?: string;
  startDate?: Date;
  endDate?: Date;
  movies: MediaItem[];
}

export interface WatchOrder {
  id: string;
  title: string;
  description?: string;
  isRecommended: boolean;
  movies: {
    movieId: string;
    order: number;
    note?: string;
  }[];
}

export interface MediaDetectionResult {
  originalFilename: string;
  detectedType: MediaType;
  confidence: number;
  extractedTitle: string;
  extractedYear?: number;
  extractedSeason?: number;
  extractedEpisode?: number;
  extractedEpisodeTitle?: string;
  extractedSagaHint?: string;
  extractedSequenceNumber?: number;
  extractedPhaseHint?: string;
  detectionPattern: DetectionPattern;
  suggestedGrouping?: GroupingSuggestion;
}

export interface DetectionPattern {
  pattern: string;
  type: 'series' | 'movie' | 'saga' | 'standalone';
  examples: string[];
}

export interface GroupingSuggestion {
  groupType: 'series' | 'saga' | 'standalone';
  groupTitle: string;
  groupId?: string;
  confidence: number;
  similarFiles: string[];
  suggestedPhase?: string;
  suggestedOrder?: number;
}

// Patterns de détection
const FILENAME_PATTERNS = {
  TV_SERIES: [
    /^(.+?)[.\s]S(\d{1,2})E(\d{1,2})[.\s]*(.*)$/i,
    /^(.+?)[.\s](\d{1,2})x(\d{1,2})[.\s]*(.*)$/i,
    /^(.+?)[.\s]Season[.\s](\d{1,2})[.\s]Episode[.\s](\d{1,2})/i,
    /^(.+?)[.\s]\[S(\d{1,2})E(\d{1,2})\]/i,
  ],
  
  MOVIES: [
    /^(.+?)[.\s]\((\d{4})\)/i,
    /^(.+?)[.\s](\d{4})[.\s]/i,
    /^(.+?)[.\s]\[(\d{4})\]/i,
  ],
  
  SAGAS: [
    /^(.+?)[.\s](\d{1,2})[.\s]*[-–][.\s]*(.+)$/i,
    /^(.+?)[.\s](\d{1,2})[.\s]*[:][.\s]*(.+)$/i,
    /^(.+?)[.\s]Part[.\s](\d{1,2})[.\s]*[-–]?[.\s]*(.*)$/i,
    /^(.+?)[.\s]Volume[.\s](\d{1,2})[.\s]*[-–]?[.\s]*(.*)$/i,
    /^(.+?)[.\s]Chapter[.\s](\d{1,2})[.\s]*[-–]?[.\s]*(.*)$/i,
    /^(.+?)[.\s]Episode[.\s](\d{1,2})[.\s]*[-–]?[.\s]*(.*)$/i,
    /^(.+?)[.\s]Phase[.\s](\d{1,2})[.\s]*[-–]?[.\s]*(.*)$/i,
    /^(.*Marvel.*|.*MCU.*|.*Avengers.*)/i,
    /^(.*Star Wars.*|.*SW.*)/i,
    /^(.*Fast.*Furious.*|.*F&F.*)/i,
    /^(.*Harry Potter.*|.*HP.*)/i,
  ]
};

const TYPE_KEYWORDS = {
  SERIES: ['season', 'episode', 'pilot', 'finale', 'series', 'show'],
  MOVIES: ['movie', 'film', 'cinema'],
  DOCUMENTARIES: ['documentary', 'docu', 'national.geographic', 'discovery'],
  SAGAS: [
    'part', 'volume', 'chapter', 'saga', 'trilogy', 'quadrilogy', 'phase', 'episode',
    'marvel', 'mcu', 'dc', 'dceu', 'star.wars', 'harry.potter', 'lord.of.the.rings',
    'fast.furious', 'james.bond', '007', 'mission.impossible', 'avengers',
    'x-men', 'transformers', 'pirates.caribbean', 'indiana.jones'
  ],
  STANDALONES: ['standalone', 'independent', 'single'],
  SPIN_OFFS: ['spinoff', 'spin-off', 'side.story', 'origins']
};

const KNOWN_SAGAS: { [key: string]: any } = {
  'marvel-cinematic-universe': {
    title: 'Marvel Cinematic Universe',
    aliases: ['mcu', 'marvel', 'avengers'],
    phases: [
      { number: 1, title: 'Phase 1' },
      { number: 2, title: 'Phase 2' },
      { number: 3, title: 'Phase 3' },
      { number: 4, title: 'Phase 4' }
    ]
  },
  'star-wars': {
    title: 'Star Wars',
    aliases: ['sw', 'star.wars'],
    phases: [
      { number: 1, title: 'Trilogie Originale' },
      { number: 2, title: 'Prélogie' },
      { number: 3, title: 'Trilogie Sequel' }
    ]
  },
  'fast-furious': {
    title: 'Fast & Furious',
    aliases: ['fast.furious', 'f&f', 'fast.and.furious'],
    phases: [
      { number: 1, title: 'Saga Principale' }
    ]
  }
};

@Injectable({
  providedIn: 'root'
})
export class MediaDetectionService {
  private detectedSeriesSignal = signal<Map<string, Series>>(new Map());
  private detectedSagasSignal = signal<Map<string, Saga>>(new Map());
  private detectionResultsSignal = signal<MediaDetectionResult[]>([]);

  detectedSeries = this.detectedSeriesSignal.asReadonly();
  detectedSagas = this.detectedSagasSignal.asReadonly();
  detectionResults = this.detectionResultsSignal.asReadonly();

  // Computed values
  totalSeries = computed(() => this.detectedSeries().size);
  totalSagas = computed(() => this.detectedSagas().size);
  
  seriesList = computed(() => Array.from(this.detectedSeries().values()));
  sagasList = computed(() => Array.from(this.detectedSagas().values()));

  /**
   * Analyse un nom de fichier et détecte le type de média
   */
  analyzeFilename(filename: string): MediaDetectionResult {
    const cleanFilename = this.cleanFilename(filename);
    
    // 1. Essayer de détecter une série TV
    const seriesResult = this.detectSeries(cleanFilename);
    if (seriesResult.confidence > 0.7) {
      return seriesResult;
    }
    
    // 2. Essayer de détecter une saga connue
    const knownSagaResult = this.detectKnownSaga(cleanFilename);
    if (knownSagaResult.confidence > 0.8) {
      return knownSagaResult;
    }
    
    // 3. Essayer de détecter une saga par pattern
    const sagaResult = this.detectSaga(cleanFilename);
    if (sagaResult.confidence > 0.6) {
      return sagaResult;
    }
    
    // 4. Essayer de détecter un film simple
    const movieResult = this.detectMovie(cleanFilename);
    if (movieResult.confidence > 0.5) {
      return movieResult;
    }
    
    // Par défaut, considérer comme un film autonome
    return {
      originalFilename: filename,
      detectedType: MediaType.MOVIE,
      confidence: 0.3,
      extractedTitle: cleanFilename,
      detectionPattern: {
        pattern: 'default',
        type: 'standalone',
        examples: []
      }
    };
  }

  /**
   * Détecte si le fichier fait partie d'une saga connue
   */
  private detectKnownSaga(filename: string): MediaDetectionResult {
    const lowerFilename = filename.toLowerCase();
    
    for (const [sagaId, sagaData] of Object.entries(KNOWN_SAGAS)) {
      const matchingAlias = sagaData.aliases.find((alias: string) => 
        lowerFilename.includes(alias.toLowerCase())
      );
      
      if (matchingAlias) {
        const movieTitle = this.extractMovieTitleFromSaga(filename, matchingAlias);
        const sequenceNumber = this.extractSequenceNumber(filename);
        const phase = this.detectPhase(filename, sagaData);
        
        return {
          originalFilename: filename,
          detectedType: MediaType.SAGA_MOVIE,
          confidence: 0.9,
          extractedTitle: movieTitle || filename,
          extractedSagaHint: sagaData.title,
          extractedSequenceNumber: sequenceNumber,
          extractedPhaseHint: phase?.title,
          detectionPattern: {
            pattern: `known_saga_${sagaId}`,
            type: 'saga',
            examples: sagaData.aliases
          },
          suggestedGrouping: {
            groupType: 'saga',
            groupTitle: sagaData.title,
            groupId: sagaId,
            confidence: 0.9,
            similarFiles: [],
            suggestedPhase: phase?.title,
            suggestedOrder: sequenceNumber
          }
        };
      }
    }
    
    return {
      originalFilename: filename,
      detectedType: MediaType.OTHER,
      confidence: 0,
      extractedTitle: filename,
      detectionPattern: {
        pattern: 'none',
        type: 'saga',
        examples: []
      }
    };
  }

  /**
   * Détecte si le fichier fait partie d'une saga par patterns
   */
  private detectSaga(filename: string): MediaDetectionResult {
    for (const pattern of FILENAME_PATTERNS.SAGAS) {
      const match = filename.match(pattern);
      if (match) {
        const [, sagaTitle, sequenceNumber, movieTitle] = match;
        
        return {
          originalFilename: filename,
          detectedType: MediaType.SAGA_MOVIE,
          confidence: 0.8,
          extractedTitle: movieTitle ? this.cleanTitle(movieTitle) : `${sagaTitle} ${sequenceNumber}`,
          extractedSagaHint: this.cleanTitle(sagaTitle),
          extractedSequenceNumber: parseInt(sequenceNumber) || 1,
          detectionPattern: {
            pattern: pattern.source,
            type: 'saga',
            examples: ['Saga 1 - Title', 'Series Part 1', 'MCU Phase 1']
          },
          suggestedGrouping: {
            groupType: 'saga',
            groupTitle: this.cleanTitle(sagaTitle),
            confidence: 0.8,
            similarFiles: [],
            suggestedOrder: parseInt(sequenceNumber) || 1
          }
        };
      }
    }
    
    // Vérifier les mots-clés de saga
    const hasSagaKeywords = TYPE_KEYWORDS.SAGAS.some(keyword => 
      filename.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasSagaKeywords) {
      const sagaHint = this.extractSagaHintFromKeywords(filename);
      const sequenceNumber = this.extractSequenceNumber(filename);
      
      return {
        originalFilename: filename,
        detectedType: MediaType.SAGA_MOVIE,
        confidence: 0.6,
        extractedTitle: filename,
        extractedSagaHint: sagaHint,
        extractedSequenceNumber: sequenceNumber,
        detectionPattern: {
          pattern: 'keywords',
          type: 'saga',
          examples: ['marvel.movie', 'star.wars.episode', 'fast.furious.part']
        },
        suggestedGrouping: {
          groupType: 'saga',
          groupTitle: sagaHint || 'Saga inconnue',
          confidence: 0.6,
          similarFiles: [],
          suggestedOrder: sequenceNumber
        }
      };
    }
    
    return {
      originalFilename: filename,
      detectedType: MediaType.OTHER,
      confidence: 0,
      extractedTitle: filename,
      detectionPattern: {
        pattern: 'none',
        type: 'saga',
        examples: []
      }
    };
  }

  /**
   * Détecte si le fichier est un épisode de série
   */
  private detectSeries(filename: string): MediaDetectionResult {
    for (const pattern of FILENAME_PATTERNS.TV_SERIES) {
      const match = filename.match(pattern);
      if (match) {
        const [, seriesTitle, season, episode, episodeTitle] = match;
        
        return {
          originalFilename: filename,
          detectedType: MediaType.TV_EPISODE,
          confidence: 0.9,
          extractedTitle: this.cleanTitle(seriesTitle),
          extractedSeason: parseInt(season),
          extractedEpisode: parseInt(episode),
          extractedEpisodeTitle: episodeTitle ? this.cleanTitle(episodeTitle) : undefined,
          detectionPattern: {
            pattern: pattern.source,
            type: 'series',
            examples: ['Series.S01E01.Title', 'Show.1x01.Episode']
          },
          suggestedGrouping: {
            groupType: 'series',
            groupTitle: this.cleanTitle(seriesTitle),
            confidence: 0.9,
            similarFiles: []
          }
        };
      }
    }
    
    // Vérifier les mots-clés de série
    const hasSeriesKeywords = TYPE_KEYWORDS.SERIES.some(keyword => 
      filename.toLowerCase().includes(keyword)
    );
    
    if (hasSeriesKeywords) {
      return {
        originalFilename: filename,
        detectedType: MediaType.TV_EPISODE,
        confidence: 0.6,
        extractedTitle: filename,
        detectionPattern: {
          pattern: 'keywords',
          type: 'series',
          examples: ['show.season.1', 'series.episode.1']
        }
      };
    }
    
    return {
      originalFilename: filename,
      detectedType: MediaType.OTHER,
      confidence: 0,
      extractedTitle: filename,
      detectionPattern: {
        pattern: 'none',
        type: 'series',
        examples: []
      }
    };
  }

  /**
   * Détecte si le fichier est un film autonome
   */
  private detectMovie(filename: string): MediaDetectionResult {
    for (const pattern of FILENAME_PATTERNS.MOVIES) {
      const match = filename.match(pattern);
      if (match) {
        const [, title, year] = match;
        
        return {
          originalFilename: filename,
          detectedType: MediaType.MOVIE,
          confidence: 0.8,
          extractedTitle: this.cleanTitle(title),
          extractedYear: parseInt(year),
          detectionPattern: {
            pattern: pattern.source,
            type: 'standalone',
            examples: ['Movie (2023)', 'Film.2023']
          }
        };
      }
    }
    
    return {
      originalFilename: filename,
      detectedType: MediaType.MOVIE,
      confidence: 0.4,
      extractedTitle: filename,
      detectionPattern: {
        pattern: 'default',
        type: 'standalone',
        examples: []
      }
    };
  }

  /**
   * Méthodes utilitaires
   */
  private extractMovieTitleFromSaga(filename: string, sagaKeyword: string): string {
    return filename
      .replace(new RegExp(sagaKeyword, 'gi'), '')
      .replace(/[._-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractSequenceNumber(filename: string): number | undefined {
    const patterns = [
      /(\d{1,2})[.\s]*[-–:][.\s]/,
      /Part[.\s](\d{1,2})/i,
      /Volume[.\s](\d{1,2})/i,
      /Chapter[.\s](\d{1,2})/i,
      /Episode[.\s](\d{1,2})/i,
      /Phase[.\s](\d{1,2})/i
    ];
    
    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return undefined;
  }

  private detectPhase(filename: string, sagaData: any): any {
    for (const phase of sagaData.phases || []) {
      if (filename.toLowerCase().includes(phase.title.toLowerCase())) {
        return phase;
      }
    }
    return null;
  }

  private extractSagaHintFromKeywords(filename: string): string {
    const lowerFilename = filename.toLowerCase();
    
    for (const keyword of TYPE_KEYWORDS.SAGAS) {
      if (lowerFilename.includes(keyword)) {
        return this.cleanTitle(keyword.replace(/[._]/g, ' '));
      }
    }
    
    return 'Saga';
  }

  private cleanFilename(filename: string): string {
    return filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[._-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/[._-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Analyse un lot de noms de fichiers
   */
  analyzeBatch(filenames: string[]): MediaDetectionResult[] {
    const results = filenames.map(filename => this.analyzeFilename(filename));
    return results;
  }

  /**
   * Obtient les statistiques de détection
   */
  getDetectionStats(): {
    totalFiles: number;
    standaloneMovies: number;
    sagaMovies: number;
    episodes: number;
    series: number;
    sagas: number;
    confidence: {
      high: number;
      medium: number;
      low: number;
    };
  } {
    const results = this.detectionResults();
    
    return {
      totalFiles: results.length,
      standaloneMovies: results.filter(r => r.detectedType === MediaType.MOVIE).length,
      sagaMovies: results.filter(r => r.detectedType === MediaType.SAGA_MOVIE).length,
      episodes: results.filter(r => r.detectedType === MediaType.TV_EPISODE).length,
      series: this.totalSeries(),
      sagas: this.totalSagas(),
      confidence: {
        high: results.filter(r => r.confidence > 0.7).length,
        medium: results.filter(r => r.confidence > 0.4 && r.confidence <= 0.7).length,
        low: results.filter(r => r.confidence <= 0.4).length
      }
    };
  }
}