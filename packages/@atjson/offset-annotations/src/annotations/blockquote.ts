import { BlockAnnotation, Insertion } from '@atjson/document';
import { v4 as uuid } from 'uuid';
import Paragraph from './paragraph';

export default class Blockquote extends BlockAnnotation {
  static type = 'blockquote';
  static vendorPrefix = 'offset';
  attributes!: {
    attribution: string;
    accreditation: string;
  };

  handleInsertion(change: Insertion) {
    let newline = change.text.indexOf('\n');
    if (newline > -1 && this.isOverlapping(change.start, change.start)) {
      let blockquote = this.clone();
      blockquote.end = newline + 1;

      // And now add a new paragraph.
      return [blockquote, new Paragraph({
        id: uuid(),
        start: newline + 1,
        end: this.end,
        attributes: {}
      })];
    }
  }
}
