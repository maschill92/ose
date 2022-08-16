import { OseActor } from "../actor/entity";
import { OSE } from "../config";

interface OseCharacterCreatorOptions extends FormApplicationOptions {}
interface OseCharacterCreatorData
extends FormApplication.Data<OseActor, OseCharacterCreatorOptions> {
  user: User;
}
// TODO: Can this extend Application?
export class OseCharacterModifiers extends FormApplication<
  OseCharacterCreatorOptions,
  OseCharacterCreatorData
> {
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
   */
  getData(): OseCharacterCreatorData {
    const data = foundry.utils.deepClone(this.object.data);
    // TODO: This isn't used in the HTML file anywhere. Remove?
    //@ts-ignore
    data.user = game.user;
    //@ts-ignore
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html: JQuery) {
    super.activateListeners(html);
  }

  /**
   * Overriding as it's an abstract function on FormApplication. Perhaps this class should extend Application instead?
   */
  override _updateObject(): Promise<unknown> {
    return Promise.resolve();
  }
}
