import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActiveGameTableComponent } from '@app/components/common/active-game-table/active-game-table.component';

@Component({
    selector: 'app-join-page',
    imports: [ActiveGameTableComponent, RouterLink],
    templateUrl: './join-page.component.html',
})
export class JoinPageComponent {}
