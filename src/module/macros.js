// @ts-check
/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {*} data     The dropped data, not good typing right now... see: https://github.com/League-of-Foundry-Developers/foundry-vtt-types/issues/928
 * @param {number} slot     The hotbar slot to use
 * @returns {void | false | Promise<void>} foundry expects "false" to prevent calling additional hooks. This should probably be made boolean
 */
export function createOseMacro(data, slot) {
  debugger;
  if ("type" in data && data.type !== "Item") return;
  if (!("data" in data))
    ui.notifications.warn(
      game.i18n.localize("OSE.warn.macrosOnlyForOwnedItems")
    );
  const item = data.data;

  // Create the macro command
  const command = `game.ose.rollItemMacro("${item.name}");`;
  let macro = game.macros?.contents.find(
    (m) => m.name === item.name && m.data.command === command
  );
  if (!macro) {
    Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "ose.itemMacro": true },
    }).then((macro) => {
      if (macro) {
        game.user?.assignHotbarMacro(macro, slot);
      }
    });
  }
  return false;
}

/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise<void>}
 */
export async function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors?.tokens[speaker.token];
  //@ts-ignore consider using ChatMessage.getSpeakerActor(speaker)
  if (!actor) actor = game.actors?.get(speaker.actor);

  // Get matching items
  const items = actor ? actor.items.filter((i) => i.name === itemName) : [];
  if (items.length > 1) {
    ui.notifications.warn(
      game.i18n.format("OSE.warn.moreThanOneItemWithName", {
        actorName: actor?.name,
        itemName: itemName,
      })
    );
  } else if (items.length === 0) {
    ui.notifications.error(
      game.i18n.format("OSE.warn.noItemWithName", {
        actorName: actor?.name,
        itemName: itemName,
      })
    );
  }
  const item = items[0];

  // Trigger the item roll
  item.roll();
}
