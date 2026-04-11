import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
    selector: 'app-game-action-controls',
    templateUrl: './game-action-controls.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'block w-full',
    },
})
export class GameActionControlsComponent {
    readonly currentTurnPlayerName = input<string | null>(null);
    readonly showTurnTimer = input(false);
    readonly turnTimeLeftSeconds = input<number | null>(null);
    readonly isTurnPreparing = input(false);
    readonly isInCombat = input(false);
    readonly combatStatus = input('');
    readonly canEndTurn = input(false);
    readonly canToggleActionMode = input(false);
    readonly actionMode = input(false);
    readonly isGameFinished = input(false);
    readonly isLocalPlayerTurn = input(false);
    readonly localPlayerHasActionLeft = input(false);

    readonly endTurnRequested = output<void>();
    readonly toggleActionModeRequested = output<void>();
}
