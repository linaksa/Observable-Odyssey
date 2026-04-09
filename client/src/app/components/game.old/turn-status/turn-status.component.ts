import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GameAbandonComponent } from '@app/components/game/game-abandon/game-abandon.component';
import { TurnStatusData } from '@common/info';

@Component({
    selector: 'app-turn-status',
    imports: [GameAbandonComponent],
    templateUrl: './turn-status.component.html',
})
export class TurnStatusComponent {
    @Input({ required: true }) data!: TurnStatusData;
    @Output() endTurnRequested = new EventEmitter<void>();

    onEndTurnClick(): void {
        this.endTurnRequested.emit();
    }
}
