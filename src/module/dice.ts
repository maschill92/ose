import { ChatMessageDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";
import { ChatSpeakerDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { OSE } from "./config";

export class OseDice {
  private static async sendRoll({
    parts = [],
    data,
    title,
    flavor = null,
    speaker = null,
    form,
    chatMessage = true,
  }: RollOpts): Promise<Roll> {
    const template = `${OSE.systemPath()}/templates/chat/roll-result.html`;

    let chatData: ChatMessageDataConstructorData = {
      user: game.user?.id,
      speaker: speaker,
    };

    const templateData = {
      title: title,
      flavor: flavor,
      data: data,
      result: null as DigestedAttackRoll | null,
      rollOSE: null as string | null,
      rollDamage: null as string | null,
    };

    // Optionally include a situational bonus
    if (form !== null && form && "bonus" in form && form.bonus.value) {
      parts.push(form.bonus.value);
    }

    //;
    const roll = new Roll(parts.join("+"), data).evaluate({ async: false });

    // Convert the roll to a chat message and return the roll
    let rollMode = game.settings.get("core", "rollMode");
    rollMode = form && "rollMode" in form ? form.rollMode.value : rollMode;

    // Force blind roll (ability formulas)
    if (!form && data.roll?.blindroll) {
      rollMode = game.user?.isGM ? "selfroll" : "blindroll";
    }

    if (["gmroll", "blindroll"].includes(rollMode))
      chatData.whisper = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "selfroll" && game.user?.id) {
      chatData["whisper"] = [game.user.id];
    }
    if (rollMode === "blindroll") {
      chatData["blind"] = true;
      data.roll.blindroll = true;
    }

    templateData.result = OseDice.digestResult(data, roll);

    return new Promise<Roll>((resolve) => {
      roll.render().then((r) => {
        templateData.rollOSE = r;
        renderTemplate(template, templateData).then((content) => {
          chatData.content = content;
          // Dice So Nice
          // @ts-ignore need to define/import TS definitions for module
          if (game.dice3d) {
            // @ts-ignore need to define/import TS definitions for module
            game.dice3d
              .showForRoll(
                roll,
                game.user,
                true,
                chatData.whisper,
                chatData.blind
              )
              .then(() => {
                if (chatMessage !== false) ChatMessage.create(chatData);
                resolve(roll);
              });
          } else {
            chatData.sound = CONFIG.sounds.dice;
            if (chatMessage !== false) ChatMessage.create(chatData);
            resolve(roll);
          }
        });
      });
    });
  }

  private static digestResult(data: RollOpts["data"], roll: Roll): DigestedAttackRoll {
    const rollTotal = roll.total!;
    let result: DigestedAttackRoll = {
      isSuccess: false,
      isFailure: false,
      // type is this?
      target: data.roll.target as string | number,
      total: rollTotal!,
      details: "",
      victim: "",
    };

    let die = roll.terms[0].total;
    if (data.roll.type == "result") {
      if (rollTotal == result.target) {
        result.isSuccess = true;
      } else {
        result.isFailure = true;
      }
    } else if (data.roll.type == "above") {
      // SAVING THROWS
      if (rollTotal >= result.target) {
        result.isSuccess = true;
      } else {
        result.isFailure = true;
      }
    } else if (data.roll.type == "below") {
      // MORALE, EXPLORATION
      if (rollTotal <= result.target) {
        result.isSuccess = true;
      } else {
        result.isFailure = true;
      }
    } else if (data.roll.type == "check") {
      // SCORE CHECKS (1s and 20s)
      if (die == 1 || (rollTotal <= result.target && (die as number) < 20)) {
        result.isSuccess = true;
      } else {
        result.isFailure = true;
      }
    } else if (data.roll.type == "table") {
      // Reaction
      let table = data.roll.table;
      let output = table ? Object.values(table)[0] : "";
      for (let i = 0; i <= rollTotal; i++) {
        if (table && table[i]) {
          output = table[i];
        }
      }
      result.details = output as string;
    }
    return result;
  }

  private static attackIsSuccess(
    roll: Roll,
    thac0: number | string,
    ac: number
  ): boolean {
    const rollTotal = roll.total ?? 0;
    if (rollTotal == 1 || roll.dice[0].results[0].result == 1) {
      return false;
    }
    if ((rollTotal ?? 0) >= 20 || roll.dice[0].results[0].result == 20) {
      return true;
    }
    if (rollTotal + ac >= thac0) {
      return true;
    }
    return false;
  }

  private static digestAttackResult(
    data: RollOpts["data"],
    roll: Roll
  ): DigestedAttackRoll {
    let result: DigestedAttackRoll = {
      isSuccess: false,
      isFailure: false,
      target: "",
      total: roll.total!,
      victim: null,
      details: "",
    };
    result.target = data.roll.thac0;
    let targetActorData =
      data.roll.target?.actor?.system ||
      data.roll.target?.actor?.data?.data ||
      null; //v9-compatibility

    const targetAc = data.roll.target ? targetActorData.ac.value : 9;
    const targetAac = data.roll.target ? targetActorData.aac.value : 0;
    result.victim = data.roll.target ? data.roll.target.data.name : null;

    if (game.settings.get(game.system.id, "ascendingAC")) {
      if (
        // @ts-ignore terms are RollTerm objects and not numbers
        (roll.terms[0] != 20 && roll.total < targetAac) ||
        // @ts-ignore terms are RollTerm objects and not numbers
        roll.terms[0] == 1
      ) {
        result.details = game.i18n.format(
          "OSE.messages.AttackAscendingFailure",
          {
            bonus: result.target,
          }
        );
        return result;
      }
      result.details = game.i18n.format("OSE.messages.AttackAscendingSuccess", {
        result: roll.total,
      });
      result.isSuccess = true;
    } else {
      if (!this.attackIsSuccess(roll, result.target, targetAc)) {
        result.details = game.i18n.format("OSE.messages.AttackFailure", {
          bonus: result.target,
        });
        return result;
      }
      result.isSuccess = true;
      let value = Math.clamped(
        parseInt(result.target.toString()) - (roll.total ?? 0),
        -3,
        9
      );
      result.details = game.i18n.format("OSE.messages.AttackSuccess", {
        result: value,
        bonus: result.target,
      });
    }
    return result;
  }

  private static async sendAttackRoll({
    parts,
    data,
    flags,
    title,
    flavor = null,
    speaker = null,
    form,
  }: RollOpts): Promise<Roll> {
    const template = `${OSE.systemPath()}/templates/chat/roll-attack.html`;
    const chatData: ChatMessageDataConstructorData = {
      user: game.user?.id,
      speaker: speaker,
      flags: flags,
    };

    const templateData = {
      title: title,
      flavor: flavor,
      data: data,
      config: CONFIG.OSE,
      result: null as DigestedAttackRoll | null,
      rollOSE: null as string | null,
      rollDamage: null as string | null,
    };

    // Optionally include a situational bonus
    if (form !== null && form && "bonus" in form && form.bonus.value) {
      parts.push(form.bonus.value);
    }

    const roll = new Roll(parts.join("+"), data).evaluate({ async: false });
    const dmgRoll = new Roll(data.roll?.dmg?.join("+") ?? "", data).evaluate({
      async: false,
    });

    // Convert the roll to a chat message and return the roll
    let rollMode = game.settings.get("core", "rollMode");
    rollMode = form && "rollMode" in form ? form.rollMode.value : rollMode;

    // Force blind roll (ability formulas)
    if (data.roll?.blindroll) {
      rollMode = game.user?.isGM ? "selfroll" : "blindroll";
    }

    if (["gmroll", "blindroll"].includes(rollMode))
      chatData.whisper = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "selfroll" && game.user?.id) {
      chatData.whisper = [game.user.id];
    }
    if (rollMode === "blindroll") {
      chatData.blind = true;
      if (data.roll) {
        data.roll.blindroll = true;
      }
    }

    templateData.result = OseDice.digestAttackResult(data, roll);

    return new Promise<Roll>((resolve) => {
      roll.render().then((r) => {
        templateData.rollOSE = r;
        dmgRoll.render().then((dr) => {
          templateData.rollDamage = dr;
          renderTemplate(template, templateData).then((content) => {
            chatData.content = content;
            // 2 Step Dice So Nice
            // @ts-ignore need to define/import TS definitions for module
            if (game.dice3d) {
              // @ts-ignore need to define/import TS definitions for module
              game.dice3d
                .showForRoll(
                  roll,
                  game.user,
                  true,
                  chatData.whisper,
                  chatData.blind
                )
                .then(() => {
                  // @ts-ignore need to define/import TS definitions for module
                  if (templateData.result.isSuccess) {
                    // @ts-ignore need to define/import TS definitions for module
                    templateData.result.dmg = dmgRoll.total;
                    // @ts-ignore need to define/import TS definitions for module
                    game.dice3d
                      .showForRoll(
                        dmgRoll,
                        game.user,
                        true,
                        chatData.whisper,
                        chatData.blind
                      )
                      .then(() => {
                        ChatMessage.create(chatData);
                        resolve(roll);
                      });
                  } else {
                    ChatMessage.create(chatData);
                    resolve(roll);
                  }
                });
            } else {
              chatData.sound = CONFIG.sounds.dice;
              ChatMessage.create(chatData);
              resolve(roll);
            }
          });
        });
      });
    });
  }

  /**
   * JS doc to support typescript
   * @param {object} param0
   * @returns
   */
  public static async RollSave({
    parts,
    data,
    skipDialog = false,
    speaker = null,
    flavor = null,
    title,
    chatMessage = true,
  }: RollOpts): Promise<Roll> {
    let rolled = false;
    const template = `${OSE.systemPath()}/templates/chat/roll-dialog.html`;
    let dialogData = {
      formula: parts.join(" "),
      data: data,
      rollMode: game.settings.get("core", "rollMode"),
      rollModes: CONFIG.Dice.rollModes,
    };

    let rollData: RollOpts = {
      parts: parts,
      data: data,
      title: title,
      flavor: flavor,
      speaker: speaker,
      chatMessage: chatMessage,
    };
    if (skipDialog) {
      return OseDice.sendRoll(rollData);
    }

    let buttons: Dialog.Data["buttons"] = {
      ok: {
        label: game.i18n.localize("OSE.Roll"),
        icon: '<i class="fas fa-dice-d20"></i>',
        callback: (html) => {
          rolled = true;
          rollData.form = $(html).find("form");
          roll = OseDice.sendRoll(rollData);
        },
      },
      magic: {
        label: game.i18n.localize("OSE.saves.magic.short"),
        icon: '<i class="fas fa-magic"></i>',
        callback: (html) => {
          rolled = true;
          rollData.form = $(html).find("form");
          rollData.parts.push(`${rollData.data.roll.magic}`);
          rollData.title += ` ${game.i18n.localize("OSE.saves.magic.short")} (${
            rollData.data.roll.magic
          })`;
          roll = OseDice.sendRoll(rollData);
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("OSE.Cancel"),
      },
    };

    const html = await renderTemplate(template, dialogData);
    let roll: any;

    //Create Dialog window
    return new Promise<Roll>((resolve) => {
      new Dialog({
        title: title,
        content: html,
        buttons: buttons,
        default: "ok",
        close: () => {
          resolve(rolled ? roll : false);
        },
      }).render(true);
    });
  }

  /**
   * JS doc to support typescript
   * @param {object} param0
   * @returns
   */
  public static async Roll({
    parts,
    data,
    skipDialog,
    speaker,
    flavor,
    title,
    chatMessage,
    flags,
  }: RollOpts): Promise<Roll> {
    let rolled = false;
    const template = `${OSE.systemPath()}/templates/chat/roll-dialog.html`;
    let dialogData = {
      formula: parts.join(" "),
      data: data,
      rollMode: data.roll?.blindroll
        ? "blindroll"
        : game.settings.get("core", "rollMode"),
      rollModes: CONFIG.Dice.rollModes,
    };
    let rollData: RollOpts = {
      parts: parts,
      data: data,
      title: title,
      flavor: flavor,
      speaker: speaker,
      chatMessage: chatMessage,
      flags: flags,
    };
    if (skipDialog) {
      return data.roll?.type && typeof data.roll.type === 'string' &&
        ["melee", "missile", "attack"].includes(data.roll.type)
        ? OseDice.sendAttackRoll(rollData)
        : OseDice.sendRoll(rollData);
    }

    let buttons: Dialog.Data["buttons"] = {
      ok: {
        label: game.i18n.localize("OSE.Roll"),
        icon: '<i class="fas fa-dice-d20"></i>',
        callback: (html) => {
          rolled = true;
          rollData.form = $(html).find("form");
          roll =
            data.roll?.type && typeof data.roll.type === 'string' &&
            ["melee", "missile", "attack"].includes(data.roll.type)
              ? OseDice.sendAttackRoll(rollData)
              : OseDice.sendRoll(rollData);
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("OSE.Cancel"),
      },
    };

    const html = await renderTemplate(template, dialogData);
    let roll: any;

    //Create Dialog window
    return new Promise<Roll>((resolve) => {
      new Dialog({
        title: title,
        content: html,
        buttons: buttons,
        default: "ok",
        close: () => {
          resolve(rolled ? roll : false);
        },
      }).render(true);
    });
  }
}

// FIXME: These types are a bit of a mess. Likely will need some sort of refactor

interface DigestedAttackRoll {
  isSuccess: boolean;
  isFailure: boolean;
  target: number | string;
  total: number;
  details: string;
  victim: string | null;
}

interface RollOpts {
  event?: JQuery.Event;
  parts: (string | number)[];
  data: {
    actor?: { [key: string]: any };
    roll: {
      table?: { [key: string]: unknown };
      blindroll?: boolean;
      type?:
        | string
        | {
            type: string;
          };
      dmg?: string[];
      target?: null | { actor: Actor } | number | string;
      magic?: string | number;
      thac0?: string | number;
    };
  };
  skipDialog?: boolean;
  speaker: ChatSpeakerDataConstructorData | null;
  flavor: string | null;
  title: string;
  chatMessage?: boolean | string;
  flags?: {};
  form?:
    | JQuery<HTMLFormElement>
    | {
        rollMode: {
          value: keyof CONFIG.Dice.RollModes;
        };
        bonus: {
          value: number | string;
        };
      };
}
