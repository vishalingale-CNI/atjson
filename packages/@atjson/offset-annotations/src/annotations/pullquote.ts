import { BlockAnnotation, Insertion } from '@atjson/document';
import { v4 as uuid } from 'uuid';
import Paragraph from './paragraph';

export default class Pullquote extends BlockAnnotation {
  static type = 'pullquote';
  static vendorPrefix = 'offset';
  attributes!: {
    attribution?: string;
  };

  handleInsertion(change: Insertion) {
    let newline = change.text.indexOf('\n');
    if (newline > -1 && this.isOverlapping(change.start, change.start)) {
      let pullQuote = this.clone();
      pullQuote.end = newline + 1;

      // And now add a new paragraph.
      return [pullQuote, new Paragraph({
        id: uuid(),
        start: newline + 1,
        end: this.end,
        attributes: {}
      })];
    }
  }
}
