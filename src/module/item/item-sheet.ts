import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs";
import { OSE, OseConfig } from "../config";

interface OseItemSheetOptions extends ItemSheet.Options {}
type OseItemSheetData = ActorData & { editable: boolean; config: OseConfig };


/**
 * Extend the basic ItemSheet with some very simple modifications
 */
export class OseItemSheet extends ItemSheet<
  OseItemSheetOptions,
  OseItemSheetData
> {
  /**
   * Extend and override the default options used by the Simple Item Sheet
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ose", "sheet", "item"],
      width: 520,
      height: 390,
      resizable: false,
      tabs: [
        {
          navSelector: ".tabs",
          contentSelector: ".sheet-body",
          initial: "description",
        },
      ],
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = `${OSE.systemPath()}/templates/items/`;
    return `${path}/${this.item.data.type}-sheet.html`;
  }

  /**
   * Prepare data for rendering the Item sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  async getData(): Promise<OseItemSheetData> {
    const data = (await super.getData()).data;
    //@ts-ignore
    data.editable = this.document.sheet?.isEditable ?? false;
    //@ts-ignore
    data.config = CONFIG.OSE;
    //@ts-ignore
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    html.find('input[data-action="add-tag"]').keypress((ev) => {
      if (ev.which == 13) {
        let value = $(ev.currentTarget).val();
        let values = (value as string).split(",");
        this.object.pushManualTag(values);
      }
    });
    html.find(".tag-delete").click((ev) => {
      let value = ev.currentTarget!.parentElement!.dataset.tag;
      this.object.popManualTag(value);
    });
    html.find("a.melee-toggle").click(() => {
      if (this.object.data.type === "weapon") {
        this.object.update({ data: { melee: !this.object.data.data.melee } });
      }
    });

    html.find("a.missile-toggle").click(() => {
      if (this.object.data.type === "weapon") {
        this.object.update({
          data: { missile: !this.object.data.data.missile },
        });
      }
    });

    super.activateListeners(html);
  }
}
