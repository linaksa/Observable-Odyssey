import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameTableComponent } from '@app/components/common/game-table/game-table.component';

@Component({
    selector: 'app-create-page',
    imports: [GameTableComponent, RouterLink],
    templateUrl: './create-page.component.html',
})
export class CreatePageComponent {}
