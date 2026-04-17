import { Position } from '@common/character';
import { DijkstraResult } from '@app/interfaces/dijkstra-result.interface';
import { MinimumHeap } from '@app/utils/min-heap';

export enum Direction {
    Up,
    Down,
    Left,
    Right,
}

export const DIRECTION_DELTA: Record<Direction, Position> = {
    [Direction.Up]: { x: 0, y: -1 },
    [Direction.Down]: { x: 0, y: 1 },
    [Direction.Left]: { x: -1, y: 0 },
    [Direction.Right]: { x: 1, y: 0 },
};

//Code from https://www.geeksforgeeks.org/dsa/dijkstras-shortest-path-algorithm-greedy-algo-7/ adapted to our grid-based graph representation
export function dijkstra(adj: [number, number][][], src: number): DijkstraResult {
    const V = adj.length;
    const pq = new MinimumHeap<[number, number]>();
    const dist: number[] = Array(V).fill(Infinity);
    const prev: (number | null)[] = Array(V).fill(null);

    dist[src] = 0;
    pq.push([0, src]);

    while (!pq.isEmpty()) {
        const top = pq.pop();
        if (!top) continue;

        const [d, u] = top;
        if (d > dist[u]) continue;

        for (const [v, w] of adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                prev[v] = u;
                pq.push([dist[v], v]);
            }
        }
    }

    return { distances: dist, predecessors: prev };
}

// Reconstruct node indices from src to target, excluding target's own cell
export function reconstructPath(predecessors: (number | null)[], src: number, target: number): number[] {
    const path: number[] = [];
    let current: number | null = target;

    while (current !== null && current !== src) {
        path.unshift(current);
        current = predecessors[current];
    }

    // Remove the target's cell itself — stop adjacent
    path.pop();

    return path; // each entry is a flat grid index
}

export function indexToDirection(from: number, to: number, totalColumns: number): Direction {
    const fromRow = Math.floor(from / totalColumns);
    const fromCol = from % totalColumns;
    const toRow = Math.floor(to / totalColumns);
    const toCol = to % totalColumns;

    if (toRow < fromRow) return Direction.Up;
    if (toRow > fromRow) return Direction.Down;
    if (toCol < fromCol) return Direction.Left;
    return Direction.Right;
}
