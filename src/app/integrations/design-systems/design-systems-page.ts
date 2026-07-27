import '@spectrum-web-components/theme/sp-theme.js';
// <sp-theme> resolves its attributes against separately-loaded theme fragments; without these,
// it falls back to unthemed defaults and warns at runtime.
import '@spectrum-web-components/theme/theme-light.js';
import '@spectrum-web-components/theme/scale-medium.js';
import '@spectrum-web-components/button/sp-button.js';
import '@spectrum-web-components/textfield/sp-textfield.js';
import '@ui5/webcomponents/Button.js';
import '@cds/core/button/register.js';
import '@esri/calcite-components/components/calcite-button';
import '@fluentui/web-components/button/define.js';
import '@nordhealth/components/lib/Button.js';
import '@rhds/elements/rh-button/rh-button.js';
import '@rhds/elements/rh-switch/rh-switch.js';
import rhdsCheckmarkIcon from '@rhds/icons/microns/checkmark.js';
import '@aurodesignsystem/auro-button';
import '@vaadin/button';
import '@patternfly/elements/pf-v5-button/pf-v5-button.js';
import '@lion/ui/define/lion-button.js';
import '@local/cem-workspace-example';
import '@material/web/button/filled-button.js';

import { RhIcon } from '@rhds/elements/rh-icon/rh-icon.js';
import type { ButtonClickEventDetail } from '@ui5/webcomponents/dist/Button.js';
import ButtonDesign from '@ui5/webcomponents/dist/types/ButtonDesign.js';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

const rhdsIcons = new Map([['microns/checkmark', rhdsCheckmarkIcon]]);

// RHDS's default variable package import cannot be resolved by Vite in the browser. Statically
// importing the icons used by this page keeps the bundle narrow and follows RhIcon's supported
// custom-resolver integration.
RhIcon.resolve = (set, icon) => {
  const resolvedIcon = rhdsIcons.get(`${set}/${icon}`);
  if (resolvedIcon === undefined) {
    throw new Error(`RHDS icon "${set}/${icon}" is not included in this example bundle.`);
  }
  return resolvedIcon.cloneNode(true);
};

@Component({
  selector: 'app-design-systems-page',
  templateUrl: './design-systems-page.html',
  styleUrl: './design-systems-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemsPage {
  protected readonly controlsDisabled = signal(false);
  protected readonly ui5ButtonDesign = ButtonDesign.Emphasized;
  protected readonly spectrumValue = signal('Manifest-backed value');
  protected readonly spectrumVariant = signal<
    'accent' | 'primary' | 'secondary' | 'negative' | 'white' | 'black' | 'cta' | 'overBackground'
  >('accent');
  protected readonly materialButtonType = signal<'button' | 'reset' | 'submit'>('button');
  protected readonly activationCount = signal(0);
  protected readonly lastActivated = signal('No component activated yet');
  protected readonly activitySummary = computed(
    () => `${this.lastActivated()}. ${this.activationCount()} total activations.`,
  );

  protected toggleDisabled(): void {
    this.controlsDisabled.update((disabled) => !disabled);
  }

  protected recordActivation(system: string): void {
    this.lastActivated.set(`${system} button activated`);
    this.activationCount.update((count) => count + 1);
  }

  // UI5's manifest declares `click` as CustomEvent<ButtonClickEventDetail>, but its reference
  // omits the start/end indices the CEM spec requires for names nested in compound type text,
  // so Angular does not apply the payload type and `$event` stays the native click event. The
  // handler narrows manually until UI5's generator emits exact offsets.
  protected recordUi5Activation(event: Event): void {
    const detail = (event as CustomEvent<Partial<ButtonClickEventDetail>>).detail;
    const interaction = detail?.shiftKey ? 'UI5 shift-click' : 'UI5 button activated';
    this.lastActivated.set(interaction);
    this.activationCount.update((count) => count + 1);
  }

  protected readonly rhdsChecked = signal(false);

  protected recordRhdsSwitch(event: Event): void {
    const checked = (event.currentTarget as EventTarget & { checked?: unknown }).checked;
    this.rhdsChecked.set(checked === true);
    this.recordActivation('RHDS switch');
  }

  protected updateSpectrumValue(event: Event): void {
    const value = (event.currentTarget as EventTarget & { value?: unknown }).value;
    if (typeof value === 'string') {
      this.spectrumValue.set(value);
    }
  }
}
