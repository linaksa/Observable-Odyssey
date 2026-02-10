import { provideHttpClient } from '@angular/common/http';
import { enableProdMode, enableProfiling, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Routes, provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { AdministrationPageComponent } from '@app/pages/administration-page/administration-page.component';
import { AppComponent } from '@app/pages/app/app.component';
import { CreatePageComponent } from '@app/pages/create-page/create-page.component';
import { EditPageComponent } from '@app/pages/edit-page/edit-page.component';
import { FormPageComponent } from '@app/pages/form-page/form-page.component';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { WaitPageComponent } from '@app/pages/wait-page/wait-page.component';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: MainPageComponent },
    { path: 'game', component: GamePageComponent },
    { path: 'create', component: CreatePageComponent },
    { path: 'admin', component: AdministrationPageComponent },
    { path: 'form', component: FormPageComponent },
    { path: 'edit/:gameId', component: EditPageComponent },
    { path: 'wait', component: WaitPageComponent },
    { path: '**', redirectTo: '/home' },
];

enableProfiling();
bootstrapApplication(AppComponent, {
    providers: [provideZoneChangeDetection(), provideHttpClient(), provideRouter(routes, withHashLocation(), withComponentInputBinding())],
});
