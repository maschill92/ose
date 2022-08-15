import { type ActorDataProperties, type ActorDataSource } from "./actor-data";
import { OseActor } from "../module/actor/entity";
import { OseCombat } from "../module/combat";
import type { OseConfig } from "../module/config";
import { OseItem } from "../module/item/entity";
import { ItemDataProperties, ItemDataSource } from "./item-data";

declare global {
  interface LenientGlobalVariableTypes {
    // Allowing game to be accessible as a typescript type regardless of whether or not the object has been initialized.
    // See documentation for LenientGlobalVariableTypes in @league-of-foundry-developers/foundry-vtt-types
    game: never;
    canvas: never;
  }

  interface CONFIG {
    OSE: OseConfig;
  }

  interface Game {
    ose: {
      rollItemMacro: (itemName: string) => Promise<void>;
      oseCombat: OseCombat;
    };
  }

  interface SourceConfig {
    Actor: ActorDataSource;
    Item: ItemDataSource;
  }

  interface DataConfig {
    Actor: ActorDataProperties;
    Item: ItemDataProperties;
  }

  interface DocumentClassConfig {
    Actor: typeof OseActor;
    Item: typeof OseItem;
  }
}
