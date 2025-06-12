// src/app/app.component.ts - Avec navigation Sources
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="app-container">
      <header class="temp-header">
        <h1>🎬 Home Media App</h1>
        <nav>
          <a href="/home">Accueil</a>
          <a href="/library">Bibliothèque</a>
          <a href="/sources">Sources</a>
          <a href="/player">Lecteur</a>
          <a href="/settings">Paramètres</a>
        </nav>
      </header>
      <main>
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      font-family: Arial, sans-serif;
    }
    .temp-header {
      background: #1a1a1a;
      color: white;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .temp-header nav {
      display: flex;
      gap: 1rem;
    }
    .temp-header a {
      color: #4CAF50;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: background 0.2s ease;
    }
    .temp-header a:hover {
      background: rgba(76, 175, 80, 0.2);
    }
    main {
      min-height: calc(100vh - 80px);
    }
  `]
})
export class AppComponent {
  title = 'home-media-app';
}