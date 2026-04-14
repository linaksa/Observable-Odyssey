import { provideHttpClient } from '@angular/common/http';
import { enableProdMode, enableProfiling, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Routes, provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { activePlayerGuard } from '@app/guards/active-player.guard';
import { waitPageGuard } from '@app/guards/wait-page.guard';
import { AngularHttpClientAdapter } from '@app/http/angular-http-client-adapter';
import { HTTP_CLIENT } from '@app/http/http-interface';
import { AdministrationPageComponent } from '@app/pages/admin/administration-page/administration-page.component';
import { EditorPageComponent } from '@app/pages/admin/editor-page/editor-page.component';
import { AppComponent } from '@app/pages/core/app/app.component';
import { ErrorPageComponent } from '@app/pages/core/error-page/error-page.component';
import { MainPageComponent } from '@app/pages/core/main-page/main-page.component';
import { FormPageComponent } from '@app/pages/gameplay/form-page/form-page.component';
import { GameEndComponent } from '@app/pages/gameplay/game-end/game-end.component';
import { GamePageComponent } from '@app/pages/gameplay/game-page/game-page.component';
import { CreatePageComponent } from '@app/pages/lobby/create-page/create-page.component';
import { JoinFormPageComponent } from '@app/pages/lobby/join-form-page/join-form-page.component';
import { JoinPageComponent } from '@app/pages/lobby/join-page/join-page.component';
import { WaitPageComponent } from '@app/pages/lobby/wait-page/wait-page.component';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: MainPageComponent },
    { path: 'create', component: CreatePageComponent },
    { path: 'admin', component: AdministrationPageComponent },
    { path: 'form/:gameId', component: FormPageComponent },
    { path: 'edit/:gameId', component: EditorPageComponent },
    { path: 'wait/:activeGameId', component: WaitPageComponent, canActivate: [waitPageGuard] },
    { path: 'play/:activeGameId', component: GamePageComponent, canActivate: [activePlayerGuard] },
    { path: 'join', component: JoinPageComponent },
    { path: 'join/:activeGameId', component: JoinFormPageComponent },
    { path: 'end/:activeGameId', component: GameEndComponent },
    { path: 'error', component: ErrorPageComponent },
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
