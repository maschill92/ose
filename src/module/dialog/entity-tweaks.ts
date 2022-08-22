import { OseActor } from "../actor/entity";
import { OSE, OseConfig } from "../config";

interface OseEntityTweaksOptions extends FormApplicationOptions {}

interface OseEntityTweaksData {
  type: OseActor["data"]["type"];
  data: OseActor["data"]["data"];
  user: User;
  config: OseConfig & {
    ascendingAC: boolean;
  };
}

export class OseEntityTweaks extends FormApplication<
  OseEntityTweaksOptions,
  OseEntityTweaksData,
  OseActor
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
  async getData(): Promise<OseEntityTweaksData> {
    return {
      type: this.object.data.type,
      config: {
        ...CONFIG.OSE,
        ascendingAC: game.settings.get("ose", "ascendingAC"),
      },
      data: this.object.data.data,
      user: game.user!,
    };
  }

  /* -------------------------------------------- */

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  async _updateObject(event: Event, formData: object) {
    // Update the actor
    this.object.update(formData);
    // Re-draw the updated sheet
    this.object.sheet?.render(true);
  }
}
