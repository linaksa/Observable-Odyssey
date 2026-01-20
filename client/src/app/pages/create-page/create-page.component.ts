import { Component } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppMaterialModule } from '@app/modules/material.module';

const MOCK_GAME = [
    {
        gameTitle: 'Epic Battle Arena',
        description: 'An exciting CTF game with challenging obstacles and strategic positioning',
        gameMode: 'ctf',
        lastModifiedDate: '2026-01-11T11:25:55.440Z',
        dateCreated: '2026-01-07T16:03:14.440Z',
        visibility: 'hidden',
        preview: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        board: {
            cells: [
                ['ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER'],
                ['WATER', 'ICE', 'WATER', 'ICE', 'WATER', 'WATER', 'WATER', 'ICE', 'WATER', 'WALL'],
                ['WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER'],
                ['WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE'],
                ['ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WATER', 'WATER', 'ICE', 'WATER'],
                ['WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL'],
                ['WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER'],
                ['WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE'],
                ['ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WATER', 'WATER', 'ICE', 'WATER'],
                ['WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL'],
            ],
            items: [
                {
                    x: 0,
                    y: 0,
                    size: 1,
                    itemType: 'startingPosition',
                },
                {
                    x: 3,
                    y: 3,
                    size: 1,
                    itemType: 'startingPosition',
                },
                {
                    x: 1,
                    y: 1,
                    size: 4,
                    itemType: 'fightSanctuary',
                },
            ],
        },
        _id: '696fa742d7b16f3f2849c333',
        __v: 0,
    },
    {
        gameTitle: 'Epic Battle Arena2',
        description: 'An exciting CTF game with challenging obstacles and strategic positioning',
        gameMode: 'ctf',
        lastModifiedDate: '2026-01-20T16:03:14.440Z',
        dateCreated: '2026-01-20T16:03:14.440Z',
        visibility: 'hidden',
        preview: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        board: {
            cells: [
                ['ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER'],
                ['WATER', 'ICE', 'WATER', 'ICE', 'WATER', 'WATER', 'WATER', 'ICE', 'WATER', 'WALL'],
                ['WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER'],
                ['WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE'],
                ['ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WATER', 'WATER', 'ICE', 'WATER'],
                ['WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL'],
                ['WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER'],
                ['WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE'],
                ['ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WATER', 'WATER', 'ICE', 'WATER'],
                ['WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL', 'WATER', 'ICE', 'WATER', 'WALL'],
            ],
            items: [
                {
                    x: 0,
                    y: 0,
                    size: 1,
                    itemType: 'startingPosition',
                },
                {
                    x: 3,
                    y: 3,
                    size: 1,
                    itemType: 'startingPosition',
                },
                {
                    x: 1,
                    y: 1,
                    size: 4,
                    itemType: 'fightSanctuary',
                },
            ],
        },
        _id: '696fa742d7b16f3f2849c333',
        __v: 0,
    },
];

type TableRow = {
    name: string;
    description: string;
    size: string;
    mode: string;
    lastEdited: string;
    image: string;
};

const ELEMENT_DATA: TableRow[] = MOCK_GAME.map((game) => ({
    name: game.gameTitle,
    description: game.description,
    size: `${game.board.cells[0].length}x${game.board.cells.length}`,
    mode: game.gameMode,
    lastEdited: new Date(game.lastModifiedDate).toISOString().slice(0, 10),
    image: game.preview,
}));

@Component({
    selector: 'app-create-page',
    imports: [MatTableModule, MatTooltipModule, AppMaterialModule],
    templateUrl: './create-page.component.html',
    styleUrl: './create-page.component.scss',
})
export class CreatePageComponent {
    displayedColumns: string[] = ['image', 'name', 'size', 'mode', 'lastEdited', 'actions'];
    dataSource = ELEMENT_DATA;
}
