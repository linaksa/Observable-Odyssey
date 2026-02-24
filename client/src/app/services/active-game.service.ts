import { Injectable } from '@angular/core';
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';

@Injectable({
    providedIn: 'root',
})
export class ActiveGameService {
    playerName: string = 'Player 1';

    activeGame: IActiveGame = {
        _id: {
            $oid: '699485279b3aa7b27b28f4ee',
        },
        game: {
            gameTitle: 'ermlk534ejr534 v2',
            description: 'rgdrgdrfgrgerdgerfsdfsfas',
            gameMode: 'classic',
            lastModifiedDate: new Date(),
            dateCreated: new Date(),
            visibility: 'hidden',
            preview: '',
            board: {
                cells: [
                    ['EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY'],
                    ['EMPTY', 'ICE', 'ICE', 'ICE', 'ICE', 'ICE', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY'],
                    ['EMPTY', 'ICE', 'ICE', 'ICE', 'ICE', 'ICE', 'WATER', 'WATER', 'WATER', 'EMPTY'],
                    ['EMPTY', 'ICE', 'ICE', 'ICE', 'ICE', 'ICE', 'WATER', 'WATER', 'WATER', 'EMPTY'],
                    ['EMPTY', 'ICE', 'ICE', 'ICE', 'ICE', 'ICE', 'WATER', 'WATER', 'WATER', 'EMPTY'],
                    ['ICE', 'ICE', 'EMPTY', 'ICE', 'EMPTY', 'EMPTY', 'WATER', 'WATER', 'WATER', 'EMPTY'],
                    ['EMPTY', 'ICE', 'ICE', 'ICE', 'ICE', 'ICE', 'WATER', 'WATER', 'WATER', 'EMPTY'],
                    ['EMPTY', 'ICE', 'ICE', 'ICE', 'ICE', 'ICE', 'WATER', 'WATER', 'WATER', 'WATER'],
                    ['EMPTY', 'ICE', 'ICE', 'WATER', 'ICE', 'ICE', 'WATER', 'WATER', 'WATER', 'EMPTY'],
                    ['ICE', 'ICE', 'ICE', 'ICE', 'ICE', 'ICE', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY'],
                ],
                items: [
                    { x: 0, y: 5, size: 4, itemType: 'fightSanctuary' },
                    { x: 0, y: 7, size: 4, itemType: 'lifeSanctuary' },
                    { x: 0, y: 1, size: 1, itemType: 'startingPosition' },
                    { x: 1, y: 1, size: 1, itemType: 'startingPosition' },
                ],
            },
        },
        players: [
            {
                name: 'Player 1',
                avatar: Avatar.Avatar2,
                initialHealth: 10,
                currentHealth: 10,
                attackBonusDiceType: DiceType.FourSided,
                defenseBonusDiceType: DiceType.FourSided,
                rapidityPoints: 5,
                attackPoints: 3,
                defensePoints: 2,
                actionsLeft: 2,
                movementLeft: 3,
                x: 0,
                y: 0,
            },
        ],
        messages: [],
        itemsState: [],
    } as IActiveGame;

    getPlayerByName(playerName: string): ICharacter | undefined {
        return this.activeGame.players.find((player) => player.name === playerName);
    }
}
