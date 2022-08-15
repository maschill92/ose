import { OseItem } from "./item/entity";
import { OSE } from "./config";

export const RenderCompendium = async function (
  object: Compendium<CompendiumCollection.Metadata>,
  html: JQuery,
  d: Compendium.Data<CompendiumCollection.Metadata>
) {
  if (object.metadata.type !== "Item") {
    return;
  }
  const render = html.find(".item");
  const docs = await d.collection.getDocuments();

  render.each(function (_, item) {
    const id = item.dataset.documentId;

    const element = docs.filter((d) => d.id === id)[0];
    renderTemplate(
      `${OSE.systemPath()}/templates/actors/partials/item-auto-tags-partial.html`,
      { tags: OseItem.prototype.getAutoTagList.call(element) }
    ).then((s) => {
      $(item).append($.parseHTML(s));
    });
  });
};

export const RenderItemDirectory = async function (
  object: ItemDirectory,
  html: JQuery
) {
  if (object.id != "items") {
    return;
  }

  const render = html.find(".item");
  const content = object.documents;

  render.each(function (_, item) {
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
