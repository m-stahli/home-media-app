// src/app/app.component.ts - Version corrigée avec RouterLink
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router'; // 🔥 AJOUT de RouterLink
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, ToastComponent], // 🔥 AJOUT de RouterLink dans les imports
  template: `
    <div class="app-container">
      <header class="temp-header">
        <h1>🎬 Home Media App</h1>
        <nav>
          <a routerLink="/home" routerLinkActive="active">Accueil</a>
          <a routerLink="/library" routerLinkActive="active">Bibliothèque</a>
          <a routerLink="/sources" routerLinkActive="active">Sources</a>
          <a routerLink="/import" routerLinkActive="active">Import</a>
          <a routerLink="/player" routerLinkActive="active">Lecteur</a>
          <a routerLink="/settings" routerLinkActive="active">Paramètres</a>
        </nav>
      </header>
      <main>
        <router-outlet></router-outlet>
      </main>
      <app-toast></app-toast>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .temp-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .temp-header h1 {
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
    }

    .temp-header nav {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
    }

    .temp-header nav a {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      transition: all 0.2s ease;
      font-weight: 500;
    }

    .temp-header nav a:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }

    .temp-header nav a.active {
      background: rgba(255, 255, 255, 0.3);
      font-weight: 600;
    }

    main {
      flex: 1;
      min-height: calc(100vh - 120px);
    }

    @media (max-width: 768px) {
      .temp-header {
        padding: 1rem;
      }
      
      .temp-header h1 {
        font-size: 1.3rem;
        margin-bottom: 0.5rem;
      }
      
      .temp-header nav {
        gap: 1rem;
      }
      
      .temp-header nav a {
        padding: 0.4rem 0.8rem;
        font-size: 0.9rem;
      }
    }
  `]
})
export class AppComponent {
  title = 'home-media-app';
}