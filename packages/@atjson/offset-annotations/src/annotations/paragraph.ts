import { BlockAnnotation, Insertion } from '@atjson/document';
import { v4 as uuid } from 'uuid';

export default class Paragraph extends BlockAnnotation {
  static type = 'paragraph';
  static vendorPrefix = 'offset';

  get rank() {
    return super.rank * 3 / 2;
  }

  handleInsertion(change: Insertion) {
    let newline = change.text.indexOf('\n');
    if (newline > -1 && this.isOverlapping(change.start, change.start)) {
      let paragraph = this.clone();
      paragraph.end = newline + 1;

      // And now add a new paragraph.
      return [paragraph, new Paragraph({
        id: uuid(),
        start: newline + 1,
        end: this.end,
        attributes: {}
      })];
    }
  }
}
