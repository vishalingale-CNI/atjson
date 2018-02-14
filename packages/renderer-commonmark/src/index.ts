import { HIRNode } from '@atjson/hir';
import Renderer, { State } from '@atjson/renderer-hir';

export function* split() {
  let rawText = yield;
  let text = rawText.join('');
  let start = 0;
  let end = text.length;

  while (text[start] === ' ' && start < end) { start++; }
  while (text[end - 1] === ' ' && end > start) { end--; }

  return [
    text.slice(0, start),
    text.slice(start, end),
    text.slice(end)
  ];
}

// http://spec.commonmark.org/0.28/#backslash-escapes
function escapePunctuation(text: string) {
  return text.replace(/([#$%'"!()*+,=?@\\\[\]\^_`{|}~-])/g, '\\$1')
             .replace(/(\d+)\./g, '$1\\.')
             .replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;');
}

function escapeText(text: string) {
  return text.replace(/\[/g, '\\[')
             .replace(/\]/g, '\\]');
}

function escapeAttribute(text: string) {
  return text.replace(/\(/g, '\\(')
             .replace(/\)/g, '\\)');
}

function join(...stanzas: string[]): string {
  let text = '';
  let lastStanza = '';
  for (let i = 0, len = stanzas.length; i < len; i++) {
    let stanza = stanzas[i];
    text += stanza;
    if (lastStanza[lastStanza.length - 1] !== '\n' &&
        stanza[0] !== '\n') {
      text += '\n';
    }
    lastStanza = stanza;
  }

  return text + '\n\n';
}

export default class CommonmarkRenderer extends Renderer {

  renderText(text: string, state: State) {
    if (state.get('isPreformatted')) {
      return text;
    }
    return escapePunctuation(text);
  }

  /**
   * The root allows us to normalize the document
   * after all annotations have been rendered to
   * CommonMark.
   */
  *'root'(): IterableIterator<string> {
    let document = yield;
    return document.join('').trimRight();
  }

  /**
   * Bold text looks like **this** in Markdown.
   */
  *'bold'(): IterableIterator<string> {
    let [before, text, after] = yield* split();
    return `${before}**${text}**${after}`;
  }

  /**
   * > A block quote has `>` in front of every line
   * > it is on.
   * >
   * > It can also span multiple lines.
   */
  *'blockquote'(): IterableIterator<string> {
    let text: string[] = yield;
    let lines: string[] = text.join('').split('\n');
    let endOfQuote = lines.length;
    let startOfQuote = 0;

    while (lines[startOfQuote].match(/^(\s)*$/)) startOfQuote++;
    while (lines[endOfQuote - 1].match(/^(\s)*$/)) endOfQuote--;

    return lines.slice(startOfQuote, endOfQuote).map(line => `> ${line}`)).join('\n') + '\n';
  }

  /**
   * # Headings have 6 levels, with a single `#` being the most important
   *
   * ###### and six `#` being the least important
   */
  *'heading'(props: { level: number }): IterableIterator<string> {
    let heading = yield;
    let level = new Array(props.level + 1).join('#');
    return `${level} ${heading.join('')}\n`;
  }

  /**
   * A horizontal rule separates sections of a story
   * ***
   * Into multiple sections.
   */
  *'horizontal-rule'(): IterableIterator<string> {
    return '***\n';
  }

  /**
   * Images are embedded like links, but with a `!` in front.
   * ![CommonMark](http://commonmark.org/images/markdown-mark.png)
   */
  *'image'(props: { alt: string, title?: string, url: string }): IterableIterator<string> {
    let title = '';
    if (props.title) {
      title = ` "${props.title.replace(/"/g, '\\"')}"`;
    }
    return `![${props.alt}](${props.url}${title})`;
  }

  /**
   * Italic text looks like *this* in Markdown.
   */
  *'italic'(_, state: State): IterableIterator<string> {
    let isItalicized = state.get('isItalicized');
    state.set('isItalicized', true);
    let [before, text, after] = yield* split();
    state.set('isItalicized', isItalicized);
    let markup = isItalicized ? '_' : '*';
    return `${before}${markup}${text}${markup}${after}`;
  }

  /**
   * A line break in Commonmark can be two white spaces at the end of the line  <--
   * or it can be a backslash at the end of the line\
   */
  *'line-break'(): IterableIterator<string> {
    return '  \n';
  }

  /**
   * Fixed space in Commonmark is the unicode \u00A0 character
   */
  *'fixed-space'(): IterableIterator<string> {
    let text = yield;
    return '\u00A0';
  },

  /**
   * A [link](http://commonmark.org) has the url right next to it in Markdown.
   */
  *'link'(props: { href: string, title?: string }): IterableIterator<string> {
    let [before, text, after] = yield* split();
    let href = escapeAttribute(props.href);
    if (props.title) {
      let title = props.title.replace(/"/g, '\\"');
      return `${before}[${text}](${href} "${title}")${after}`;
    }
    return `${before}[${text}](${href})${after}`;
  }

  /**
   * A `code` span can be inline or as a block:
   *
   * ```js
   * function () {}
   * ```
   */
  *'code'(props: { type?: string, language?: string }, state: State): IterableIterator<string> {
    state.set('isPreformatted', true);
    let code = yield;
    state.set('isPreformatted', false);
    if (props.type === 'block') {
      return code.join('').split('\n').map(line => `    ${line}`).join('\n') + '\n';
    } else {
      return `\`${code.join('')}\``;
    }
  }

  *'html_inline'(_, state: State): IterableIterator<string> {
    state.set('isPreformatted', true);
    let text = yield;
    state.set('isPreformatted', false);
    return text.join('');
  }

  *'html_block'(_, state: State): IterableIterator<string> {
    state.set('isPreformatted', true);
    let text = yield;
    state.set('isPreformatted', false);
    return text.join('');
  }

  *'fence'(props: { language?: string }, state: State): IterableIterator<string> {
    state.set('isPreformatted', true);
    let text = yield;
    let fence = '```';
    if (props.language) {
      fence += props.language;
    }
    state.set('isPreformatted', false);
    return join(fence, text.join(''), '```');
  }

  /**
   * A list item is part of an ordered list or an unordered list.
   */
  *'list-item'(_, state: State): IterableIterator<string> {
    let indent: string = '   '.repeat(state.get('indent'));
    let rawItem: string[] = yield;
    let index: number = state.get('index');
    let [firstLine, ...lines]: string[] = rawItem.join('').split('\n');
    let text = [firstLine, ...lines.map(line => indent + line)].join('\n').trim();

    if (state.get('type') === 'ordered-list') {
      text = `${indent}${index}. ${text}`;
      state.set('index', index + 1);
    } else if (state.get('type') === 'unordered-list') {
      text = `${indent}- ${text}`;
    }

    return text;
  }

  /**
   * 1. An ordered list contains
   * 2. A number
   * 3. Of things with numbers preceding them
   */
  *'ordered-list'(props: { start?: number }, state: State): IterableIterator<string> {
    let indent = state.get('indent');
    let start = 1;
    if (indent == null) {
      indent = -1;
    }
    if (props.start) {
      start = props.start;
    }
    state.push({
      type: 'ordered-list',
      indent: indent + 1,
      index: start
    });
    let list = yield;
    state.pop();

    let markdown = join(...list);
    if (state.get('type') === 'ordered-list' ||
        state.get('type') === 'unordered-list') {
      return `\n${markdown}`;
    }
    return markdown;
  }

  /**
   * - An ordered list contains
   * - A number
   * - Of things with dashes preceding them
   */
  *'unordered-list'(_, state: State): IterableIterator<string> {
    let indent = state.get('indent');
    if (indent == null) {
      indent = -1;
    }

    state.push({
      type: 'unordered-list',
      indent: indent + 1
    });
    let list = yield;
    state.pop();

    let markdown = join(...list);
    if (state.get('type') === 'ordered-list' ||
        state.get('type') === 'unordered-list') {
      return `\n${markdown}`;
    }
    return markdown;
  }

  /**
   * - An ordered list contains
   * - A number
   * - Of things with dashes preceding them
   */
  *'paragraph'(): IterableIterator<string> {
    let text = yield;
    return text.join('') + '\n\n';
  }

  *renderAnnotation(annotation: HIRNode, state: State, schema: Schema) {
    let rule = this[annotation.type];
    if (rule) {
      return yield* this[annotation.type](annotation.attributes, state);
    } else {
      let text = yield;
      return text.join('');
    }
  }
}
