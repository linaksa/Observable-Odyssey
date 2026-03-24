export interface AttackResult {
    attackerName: string;
    defenderName: string;
    attackerVictories: number;
    attackerActionsLeft: number;
    defenderNewPosition: { x: number; y: number };
}

export enum AttackPosture {
    Offensive = 'Offensive',
    Defensive = 'Defensive',
}
