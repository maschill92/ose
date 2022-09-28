import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemDataSourceItemData } from "../../types/item-data";
import { OseActor } from "../actor/entity";
import { OSE } from "../config";
import { OseItem } from "../item/entity";

interface OseCharacterGpCostOptions extends FormApplicationOptions {}
interface OseCharacterGpCostData
  extends FormApplication.Data<OseActor, OseCharacterGpCostOptions> {
  user: User;
}

export class OseCharacterGpCost extends FormApplication<
  OseCharacterGpCostOptions,
  OseCharacterGpCostData
> {
  private inventory: OseActor["items"] | null = null;

  constructor(
    event: OseActor,
    preparedData: any,
    options: Partial<OseCharacterGpCostOptions>
  ) {
    super(event, options);
    // @ts-ignore mutation of actor data
    this.object.preparedData = preparedData;
  }
  static get defaultOptions() {
    const options = super.defaultOptions;
    (options.classes = ["ose", "dialog", "gp-cost"]),
      (options.id = "sheet-gp-cost");
    options.template = `${OSE.systemPath()}/templates/actors/dialogs/gp-cost-dialog.html`;
    options.width = 240;
    return options;
  }

  /* -------------------------------------------- */

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  get title() {
    return `${this.object.name}: ${game.i18n.localize(
      "OSE.dialog.shoppingCart"
    )}`;
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  // @ts-ignore
  async getData(): Promise<object> {
    // @ts-ignore preparedData is created/modified in constructor.
    const data = await foundry.utils.deepClone(this.object.preparedData);
    data.totalCost = await this._getTotalCost(data);
    data.user = game.user;
    this.inventory = this.object.items;
    return data;
  }

  async close(options: FormApplication.CloseOptions): Promise<void> {
    return super.close(options);
  }

  // @ts-ignore return type is not correct from super._onSubmit
  async _onSubmit(
    event: Event,
    {
      preventClose = false,
      preventRender = false,
    }: FormApplication.OnSubmitOptions = {}
  ) {
    // await
    super._onSubmit(event, {
      preventClose: preventClose,
      preventRender: preventRender,
    });
    // Generate gold
    const totalCost = await this._getTotalCost(await this.getData());
    const gp = await this.object.items.find((item) => {
      itemData = item?.system || item?.data?.data; //v9-compatibility
      return (
        item.data.type === "item" &&
        (item.name === game.i18n.localize("OSE.items.gp.short") ||
          item.name === "GP") && // legacy behavior used GP, even for other languages
        itemData.treasure
      );
    });
    if (!gp) {
      ui.notifications.error(game.i18n.localize("OSE.error.noGP"));
      return;
    }
    const newGP =
      (gp.data.data as ItemDataSourceItemData).quantity.value - totalCost;
    if (newGP >= 0) {
      this.object.updateEmbeddedDocuments("Item", [
        { _id: gp.id, "data.quantity.value": newGP },
      ]);
    } else {
      ui.notifications.error(game.i18n.localize("OSE.error.notEnoughGP"));
    }
  }

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  async _updateObject(event: Event, formData: object) {
    event.preventDefault();
    const items = this.object.data.items;
    //@ts-ignore Can't seem to get this function to run, ignoring all issues here.
    const speaker = ChatMessage.getSpeaker({ actor: this });
    const templateData = await this.getData();
    const content = await renderTemplate(
      `${OSE.systemPath()}/templates/chat/inventory-list.html`,
      templateData
    );
    ChatMessage.create({
      content: content,
      speaker: speaker,
    });
    // Update the actor
    await this.object.update(formData);

    // Re-draw the updated sheet
    this.object.sheet?.render(true);
  }

  // FIXME: Is ActorData the correct type?
  // @ts-ignore this is prepared data which should be in dirived data on the actor? Perhaps it should come out of getData()
  async _getTotalCost(data) {
    let total = 0;
    const physical = ["item", "container", "weapon", "armor"];
    data.items.forEach((item: OseItem) => {
      const itemData = item?.system || item?.data?.data;
      if (
        physical.some((itemType) => item.type === itemType) &&
        !itemData.treasure
      )
        if (itemData.quantity.max) total += itemData.cost;
        else total += itemData.cost * itemData.quantity.value;
    });
    return total;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html: JQuery) {
    super.activateListeners(html);
    html.find("a.auto-deduct").click(async (ev) => {
      this.submit();
    });
  }
}
