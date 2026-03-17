//Thank you to geeks for geeks for the djikstra algorithm : https://www.geeksforgeeks.org/dsa/dijkstras-shortest-path-algorithm-greedy-algo-7/

import { MinimumHeap } from './min-heap';

export function dijkstra(adj: [number, number][][], src: number): number[] {
    const V = adj.length;

    // Min-heap (priority queue) storing pairs of (distance, node)
    const pq = new MinimumHeap<[number, number]>();

    const dist: number[] = Array(V).fill(Infinity);

    // Distance from source to itself is 0
    dist[src] = 0;
    pq.push([0, src]);

    // Process the queue until all reachable vertices are finalized
    while (!pq.isEmpty()) {
        const top = pq.pop();
        if (!top) continue;

        const [d, u] = top;

        // If this distance not the latest shortest one, skip it
        if (d > dist[u]) continue;

        // Explore all neighbors of the current vertex
        for (const [v, w] of adj[u]) {
            // If we found a shorter path to v through u, update it
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push([dist[v], v]);
            }
        }
    }

    // Return the final shortest distances from the source
    return dist;
}
