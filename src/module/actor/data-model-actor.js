import OseDataModelCharacterAC from "./data-model-classes/data-model-character-ac";
import OseDataModelCharacterMove from "./data-model-classes/data-model-character-move";
import OseDataModelCharacterScores from "./data-model-classes/data-model-character-scores";
import OseDataModelCharacterSpells from "./data-model-classes/data-model-character-spells";
import OseDataModelCharacterEncumbrance from "./data-model-classes/data-model-character-encumbrance";

// Encumbrance schemes
import OseDataModelCharacterEncumbranceBasic from "./data-model-classes/data-model-character-encumbrance-basic";
import OseDataModelCharacterEncumbranceDetailed from "./data-model-classes/data-model-character-encumbrance-detailed";
import OseDataModelCharacterEncumbranceComplete from "./data-model-classes/data-model-character-encumbrance-complete";

const getItemsOfActorOfType = (actor, filterType, filterFn = null) =>
  actor.items
    .filter(({ type }) => type === filterType)
    .filter(filterFn ? filterFn : () => true);

export default class OseDataModelActor extends foundry.abstract.DataModel {
  prepareDerivedData() {
    this.spells = new OseDataModelCharacterSpells(
      this.spells,
      this.#spellList
    )
  }
  get armor() {
    return getItemsOfActorOfType(
      this.parent,
      'armor',
      ({ system: { containerId } }) => !containerId
    );
  }
  get containers() {
    const containerContent = this.parent.items
      .filter(({ system: { containerId } }) => containerId)
      .reduce((obj, item) => {
        const { containerId } = item.system;

        return {
          ...obj,
          [containerId]: obj[containerId] ? [...obj[containerId], item] : [item]
        }
      }, {});

    const containers = getItemsOfActorOfType(
      this.parent,
      'container',
      ({ system: { containerId } }) => !containerId
    );

    const reducedWeight = (acc, { system: { weight, quantity } }) => (
      acc + weight * (quantity?.value || 1)
    );

    const mapItemsToContainer = (container, key) => ({
      ...container,
      system: {
        ...container.system,
        itemIds: containerContent[container.id] || [],
        totalWeight: containerContent[container.id]?.reduce(reducedWeight, 0)
      }
    });

    return containers.map(mapItemsToContainer);
  }
  get items() {
    return getItemsOfActorOfType(
      this.parent,
      'item',
      ({ system: { treasure, containerId } }) => !treasure && !containerId
    );
  }
  get treasures() {
    return getItemsOfActorOfType(
      this.parent,
      'item',
      ({ system: { treasure, containerId } }) => treasure && !containerId
    );
  }
  get weapons() {
    return getItemsOfActorOfType(
      this.parent,
      'weapon',
      ({ system: { containerId } }) => !containerId
    );
  }
  get abilities() {
    return getItemsOfActorOfType(
      this.parent,
      'ability',
      ({ system: { containerId } }) => !containerId
    ).sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get #spellList() {
    return getItemsOfActorOfType(
      this.parent,
      'spell',
      ({ system: { containerId } }) => !containerId
    );
  }
}
