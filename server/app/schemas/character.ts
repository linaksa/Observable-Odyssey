import { ICharacter } from '@common/character';
import { Schema } from 'mongoose';
import { positionSchema } from './position';

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
        positionGrille: {
            type: positionSchema,
            required: true,
        },
        victories: {
            type: Number,
            required: true,
        },
    },
    { _id: false },
);
