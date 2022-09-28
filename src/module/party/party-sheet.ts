import { OsePartyXP } from "./party-xp";
import { OseParty } from "./party";
import { OSE, OseConfig } from "../config";
import { OseActor } from "../actor/entity";

const Party: { partySheet?: OsePartySheet } = {
  partySheet: void 0,
};

interface OsePartySheetOptions extends FormApplicationOptions {}

interface OsePartySheetData {
  partyActors: OseActor[];
  config: OseConfig;
  user: User;
  settings: { ascending: boolean };
}

export class OsePartySheet extends FormApplication<
  OsePartySheetOptions,
  OsePartySheetData
> {
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
   */
  override getData(): OsePartySheetData {
    const settings = {
      ascending: game.settings.get(game.system.id, "ascendingAC"),
    };

    let data = {
      partyActors: OseParty.currentParty,
      config: CONFIG.OSE,
      user: game.user!,
      settings: settings,
    };

    return data;
  }

  async _addActorToParty(actor: OseActor): Promise<void> {
    if (actor.type !== "character") {
      return;
    }

    await actor.setFlag(game.system.id, "party", true);
  }

  async _removeActorFromParty(actor: OseActor): Promise<void> {
    await actor.setFlag(game.system.id, "party", false);
  }

  /* ---------------------- */
  /* --Drag&Drop Behavior-- */
  /* ---------------------- */

  /**
   * Adding to the Party Sheet
   */
  _onDrop(event: DragEvent) {
    event.preventDefault();
    // WIP Drop Items
    try {
      // TODO: Consider using Actor/Folder.fromDropData
      const data = JSON.parse(event.dataTransfer!.getData("text/plain"));

      switch (data.type) {
        case "Actor":

          return this._onDropActor(event, data);
        case "Folder":
          return this._onDropFolder(data);
      }
    } catch (err) {
      return false;
    }
  }

  async _onDropActor(data: any) {
   
    if (data.type !== "Actor") {
      return;
    }

    const actors = game.actors;
    let droppedActor = await fromUuid(data.uuid);

    if (droppedActor) {
      this._addActorToParty(droppedActor);
    }
  }

  _recursiveAddFolder(folder: Folder) {
    folder.contents.forEach((actor) => {
      if (actor instanceof OseActor) {
        this._addActorToParty(actor);
      }
    });
    folder
      .getSubfolders()
      .forEach((folder) => this._recursiveAddFolder(folder));
  }

  _onDropFolder(data: any) {
    if (data.type !== "Folder") {
      return;
    }

    const folder = game.folders?.get(data.id);
    if (!folder) return;

    this._recursiveAddFolder(folder);
  }

  /**
   * Dragging from the Party Sheet
   * @param {DragEvent} event
   * @returns
   */
  _onDragStart(event: DragEvent) {
    try {
      const actorId = (event.currentTarget as HTMLElement)?.dataset?.actorId;

      const dragData = {
        id: actorId,
        type: "Actor",
      };

      // Set data transfer
      event.dataTransfer?.setData("text/plain", JSON.stringify(dragData));
    } catch (error) {
      return false;
    }

    return true;
  }

  /* -------------------------------------------- */

  async _dealXP() {
    new OsePartyXP(this.object, {}).render(true);
  }

  override activateListeners(html: JQuery) {
    super.activateListeners(html);

    html.find(".header #deal-xp").click(() => this._dealXP());

    // Actor buttons

    const getActor = (event: JQuery.ClickEvent): OseActor | null => {
      const id = event.currentTarget.closest(".actor").dataset.actorId;
      return game.actors?.get(id) ?? null;
    };

    html.find(".field-img button[data-action='open-sheet']").click((event) => {
      getActor(event)?.sheet?.render(true);
    });

    html
      .find(".field-img button[data-action='remove-actor']")
      .click(async (event) => {
        const actor = getActor(event);
        if (actor) {
          await this._removeActorFromParty(actor);
        }
      });
  }

  /**
   * Overriding as it's an abstract function on FormApplication. Perhaps this class should extend Application instead?
   */
  protected _updateObject(): Promise<unknown> {
    return Promise.resolve();
  }
}
