// src/app/app.routes.ts - Avec sélecteurs uniques + Sources
import { Routes } from '@angular/router';
import { Component } from '@angular/core';

// Composants temporaires avec sélecteurs uniques
@Component({
  selector: 'temp-player', // Sélecteur unique
  template: `
    <div style="padding: 2rem; text-align: center;">
      <h1>🎬 Lecteur</h1>
      <p>Lecteur de médias en cours de développement.</p>
      <button onclick="history.back()" style="padding: 0.5rem 1rem; margin-top: 1rem;">
        ← Retour
      </button>
    </div>
  `,
  standalone: true
})
export class TempPlayerComponent { }

@Component({
  selector: 'temp-settings', // Sélecteur unique
  template: `
    <div style="padding: 2rem; text-align: center;">
      <h1>⚙️ Paramètres</h1>
      <p>Configuration de l'application en cours de développement.</p>
      <button onclick="history.back()" style="padding: 0.5rem 1rem; margin-top: 1rem;">
        ← Retour
      </button>
    </div>
  `,
  standalone: true
})
export class TempSettingsComponent { }

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { 
    path: 'home', 
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  { 
    path: 'library', 
    loadComponent: () => import('./pages/library/library.component').then(m => m.LibraryComponent)
  },
  { 
    path: 'sources', 
    loadComponent: () => import('./pages/sources/sources.component').then(m => m.SourcesComponent)
  },
  { path: 'player', component: TempPlayerComponent },
  { path: 'player/:id', component: TempPlayerComponent },
  { path: 'settings', component: TempSettingsComponent },
  { path: '**', redirectTo: '/home' }
];