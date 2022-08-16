//@ts-check
import { ChatMessageDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";
import { OSE } from "./config";

export const augmentTable = (
  table: RollTableConfig,
  html: JQuery,
  _: RollTableConfig.Data
) => {
  // Treasure Toggle
  const isTreasureTable = Boolean(
    table.object.getFlag(game.system.id, "treasure")
  );

  let treasureTableToggle = $(
    "<div class='toggle-treasure' title='Toggle Treasure Table'></div>"
  );
  treasureTableToggle.toggleClass("active", isTreasureTable);

  let head = html.find(".sheet-header");
  head.append(treasureTableToggle);

  html.find(".toggle-treasure").click(() => {
    const isTreasure = Boolean(
      table.object.getFlag(game.system.id, "treasure")
    );
    table.object.setFlag(game.system.id, "treasure", !isTreasure);
  });

  // Treasure table formatting
  if (!isTreasureTable) {
    return;
  }

  // Hide irrelevant standard fields
  html.find(".result-range").hide(); // We only hide this column because the underlying model requires two fields for the range and throw an error if they are missing
  html.find(".normalize-results").remove();

  let chanceHeader = html.find(".table-header .result-weight");
  chanceHeader.text("Chance (%)");

  let chanceColumn = html.find(".result-weight");
  chanceColumn.css("flex", "0 0 75px");

  let formula = html.find("input[name=formula]");
  formula.attr("value", "1d100");
  //@ts-ignore
  formula.attr("disabled", true);

  // Replace Roll button
  const roll = `<button class="roll-treasure" type="button"><i class="fas fa-gem"></i> ${game.i18n.localize(
    "OSE.table.treasure.roll"
  )}</button>`;
  html.find(".sheet-footer .roll").replaceWith(roll);

  html.find(".roll-treasure").click((ev) => {
    rollTreasure(table.object, { event: ev });
  });
};

interface DrawTreasureData {
  treasure?: {
    [key: string]: DrawTreasureItem;
  };
}
interface DrawTreasureItem extends DrawTreasureData {
  img?: string | null;
  text?: string;
}

function drawTreasure(table: RollTable, data: DrawTreasureData = {}) {
  /**
   *
   * @param {number} chance
   * @returns
   */
  const percent = (chance = -1): boolean => {
    const roll = new Roll("1d100");
    roll.evaluate({ async: false });
    return (roll.total ?? -1) <= chance;
  };
  data.treasure = {};
  if (table.getFlag(game.system.id, "treasure")) {
    table.results.forEach((r) => {
      if (percent(r.data.weight) && r.id) {
        const text = r.getChatText();
        data.treasure![r.id] = {};
        data.treasure![r.id!] = {
          img: r.data.img,
          text: TextEditor.enrichHTML(text),
        };
        if (
          r.data.type === CONST.TABLE_RESULT_TYPES.DOCUMENT &&
          r.data.collection === "RollTable" &&
          r.data.resultId
        ) {
          const embeddedTable = game.tables?.get(r.data.resultId);
          if (embeddedTable) {
            drawTreasure(embeddedTable, data.treasure![r.id!]);
          }
        }
      }
    });
  } else {
    // FIXME: This API is no longer available? Treasure tables should probably be a custom type.
    //@ts-ignore
    const results = table.evaluate({ async: false }).results;
    // @ts-ignore
    results.forEach((s) => {
      // @ts-ignore
      const text = TextEditor.enrichHTML(table._getResultChatText(s));
      data.treasure![s.id] = { img: s.data.img, text: text };
    });
  }
  return data;
}

async function rollTreasure(
  table: RollTable,
  options: { event?: JQuery.TriggeredEvent } = {}
) {
  // Draw treasure
  const data = drawTreasure(table, {});
  let templateData = {
    treasure: data.treasure,
    table: table,
  };

  // Animation
  if (options.event) {
    let results = $(options.event.currentTarget.parentElement)
      .prev()
      .find(".table-result");
    results.each((_, item) => {
      item.classList.remove("active");
      if (item.dataset.resultId && data.treasure![item.dataset.resultId]) {
        item.classList.add("active");
      }
    });
  }

  let html = await renderTemplate(
    `${OSE.systemPath()}/templates/chat/roll-treasure.html`,
    templateData
  );

  let chatData: ChatMessageDataConstructorData = {
    content: html,
    // sound: "systems/ose/assets/coins.mp3"
  };

  let rollMode = game.settings.get("core", "rollMode");
  if (["gmroll", "blindroll"].includes(rollMode))
    chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
  if (rollMode === "selfroll")
    chatData["whisper"] = game.user?.id ? [game.user.id] : null;
  if (rollMode === "blindroll") chatData["blind"] = true;

  ChatMessage.create(chatData);
}