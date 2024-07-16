import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { landingGuard } from './guards/landing.guard';
import { homeGuard } from './home-module/guards/home.guard';

const routes: Routes = [
  { path: '', loadChildren: () => import('./components/landing/landing.module').then(m => m.LandingModule), canActivate: [landingGuard] },
  { path: 'login', loadChildren: () => import('./components/login/login.module').then(m => m.LoginModule), canActivate: [landingGuard] },
  { path: 'registro', loadChildren: () => import('./components/register/register.module').then(m => m.RegisterModule), canActivate: [landingGuard] },
  { path: 'recuperar-pass', loadChildren: () => import('./components/recoverPassword/recover-password.module').then(m => m.RecoverPasswordModule), canActivate: [landingGuard] },
  { path: 'buscar', loadChildren: () => import('./components/search/search.module').then(m => m.SearchModule), canActivate: [landingGuard] },
  { path: 'seguridad', loadChildren: () => import('./components/securityOptions/security-options.module').then(m => m.SecurityOptionsModule) },
  { path: 'reset-password/:token', loadChildren: () => import('./components/resetPassword/reset-password.module').then(m => m.ResetPasswordModule) },
  { path: 'inicio', loadChildren: () => import('./home-module/home.module').then(m => m.HomeModule), canActivate: [homeGuard] },
  { path: 'error', loadChildren: () => import('./error/error.module').then(m => m.ErrorModule), canActivate: [homeGuard]  },
  { path: 'notificaciones', loadChildren: () => import('./notifications-module/notifications-module.module').then(m => m.NotificationsModule), canActivate: [homeGuard] },
  { path: '**', loadChildren: () => import('./components/landing/landing.module').then(m => m.LandingModule), canActivate: [landingGuard] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'top',
    onSameUrlNavigation: 'reload',
    paramsInheritanceStrategy: 'always',
    urlUpdateStrategy: 'eager'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
