import OffsetSource, {
  Bold,
  GiphyEmbed,
  Italic,
  LineBreak,
  Link,
  YouTubeEmbed
} from "@atjson/offset-annotations";
import GlimmerRenderer from "../src";

describe("GlimmerRenderer", () => {
  it("renders simple components", () => {
    let document = new OffsetSource({
      content: "This is bold and italic text",
      annotations: [
        new Bold({ start: 8, end: 17 }),
        new Italic({ start: 12, end: 23 })
      ]
    });

    console.log(GlimmerRenderer.render(document));
    expect(GlimmerRenderer.render(document)).toMatchInlineSnapshot(`
      Array [
        0,
        "This is ",
        "<Bold>",
        Object {},
        0,
        "bold",
        "<Italic>",
        Object {},
        0,
        " and ",
        "<Italic>",
        Object {},
        0,
        "italic",
        0,
        " text",
      ]
    `);
  });
});
