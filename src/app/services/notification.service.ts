// src/app/services/notification.service.ts
import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastsSignal = signal<ToastMessage[]>([]);
  
  toasts = this.toastsSignal.asReadonly();

  showSuccess(title: string, message: string, duration = 4000): void {
    this.addToast('success', title, message, duration);
  }

  showError(title: string, message: string, duration = 6000): void {
    this.addToast('error', title, message, duration);
  }

  showInfo(title: string, message: string, duration = 4000): void {
    this.addToast('info', title, message, duration);
  }

  showWarning(title: string, message: string, duration = 5000): void {
    this.addToast('warning', title, message, duration);
  }

  private addToast(type: ToastMessage['type'], title: string, message: string, duration: number): void {
    const toast: ToastMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      type,
      title,
      message,
      duration,
      timestamp: new Date()
    };

    this.toastsSignal.update(current => [...current, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast.id);
      }, duration);
    }
  }

  removeToast(id: string): void {
    this.toastsSignal.update(current => current.filter(toast => toast.id !== id));
  }

  clearAll(): void {
    this.toastsSignal.set([]);
  }
}