//@ts-check
import { OsePartyXP } from "./party-xp";
import { OseParty } from "./party";
import { OSE } from "../config";
import { OseActor } from "../actor/entity";

/**
 * @type {{partySheet?: OsePartySheet}}
 */
const Party = {
  partySheet: void 0,
};

/**
 * @typedef {FormApplicationOptions} OsePartySheetOptions
 */
/**
 * @typedef {{partyActors: OseActor[], config: import("../config").OseConfig, user: User; settings: {ascending: boolean}}} OsePartySheetData
 */

export class OsePartySheet extends FormApplication {
  /**
   *
   * @protected
   * @override
   * @param {Event} event
   * @param {object | undefined} formData
   */
  async _updateObject(event, formData) {
    throw new Error("Method not implemented.");
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ose", "dialog", "party-sheet"],
      template: `${OSE.systemPath()}/templates/apps/party-sheet.html`,
      width: 280,
      height: 400,
      resizable: true,
      dragDrop: [
        { dragSelector: ".actor-list .actor", dropSelector: ".party-members" },
      ],
      closeOnSubmit: false,
    });
  }

  static init() {
    Party.partySheet = new OsePartySheet({});
  }

  static showPartySheet(options = {}) {
    OsePartySheet.partySheet?.render(true, { focus: true, ...options });
  }

  static get partySheet() {
    return Party.partySheet;
  }

  /* -------------------------------------------- */

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  get title() {
    return game.i18n.localize("OSE.dialog.partysheet");
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {OsePartySheetData}
   */
  // @ts-ignore
  getData() {
    const settings = {
      ascending: game.settings.get("ose", "ascendingAC"),
    };

    let data = {
      partyActors: OseParty.currentParty,
      // data: this.object,
      config: CONFIG.OSE,
      user: game.user,
      settings: settings,
    };
    // @ts-ignore
    return data;
  }

  /**
   *
   * @param {OseActor} actor
   * @returns
   */
  async _addActorToParty(actor) {
    if (actor.type !== "character") {
      return;
    }

    await actor.setFlag(game.system.id, "party", true);
  }

  /**
   *
   * @param {OseActor} actor
   * @returns
   */
  async _removeActorFromParty(actor) {
    await actor.setFlag(game.system.id, "party", false);
  }

  /* ---------------------- */
  /* --Drag&Drop Behavior-- */
  /* ---------------------- */

  /**
   * Adding to the Party Sheet
   * @param {DragEvent} event
   * @returns
   */
  _onDrop(event) {
    event.preventDefault();

    // WIP Drop Items
    let data;
    try {
      // @ts-ignore
      data = JSON.parse(event.dataTransfer.getData("text/plain"));

      switch (data.type) {
        case "Actor":
          return this._onDropActor(event, data);
        case "Folder":
          return this._onDropFolder(event, data);
      }
    } catch (err) {
      return false;
    }
  }

  /**
   *
   * @param {Event} event
   * @param {*} data
   * @returns
   */
  _onDropActor(event, data) {
    if (data.type !== "Actor") {
      return;
    }

    const actors = game.actors;
    // @ts-ignore
    let droppedActor = actors.find((actor) => actor.id === data.id);

    // @ts-ignore
    this._addActorToParty(droppedActor);
  }

  /**
   *
   * @param {Folder} folder
   */
  _recursiveAddFolder(folder) {
    debugger;
    folder.contents.forEach((actor) => {
      if (actor instanceof OseActor) {
        debugger;
        this._addActorToParty(actor);
      }
    });
    folder
      .getSubfolders()
      .forEach((folder) => this._recursiveAddFolder(folder));
  }

  /**
   *
   * @param {Event} event
   * @param {*} data
   * @returns
   */
  _onDropFolder(event, data) {
    if (data.documentName !== "Actor") {
      return;
    }

    // @ts-ignore
    const folder = game.folders.get(data.id);
    if (!folder) return;

    this._recursiveAddFolder(folder);
  }

  /**
   * Dragging from the Party Sheet
   * @param {DragEvent} event
   * @returns
   */
  _onDragStart(event) {
    try {
      // @ts-ignore
      const actorId = event.currentTarget.dataset.actorId;

      const dragData = {
        id: actorId,
        type: "Actor",
      };

      // Set data transfer
      // @ts-ignore
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    } catch (error) {
      return false;
    }

    return true;
  }

  /* -------------------------------------------- */

  async _dealXP() {
    new OsePartyXP(this.object, {}).render(true);
  }

  /**
   * @override
   * @param {JQuery} html
   */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".header #deal-xp").click(() => this._dealXP());

    // Actor buttons
    /**
     *
     * @param {JQuery.ClickEvent} event
     * @returns {Actor}
     */
    const getActor = (event) => {
      const id = event.currentTarget.closest(".actor").dataset.actorId;
      // @ts-ignore
      return game.actors.get(id);
    };

    html.find(".field-img button[data-action='open-sheet']").click((event) => {
      // @ts-ignore
      getActor(event).sheet.render(true);
    });

    html
      .find(".field-img button[data-action='remove-actor']")
      .click(async (event) => {
        // @ts-ignore
        await this._removeActorFromParty(getActor(event));
      });
  }
}
