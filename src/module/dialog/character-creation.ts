import { OseDice } from "../dice";
import { Attribute, OSE, OseConfig } from "../config";
import { OseActor } from "../actor/entity";
import { simpleRoll } from "../utils/dice-utils";

interface OseCharacterCreatorOptions extends FormApplicationOptions {}

interface OseCharacterCreatorData {
  scoreConfig: OseConfig["scores"];
  stats: {
    sum: number;
    avg: number;
    std: number | null;
  };
  scores: ScoresData;
  gold: number;
  counters: CountersData;
  formDisabled: boolean;
}

type ScoresData = Record<Attribute, number>;
type CountersData = Record<Attribute | "gold", number>;

/**
 * Dialog to generate a new character. Supports rolling of attribute scores and gold.
 */
export class OseCharacterCreator extends FormApplication<
  OseCharacterCreatorOptions,
  OseCharacterCreatorData,
  OseActor
> {
  stats: {
    sum: number;
    avg: number;
    std: number | null;
  } = {
    sum: 0,
    avg: 0,
    std: null,
  };
  scores: ScoresData = {
    str: 0,
    wis: 0,
    dex: 0,
    int: 0,
    cha: 0,
    con: 0,
  };
  counters: CountersData = {
    str: 0,
    wis: 0,
    dex: 0,
    int: 0,
    cha: 0,
    con: 0,
    gold: 0,
  };
  gold = 0;

  static get defaultOptions() {
    const options = super.defaultOptions;
    (options.classes = ["ose", "dialog", "creator"]),
      (options.id = "character-creator");
    options.template = `${OSE.systemPath()}/templates/actors/dialogs/character-creation.html`;
    options.width = 300;
    return options;
  }

  /* -------------------------------------------- */

  /**
   * Add the Entity name into the window title
   */
  get title(): string {
    return `${this.object.name}: ${game.i18n.localize("OSE.dialog.generator")}`;
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   */
  override getData(): OseCharacterCreatorData {
    this.computeStatistics();
    return {
      scoreConfig: CONFIG.OSE.scores,
      stats: this.stats,
      scores: this.scores,
      counters: this.counters,
      gold: this.gold,
      // disabled if at least one of scores/gold are 0
      formDisabled: [...Object.values(this.scores), this.gold].some(
        (num) => num === 0
      ),
    };
  }

  private computeStatistics(): void {
    function getSum(nums: number[]) {
      return nums.reduce((partialSum, a) => partialSum + a, 0);
    }
    function getVariance(nums: number[]) {
      return getSum(nums.map((v) => (v - avg) ** 2));
    }
    function getStandardDeviation(nums: number[]) {
      return Math.sqrt(getVariance(nums));
    }

    const scoreNumbers = Object.values(this.scores);

    const sum = getSum(scoreNumbers);
    const avg = sum / 6; // always use 6
    const std =
      scoreNumbers.length > 1 ? getStandardDeviation(scoreNumbers) : null;

    this.stats = {
      avg,
      sum,
      std,
    };
  }

  /** @override */
  activateListeners(html: JQuery) {
    super.activateListeners(html);
    // Roll individual score
    html.find("a.score-roll").on("click", (ev) => {
      const attribute = $(ev.currentTarget)
        .closest(".form-group")
        .data("score") as Attribute;
      this.onClickRollScore(attribute);
    });

    // Roll gold
    debugger;
    html.find("a.gold-roll").on("click", (ev) => {
      this.onClickRollGold();
    });

    // Manually change a score
    html.find<HTMLInputElement>("input.score-value").on("change", (ev) => {
      const score = parseInt(ev.currentTarget.value);
      const attribute: Attribute = $(ev.currentTarget)
        .closest(".form-group")
        .data("score") as Attribute;
      this.onChangeScoreValue(attribute, score);
    });

    // Roll all
    html.find("a.auto-roll").on("click", async (ev) => {
      this.onClickAutoRoll();
    });
  }

  private onChangeScoreValue(score: Attribute, value: number) {
    this.scores[score] = value;
    this.computeStatistics();
    this.render();
  }

  private async onClickAutoRoll() {
    const scores = Object.keys(
      CONFIG.OSE.scores
    ) as (keyof typeof CONFIG.OSE.scores)[];
    await Promise.all([
      ...scores.map((attribute) => this.rollScore(attribute, true)),
      this.rollGold(true),
    ]);

    this.computeStatistics();

    const templateData = {
      title: game.i18n.localize("OSE.dialog.generator"),
      img: this.object.img,
      scoreNames: CONFIG.OSE.scores,
      scores: this.scores,
      stats: this.stats,
      gold: this.gold,
    };
    const content = await renderTemplate(
      `${OSE.systemPath()}/templates/chat/roll-creation.html`,
      templateData
    );
    ChatMessage.create({
      content: content,
      speaker: ChatMessage.getSpeaker({ actor: this.object }),
    });

    this.render();
  }

  private async onClickRollGold() {
    await this.rollGold();
    this.render();
  }

  private async onClickRollScore(attribute: Attribute) {
    await this.rollScore(attribute);
  }

  private async rollScore(attribute: Attribute, skipMessage = false) {
    this.counters[attribute]++;
    const label = game.i18n.localize(`OSE.scores.${attribute}.long`);
    const roll = await this.createSingleRoll(
      "3d6",
      label,
      this.counters[attribute],
      skipMessage
    );
    this.scores[attribute] = roll.total;
  }

  private async rollGold(skipMessage = false) {
    this.counters.gold++;
    const label = game.i18n.localize("OSE.items.gp.short");
    const roll = await this.createSingleRoll(
      "3d6 * 10",
      label,
      this.counters.gold,
      skipMessage
    );
    this.gold = roll.total;
  }

  private createSingleRoll(
    roll: string,
    label: string,
    count: number,
    skipMessage: boolean = false
  ) {
    const title = game.i18n.format("OSE.dialog.generateScore", {
      score: label,
      count,
    });
    return simpleRoll({
      title,
      skipMessage,
      rollParts: [roll],
      rollingEntity: this.object,
    });
  }

  /**
   * This method is called upon form submission after form data is validated
   * @param event The SubmitEvent
   * @param formData Bound data from the form. Used for updating the actor directly.
   */
  protected override async _updateObject(
    _: Event,
    formData: object
  ): Promise<void> {
    await this.object.update(formData);

    // Generate gold, the gold value won't be in the formData as the input field is always disabled.
    // Gold can only be generated via rolling which is set in rollGold()
    await this.object.createEmbeddedDocuments("Item", [
      {
        name: game.i18n.localize("OSE.items.gp.short"),
        type: "item",
        img: "systems/ose/assets/gold.png",
        data: {
          treasure: true,
          cost: 1,
          weight: 1,
          quantity: {
            value: this.gold || 0,
          },
        },
      },
    ]);
  }
}
