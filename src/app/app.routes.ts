import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'simulator', pathMatch: 'full' },
  { 
    path: 'simulator', 
    loadComponent: () => import('./components/simulator/simulator.component').then(m => m.SimulatorComponent)
  },
  { 
    path: 'levels', 
    loadComponent: () => import('./components/levels/levels.component').then(m => m.LevelsComponent)
  },
  { 
    path: 'custom-scheduler', 
    loadComponent: () => import('./components/custom-scheduler/custom-scheduler.component').then(m => m.CustomSchedulerComponent)
  }
];
