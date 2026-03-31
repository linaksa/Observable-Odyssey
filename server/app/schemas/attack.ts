import { inMemoryDb } from '@app/database';
import { ICurrentAttack } from '@common/activeGame';
import { AttackPosture } from '@common/attackResult';
import { Schema } from 'mongoose';

export const currentAttackSchema = new Schema<ICurrentAttack>({
    attacker: {
        type: String,
        required: true,
    },
    defender: {
        type: String,
        required: true,
    },

    turnCount: {
        type: Number,
        required: true,
    },

    attackerPosture: {
        type: String,
        enum: [AttackPosture.Offensive, AttackPosture.Defensive],
        default: null,
    },

    defenderPosture: {
        type: String,
        enum: [AttackPosture.Offensive, AttackPosture.Defensive],
        default: null,
    },

    suspendedTurnTimer: {
        type: Number,
        required: true,
        default: 0,
    },
});

export const currentAttackModel = inMemoryDb.model<ICurrentAttack>('CurrentAttack', currentAttackSchema);
