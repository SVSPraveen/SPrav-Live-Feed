import test from 'node:test';
import assert from 'node:assert';
import { cleanJobDescription } from './cleanDescription.js';

test('cleanJobDescription: handles empty, whitespace, and non-string inputs', () => {
  assert.strictEqual(cleanJobDescription(''), 'No description available.');
  assert.strictEqual(cleanJobDescription(null), 'No description available.');
  assert.strictEqual(cleanJobDescription(undefined), 'No description available.');
  assert.strictEqual(cleanJobDescription('   '), 'No description available.');
  assert.strictEqual(cleanJobDescription(123), 'No description available.');
  assert.strictEqual(cleanJobDescription({}), 'No description available.');
  assert.strictEqual(cleanJobDescription([]), 'No description available.');
});

test('cleanJobDescription: returns fallback when tags strip down to empty whitespace', () => {
  assert.strictEqual(cleanJobDescription('<p>   </p><br/><div class="empty"></div>'), 'No description available.');
  assert.strictEqual(cleanJobDescription('<span>   </span>'), 'No description available.');
});

test('cleanJobDescription: exact conversion of breaks, headings, containers and lists', () => {
  const html = '<h1>Role Overview</h1><p>Line A<br>Line B<br/>Line C<br />Line D<  br  ></p><article><header>Header</header><section>Section</section><footer>Footer</footer></article><h2>Skills</h2><  ul  ><  li  >Item 1<  /  li  ><li id="item-2">Item 2</li><  /  ul  >';
  const cleaned = cleanJobDescription(html);
  
  const expected = [
    'Role Overview',
    '',
    'Line A',
    'Line B',
    'Line C',
    'Line D',
    '',
    'Header',
    '',
    'Section',
    '',
    'Footer',
    '',
    'Skills',
    '',
    '• Item 1',
    '• Item 2'
  ].join('\n');
  
  assert.strictEqual(cleaned, expected);
});

test('cleanJobDescription: distinguishes br from abbr/wbr and verifies opening ul newline', () => {
  const html = 'Intro<abbr title="World Wide Web">WWW</abbr><wbr>Ready<ul><li>Point A</li></ul>Outro';
  const cleaned = cleanJobDescription(html);
  
  const expected = [
    'IntroWWWReady',
    '',
    '• Point A',
    'Outro'
  ].join('\n');
  
  assert.strictEqual(cleaned, expected);
});

test('cleanJobDescription: exact handling of ordered lists and generic inline tags', () => {
  const html = '<  ol  ><  li id="step1"  >First step<  /  li  ><li>Second step</li><  /  ol  ><div class="container">Text with <span class="tag">highlight</span>, <strong>bold</strong>, <em>italic</em>, and <a href="https://example.com">link</a>.</div>';
  const cleaned = cleanJobDescription(html);
  
  const expected = [
    '• First step',
    '• Second step',
    '',
    'Text with highlight, bold, italic, and link.'
  ].join('\n');
  
  assert.strictEqual(cleaned, expected);
});

test('cleanJobDescription: exact decoding of all HTML entity variants', () => {
  const html = 'Tom &amp; Jerry &lt;Remote&gt; &quot;High Scale&quot; it&#39;s Bob&apos;s job &nbsp; &#160; end';
  const cleaned = cleanJobDescription(html);
  assert.strictEqual(cleaned, "Tom & Jerry <Remote> \"High Scale\" it's Bob's job     end");
});

test('cleanJobDescription: exact cleaning of unicode non-breaking spaces \\u00a0', () => {
  const text = 'Word1\u00a0Word2\u00a0Word3';
  const cleaned = cleanJobDescription(text);
  assert.strictEqual(cleaned, 'Word1 Word2 Word3');
});

test('cleanJobDescription: line trimming and triple newline collapsing', () => {
  const messy = '   First paragraph   \n\n\n\n\n   Second paragraph with spaces     \n\n\n\n   Third paragraph   ';
  const cleaned = cleanJobDescription(messy);
  assert.strictEqual(cleaned, 'First paragraph\n\nSecond paragraph with spaces\n\nThird paragraph');
});

test('cleanJobDescription: DOMParser integration, textContent fallback, null body handling, and parser error recovery', () => {
  const originalDOMParser = globalThis.DOMParser;
  try {
    // 1. Active DOMParser decoding
    globalThis.DOMParser = class MockDOMParser {
      parseFromString(str, mime) {
        assert.strictEqual(mime, 'text/html');
        return {
          body: {
            textContent: str.replace('&custom;', 'DECODED_CUSTOM')
          }
        };
      }
    };
    const res = cleanJobDescription('<div>Engineering &custom;</div>');
    assert.strictEqual(res, 'Engineering DECODED_CUSTOM');

    // 2. DOMParser body textContent is null/empty
    globalThis.DOMParser = class MockEmptyDOMParser {
      parseFromString() {
        return { body: { textContent: '' } };
      }
    };
    const resEmpty = cleanJobDescription('Fallback Text');
    assert.strictEqual(resEmpty, 'Fallback Text');

    // 3. DOMParser body is null
    globalThis.DOMParser = class MockNullBodyDOMParser {
      parseFromString() {
        return { body: null };
      }
    };
    const resNullBody = cleanJobDescription('Preserved Text');
    assert.strictEqual(resNullBody, 'Preserved Text');

    // 4. DOMParser parseFromString throws custom parsing error (should be handled safely)
    globalThis.DOMParser = class MockThrowingDOMParser {
      parseFromString() {
        const err = new Error('XML parsing failed');
        err.name = 'DOMException';
        throw err;
      }
    };
    const resCatch = cleanJobDescription('<p>Standard &amp; Safe</p>');
    assert.strictEqual(resCatch, 'Standard & Safe');

    // 5. DOMParser throws TypeError (should propagate)
    globalThis.DOMParser = class MockTypeErrorDOMParser {
      parseFromString() {
        throw new TypeError('Invalid invocation');
      }
    };
    assert.throws(() => cleanJobDescription('<p>Type Error Test</p>'), TypeError);
  } finally {
    globalThis.DOMParser = originalDOMParser;
  }
});
