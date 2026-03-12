export interface AttackResult {
    attackerName: string;
    defenderName: string;
    attackerVictories: number;
    defenderNewPosition: { x: number; y: number };
}
