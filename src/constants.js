class IEnum {
	constructor(values) {
		this.values = values;
	}

	readFrom(reader) {
		var val = reader.readInt(true);

		return this.values[val];
	}
}

exports.PlayerInit = {
	values: ["dragOrder", "dragNumber", "dragNumberRequired", "numpad"],
};

exports.AttackModifier = {
	values: ["plus0", "plus1", "plus2", "minus1", "minus2", "nullAttack", "doubleAttack", "bless", "curse"],
};

exports.ElementState = {
	values: ["inert", "strong", "waning"],
};

exports.Condition = {
	values: ["star", "summonNew", "summon", "stun", "immobilize", "disarm", "wound", "muddle", "poison", "strengthen", "invisible", "regenerate", "doom"],
};

exports.CharacterClass = {
	values: ["Escort", "Objective", "Brute", "Cragheart", "Mindthief", "Scoundrel", "Spellweaver", "Tinkerer", "Diviner", "Beast Tyrant", "Berserker", "Doomstalker", "Elementalist", "Nightshroud", "Plagueherald", "Quartermaster", "Sawbones", "Soothsinger", "Summoner", "Sunkeeper", "Bladeswarm"],
};

exports.MonsterType = {
	values: ["normal", "elite", "boss", "summon"],
};

exports.SummonColor = {
	values: ["beast", "blue", "green", "yellow", "orange", "white", "purple", "pink", "red"],
};

exports.MonsterName = {
	values: ["Ancient Artillery", "Bandit Archer", "Bandit Guard", "Black Imp", "Cave Bear", "City Archer", "City Guard", "Cultist", "Deep Terror", "Earth Demon", "Flame Demon", "Frost Demon", "Forest Imp", "Giant Viper", "Harrower Infester", "Hound", "Inox Archer", "Inox Guard", "Inox Shaman", "Living Bones", "Living Corpse", "Living Spirit", "Lurker", "Ooze", "Night Demon", "Rending Drake", "Savvas Icestorm", "Savvas Lavaflow", "Spitting Drake", "Stone Golem", "Sun Demon", "Vermling Scout", "Vermling Shaman", "Wind Demon", "Bandit Commander", "The Betrayer", "Captain of the Guard", "The Colorless", "Dark Rider", "Elder Drake", "The Gloom", "Inox Bodyguard", "Jekserah", "Merciless Overseer", "Prime Demon", "The Sightless Eye", "Winged Horror", "Aesther Ashblade", "Aesther Scout", "Bear - Drake Abomination", "Valrath Tracker", "Valrath Savage", "Wolf - Viper Abomination", "Human Commander", "Valrath Commander", "Manifestation of Corruption"]
};

exports.MonsterRating = { "Ancient Artillery": "1", "Bandit Archer": "1", "Bandit Guard": "1", "Black Imp": "0.5", "Cave Bear": "2", "City Archer": "1", "City Guard": "1", "Cultist": "1", "Deep Terror": "1", "Earth Demon": "1.5", "Flame Demon": "1.5", "Forest Imp": "0.5", "Frost Demon": "1.5", "Giant Viper": "0.5", "Harrower Infester": "1.5", "Hound": "1", "Inox Archer": "1", "Inox Guard": "1", "Inox Shaman": "1", "Living Bones": "1", "Living Corpse": "1", "Living Spirit": "1", "Lurker": "1.5", "Night Demon": "1.5", "Ooze": "1", "Savvas Icestorm": "2", "Savvas Lavaflow": "2", "Spitting Drake": "1.5", "Stone Golem": "2", "Sun Demon": "1.5", "Vermling Scout": "0.5", "Vermling Shaman": "1", "Vicious Drake": "1.5", "Wind Demon": "1.5" }
exports.keyboard = {
	BACKSPACE: 8,
	TAB: 9,
	ENTER: 13,
	SHIFT: 16,
	CTRL: 17,
	ALT: 18,
	PAUSE: 19,
	CAPS_LOCK: 20,
	ESCAPE: 27,
	SPACE: 32,
	PAGE_UP: 33,
	PAGE_DOWN: 34,
	END: 35,
	HOME: 36,
	LEFT_ARROW: 37,
	UP_ARROW: 38,
	RIGHT_ARROW: 39,
	DOWN_ARROW: 40,
	INSERT: 45,
	DELETE: 46,
	KEY_0: 48,
	KEY_1: 49,
	KEY_2: 50,
	KEY_3: 51,
	KEY_4: 52,
	KEY_5: 53,
	KEY_6: 54,
	KEY_7: 55,
	KEY_8: 56,
	KEY_9: 57,
	KEY_A: 65,
	KEY_B: 66,
	KEY_C: 67,
	KEY_D: 68,
	KEY_E: 69,
	KEY_F: 70,
	KEY_G: 71,
	KEY_H: 72,
	KEY_I: 73,
	KEY_J: 74,
	KEY_K: 75,
	KEY_L: 76,
	KEY_M: 77,
	KEY_N: 78,
	KEY_O: 79,
	KEY_P: 80,
	KEY_Q: 81,
	KEY_R: 82,
	KEY_S: 83,
	KEY_T: 84,
	KEY_U: 85,
	KEY_V: 86,
	KEY_W: 87,
	KEY_X: 88,
	KEY_Y: 89,
	KEY_Z: 90,
	LEFT_META: 91,
	RIGHT_META: 92,
	SELECT: 93,
	NUMPAD_0: 96,
	NUMPAD_1: 97,
	NUMPAD_2: 98,
	NUMPAD_3: 99,
	NUMPAD_4: 100,
	NUMPAD_5: 101,
	NUMPAD_6: 102,
	NUMPAD_7: 103,
	NUMPAD_8: 104,
	NUMPAD_9: 105,
	MULTIPLY: 106,
	ADD: 107,
	SUBTRACT: 109,
	DECIMAL: 110,
	DIVIDE: 111,
	F1: 112,
	F2: 113,
	F3: 114,
	F4: 115,
	F5: 116,
	F6: 117,
	F7: 118,
	F8: 119,
	F9: 120,
	F10: 121,
	F11: 122,
	F12: 123,
	NUM_LOCK: 144,
	SCROLL_LOCK: 145,
	SEMICOLON: 186,
	EQUALS: 187,
	COMMA: 188,
	DASH: 189,
	PERIOD: 190,
	FORWARD_SLASH: 191,
	GRAVE_ACCENT: 192,
	OPEN_BRACKET: 219,
	BACK_SLASH: 220,
	CLOSE_BRACKET: 221,
	SINGLE_QUOTE: 222
};