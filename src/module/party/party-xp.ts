import { OseParty } from "./party";
import { OSE, OseConfig } from "../config";
import { OseActor } from "../actor/entity";

interface OsePartyXPOptions extends FormApplicationOptions {}

interface OsePartyXPData {
  actors: OseActor[];
  data: {};
  config: OseConfig;
  user: User | null;
}

export class OsePartyXP extends FormApplication<
  OsePartyXPOptions,
  OsePartyXPData
> {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ose", "dialog", "party-xp"],
      template: `${OSE.systemPath()}/templates/apps/party-xp.html`,
      width: 300,
      height: "auto" as const,
      resizable: false,
      closeOnSubmit: true as boolean,
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
   */
  getData(): OsePartyXPData {
    let data = {
      actors: OseParty.currentParty,
      data: this.object,
      config: CONFIG.OSE,
      user: game.user,
    };
    return data;
  }

  _onDrop(event: DragEvent) {
    event.preventDefault();
    // WIP Drop Item Quantity
    let data;
    try {
      data = JSON.parse(event.dataTransfer!.getData("text/plain"));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }
  }
  /* -------------------------------------------- */

  async _updateObject(event: Event, formData: never) {
    this._dealXP(event);
  }

  _calculateShare(ev: Event) {
    const currentParty = OseParty.currentParty;

    const html = $(this.form!);
    const totalXP = html.find('input[name="total"]').val();
    //@ts-ignore
    const baseXpShare = parseFloat(totalXP) / currentParty.length;

    currentParty.forEach((a) => {
      if (a.data.type !== "character") {
        return;
      }
      const actorData = a?.system || a?.data.data; //v9-compatibility
      const xpShare = Math.floor(
        (actorData.details.xp.share / 100) * baseXpShare
      );
      html.find(`li[data-actor-id='${a.id}'] input`).val(xpShare);
    });
  }

  _dealXP(ev: Event) {
    const html = $(this.form!);
    const rows = html.find(".actor");
    rows.each((_, row) => {
      const qRow = $(row);
      const value = qRow.find("input").val();
      const id = qRow.data("actorId");
      const actor = OseParty.currentParty.find((e) => e.id === id);
      if (value && actor) {
        //@ts-ignore
        actor.getExperience(Math.floor(parseInt(value)));
      }
    });
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);

    const totalField = html.find('input[name="total"]');
    totalField.on("input", this._calculateShare.bind(this));

    html.find('button[data-action="deal-xp"').click((event) => {
      //@ts-ignore
      super.submit(event);
    });
  }
}
