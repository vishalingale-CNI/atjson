import { BlockAnnotation, Insertion } from '@atjson/document';
import { v4 as uuid } from 'uuid';
import Paragraph from './paragraph';

export default class Heading extends BlockAnnotation {
  static type = 'heading';
  static vendorPrefix = 'offset';
  attributes!: {
    level: 1 | 2 | 3 | 4 | 5 | 6;
  };

  handleInsertion(change: Insertion) {
    let newline = change.text.indexOf('\n');
    if (newline > -1 && this.isOverlapping(change.start, change.start)) {
      let heading = this.clone();
      heading.end = newline + 1;

      // And now add a new paragraph.
      return [heading, new Paragraph({
        id: uuid(),
        start: newline + 1,
        end: this.end,
        attributes: {}
      })];
    }
  }
}
