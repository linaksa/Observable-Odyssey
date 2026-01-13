import { Avatar, DiceType } from "@app/constants";
import { Schema } from "mongoose";

export interface ICharacter {
    name: string;
    avatar: Avatar;
    initialHealth: Number;
    currentHealth: Number;
    attackBonusDiceType: DiceType;
    defenseBonusDiceType: DiceType;
    rapidityPoints: Number;
    attackPoints: Number;
    defensePoints: Number;
    actionsLeft: Number;
    movementLeft: Number;
    x: Number;
    y: Number;
}

export const characterSchema = new Schema<ICharacter>({
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
    x: {
        type: Number,
        required: true,
    },
    y: {
        type: Number,
        required: true,
    }
}, { _id: false });