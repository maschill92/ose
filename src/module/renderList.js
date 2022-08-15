//@ts-check
import { OseItem } from "./item/entity";
import { OSE } from "./config";

export const RenderCompendium = async function (object, html, d) {
  if (object.documentName != "Item") {
    return;
  }
  const render = html[0].querySelectorAll(".item");
  const docs = await d.collection.getDocuments();

  render.forEach(async function (item, i) {
    const id = render[i].dataset.documentId;

    const element = docs.filter((d) => d.id === id)[0];
    const tagTemplate = $.parseHTML(
      await renderTemplate(
        `${OSE.systemPath()}/templates/actors/partials/item-auto-tags-partial.html`,
        { tags: OseItem.prototype.getAutoTagList.call(element) }
      )
    );

    $(item).append(tagTemplate);
  });
};

/**
 *
 * @param {ItemDirectory} object
 * @param {JQuery} html
 * @returns
 */
export const RenderItemDirectory = async function (object, html) {
  if (object.id != "items") {
    return;
  }

  const render = html.find(".item");
  const content = object.documents;

  render.each(function (idx, item) {
    const foundryDocument = content.find(
      (e) => e.id == item.dataset.documentId
    );

    renderTemplate(
      `${OSE.systemPath()}/templates/actors/partials/item-auto-tags-partial.html`,
      { tags: OseItem.prototype.getAutoTagList.call(foundryDocument) }
    ).then((s) => {
      $(item).append($.parseHTML(s));
    });
  });
};
