import { Evaluated } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/dice/roll";
import { OseActor } from "../actor/entity";
import { OseItem } from "../item/entity";

interface CreateRollOpts<
  RollData extends Record<string, unknown> = Record<string, unknown>
> {
  rollParts: string[];
  data?: RollData;
  rollOptions?: InexactPartial<RollTerm.EvaluationOptions>;
}

export async function createRoll<
  RollData extends Record<string, unknown> = Record<string, unknown>
>({
  rollParts,
  data,
  rollOptions,
}: CreateRollOpts<RollData>): Promise<Evaluated<Roll<RollData>>> {
  return Roll.create(rollParts.join("+"), data, rollOptions).evaluate({
    async: true,
  });
}

interface SimpleRollOpts<
  RollData extends Record<string, unknown> = Record<string, unknown>
> extends CreateRollOpts<RollData> {
  skipMessage?: boolean;
  speaker?: ChatMessage.GetSpeakerOptions;
  title: string;
  flavor?: string;
  rollingEntity?: OseActor | OseItem;
}

export async function simpleRoll<
  RollData extends Record<string, unknown> = Record<string, unknown>
>(opts: SimpleRollOpts<RollData>) {
  const speaker = ChatMessage.getSpeaker(opts.speaker);
  const roll = await createRoll(opts);
  if (opts.skipMessage !== true) {
    const renderedRoll = await roll.render();
    // generate content for message
    const content = await renderRollResultTemplate({
      title: opts.title,
      rollOSE: renderedRoll,
      rollingEntity: opts.rollingEntity,
    });

    // create the message and sent it to the chat log
    await roll.toMessage(
      {
        user: game.user,
        speaker,
        content,
        title: opts.title,
        flavor: opts.flavor,
      },
      { rollMode: game.settings.get("core", "rollMode"), create: true }
    );
  }
  return roll;
}

async function renderRollResultTemplate(templateData: {
  title: string;
  rollOSE: string;
  rollingEntity?: OseActor | OseItem;
  details?: string;
  result?: {
    isSuccess?: boolean;
    isFailure?: boolean;
    target?: string;
  };
}): Promise<string> {
  const template = `${CONFIG.OSE.systemPath()}/templates/chat/roll-result.html`;
  debugger;
  return renderTemplate(template, {
    ...templateData,
    // adding for backwards compatibility with template file
    data: {
      item:
        templateData.rollingEntity instanceof OseItem
          ? { img: templateData.rollingEntity.img }
          : undefined,
      actor:
        templateData.rollingEntity instanceof OseActor
          ? { img: templateData.rollingEntity.img }
          : undefined,
    },
  });
}
