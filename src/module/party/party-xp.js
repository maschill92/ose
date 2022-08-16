//@ts-check
import { OseParty } from "./party";
import { OSE } from "../config";
import { OseActor } from "../actor/entity";

export class OsePartyXP extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ose", "dialog", "party-xp"],
      template: `${OSE.systemPath()}/templates/apps/party-xp.html`,
      width: 300,
      height: "auto",
      resizable: false,
      closeOnSubmit: true,
    });
  }

  /* -------------------------------------------- */

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  get title() {
    return game.i18n.localize("OSE.dialog.xp.deal");
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {{actors: OseActor[], data: {}, config: import("../config").OseConfig, user: User | null, settings: any}}
   */
  // @ts-ignore
  getData() {
    let data = {
      actors: OseParty.currentParty,
      data: this.object,
      config: CONFIG.OSE,
      user: game.user,
      // TODO: remove settings? copy/paste from party-sheet?
      //@ts-ignore
      settings: settings,
    };
    return data;
  }

  /**
   *
   * @param {DragEvent} event
   * @returns
   */
  _onDrop(event) {
    event.preventDefault();
    // WIP Drop Item Quantity
    let data;
    try {
      // @ts-ignore
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }
  }
  /* -------------------------------------------- */

  /**
   *
   * @param {Event} event
   * @param {never} formData
   */
  async _updateObject(event, formData) {
    this._dealXP(event);
  }

  /**
   *
   * @param {Event} ev
   */
  _calculateShare(ev) {
    const currentParty = OseParty.currentParty;

    // @ts-ignore
    const html = $(this.form);
    // @ts-ignore
    const totalXP = html.find('input[name="total"]').val();
    const baseXpShare = parseFloat(totalXP) / currentParty.length;

    currentParty.forEach((a) => {
      if (a.data.type !== "character") {
        return;
      }
      const xpShare = Math.floor(
        (a.data.data.details.xp.share / 100) * baseXpShare
      );
      // @ts-ignore
      html.find(`li[data-actor-id='${a.id}'] input`).val(xpShare);
    });
  }

  /**
   *
   * @param {Event} ev
   */
  _dealXP(ev) {
    // @ts-ignore
    const html = $(this.form);
    // @ts-ignore
    const rows = html.find(".actor");
    rows.each(
      /**
       *
       * @param {number} _
       * @param {HTMLElement} row
       */
      (_, row) => {
        const qRow = $(row);
        const value = qRow.find("input").val();
        const id = qRow.data("actorId");
        const actor = OseParty.currentParty.find((e) => e.id === id);
        if (value && actor) {
          // @ts-ignore
          actor.getExperience(Math.floor(parseInt(value)));
        }
      }
    );
  }

  /**
   *
   * @param {JQuery} html
   */
  activateListeners(html) {
    super.activateListeners(html);

    const totalField = html.find('input[name="total"]');
    totalField.on("input", this._calculateShare.bind(this));

    html.find('button[data-action="deal-xp"').click((event) => {
      // @ts-ignore
      super.submit(event);
    });
  }
}
