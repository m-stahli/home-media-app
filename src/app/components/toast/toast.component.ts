// src/app/components/toast/toast.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of notificationService.toasts()" 
           class="toast" 
           [attr.data-type]="toast.type"
           (click)="removeToast(toast.id)">
        <div class="toast-icon">{{ getIcon(toast.type) }}</div>
        <div class="toast-content">
          <h4>{{ toast.title }}</h4>
          <p>{{ toast.message }}</p>
        </div>
        <button class="toast-close" (click)="removeToast(toast.id); $event.stopPropagation()">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 400px;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      transition: transform 0.2s ease;
      min-width: 300px;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast:hover {
      transform: translateX(-4px);
    }

    .toast[data-type="success"] {
      background: #e8f5e8;
      border-left: 4px solid #4caf50;
      color: #2e7d32;
    }

    .toast[data-type="error"] {
      background: #ffebee;
      border-left: 4px solid #f44336;
      color: #c62828;
    }

    .toast[data-type="info"] {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      color: #1565c0;
    }

    .toast[data-type="warning"] {
      background: #fff3e0;
      border-left: 4px solid #ff9800;
      color: #ef6c00;
    }

    .toast-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .toast-content {
      flex: 1;
    }

    .toast-content h4 {
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .toast-content p {
      margin: 0;
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .toast-close {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s ease;
      flex-shrink: 0;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toast-close:hover {
      opacity: 1;
    }

    @media (max-width: 768px) {
      .toast-container {
        left: 1rem;
        right: 1rem;
        max-width: none;
      }
      
      .toast {
        min-width: auto;
      }
    }
  `]
})
export class ToastComponent {
  notificationService = inject(NotificationService);

  getIcon(type: string): string {
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };
    return icons[type as keyof typeof icons] || 'ℹ️';
  }

  removeToast(id: string): void {
    this.notificationService.removeToast(id);
  }
}