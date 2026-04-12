import { Router } from '@angular/router';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ToastService } from '@app/services/ui/toast.service';
import { IActiveGame } from '@common/activeGame';
import { CombatOutcome, CombatTurnOutcome } from '@common/attackResult';
import { ICharacter } from '@common/character';
import { SocketEvent } from '@common/socket-events';
import { IFlagActionData } from '@common/socket-payloads';

export interface BooleanSignal {
    update(updater: (current: boolean) => boolean): void;
}

export interface ActiveGameSocketContext {
    socket: SocketService;
    localPlayer: LocalPlayerService;
    toastService: ToastService;
    router: Router;
    getActiveGame: () => IActiveGame | undefined;
    setActiveGame: (activeGame: IActiveGame) => void;
    getPlayerByName: (playerName: string) => ICharacter | undefined;
    setCombatOutcome: (combatOutcome: CombatOutcome) => void;
    setRoundOutcome: (roundCombatOutcome: CombatTurnOutcome | null) => void;
    currentPlayer: {
        set(value: number): void;
    };
    hasChangedLocation: BooleanSignal;
    hasAbandoned: BooleanSignal;
    gameHasEnded: BooleanSignal;
    handleFlagActionRequest: (data: IFlagActionData, acceptEvent: SocketEvent.TakeFlag | SocketEvent.GiveFlag) => void;
    closeFlagActionRequestIfExpired: (currentTurnPlayerName: string) => void;
}
