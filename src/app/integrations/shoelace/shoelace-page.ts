import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/details/details.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/progress-bar/progress-bar.js';
import '@shoelace-style/shoelace/dist/components/rating/rating.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-shoelace-page',
  templateUrl: './shoelace-page.html',
  styleUrl: './shoelace-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShoelacePage {
  protected readonly name = signal('Angular developer');
  protected readonly selectedLibrary = signal('shoelace');
  protected readonly notifications = signal(true);
  protected readonly progress = signal(35);
  protected readonly rating = signal(4);
  protected readonly alertOpen = signal(true);
  protected readonly detailsOpen = signal(false);

  protected handleNameInput(event: Event): void {
    const value = (event.currentTarget as EventTarget & { value?: unknown }).value;
    if (typeof value === 'string') {
      this.name.set(value);
    }
  }

  protected handleLibraryChange(event: Event): void {
    const value = (event.currentTarget as EventTarget & { value?: unknown }).value;
    if (typeof value === 'string') {
      this.selectedLibrary.set(value);
    }
  }

  protected handleNotificationsChange(event: Event): void {
    const checked = (event.currentTarget as EventTarget & { checked?: unknown }).checked;
    if (typeof checked === 'boolean') {
      this.notifications.set(checked);
    }
  }

  protected handleRatingChange(event: Event): void {
    const value = (event.currentTarget as EventTarget & { value?: unknown }).value;
    if (typeof value === 'number') {
      this.rating.set(value);
    }
  }

  protected advanceProgress(): void {
    this.progress.update((value) => (value >= 100 ? 0 : Math.min(value + 15, 100)));
  }
}
