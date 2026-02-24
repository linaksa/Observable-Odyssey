import { Injectable, signal } from '@angular/core';

const DEFAULT_TOAST_DURATION_MS = 4000;

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  showToast = signal<boolean>(false);
  toastMessage = signal<string | null>(null);
  toastTimeoutId: ReturnType<typeof setTimeout> | null = null;


  show(message: string) {
    this.showWithDuration(message, DEFAULT_TOAST_DURATION_MS);
  }

  showWithDuration(message: string, durationMs: number) {
    this.toastMessage.set(message);
    this.showToast.set(true);

    this.toastTimeoutId = setTimeout(() => {
      this.hide();
    }, durationMs);
  }

  hide() {
    this.showToast.set(false);
  }
}
