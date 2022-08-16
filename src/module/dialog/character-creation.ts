import { OseDice } from "../dice";
import { Attribute, OSE, OseConfig } from "../config";
import { OseActor } from "../actor/entity";

interface OseCharacterCreatorOptions extends FormApplicationOptions {}

interface OseCharacterCreatorData
  extends FormApplication.Data<OseActor, OseCharacterCreatorOptions> {
  user: User;
  config: OseConfig;
}

/**
 * Dialog to generate a new character. Supports rolling of attribute scores and gold.
 */
export class OseCharacterCreator extends FormApplication<
  OseCharacterCreatorOptions,
  OseCharacterCreatorData
> {
  counters: Record<Attribute | "gold", number> | null = null;
  stats: {
    sum: number;
    avg: number;
    std: number;
  } | null = null;
  scores: Record<Attribute, { value: number }> | null = null;
  gold: number | null = null;

  static get defaultOptions() {
    const options = super.defaultOptions;
    (options.classes = ["ose", "dialog", "creator"]),
      (options.id = "character-creator");
    options.template = `${OSE.systemPath()}/templates/actors/dialogs/character-creation.html`;
    options.width = 235;
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
  override async getData(): Promise<OseCharacterCreatorData> {
    let data = await super.getData();
    if (!game.user) {
      throw new Error("Unable to get game.user");
    }
    data.user = game.user;
    data.config = CONFIG.OSE;
    this.counters = {
      str: 0,
      wis: 0,
      dex: 0,
      int: 0,
      cha: 0,
      con: 0,
      gold: 0,
    };
    this.stats = {
      sum: 0,
      avg: 0,
      std: 0,
    };
    this.scores = {
      str: { value: 0 },
      wis: { value: 0 },
      dex: { value: 0 },
      int: { value: 0 },
      cha: { value: 0 },
      con: { value: 0 },
    };
    this.gold = 0;
    return data;
  }

  /* -------------------------------------------- */

  doStats(ev: JQuery.TriggeredEvent) {
    const list = $(ev.currentTarget!).closest(".attribute-list");
    const scores = Object.values(this.scores!);
    const n = scores.length;
    const sum = scores.reduce((acc, next) => acc + next.value, 0);
    const mean = parseFloat(sum.toString()) / n;
    const std = Math.sqrt(
      scores
        .map((x) => Math.pow(x.value - mean, 2))
        .reduce((acc, next) => acc + next, 0) / n
    );

    let stats = list.siblings(".roll-stats");
    stats.find(".sum").text(sum);
    stats.find(".avg").text(Math.round((10 * sum) / n) / 10);
    stats.find(".std").text(Math.round(100 * std) / 100);

    if (n >= 6) {
      $(ev)
        .closest("form")
        .find('button[type="submit"]')
        .removeAttr("disabled");
    }

    // FIXME: Appears to be polluting the OseActor instance
    //@ts-ignore
    this.object.data.stats = {
      sum: sum,
      avg: Math.round((10 * sum) / n) / 10,
      std: Math.round(100 * std) / 100,
    };
  }

  rollScore(
    score: Attribute | "gold",
    options: { skipMessage?: boolean; event?: JQuery.Event } = {}
  ) {
    // Increase counter
    this.counters![score]++;

    const label =
      score != "gold" ? game.i18n.localize(`OSE.scores.${score}.long`) : "Gold";
    const rollParts = ["3d6"];
    const data = {
      roll: {
        type: "result",
      },
    };
    if (options.skipMessage) {
      return new Roll(rollParts[0]).evaluate();
    }
    // Roll and return
    return OseDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this.object }),
      flavor: game.i18n.format("OSE.dialog.generateScore", {
        score: label,
        count: this.counters![score],
      }),
      title: game.i18n.format("OSE.dialog.generateScore", {
        score: label,
        count: this.counters![score],
      }),
    });
  }

  /**
   *
   * @param options
   * @returns
   */
  override async close(...args: Parameters<FormApplication["close"]>) {
    const [options] = args;
    // Gather scores
    const speaker = ChatMessage.getSpeaker({ actor: this.object });
    const templateData = {
      config: CONFIG.OSE,
      scores: this.scores,
      title: game.i18n.localize("OSE.dialog.generator"),
      // @ts-ignore Assumed pollution of the OseActor
      stats: this.object.data.stats,
      gold: this.gold,
    };
    const content = await renderTemplate(
      `${OSE.systemPath()}/templates/chat/roll-creation.html`,
      templateData
    );
    ChatMessage.create({
      content: content,
      speaker,
    });
    return super.close(options);
  }

  /** @override */
  activateListeners(html: JQuery) {
    super.activateListeners(html);
    html.find("a.score-roll").click((ev) => {
      let el = ev.currentTarget.parentElement?.parentElement!;
      let score = el!.dataset.score as Attribute;
      this.rollScore(score, { event: ev }).then((r) => {
        this.scores![score] = { value: r.total };
        $(el).find("input").val(r.total).trigger("change");
      });
    });

    html.find("a.gold-roll").click((ev) => {
      let el = ev.currentTarget.parentElement?.parentElement?.parentElement!;
      this.rollScore("gold", { event: ev }).then((r) => {
        this.gold = 10 * r.total;
        $(el).find(".gold-value").val(this.gold);
      });
    });

    html.find("input.score-value").on("", (ev) => {
      this.doStats(ev);
    });

    html.find("a.auto-roll").click(async (ev) => {
      const stats: Attribute[] = ["str", "int", "dex", "wis", "con", "cha"];
      for (let char of stats) {
        const r = await this.rollScore(char, { event: ev, skipMessage: true });
        this.scores![char] = { value: r.total };
      }
      this.doStats(ev);
      const r = await this.rollScore("gold", { event: ev, skipMessage: true });
      this.gold = 10 * r.total;
      this.submit();
    });
  }

  protected override async _onSubmit(
    event: Event,
    {
      updateData,
      preventClose = false,
      preventRender = false,
    }: FormApplication.OnSubmitOptions | undefined = {}
  ): Promise<Partial<Record<string, unknown>>> {
    updateData = { ...updateData, data: { scores: this.scores } };
    await super._onSubmit(event, {
      updateData: updateData,
      preventClose: preventClose,
      preventRender: preventRender,
    });
    // Generate gold
    this.object.createEmbeddedDocuments("Item", [
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
    return {};
  }
  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  protected async _updateObject(
    event: Event,
    formData?: object | undefined
  ): Promise<void> {
    event.preventDefault();
    // Update the actor
    await this.object.update(formData);

    // Re-draw the updated sheet
    this.object.sheet?.render(true);
  }
}
