//@ts-check
import { OSE } from "../config";

export class OseEntityTweaks extends FormApplication {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = "sheet-tweaks";
    options.template = `${OSE.systemPath()}/templates/actors/dialogs/tweaks-dialog.html`;
    options.width = 380;
    return options;
  }

  /* -------------------------------------------- */

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  get title() {
    // @ts-ignore
    return `${this.object.name}: ${game.i18n.localize("OSE.dialog.tweaks")}`;
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  // @ts-ignore
  getData() {
    // @ts-ignore
    const data = foundry.utils.deepClone(this.object.data);
    if (data.type === "character") {
      data.isCharacter = true;
    }
    data.user = game.user;
    data.config = {
      ...CONFIG.OSE,
      ascendingAC: game.settings.get("ose", "ascendingAC"),
    };
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  // @ts-ignore
  activateListeners(html) {
    super.activateListeners(html);
  }

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  // @ts-ignore
  async _updateObject(event, formData) {
    event.preventDefault();
    // Update the actor
    // @ts-ignore
    this.object.update(formData);
    // Re-draw the updated sheet
    // @ts-ignore
    this.object.sheet.render(true);
  }
}
