import { Attribute, ExplorationSkill, Save } from "../module/config";

/**
 * template.json interface backed by "common" template
 */
interface ActorDataSourceTemplateCommon {
  retainer: {
    enabled: boolean;
    loyalty: number;
    wage: string;
  };
  hp: {
    hd: string;
    value: number;
    max: number;
  };
  ac: {
    value: number;
    mod: number;
  };
  aac: {
    value: number;
    mod: number;
  };
  thac0: {
    value: number;
    bba: number;
    mod: {
      missile: number;
      melee: number;
    };
  };
  saves: Record<Save, { value: number }>;
  movement: {
    base: number;
  };
  initiative: {
    value: number;
    mod: number;
  };
}

type SpellLevels = "1" | "2" | "3" | "4" | "5" | "6";
/**
 * template.json interface backed by "spellcaster" template
 */
interface ActorDataSourceTemplateSpellcaster {
  spells: Record<SpellLevels, { max: number }> & {
    enabled: false;
  };
}

/**
 * template.json character actor type
 */
interface ActorDataSourceDataCharacter
  extends ActorDataSourceTemplateCommon,
    ActorDataSourceTemplateSpellcaster {
  config: {
    movementAuto: boolean;
  };
  details: {
    biography: string;
    notes: string;
    class: string;
    title: string;
    alignment: string;
    level: number;
    xp: {
      share: number;
      next: number;
      value: number;
      bonus: number;
    };
  };
  exploration: Record<ExplorationSkill, number>;
  scores: Record<Attribute, { value: number; bonus: number }>;
  encumbrance: {
    max: number;
  };
  languages: {
    value: string[];
  };
}

/**
 * template.json monster actor type
 */
interface ActorDataSourceDataMonster
  extends ActorDataSourceTemplateCommon,
    ActorDataSourceTemplateSpellcaster {
  details: {
    biography: string;
    alignment: string;
    xp: number;
    treasure: {
      table: string;
      type: string;
    };
    appearing: {
      d: number;
      w: number;
    };
    morale: number;
  };
  attacks: string;
}

interface CharacterDataSource {
  type: "character";
  data: ActorDataSourceDataCharacter;
}
interface MonsterDataSource {
  type: "monster";
  data: ActorDataSourceDataMonster;
}

type CharacterDataSourceProperties = ActorDataSourceDataCharacter & {
  isSlow: boolean;
  treasure: number;
  languages: {
    literacy: string;
    spoken: string;
  };
  movement: {
    encounter: number;
  };
  scores: {
    str: { mod: number };
    int: { mod: number };
    wis: { mod: number };
    dex: { mod: number; init: number };
    con: { mod: number };
    cha: { mod: number; npc: number; retain: number; loyalty: number };
  };
  ac: {
    shield: number;
    naked: number;
  };
  aac: {
    shield: number;
    naked: number;
  };
  exploration: {
    odMod: number;
  };
  encumbrance: {
    pct: number;
    encumbered: boolean;
    value: number;
    steps: number[];
  };
};

type MonsterDataSourceProperties = ActorDataSourceDataMonster & {
  isSlow: boolean;
  movement: {
    encounter: number;
  };
};

interface CharacterDataProperties {
  type: "character";
  data: CharacterDataSourceProperties;
}
interface MonsterDataProperties {
  type: "monster";
  data: MonsterDataSourceProperties;
}

/**
 * Types ending in "Source" are the data configurations persisted.
 *
 * The raw definitions can be found in template.json
 */
export type ActorDataSource = CharacterDataSource;

/**
 * Types ending in "Properties" are the properties found after all data is prepared.
 */
export type ActorDataProperties =
  | CharacterDataProperties
  | MonsterDataProperties;
