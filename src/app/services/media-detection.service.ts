// src/app/services/media-detection.service.ts - Version autonome
import { Injectable, signal, computed } from '@angular/core';

// ===== TYPES DÉFINIS LOCALEMENT =====
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

export interface DetectionStats {
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
}

export interface SeriesGroup {
  id: string;
  title: string;
  totalEpisodes: number;
  totalSeasons: number;
  episodes: MediaDetectionResult[];
}

export interface SagaGroup {
  id: string;
  title: string;
  totalMovies: number;
  movies: MediaDetectionResult[];
  suggestedPhases: string[];
}

// ===== PATTERNS ET CONSTANTES =====
const FILENAME_PATTERNS = {
  TV_SERIES: [
    /^(.+?)[.\s]S(\d{1,2})E(\d{1,2})[.\s]*(.*)$/i,           // Series.S01E01.Title
    /^(.+?)[.\s](\d{1,2})x(\d{1,2})[.\s]*(.*)$/i,            // Series.1x01.Title  
    /^(.+?)[.\s]Season[.\s](\d{1,2})[.\s]Episode[.\s](\d{1,2})/i, // Series Season 1 Episode 1
    /^(.+?)[.\s]\[S(\d{1,2})E(\d{1,2})\]/i,                  // Series [S01E01]
  ],
  
  MOVIES: [
    /^(.+?)[.\s]\((\d{4})\)/i,                               // Movie (2023)
    /^(.+?)[.\s](\d{4})[.\s]/i,                              // Movie 2023
    /^(.+?)[.\s]\[(\d{4})\]/i,                               // Movie [2023]
  ],
  
  SAGAS: [
    /^(.+?)[.\s](\d{1,2})[.\s]*[-–][.\s]*(.+)$/i,            // Saga 1 - Title
    /^(.+?)[.\s](\d{1,2})[.\s]*[:][.\s]*(.+)$/i,             // Saga 1: Title
    /^(.+?)[.\s]Part[.\s](\d{1,2})[.\s]*[-–]?[.\s]*(.*)$/i,  // Saga Part 1 - Title
    /^(.+?)[.\s]Volume[.\s](\d{1,2})[.\s]*[-–]?[.\s]*(.*)$/i, // Saga Volume 1
    /^(.+?)[.\s]Chapter[.\s](\d{1,2})[.\s]*[-–]?[.\s]*(.*)$/i, // Saga Chapter 1
    /^(.+?)[.\s]Episode[.\s](\d{1,2})[.\s]*[-–]?[.\s]*(.*)$/i, // Star Wars Episode 1
    /^(.+?)[.\s]Phase[.\s](\d{1,2})[.\s]*[-–]?[.\s]*(.*)$/i,  // MCU Phase 1
    /^(.*Marvel.*|.*MCU.*|.*Avengers.*)/i,                    // Marvel/MCU
    /^(.*Star Wars.*|.*SW.*)/i,                              // Star Wars
    /^(.*Fast.*Furious.*|.*F&F.*)/i,                         // Fast & Furious
    /^(.*Harry Potter.*|.*HP.*)/i,                           // Harry Potter
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
  ]
};

const KNOWN_SAGAS: { [key: string]: any } = {
  'marvel-cinematic-universe': {
    title: 'Marvel Cinematic Universe',
    aliases: ['mcu', 'marvel', 'avengers', 'iron.man', 'thor', 'captain.america'],
    phases: [
      { number: 1, title: 'Phase 1' },
      { number: 2, title: 'Phase 2' },
      { number: 3, title: 'Phase 3' },
      { number: 4, title: 'Phase 4' }
    ]
  },
  'star-wars': {
    title: 'Star Wars',
    aliases: ['star.wars', 'sw', 'jedi', 'sith', 'empire', 'republic'],
    phases: [
      { number: 1, title: 'Trilogie Originale' },
      { number: 2, title: 'Prélogie' },
      { number: 3, title: 'Trilogie Sequel' }
    ]
  },
  'fast-furious': {
    title: 'Fast & Furious',
    aliases: ['fast.furious', 'f&f', 'fast.and.furious', 'furious'],
    phases: [{ number: 1, title: 'Saga Principale' }]
  },
  'harry-potter': {
    title: 'Harry Potter Universe',
    aliases: ['harry.potter', 'hp', 'potter', 'wizarding.world'],
    phases: [
      { number: 1, title: 'Harry Potter' },
      { number: 2, title: 'Fantastic Beasts' }
    ]
  }
};

// ===== SERVICE =====
@Injectable({
  providedIn: 'root'
})
export class MediaDetectionService {
  private detectionResultsSignal = signal<MediaDetectionResult[]>([]);
  private seriesGroupsSignal = signal<Map<string, SeriesGroup>>(new Map());
  private sagaGroupsSignal = signal<Map<string, SagaGroup>>(new Map());

  detectionResults = this.detectionResultsSignal.asReadonly();
  seriesGroups = this.seriesGroupsSignal.asReadonly();
  sagaGroups = this.sagaGroupsSignal.asReadonly();

  // Computed values
  totalSeries = computed(() => this.seriesGroups().size);
  totalSagas = computed(() => this.sagaGroups().size);
  
  seriesList = computed(() => Array.from(this.seriesGroups().values()));
  sagasList = computed(() => Array.from(this.sagaGroups().values()));

  /**
   * Analyse un nom de fichier et détecte le type de média
   */
  analyzeFilename(filename: string): MediaDetectionResult {
    const cleanFilename = this.cleanFilename(filename);
    
    // 1. Essayer de détecter une série TV (priorité haute)
    const seriesResult = this.detectSeries(cleanFilename, filename);
    if (seriesResult.confidence > 0.7) {
      return seriesResult;
    }
    
    // 2. Essayer de détecter une saga connue (priorité haute)
    const knownSagaResult = this.detectKnownSaga(cleanFilename, filename);
    if (knownSagaResult.confidence > 0.8) {
      return knownSagaResult;
    }
    
    // 3. Essayer de détecter une saga par pattern (priorité moyenne)
    const sagaResult = this.detectSaga(cleanFilename, filename);
    if (sagaResult.confidence > 0.6) {
      return sagaResult;
    }
    
    // 4. Essayer de détecter un film simple (priorité basse)
    const movieResult = this.detectMovie(cleanFilename, filename);
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
  private detectKnownSaga(cleanFilename: string, originalFilename: string): MediaDetectionResult {
    const lowerFilename = cleanFilename.toLowerCase();
    
    for (const [sagaId, sagaData] of Object.entries(KNOWN_SAGAS)) {
      const matchingAlias = sagaData.aliases.find((alias: string) => 
        lowerFilename.includes(alias.toLowerCase())
      );
      
      if (matchingAlias) {
        const movieTitle = this.extractMovieTitleFromSaga(cleanFilename, matchingAlias);
        const sequenceNumber = this.extractSequenceNumber(cleanFilename);
        const phase = this.detectPhase(cleanFilename, sagaData);
        
        return {
          originalFilename: originalFilename,
          detectedType: MediaType.SAGA_MOVIE,
          confidence: 0.9,
          extractedTitle: movieTitle || cleanFilename,
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
      originalFilename: originalFilename,
      detectedType: MediaType.OTHER,
      confidence: 0,
      extractedTitle: cleanFilename,
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
  private detectSaga(cleanFilename: string, originalFilename: string): MediaDetectionResult {
    for (const pattern of FILENAME_PATTERNS.SAGAS) {
      const match = cleanFilename.match(pattern);
      if (match) {
        const [, sagaTitle, sequenceNumber, movieTitle] = match;
        
        return {
          originalFilename: originalFilename,
          detectedType: MediaType.SAGA_MOVIE,
          confidence: 0.8,
          extractedTitle: movieTitle ? this.cleanTitle(movieTitle) : `${sagaTitle} ${sequenceNumber}`,
          extractedSagaHint: this.cleanTitle(sagaTitle || ''),
          extractedSequenceNumber: parseInt(sequenceNumber) || 1,
          detectionPattern: {
            pattern: pattern.source,
            type: 'saga',
            examples: ['Saga 1 - Title', 'Series Part 1', 'MCU Phase 1']
          },
          suggestedGrouping: {
            groupType: 'saga',
            groupTitle: this.cleanTitle(sagaTitle || ''),
            confidence: 0.8,
            similarFiles: [],
            suggestedOrder: parseInt(sequenceNumber) || 1
          }
        };
      }
    }
    
    // Vérifier les mots-clés de saga
    const hasSagaKeywords = TYPE_KEYWORDS.SAGAS.some(keyword => 
      cleanFilename.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasSagaKeywords) {
      const sagaHint = this.extractSagaHintFromKeywords(cleanFilename);
      const sequenceNumber = this.extractSequenceNumber(cleanFilename);
      
      return {
        originalFilename: originalFilename,
        detectedType: MediaType.SAGA_MOVIE,
        confidence: 0.6,
        extractedTitle: cleanFilename,
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
      originalFilename: originalFilename,
      detectedType: MediaType.OTHER,
      confidence: 0,
      extractedTitle: cleanFilename,
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
  private detectSeries(cleanFilename: string, originalFilename: string): MediaDetectionResult {
    for (const pattern of FILENAME_PATTERNS.TV_SERIES) {
      const match = cleanFilename.match(pattern);
      if (match) {
        const [, seriesTitle, season, episode, episodeTitle] = match;
        
        return {
          originalFilename: originalFilename,
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
      cleanFilename.toLowerCase().includes(keyword)
    );
    
    if (hasSeriesKeywords) {
      return {
        originalFilename: originalFilename,
        detectedType: MediaType.TV_EPISODE,
        confidence: 0.6,
        extractedTitle: cleanFilename,
        detectionPattern: {
          pattern: 'keywords',
          type: 'series',
          examples: ['show.season.1', 'series.episode.1']
        }
      };
    }
    
    return {
      originalFilename: originalFilename,
      detectedType: MediaType.OTHER,
      confidence: 0,
      extractedTitle: cleanFilename,
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
  private detectMovie(cleanFilename: string, originalFilename: string): MediaDetectionResult {
    for (const pattern of FILENAME_PATTERNS.MOVIES) {
      const match = cleanFilename.match(pattern);
      if (match) {
        const [, title, year] = match;
        
        return {
          originalFilename: originalFilename,
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
      originalFilename: originalFilename,
      detectedType: MediaType.MOVIE,
      confidence: 0.4,
      extractedTitle: cleanFilename,
      detectionPattern: {
        pattern: 'default',
        type: 'standalone',
        examples: []
      }
    };
  }

  /**
   * Groupe les résultats de détection en séries et sagas
   */
  groupDetectedMedia(results: MediaDetectionResult[]): void {
    this.detectionResultsSignal.set(results);
    
    const seriesGroups = new Map<string, SeriesGroup>();
    const sagaGroups = new Map<string, SagaGroup>();
    
    results.forEach(result => {
      if (result.detectedType === MediaType.TV_EPISODE && result.suggestedGrouping?.groupType === 'series') {
        const seriesTitle = result.suggestedGrouping.groupTitle;
        const seriesId = this.generateId(seriesTitle);
        
        if (!seriesGroups.has(seriesId)) {
          seriesGroups.set(seriesId, {
            id: seriesId,
            title: seriesTitle,
            totalEpisodes: 0,
            totalSeasons: 0,
            episodes: []
          });
        }
        
        const group = seriesGroups.get(seriesId)!;
        group.episodes.push(result);
        group.totalEpisodes = group.episodes.length;
        
        // Calculer le nombre de saisons
        const seasons = new Set(group.episodes.map(ep => ep.extractedSeason || 1));
        group.totalSeasons = seasons.size;
      }
      
      if (result.detectedType === MediaType.SAGA_MOVIE && result.suggestedGrouping?.groupType === 'saga') {
        const sagaTitle = result.suggestedGrouping.groupTitle;
        const sagaId = this.generateId(sagaTitle);
        
        if (!sagaGroups.has(sagaId)) {
          sagaGroups.set(sagaId, {
            id: sagaId,
            title: sagaTitle,
            totalMovies: 0,
            movies: [],
            suggestedPhases: []
          });
        }
        
        const group = sagaGroups.get(sagaId)!;
        group.movies.push(result);
        group.totalMovies = group.movies.length;
        
        // Collecter les phases suggérées
        if (result.extractedPhaseHint && !group.suggestedPhases.includes(result.extractedPhaseHint)) {
          group.suggestedPhases.push(result.extractedPhaseHint);
        }
      }
    });
    
    this.seriesGroupsSignal.set(seriesGroups);
    this.sagaGroupsSignal.set(sagaGroups);
  }

  /**
   * Analyse un lot de noms de fichiers
   */
  analyzeBatch(filenames: string[]): MediaDetectionResult[] {
    const results = filenames.map(filename => this.analyzeFilename(filename));
    this.groupDetectedMedia(results);
    return results;
  }

  /**
   * Obtient les statistiques de détection
   */
  getDetectionStats(): DetectionStats {
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

  // ===== MÉTHODES UTILITAIRES =====
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
}