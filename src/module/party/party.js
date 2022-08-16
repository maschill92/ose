//@ts-check
import { OseActor } from "../actor/entity";

export class OseParty {
  /**
   * @returns {OseActor[]}
   */
  static get currentParty() {
    const characters = game.actors?.filter(
      (act) =>
        act.data.type === "character" &&
        act.data.flags.ose &&
        act.data.flags.ose.party === true
    );

    return characters || [];
  }
}
