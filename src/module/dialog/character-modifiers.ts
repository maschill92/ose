import { OseActor } from "../actor/entity";
import { OSE } from "../config";

export class OseCharacterModifiers extends Application {
  private readonly actor: OseActor;

  constructor(
    actor: OseActor,
    options?: ConstructorParameters<typeof Application>[0]
  ) {
    if (!game.user) {
      throw new Error("Unable to find game.user");
    }
    super(options);
    this.actor = actor;
  }

  static override get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "sheet-modifiers",
      classes: ["ose", "dialog", "modifiers"],
      template: `${OSE.systemPath()}/templates/actors/dialogs/modifiers-dialog.html`,
      width: 240,
    });
  }

  /* -------------------------------------------- */

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  override get title() {
    // @ts-ignore
    return `${this.actor.name}: Modifiers`;
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   */
  override getData(): OseActor["data"] {
    return this.actor.data;
  }
}
