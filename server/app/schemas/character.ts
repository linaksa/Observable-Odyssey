//TODO Add pictures to assets
enum Avatar {
    AVATAR_1 = 'avatar1',
    AVATAR_2 = 'avatar2',
    AVATAR_3 = 'avatar3',
    AVATAR_4 = 'avatar4',
    AVATAR_5 = 'avatar5',
    AVATAR_6 = 'avatar6',
    AVATAR_7 = 'avatar7',
    AVATAR_8 = 'avatar8',
    AVATAR_9 = 'avatar9',
    AVATAR_10 = 'avatar10',
    AVATAR_11 = 'avatar11',
    AVATAR_12 = 'avatar12',
}

enum DiceType {
    FOUR_SIDED = '',

}

export interface IPlayer {
    name: String;
    avatar: Avatar;
    initialHealth: Number;
    currentHealth: Number;

}