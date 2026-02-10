import { provideHttpClient } from '@angular/common/http';
import { enableProdMode, enableProfiling, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Routes, provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { AngularHttpClientAdapter } from '@app/http/angular-http-client-adapter';
import { HTTP_CLIENT } from '@app/http/http-interface';
import { AdministrationPageComponent } from '@app/pages/administration-page/administration-page.component';
import { AppComponent } from '@app/pages/app/app.component';
import { CreatePageComponent } from '@app/pages/create-page/create-page.component';
import { EditionPageComponent } from '@app/pages/edition-page/edition-page.component';
import { FormPageComponent } from '@app/pages/form-page/form-page.component';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { WaitPageComponent } from '@app/pages/wait-page/wait-page.component';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: MainPageComponent },
    { path: 'create', component: CreatePageComponent },
    { path: 'admin', component: AdministrationPageComponent },
    { path: 'form', component: FormPageComponent },
    { path: 'edit/:gameId', component: EditionPageComponent },
    { path: 'wait', component: WaitPageComponent },
    { path: '**', redirectTo: '/home' },
];

enableProfiling();
bootstrapApplication(AppComponent, {
    providers: [
        provideZoneChangeDetection(),
        provideHttpClient(),
        provideRouter(routes, withHashLocation(), withComponentInputBinding()),
        {
            provide: HTTP_CLIENT,
            useClass: AngularHttpClientAdapter,
        },
    ],
});
