import { ICharacter, Team } from '@common/character';
import { Schema } from 'mongoose';
import { positionSchema } from '@app/schemas/position';

export const characterSchema = new Schema<ICharacter>(
    {
        name: {
            type: String,
            required: true,
            maxLength: 20,
        },
        avatar: {
            type: String,
            required: true,
        },
        initialHealth: {
            type: Number,
            required: true,
        },
        currentHealth: {
            type: Number,
            required: true,
        },
        attackBonusDiceType: {
            type: String,
            required: true,
        },
        defenseBonusDiceType: {
            type: String,
            required: true,
        },
        rapidityPoints: {
            type: Number,
            required: true,
        },
        attackPoints: {
            type: Number,
            required: true,
        },
        defensePoints: {
            type: Number,
            required: true,
        },
        actionsLeft: {
            type: Number,
            required: true,
        },
        movementLeft: {
            type: Number,
            required: true,
        },
        currentPosition: {
            type: positionSchema,
            required: true,
        },
        startingPosition: {
            type: positionSchema,
            default: { x: 0, y: 0 },
        },
        victories: {
            type: Number,
            required: true,
        },
        hasAbandoned: {
            type: Boolean,
            default: false,
        },
        team: {
            type: String,
            enum: Object.values(Team),
            default: null,
        },
        fightSanctuaryUsed: {
            type: Boolean,
            default: false,
        },
        fightSanctuaryTurnsRemaining: {
            type: Number,
            default: 0,
        },
        fightSanctuaryBonus: {
            type: Number,
            default: 0,
        },
        virtualPlayerProfile: {
            type: String,
            required: false,
        },

        nCombats: {
            type: Number,
            required: true,
        },
        nVictories: {
            type: Number,
            required: true,
        },
        nDefeats: {
            type: Number,
            required: true,
        },
        totalDamageDealt: {
            type: Number,
            required: true,
        },
        totalDamageReceived: {
            type: Number,
            required: true,
        },
        visitedCells: {
            type: [String],
            default: [],
        },
    },
    { _id: false },
);
