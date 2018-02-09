import Document from '@atjson/document';
import { HIR } from '@atjson/hir';
import HTMLSource from '@atjson/source-html';

describe('@atjson/source-html', () => {
  it('pre-code', () => {
    let html = '<pre><code>this <b>is</b> a test</code></pre>';

    let htmlAtJSON = new HTMLSource(html);

    let hir = new HIR(htmlAtJSON).toJSON();

    expect(hir).toEqual({
      type: 'root',
      attributes: undefined,
      children: [
        { type: 'pre',
          attributes: {},
          children: [{
            type: 'code',
            attributes: {},
            children: [ 'this ', { type: 'b', attributes: {}, children: ['is'] }, ' a test' ]
          }]
        }]}
    );
  });

  it('<p>aaa<br />\nbbb</p>', () => {
    let html = '<p>aaa<br />\nbbb</p>';
    let htmlAtJSON = new HTMLSource(html);
    let hir = new HIR(htmlAtJSON).toJSON();
    expect(hir).toEqual({
      type: 'root',
      attributes: undefined,
      children: [{
        type: 'p',
        attributes: {},
        children: [
          'aaa', { type: 'br', attributes: {}, children: [] }, '\nbbb'
        ]
      }]
    });
  });

  it('<a href="https://example.com">example</a>', () => {
    let html = '<a href="https://example.com">example</a>';
    let htmlAtJSON = new HTMLSource(html);

    let hir = new HIR(htmlAtJSON).toJSON();
    expect(hir).toEqual({
      type: 'root',
      attributes: undefined,
      children: [{
        type: 'a',
        attributes: {
          href: 'https://example.com'
        },
        children: ['example']
      }]
    });
  });

  it('<img src="https://example.com/test.png" /> ', () => {
    let html = '<img src="https://example.com/test.png" /> ';
    let htmlAtJSON = new HTMLSource(html);

    let hir = new HIR(htmlAtJSON).toJSON();
    expect(hir).toEqual({
      type: 'root',
      attributes: undefined,
      children: [{
        type: 'img',
        attributes: {
          src: 'https://example.com/test.png'
        },
        children: []
      }, ' ']
    });
  });

  it('<h2></h2>\n<h1></h1>\n<h3></h3>', () => {
    let html = '<h2></h2>\n<h1></h1>\n<h3></h3>';
    let htmlAtJSON = new HTMLSource(html);

    let hir = new HIR(htmlAtJSON).toJSON();
    expect(hir).toEqual({
      type: 'root',
      attributes: undefined,
      children: [{
        type: 'h2',
        attributes: {},
        children: []
      }, '\n', {
        type: 'h1',
        attributes: {},
        children: []
      }, '\n', {
        type: 'h3',
        attributes: {},
        children: []
      }]
    });
  });

  it('<p><img src="/url" alt="Foo" title="title" /></p>', () => {
    let html = '<p><img src="/url" alt="Foo" title="title" /></p>';
    let htmlAtJSON = new HTMLSource(html);

    let hir = new HIR(htmlAtJSON).toJSON();
    expect(hir).toEqual({
      type: 'root',
      attributes: undefined,
      children: [{
        type: 'p',
        attributes: {},
        children: [{
          type: 'img',
          attributes: {
            src: '/url',
            alt: 'Foo',
            title: 'title'
          },
          children: []
        }]
      }]
    });
  });

  it('<p>**<a href="**"></p> CURRENT', () => {
    let html = '<p>**<a href="**"></p>';
    let htmlAtJSON = new HTMLSource(html);

    let hir = new HIR(htmlAtJSON).toJSON();
    expect(hir).toEqual({
      type: 'root',
      attributes: undefined,
      children: [{
        type: 'p',
        attributes: {},
        children: [
          '**',
          { type: 'a', attributes: {}, children: [] }
        ]
      }]
    });
  });
});
