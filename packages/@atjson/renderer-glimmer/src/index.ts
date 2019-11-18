import { Annotation } from "@atjson/document";
import Renderer, { classify } from "@atjson/renderer-hir";
import { s } from "@glimmer/compiler";

export default class GlimmerRenderer extends Renderer {
  text(text: string) {
    return s`${text}`;
  }

  *Root() {
    let components: any[] = yield;
    console.log(components);
    return [components.map(component => [component])];
  }

  *renderAnnotation(annotation: Annotation) {
    let components: any[] = yield;
    console.log(components);
    return [
      `<${classify(annotation.type)}>`,
      annotation.attributes,
      components
    ];
  }
}
