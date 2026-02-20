import { Component } from '@angular/core';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';

@Component({
    selector: 'app-wait-page',
    imports: [NavButtonsComponent, PageTitleComponent],
    templateUrl: './wait-page.component.html',
})
export class WaitPageComponent {}
