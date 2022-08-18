import { OseActorSheet } from "./actor-sheet";
import { OseCharacterModifiers } from "../dialog/character-modifiers";
import { OseCharacterGpCost } from "../dialog/character-gp-cost.js";
import { OseCharacterCreator } from "../dialog/character-creation";
import { Attribute, ExplorationSkill, OSE } from "../config";
import { OseItem } from "../item/entity";

/**
 * Extend the basic ActorSheet with some very simple modifications
 */
export class OseActorSheetCharacter extends OseActorSheet {
  /**
   * Extend and override the default options used by the 5e Actor Sheet
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ose", "sheet", "actor", "character"],
      template: `${OSE.systemPath()}/templates/actors/character-sheet.html`,
      width: 450,
      height: 530,
      resizable: true,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "attributes",
        },
      ],
      scrollY: [".inventory"],
    });
  }

  /**
   * Organize and classify Owned Items for Character sheets
   * @private
   */
  _prepareItems(data: any) {
    const itemsData = this.actor.data.items;
    const containerContents: { [key: string]: OseItem[] } = {};
    // Partition items by category
    let [containers, treasures, items, weapons, armors, abilities, spells] =
      itemsData.reduce<
        [
          OseItem[],
          OseItem[],
          OseItem[],
          OseItem[],
          OseItem[],
          OseItem[],
          OseItem[]
        ]
      >(
        (arr, item) => {
          // Classify items into types
          const containerId =
            "containerId" in item?.data?.data
              ? item.data.data.containerId
              : null;
          if (containerId) {
            containerContents[containerId] = [
              ...(containerContents[containerId] || []),
              item,
            ];
          } else if (item.type === "container") arr[0].push(item);
          else if (item.type === "item" && "treasure" in item?.data?.data)
            arr[1].push(item);
          else if (item.type === "item") arr[2].push(item);
          else if (item.type === "weapon") arr[3].push(item);
          else if (item.type === "armor") arr[4].push(item);
          else if (item.type === "ability") arr[5].push(item);
          else if (item.type === "spell") arr[6].push(item);
          return arr;
        },
        [[], [], [], [], [], [], []]
      );
    // Sort spells by level
    var sortedSpells: { [key: number]: OseItem[] } = {};
    var slots: { [key: number]: number } = {};
    for (var i = 0; i < spells.length; i++) {
      const spell = spells[i];
      if (spell.data.type !== "spell") {
        continue;
      }
      const lvl = spell.data.data.lvl;
      if (!sortedSpells[lvl]) sortedSpells[lvl] = [];
      if (!slots[lvl]) slots[lvl] = 0;
      slots[lvl] += spell.data.data.memorized;
      sortedSpells[lvl].push(spell);
    }
    data.slots = {
      used: slots,
    };
    containers.forEach((container, key, arr) => {
      if (container.data.type !== "container") {
        return;
      }
      container.data.data.itemIds = containerContents[container.id!] || [];
      // @ts-ignore add this to derived data?
      container.data.data.totalWeight = containerContents[
        container.id!
      ]?.reduce((acc, item) => {
        return (
          acc +
          // @ts-ignore should to some item.data.type checking here?
          item.data?.data?.weight * (item.data?.data?.quantity?.value || 1)
        );
      }, 0);
      return arr;
    });

    // Assign and return
    data.owned = {
      items: items,
      armors: armors,
      weapons: weapons,
      treasures: treasures,
      containers: containers,
    };
    data.containers = containers;
    data.abilities = abilities;
    data.spells = sortedSpells;

    // Sort by sort order (see ActorSheet)
    [
      ...Object.values(data.owned),
      ...Object.values(data.spells),
      data.abilities,
      // @ts-ignore
    ].forEach((o) => o.sort((a, b) => (a.data.sort || 0) - (b.data.sort || 0)));
  }

  generateScores() {
    new OseCharacterCreator(this.actor, {
      // @ts-ignore
      top: this.position.top + 40,
      // @ts-ignore
      left: this.position.left + (this.position.width - 400) / 2,
    }).render(true);
  }

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData() {
    const data = super.getData();
    // Prepare owned items
    this._prepareItems(data);
    return data;
  }

  async _chooseLang(): Promise<{ choice: string }> {
    let choices = CONFIG.OSE.languages;

    let templateData = { choices: choices },
      dlg = await renderTemplate(
        `${OSE.systemPath()}/templates/actors/dialogs/lang-create.html`,
        templateData
      );
    //Create Dialog window
    return new Promise((resolve) => {
      new Dialog({
        title: "",
        content: dlg,
        buttons: {
          ok: {
            label: game.i18n.localize("OSE.Ok"),
            icon: '<i class="fas fa-check"></i>',
            callback: (html) => {
              debugger;
              resolve({
                choice: $(html).find('select[name="choice"]').val() as string,
              });
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("OSE.Cancel"),
          },
        },
        default: "ok",
      }).render(true);
    });
  }

  _pushLang(table: any) {
    const data = this.actor.data.data;
    // @ts-ignore
    let update = duplicate(data[table]);
    this._chooseLang().then((dialogInput) => {
      debugger;
      // @ts-ignore choice is a stringified number used as an index on the languages array
      const name = CONFIG.OSE.languages[dialogInput.choice];
      if (update.value) {
        update.value.push(name);
      } else {
        update = { value: [name] };
      }

      let newData = {};
      // @ts-ignore
      newData[table] = update;
      return this.actor.update({ data: newData });
    });
  }

  _popLang(table: any, lang: string) {
    const data = this.actor.data.data;
    // @ts-ignore
    let update = data[table].value.filter((el) => el != lang);
    let newData = {};
    // @ts-ignore
    newData[table] = { value: update };
    return this.actor.update({ data: newData });
  }

  /* -------------------------------------------- */

  _onShowModifiers(event: JQuery.Event) {
    event.preventDefault();
    new OseCharacterModifiers(this.actor, {
      // @ts-ignore
      top: this.position.top + 40,
      // @ts-ignore
      left: this.position.left + (this.position.width - 400) / 2,
    }).render(true);
  }

  async _onShowGpCost(event: JQuery.Event, preparedData: any) {
    event.preventDefault();
    new OseCharacterGpCost(this.actor, preparedData, {
      // @ts-ignore
      top: this.position.top + 40,
      // @ts-ignore
      left: this.position.left + (this.position.width - 400) / 2,
    }).render(true);
  }

  async _onShowItemTooltip() {
    let templateData = {},
      dlg = await renderTemplate(
        `${OSE.systemPath()}/templates/actors/partials/character-item-tooltip.html`,
        templateData
      );
    document.querySelector(".game")?.append(dlg);
  }

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    html.find(".ability-score .attribute-name a").click((ev) => {
      let actorObject = this.actor;
      let element = ev.currentTarget;
      let score = element.parentElement?.parentElement?.dataset
        .score as Attribute;
      let stat = element.parentElement?.parentElement?.dataset.stat;
      if (!score) {
        if (stat == "lr") {
          actorObject.rollLoyalty({ event: ev });
        }
      } else {
        actorObject.rollCheck(score, { event: ev });
      }
    });

    html.find(".exploration .attribute-name a").click((ev) => {
      let actorObject = this.actor;
      let element = ev.currentTarget;
      let expl = element.parentElement?.parentElement?.dataset
        .exploration as ExplorationSkill;
      actorObject.rollExploration(expl, { event: ev });
    });

    html.find("a[data-action='modifiers']").click((ev) => {
      this._onShowModifiers(ev);
    });

    html.find("a[data-action='gp-cost']").click((ev) => {
      this._onShowGpCost(ev, this.getData());
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Language Management
    html.find(".item-push").click((ev) => {
      ev.preventDefault();
      const header = ev.currentTarget;
      // FIXME: only data-array="..." data-array="language" in character-notes-tab. Perhaps that could be removed?
      const table = header.dataset.array;
      this._pushLang(table);
    });

    html.find(".item-pop").click((ev) => {
      ev.preventDefault();
      const header = ev.currentTarget;
      const table = header.dataset.array;
      this._popLang(table, $(ev.currentTarget).closest(".item").data("lang"));
    });

    //Toggle Equipment
    html.find(".item-toggle").click(async (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      await item?.update({
        data: {
          // @ts-ignore need to do some item.data.type checking here?
          equipped: !item.data.data.equipped,
        },
      });
    });

    html.find("a[data-action='generate-scores']").click((ev) => {
      ev.preventDefault();
      this.generateScores();
    });
  }
}
