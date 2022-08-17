export const registerFVTTModuleAPIs = () => {
  // see docs for more info https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/master/docs/api.md
  Hooks.once("item-piles-ready", async function () {
    if (ItemPiles.API.ACTOR_CLASS_TYPE !== "character")
      ItemPiles.API.setActorClassType("character");
    if (ItemPiles.API.ITEM_QUANTITY_ATTRIBUTE !== "data.quantity.value")
      ItemPiles.API.setItemQuantityAttribute("data.quantity.value");
    if (
      // FIXME: This if statement will always evaluate to true, as it's a new instance of the array
      ItemPiles.API.ITEM_FILTERS !==
      [
        {
          path: "type",
          filters: "spell,ability",
        },
      ]
    )
      ItemPiles.API.setItemFilters([
        {
          path: "type",
          filters: "spell,ability",
        },
      ]);
  });
};

// only declare ItemPiles as global for this module so it doesn't pollute the global namespace
declare var ItemPiles: ItemPiles;

interface ItemPiles {
  API: {
    ACTOR_CLASS_TYPE: string;
    setActorClassType: (arg0: string) => void;
    ITEM_QUANTITY_ATTRIBUTE: string;
    setItemQuantityAttribute: (arg0: string) => void;
    ITEM_FILTERS: { path: string; filters: string }[];
    setItemFilters: (arg0: { path: string; filters: string }[]) => void;
  };
}
