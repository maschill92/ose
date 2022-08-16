//@ts-check
import { OSE } from "../config";

export class OseCharacterModifiers extends FormApplication {
  static get defaultOptions() {
    const options = super.defaultOptions;
    (options.classes = ["ose", "dialog", "modifiers"]),
      (options.id = "sheet-modifiers");
    options.template = `${OSE.systemPath()}/templates/actors/dialogs/modifiers-dialog.html`;
    options.width = 240;
    return options;
  }

  /* -------------------------------------------- */

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  get title() {
    // @ts-ignore
    return `${this.object.name}: Modifiers`;
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
    data.user = game.user;
    return data;
  }

  /* -------------------------------------------- */

  /**
   * @override
   * @param {JQuery} html
   */
  activateListeners(html) {
    super.activateListeners(html);
  }

  /**
   * Overriding as it's an abstract function on FormApplication. Perhaps this class should extend Application instead?
   * @override
   * @returns {Promise<unknown>}
   */
  _updateObject() {
    return Promise.resolve();
  }
}
