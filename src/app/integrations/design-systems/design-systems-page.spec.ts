import { TestBed } from '@angular/core/testing';

vi.mock('@spectrum-web-components/theme/sp-theme.js', () => ({}));
vi.mock('@spectrum-web-components/button/sp-button.js', () => ({}));
vi.mock('@spectrum-web-components/textfield/sp-textfield.js', () => ({}));
vi.mock('@ui5/webcomponents/Button.js', () => ({}));
vi.mock('@cds/core/button/register.js', () => ({}));
vi.mock('@esri/calcite-components/components/calcite-button', () => ({}));
vi.mock('@fluentui/web-components/button/define.js', () => ({}));
vi.mock('@nordhealth/components/lib/Button.js', () => ({}));
vi.mock('@rhds/elements/rh-button/rh-button.js', () => ({}));
vi.mock('@rhds/elements/rh-switch/rh-switch.js', () => ({}));
vi.mock('@rhds/elements/rh-icon/rh-icon.js', () => ({ RhIcon: { resolve: undefined } }));
vi.mock('@rhds/icons/microns/checkmark.js', () => ({
  default: { cloneNode: () => document.createElementNS('http://www.w3.org/2000/svg', 'svg') },
}));
vi.mock('@aurodesignsystem/auro-button', () => ({}));
vi.mock('@vaadin/button', () => ({}));
vi.mock('@patternfly/elements/pf-v5-button/pf-v5-button.js', () => ({}));
vi.mock('@lion/ui/define/lion-button.js', () => ({}));
vi.mock('@local/cem-workspace-example', () => ({}));
vi.mock('@material/web/button/filled-button.js', () => ({}));

import { DesignSystemsPage } from './design-systems-page';

describe('DesignSystemsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesignSystemsPage],
    }).compileComponents();
  });

  it('renders each manifest-backed design system', () => {
    const fixture = TestBed.createComponent(DesignSystemsPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tags = [
      'sp-button',
      'ui5-button',
      'cds-button',
      'calcite-button',
      'fluent-button',
      'nord-button',
      'rh-button',
      'rh-switch',
      'auro-button',
      'vaadin-button',
      'pf-v5-button',
      'lion-button',
      'md-filled-button',
      'cem-workspace-example',
    ];

    for (const tag of tags) {
      expect(compiled.querySelector(tag), `${tag} should be rendered`).not.toBeNull();
    }
  });

  it('binds the shared state signal to every component button', () => {
    const fixture = TestBed.createComponent(DesignSystemsPage);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('.toolbar button') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    const spectrumButton = fixture.nativeElement.querySelector('sp-button') as HTMLElement & {
      disabled?: boolean;
      pending?: boolean;
    };
    const componentButtons = fixture.nativeElement.querySelectorAll(
      'ui5-button, cds-button, calcite-button, fluent-button, nord-button, rh-button, rh-switch, auro-button, vaadin-button, pf-v5-button, lion-button, md-filled-button',
    ) as NodeListOf<HTMLElement & { disabled?: boolean }>;

    expect(spectrumButton.pending).toBe(false);
    expect(spectrumButton.disabled).toBe(true);
    expect(componentButtons.length).toBe(13);
    for (const button of componentButtons) {
      expect(button.disabled, `${button.localName} should be disabled`).toBe(true);
    }
  });
});
