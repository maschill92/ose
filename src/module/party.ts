import { OseActor } from "./actor/entity";
import { OsePartySheet } from "./party/party-sheet";

export const addControl = (object: ActorDirectory, html: JQuery) => {
  let control = `<button class='ose-party-sheet' type="button" title='${game.i18n.localize(
    "OSE.dialog.partysheet"
  )}'><i class='fas fa-users'></i></button>`;
  html.find(".fas.fa-search").replaceWith($(control));
  html.find(".ose-party-sheet").click((ev) => {
    ev.preventDefault();
    Hooks.call("OSE.Party.showSheet");
  });
};

export const update: Hooks.UpdateDocument<typeof OseActor> = (actor: OseActor, data) => {
  const partyFlag = actor.getFlag(game.system.id, "party");

  if (partyFlag === null) {
    return;
  }

  OsePartySheet.partySheet?.render();
};
