import { TestBed } from '@angular/core/testing';

import { BoxModelPage } from './box-model-page';

describe('BoxModelPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxModelPage],
    }).compileComponents();
  });

  it('should render referenced and inline manifest-backed properties', () => {
    const fixture = TestBed.createComponent(BoxModelPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button-box') as HTMLElement & {
      size?: string;
      variant?: string;
    };
    const columns = compiled.querySelector('columns-box') as HTMLElement & { gap?: string };
    const cards = compiled.querySelectorAll('card-box');
    const progress = compiled.querySelector('progress-box') as HTMLElement & {
      label?: string;
      max?: number;
      value?: number;
    };

    expect(button.variant).toBe('primary');
    expect(button.size).toBe('large');
    expect(columns.gap).toBe('md');
    expect(cards).toHaveLength(3);
    expect(progress.value).toBe(62);
    expect(progress.max).toBe(100);
    expect(progress.label).toBe('Reference resolution: 62%');
  });

  it('should update a referenced union property through an Angular signal binding', () => {
    const fixture = TestBed.createComponent(BoxModelPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const buttonBox = compiled.querySelector('button-box') as HTMLElement & { variant?: string };
    const trigger = buttonBox.querySelector('button') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();

    expect(buttonBox.variant).toBe('secondary');
  });

  it('should demonstrate loading the package-owned Intent skill', () => {
    const fixture = TestBed.createComponent(BoxModelPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const intentSection = compiled.querySelector('[aria-labelledby="intent-heading"]');

    expect(intentSection?.textContent).toContain('@box-model/web#box-model-web');
    expect(intentSection?.textContent).toContain('Loaded 34 component examples');
  });

  it('should consume the manifest-typed close event', () => {
    const fixture = TestBed.createComponent(BoxModelPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const alert = compiled.querySelector('alert-box');

    alert?.dispatchEvent(new CustomEvent<void>('close'));
    fixture.detectChanges();

    expect(compiled.querySelector('alert-box')).toBeNull();
  });
});
