import '@box-model/web/alert.js';
import '@box-model/web/button.js';
import '@box-model/web/card.js';
import '@box-model/web/close-control.js';
import '@box-model/web/columns.js';
import '@box-model/web/progress.js';
import '@box-model/web/stat.js';
import '@box-model/web/tag.js';
import '@box-model/web/terminal.js';

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import type { ButtonVariant } from '@box-model/web/button.js';
import type { ColumnsGap } from '@box-model/web/columns.js';

const BUTTON_VARIANTS: readonly ButtonVariant[] = ['primary', 'secondary', 'tertiary'];
const COLUMN_GAPS: readonly ColumnsGap[] = ['sm', 'md', 'lg'];

@Component({
  selector: 'app-box-model-page',
  templateUrl: './box-model-page.html',
  styleUrl: './box-model-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoxModelPage {
  protected readonly alertVisible = signal(true);
  protected readonly buttonVariant = signal<ButtonVariant>('primary');
  protected readonly columnGap = signal<ColumnsGap>('md');
  protected readonly progress = signal(62);
  protected readonly progressLabel = computed(() => `Reference resolution: ${this.progress()}%`);

  protected cycleButtonVariant(): void {
    this.buttonVariant.update((variant) => this.nextValue(BUTTON_VARIANTS, variant));
  }

  protected cycleColumnGap(): void {
    this.columnGap.update((gap) => this.nextValue(COLUMN_GAPS, gap));
  }

  protected advanceProgress(): void {
    this.progress.update((value) => (value >= 100 ? 25 : Math.min(value + 13, 100)));
  }

  protected dismissAlert(_event: CustomEvent<void>): void {
    this.alertVisible.set(false);
  }

  private nextValue<T>(values: readonly T[], current: T): T {
    const currentIndex = values.indexOf(current);
    return values[(currentIndex + 1) % values.length];
  }
}
