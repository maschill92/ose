import OseDataModelCharacterAC from "./data-model-classes/data-model-character-ac";
import OseDataModelCharacterEncumbrance from "./data-model-classes/data-model-character-encumbrance";
import OseDataModelCharacterMove from "./data-model-classes/data-model-character-move";
import OseDataModelCharacterScores from "./data-model-classes/data-model-character-scores";
import OseDataModelCharacterSpells from "./data-model-classes/data-model-character-spells";
import { OseActor } from "./entity";
import OseDataModelActor from "./data-model-actor";
import OseDataModelCharacterEncumbranceDisabled from './data-model-classes/data-model-character-encumbrance-disabled'

export default class OseDataModelMonster extends OseDataModelActor {
  prepareDerivedData() {

    this.movement = new OseDataModelCharacterMove(
      new OseDataModelCharacterEncumbranceDisabled(),
      false,
      this.movement.base
    );
  }

  static defineSchema() {
    const { SchemaField, StringField, NumberField, BooleanField, ObjectField } =
      // @ts-ignore
      foundry.data.fields;

    return {
      // spellcaster template
      spells: new ObjectField(),
      // common
      ac: new SchemaField({
        value: new NumberField({ integer: true }),
        mod: new NumberField({ integer: true }),
      }),
      // common
      aac: new SchemaField({
        value: new NumberField({ integer: true }),
        mod: new NumberField({ integer: true }),
      }),
      //common
      movement: new SchemaField({
        base: new NumberField({ integer: true }),
      }),
      // common
      initiative: new ObjectField(),
      // common
      hp: new SchemaField({
        hd: new StringField(),
        value: new NumberField({ integer: true }),
        max: new NumberField({ integer: true }),
      }),
      // common
      thac0: new ObjectField(),
      // common
      saves: new SchemaField({
        breath: new SchemaField({ value: new NumberField({ integer: true }) }),
        death: new SchemaField({ value: new NumberField({ integer: true }) }),
        paralysis: new SchemaField({
          value: new NumberField({ integer: true }),
        }),
        spell: new SchemaField({ value: new NumberField({ integer: true }) }),
        wand: new SchemaField({ value: new NumberField({ integer: true }) }),
      }),
      // common
      retainer: new SchemaField({
        enabled: new BooleanField(),
        loyalty: new NumberField({ integer: true }),
        wage: new StringField(),
      }),
      // monster
      veryImportantValue: new BooleanField(),
      // monster
      details: new ObjectField(),
      // monster
      attacks: new StringField(),
    };
  }

  get isNew() {
    const ct = Object.values(this.saves).reduce((num, v) => num + v.value, 0);
    return ct == 0;
  }

  get attackPatterns() {
    const attackPatterns = {};

    let colors = Object.keys(CONFIG.OSE.colors);
    colors.push("transparent");

    // Set up attack patterns in specific order
    for (var i = 0; i < colors.length; i++) {
      attackPatterns[colors[i]] = [];
    }

    [...this.weapons, ...this.abilities].forEach((item) => {
      attackPatterns[item.system.pattern].push(item);
    });

    Object.values(attackPatterns).forEach((o) =>
      o.sort(
        (a, b) =>
          b.data.type.localeCompare(a.data.type) ||
          a.data.name.localeCompare(b.data.name)
      )
    );
    return attackPatterns;
  }
}
