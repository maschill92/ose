import { ArmorType, PatternColor, RollType, Save } from "../module/config";
import { OseItem } from "../module/item/entity";

type Tags = {title: string; value: string;}[]

/**
 * template.json interface backed by "common" Item template
 */
interface ItemDataSourceTemplateCommon {
  description: string;
  autoTags: { label: string; icon: string }[];
  /**
   * Does this get used? push/popManualTag functions use this.data.data.tags... Also it's defined in "derived data"
   */
  manualTags: Tags;
}

/**
 * template.json interface backed by "physical" Item template
 */
interface ItemDataSourceTemplatePhysical {
  quantity: {
    value: number;
    max: number;
  };
  weight: number;
  cost: number;
  containerId: string;
}

/**
 * template.json interface backed by "rollable" Item template
 */
interface ItemDataSourceTemplateRollable {
  save: Save;
}

/**
 * template.json interface backed by "equippable" Item template
 */
interface ItemDataSourceTemplateEquippable {
  equipped: boolean;
}

/**
 * template.json item Item type
 */
interface ItemDataSourceItemData
  extends ItemDataSourceTemplateCommon,
    ItemDataSourceTemplatePhysical {
  treasure: boolean;
  isContainer: boolean;
  //FIXME: This is used in item-sheet.html and item/entity.ts but isn't defined in template.json
  tags: Tags;
}
interface ItemDataSourceItem {
  type: "item";
  data: ItemDataSourceItemData;
}

/**
 * template.json container Item type
 */
interface ItemDataSourceContainerData
  extends ItemDataSourceTemplateCommon,
    ItemDataSourceTemplatePhysical {
  // FIXME: This is defined in template.json... It is used as an OseItem[]
  // at the very least it should be moved to a "properties" type as it's derived?
  itemIds: OseItem[];
}
interface ItemDataSourceContainer {
  type: "container";
  data: ItemDataSourceContainerData;
}

/**
 * template.json weapon Item type
 */
interface ItemDataSourceWeaponData
  extends ItemDataSourceTemplateCommon,
    ItemDataSourceTemplatePhysical,
    ItemDataSourceTemplateRollable,
    ItemDataSourceTemplateEquippable {
  range: {
    short: number;
    medium: number;
    long: number;
  };
  pattern: string;
  damage: string;
  bonus: number;
  tags: Tags;
  slow: boolean;
  missile: boolean;
  melee: boolean;
  counter: {
    value: number;
    max: number;
  };
}
interface ItemDataSourceWeapon {
  type: "weapon";
  data: ItemDataSourceWeaponData;
}

/**
 * template.json armor Item type
 */
interface ItemDataSourceArmorData
  extends ItemDataSourceTemplateCommon,
    ItemDataSourceTemplatePhysical,
    ItemDataSourceTemplateEquippable {
  // TODO: ac and aac are defined in template.json as number, but they are used every where as the structure defined here. template.json should be updated.
  ac: { value: number };
  aac: { value: number };
  type: ArmorType;
  //FIXME: This is used in armor-sheet.html and item/entity.ts but isn't defined in template.json
  tags: Tags;
}
interface ItemDataSourceArmor {
  type: "armor";
  data: ItemDataSourceArmorData;
}

/**
 * template.json spell Item type
 */
interface ItemDataSourceSpellData
  extends ItemDataSourceTemplateCommon,
    ItemDataSourceTemplateRollable {
  lvl: number;
  class: string;
  duration: string;
  range: string;
  roll: string;
  memorized: number;
  cast: number;
}
interface ItemDataSourceSpell {
  type: "spell";
  data: ItemDataSourceSpellData;
}

/**
 * template.json ability Item type
 */
interface ItemDataSourceAbilityData
  extends ItemDataSourceTemplateCommon,
    ItemDataSourceTemplateRollable {
  pattern: PatternColor;
  requirements: string;
  roll: string;
  rollType: RollType;
  rollTarget: number;
  blindroll: true;
}
interface ItemDataSourceAbility {
  type: "ability";
  data: ItemDataSourceAbilityData;
}

/**
 * Types ending in "Source" are the data configurations persisted.
 *
 * The raw definitions can be found in template.json
 */
export type ItemDataSource =
  | ItemDataSourceItem
  | ItemDataSourceContainer
  | ItemDataSourceWeapon
  | ItemDataSourceArmor
  | ItemDataSourceSpell
  | ItemDataSourceAbility;

/**
 * Types ending in "Properties" are the properties found after all data is prepared.
 */
export type ItemDataProperties =
  | ItemDataSourceItem
  | ItemDataSourceContainer
  | ItemDataSourceWeapon
  | ItemDataSourceArmor
  | ItemDataSourceSpell
  | ItemDataSourceAbility;
