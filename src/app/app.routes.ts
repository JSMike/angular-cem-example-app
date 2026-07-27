import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Shoelace CEM integration',
    loadComponent: () =>
      import('./integrations/shoelace/shoelace-page').then((module) => module.ShoelacePage),
  },
  {
    path: 'box-model',
    title: 'Box Model UI CEM integration',
    loadComponent: () =>
      import('./integrations/box-model/box-model-page').then((module) => module.BoxModelPage),
  },
  {
    path: 'design-systems',
    title: 'Design system CEM integrations',
    loadComponent: () =>
      import('./integrations/design-systems/design-systems-page').then(
        (module) => module.DesignSystemsPage,
      ),
  },
  { path: '**', redirectTo: '' },
];
