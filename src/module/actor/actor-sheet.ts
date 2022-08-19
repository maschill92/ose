import { OseEntityTweaks } from "../dialog/entity-tweaks";
import { OSE } from "../config";
import { ConfiguredDocumentClass } from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import { OseItem } from "../item/entity";
import {
  ActiveEffectData,
  ItemData,
} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import {
  ItemDataConstructorData,
  ItemDataSource,
} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";

interface OseActorSheetOptions extends ActorSheet.Options {}
interface OseActorSheetData
  extends InstanceType<ConfiguredDocumentClass<typeof Actor>> {}

export class OseActorSheet<
  Options extends OseActorSheetOptions = OseActorSheetOptions,
  Data extends object = OseActorSheetData
> extends ActorSheet<Options, Data> {
  getData() {
    // @ts-ignore
    const data = foundry.utils.deepClone(super.getData().data);
    data.owner = this.actor.isOwner;
    data.editable = this.actor?.sheet?.isEditable;

    data.config = {
      ...CONFIG.OSE,
      ascendingAC: game.settings.get("ose", "ascendingAC"),
      initiative: game.settings.get("ose", "initiative") != "group",
      encumbrance: game.settings.get("ose", "encumbranceOption"),
    };
    data.isNew = this.actor.isNew();

    return data;
  }

  activateEditor(
    name: string,
    options: TextEditor.Options,
    initialContent?: string
  ) {
    // remove some controls to the editor as the space is lacking
    if (name == "data.details.description") {
      options.toolbar = "styleselect bullist hr table removeFormat save";
    }
    super.activateEditor(name, options, initialContent);
  }

  // Helpers

  _getItemFromActor(
    event: JQuery.TriggeredEvent<HTMLElement, null, HTMLElement>
  ): OseItem {
    const li = event.currentTarget.closest<HTMLElement>(".item-entry");
    const item = this.actor.items.get(li?.dataset.itemId ?? "");
    if (!item) {
      throw new Error("Unable to find item.");
    }
    return item;
  }

  // end Helpers

  _toggleItemCategory(event: JQuery.TriggeredEvent) {
    event.preventDefault();
    const targetCategory = $(event.currentTarget);
    let items = targetCategory.next(".item-list");

    if (items.css("display") === "none") {
      let el = $(event.currentTarget).find(".fas.fa-caret-right");
      el.removeClass("fa-caret-right");
      el.addClass("fa-caret-down");

      items.slideDown(200);
    } else {
      let el = $(event.currentTarget).find(".fas.fa-caret-down");
      el.removeClass("fa-caret-down");
      el.addClass("fa-caret-right");

      items.slideUp(200);
    }
  }

  _toggleContainedItems(event: JQuery.TriggeredEvent) {
    event.preventDefault();
    const targetItems = $(event.target.closest(".container"));
    let items = targetItems.find(".item-list.contained-items");

    if (items.css("display") === "none") {
      let el = targetItems.find(".fas.fa-caret-right");
      el.removeClass("fa-caret-right");
      el.addClass("fa-caret-down");

      items.slideDown(200);
    } else {
      let el = targetItems.find(".fas.fa-caret-down");
      el.removeClass("fa-caret-down");
      el.addClass("fa-caret-right");

      items.slideUp(200);
    }
  }

  _toggleItemSummary(event: JQuery.TriggeredEvent) {
    event.preventDefault();
    const summary = $(event.currentTarget)
      .closest(".item-header")
      .next(".item-summary");

    if (summary.css("display") === "none") {
      summary.slideDown(200);
    } else {
      summary.slideUp(200);
    }
  }

  async _displayItemInChat(event: JQuery.TriggeredEvent) {
    const li = $(event.currentTarget).closest(".item-entry");
    const item = this.actor.items.get(li.data("itemId"));
    item?.show();
  }

  async _removeItemFromActor(event: JQuery.TriggeredEvent) {
    const item = this._getItemFromActor(event);
    const itemDisplay = event.currentTarget.closest(".item-entry");

    if (item.data.type === "container" && item.data.data.itemIds) {
      const containedItems = item.data.data.itemIds;
      const updateData = containedItems.reduce<any[]>((acc, val) => {
        acc.push({ _id: val.id, "data.containerId": "" });
        return acc;
      }, []);

      await this.actor.updateEmbeddedDocuments("Item", updateData);
    }
    this.actor.deleteEmbeddedDocuments("Item", [itemDisplay.dataset.itemId]);
  }

  /**
   * @param {bool} decrement
   */
  _useConsumable(event: JQuery.TriggeredEvent, decrement: boolean) {
    const item = this._getItemFromActor(event);

    if (decrement) {
      // @ts-ignore should consider only physical item types?
      item.update({ "data.quantity.value": item.data.data.quantity.value - 1 });
    } else {
      // @ts-ignore should consider only physical item types?
      item.update({ "data.quantity.value": item.data.data.quantity.value + 1 });
    }
  }

  async _onSpellChange(event: JQuery.TriggeredEvent) {
    event.preventDefault();
    const item = this._getItemFromActor(event);
    if (event.target.dataset.field == "cast") {
      return item.update({ "data.cast": parseInt(event.target.value) });
    } else if (event.target.dataset.field == "memorize") {
      return item.update({
        "data.memorized": parseInt(event.target.value),
      });
    }
  }

  async _resetSpells(event: JQuery.TriggeredEvent) {
    let spells = $(event.currentTarget)
      .closest(".inventory.spells")
      .find(".item-entry");
    spells.each((_, el) => {
      let itemId = el.dataset.itemId as string;
      const item = this.actor.items.get(itemId);
      item?.update({
        _id: item.id,
        // @ts-ignore should verify that item is a spell
        "data.cast": item.data.data.memorized,
      });
    });
  }

  async _rollAbility(event: JQuery.ClickEvent) {
    const item = this._getItemFromActor(event);
    if (item.data.type == "weapon") {
      if (this.actor.data.type === "monster") {
        item.update({
          data: { counter: { value: item.data.data.counter.value - 1 } },
        });
      }
      item.rollWeapon({ skipDialog: event.ctrlKey || event.metaKey });
    } else if (item.type == "spell") {
      // @ts-ignore sendSpell doesn't take any parameters
      item.spendSpell({ skipDialog: !!event.ctrlKey || !!event.metaKey });
    } else {
      item.rollFormula({ skipDialog: event.ctrlKey || event.metaKey });
    }
  }

  async _rollSave(event: JQuery.TriggeredEvent) {
    let actorObject = this.actor;
    let element = event.currentTarget;
    let save = element.parentElement.parentElement.dataset.save;
    actorObject.rollSave(save, { event: event });
  }

  async _rollAttack(event: JQuery.TriggeredEvent) {
    let actorObject = this.actor;
    let element = event.currentTarget;
    let attack = element.parentElement.parentElement.dataset.attack;
    const rollData = {
      // @ts-ignore not sure where this comes from, perhaps subclasses?
      actor: this.data,
      roll: {},
    };
    actorObject.targetAttack(rollData, attack, {
      type: attack,
      skipDialog: event.ctrlKey || event.metaKey,
    });
  }

  _onSortItem(event: DragEvent, itemData: foundry.data.ItemData["_source"]) {
    const source = this.actor.items.get(itemData._id!)!;
    const siblings = this.actor.items.filter((i) => {
      return i.data._id !== source?.data._id;
    });
    const dropTarget = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-item-id]"
    );
    const targetId = dropTarget ? dropTarget.dataset?.itemId : null;
    const target = siblings.find((s) => s.data._id === targetId);

    // Dragging items into a container
    if (
      target?.data.type === "container" &&
      target?.data.data.containerId === ""
    ) {
      this.actor.updateEmbeddedDocuments("Item", [
        { _id: source.id, "data.containerId": target.id },
      ]);
      return;
    }
    // @ts-ignore should check type here?
    if (source?.data.containerId !== "") {
      this.actor.updateEmbeddedDocuments("Item", [
        { _id: source.id, "data.containerId": "" },
      ]);
    }

    return super._onSortItem(event, itemData);
  }

  _onDragStart(event: DragEvent) {
    const li = event.currentTarget as HTMLElement;
    let itemIdsArray: OseItem[] = [];
    if ((event.target as HTMLElement).classList.contains("content-link"))
      return;

    // Create drag data
    const dragData: {
      actorId: string | null;
      sceneId: string | null;
      tokenId: string | null;
      pack: string | null;
      type?: string;
      data?: ItemData | ActiveEffectData;
    } = {
      actorId: this.actor.id,
      sceneId: this.actor.isToken ? canvas.scene?.id ?? null : null,
      tokenId: this.actor.isToken ? this.actor.token?.id ?? null : null,
      pack: this.actor.pack,
    };

    // Owned Items
    if (li.dataset.itemId) {
      const item = this.actor.items.get(li.dataset.itemId)!;
      dragData.type = "Item";
      dragData.data = item.data;
      if (item.data.type === "container" && item.data.data.itemIds.length) {
        //otherwise JSON.stringify will quadruple stringify for some reason
        itemIdsArray = item.data.data.itemIds;
      }
    }

    // Active Effect
    if (li.dataset.effectId) {
      const effect = this.actor.effects.get(li.dataset.effectId);
      dragData.type = "ActiveEffect";
      dragData.data = effect?.data;
    }

    // Set data transfer
    event.dataTransfer?.setData(
      "text/plain",
      JSON.stringify(dragData, (key, value) => {
        if (key === "itemIds") {
          //something about how this Array is created makes its elements not real Array elements
          //we go through this hoop to trick stringify into creating our string
          return JSON.stringify(itemIdsArray);
        }
        return value;
      })
    );
  }

  // @ts-ignore need to fix the return type
  async _onDropItemCreate(
    ...[itemData]: Parameters<ActorSheet["_onDropItemCreate"]>
  ) {
    //override to fix hidden items because their original containers don't exist on this actor
    const itemDataArray = itemData instanceof Array ? itemData : [itemData];
    itemDataArray.forEach((item) => {
      if (
        "containerId" in item.data &&
        item.data.containerId &&
        item.data.containerId !== ""
      )
        // @ts-ignore type check here.
        item.data.containerId = "";
      if (item.type === "container" && typeof item.data.itemIds === "string") {
        //itemIds was double stringified to fix strange behavior with stringify blanking our Arrays
        const containedItems = JSON.parse(item.data.itemIds);
        // @ts-ignore determine type for this
        containedItems.forEach((containedItem) => {
          containedItem.data.containerId = "";
        });
        // @ts-ignore align containedItems type with itemData
        itemDataArray.push(...containedItems);
      }
    });
    // @ts-ignore need to improve these types?
    return this.actor.createEmbeddedDocuments("Item", itemDataArray);
  }

  /* -------------------------------------------- */

  async _chooseItemType(
    choices = ["weapon", "armor", "shield", "gear"]
  ): Promise<{ type: ItemDataSource["type"]; name: string }> {
    let templateData = { types: choices },
      dlg = await renderTemplate(
        `${OSE.systemPath()}/templates/items/entity-create.html`,
        templateData
      );
    //Create Dialog window
    return new Promise((resolve) => {
      new Dialog({
        title: game.i18n.localize("OSE.dialog.createItem"),
        content: dlg,
        buttons: {
          ok: {
            label: game.i18n.localize("OSE.Ok"),
            icon: '<i class="fas fa-check"></i>',
            callback: (html) => {
              const $html = $(html);
              resolve({
                type: $html
                  .find('select[name="type"]')
                  .val() as ItemDataSource["type"],
                name: $html.find('input[name="name"]').val() as string,
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

  _createItem(event: JQuery.TriggeredEvent) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type as ItemDataSource["type"] | "choice";

    // item creation helper func
    const createItem = function (
      type: ItemDataSource["type"],
      name?: string
    ): DeepPartial<ItemDataConstructorData> {
      const itemData = {
        name: name ? name : `New ${type.capitalize()}`,
        type: type,
        data: duplicate(header.dataset),
      };
      delete itemData.data["type"];
      return itemData;
    };

    // Getting back to main logic
    if (type === "choice") {
      const choices = header.dataset.choices.split(",");
      this._chooseItemType(choices).then((dialogInput) => {
        const itemData = createItem(dialogInput.type, dialogInput.name);
        this.actor.createEmbeddedDocuments("Item", [itemData], {});
      });
    } else {
      const itemData = createItem(type);
      return this.actor.createEmbeddedDocuments("Item", [itemData], {});
    }
  }

  async _updateItemQuantity(event: JQuery.TriggeredEvent) {
    event.preventDefault();
    const item = this._getItemFromActor(event);

    if (event.target.dataset.field === "value") {
      return item.update({
        "data.quantity.value": parseInt(event.target.value),
      });
    } else if (event.target.dataset.field === "max") {
      return item.update({
        "data.quantity.max": parseInt(event.target.value),
      });
    }
  }

  // Override to set resizable initial size
  async _renderInner(data: Data): Promise<JQuery> {
    const html = await super._renderInner(data);
    this.form = html[0];

    // Resize resizable classes
    let resizable = html.find(".resizable");
    if (resizable.length == 0) {
      // @ts-ignore when does this break?
      return;
    }
    resizable.each((_, el) => {
      // @ts-ignore check these types?
      let heightDelta = this.position.height - this.options.height;
      el.style.height = `${heightDelta + parseInt(el.dataset.baseSize!)}px`;
    });
    return html;
  }

  async _onResize(event: Event) {
    super._onResize(event);

    let html = $(this.form!);
    let resizable = html.find(".resizable");
    if (resizable.length == 0) {
      return;
    }
    // Resize divs
    // FIXME: This logic appears to be the same as that in renderInner.
    resizable.each((_, el) => {
      // @ts-ignore check these types? can this be handled via css/flex?
      let heightDelta = this.position.height - this.options.height;
      el.style.height = `${heightDelta + parseInt(el.dataset.baseSize!)}px`;
    });
    // Resize editors
    let editors = html.find(".editor");
    editors.each((id, editor) => {
      let container = editor.closest<HTMLElement>(".resizable-editor");
      if (container) {
        // @ts-ignore
        let heightDelta = this.position.height - this.options.height;
        editor.style.height = `${
          heightDelta + parseInt(container.dataset.editorSize!)
        }px`;
      }
    });
  }

  _onConfigureActor(event: JQuery.Event) {
    event.preventDefault();
    new OseEntityTweaks(this.actor, {
      // @ts-ignore
      top: this.position.top + 40,
      // @ts-ignore
      left: this.position.left + (this.position.width - 400) / 2,
    }).render(true);
  }

  /**
   * Extend and override the sheet header buttons
   * @override
   */
  _getHeaderButtons(): Application.HeaderButton[] {
    let buttons = super._getHeaderButtons();

    // Token Configuration
    const canConfigure = game.user?.isGM || this.actor.isOwner;
    if (this.options.editable && canConfigure) {
      buttons.unshift({
        label: game.i18n.localize("OSE.dialog.tweaks"),
        class: "configure-actor",
        icon: "fas fa-code",
        onclick: (event) => this._onConfigureActor(event),
      });
    }
    return buttons;
  }

  /**
   *
   * @param {JQuery} html
   * @returns
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Attributes
    html.find(".saving-throw .attribute-name a").click((event) => {
      this._rollSave(event);
    });

    html.find(".attack a").click((event) => {
      this._rollAttack(event);
    });

    html.find(".hit-dice .attribute-name").click((event) => {
      this.actor.rollHitDice({ event: event });
    });

    // Items (Abilities, Inventory and Spells)
    html.find(".item-rollable .item-image").click(async (event) => {
      this._rollAbility(event);
    });

    html.find(".inventory .item-category-title").click((event) => {
      this._toggleItemCategory(event);
    });
    html.find(".inventory .category-caret").click((event) => {
      this._toggleContainedItems(event);
    });

    html.find(".item-name").click((event) => {
      this._toggleItemSummary(event);
    });

    html.find(".item-controls .item-show").click(async (event) => {
      this._displayItemInChat(event);
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Item Management
    html.find(".item-create").click((event) => {
      this._createItem(event);
    });

    html.find(".item-edit").click((event) => {
      const item = this._getItemFromActor(event);
      item.sheet?.render(true);
    });

    html.find(".item-delete").click((event) => {
      this._removeItemFromActor(event);
    });

    html
      .find<HTMLInputElement>(".quantity input")
      .click((ev) => ev.target.select())
      .change((ev) => {
        this._updateItemQuantity(ev);
      });

    // Consumables
    html.find(".consumable-counter .full-mark").click((event) => {
      this._useConsumable(event, true);
    });
    html.find(".consumable-counter .empty-mark").click((event) => {
      this._useConsumable(event, false);
    });

    // Spells
    html
      .find<HTMLInputElement>(".memorize input")
      .click((event) => {
        event.target.select();
      })
      .change(this._onSpellChange.bind(this));

    html
      .find(".spells .item-reset[data-action='reset-spells']")
      .click((event) => {
        this._resetSpells(event);
      });
  }
}
