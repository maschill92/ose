import { OseActor } from "../actor/entity";
import { OSE, OseConfig } from "../config";

interface OseEntityTweaksOptions extends FormApplicationOptions {}

interface OseEntityTweaksData
  extends FormApplication.Data<OseActor, OseEntityTweaksOptions> {}

export class OseEntityTweaks extends FormApplication<
  OseEntityTweaksOptions,
  OseEntityTweaksData
> {
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
    return `${this.object.name}: ${game.i18n.localize("OSE.dialog.tweaks")}`;
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  getData(): OseEntityTweaksData {
    const data = foundry.utils.deepClone(this.object.data);

    if (data.type === "character") {
      // @ts-ignore modifies Actor data
      data.isCharacter = true;
    }
    // @ts-ignore modifies Actor data
    data.user = game.user;
    // @ts-ignore modifies Actor data
    data.config = {
      ...CONFIG.OSE,
      ascendingAC: game.settings.get("ose", "ascendingAC"),
    };
    // @ts-ignore
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html: JQuery) {
    super.activateListeners(html);
  }

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  async _updateObject(event: Event, formData: object) {
    event.preventDefault();
    // Update the actor
    // @ts-ignore
    this.object.update(formData);
    // Re-draw the updated sheet
    // @ts-ignore
    this.object.sheet.render(true);
  }
}
