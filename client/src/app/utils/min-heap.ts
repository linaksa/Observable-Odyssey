// Assisted by artificial intelligence

export class MinimumHeap<T extends [number, number]> {
    private heap: T[] = [];

    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    push(value: T): void {
        this.heap.push(value);
        this.bubbleUp();
    }

    pop(): T | undefined {
        if (this.heap.length === 0) return undefined;

        const min = this.heap[0];
        const end = this.heap.pop();

        if (this.heap.length > 0 && end) {
            this.heap[0] = end;
            this.bubbleDown();
        }

        return min;
    }

    private bubbleUp(): void {
        let index = this.heap.length - 1;

        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);

            if (this.heap[parent][0] <= this.heap[index][0]) break;

            [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];

            index = parent;
        }
    }

    private bubbleDown(): void {
        let index = 0;

        while (true) {
            const left = 2 * index + 1;
            const right = 2 * index + 2;
            let smallest = index;

            if (left < this.heap.length && this.heap[left][0] < this.heap[smallest][0]) {
                smallest = left;
            }

            if (right < this.heap.length && this.heap[right][0] < this.heap[smallest][0]) {
                smallest = right;
            }

            if (smallest === index) break;

            [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];

            index = smallest;
        }
    }
}
