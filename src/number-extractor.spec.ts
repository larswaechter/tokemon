import { describe, expect, test } from 'vitest';
import { NumberExtractor } from './number-extractor.js';
import { ExtractionEvent } from './extraction-event.js';

const asyncIterator = async function* (items: string[]) {
  for (const item of items) {
    yield item;
  }
};

describe('NumberExtractor Test', () => {
  test('Emit value when received in single token', async () => {
    const extractor = new NumberExtractor('code');

    const inputTokens = ['{"code": 123}'];
    const outputTokens: string[] = [];
    let completionValue: number | undefined = undefined;

    extractor.on(ExtractionEvent.FIELD_COMPLETED, (val: number) => {
      completionValue = val;
    });

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['123']);
    expect(completionValue).toEqual(123);
    expect(extractor.value).toEqual(123);
    expect(JSON.parse(extractor.buffer)).toEqual({ code: 123 });
  });

  test('Emit value when received in single token with leading zero', async () => {
    const extractor = new NumberExtractor('code');

    const inputTokens = ['{"code": 00123}'];
    const outputTokens: string[] = [];

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['00123']);
    expect(extractor.value).toEqual(123);
  });

  test('Emit value when received in multiple tokens', async () => {
    const extractor = new NumberExtractor('code');

    const inputTokens = ['{"code"', ': 11', '22', '00', ',', '"password": "secret" }'];
    const outputTokens: string[] = [];

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['11', '22', '00']);
    expect(extractor.value).toEqual(112200);
    expect(JSON.parse(extractor.buffer)).toEqual({ code: 112200, password: 'secret' });
  });

  test('Emit value when last property', async () => {
    const extractor = new NumberExtractor('zip');

    const inputTokens = ['{"firstname": "Pablo", ', '"zip": 1122', '00}'];
    const outputTokens: string[] = [];

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['1122', '00']);
    expect(extractor.value).toEqual(112200);
    expect(JSON.parse(extractor.buffer)).toEqual({ firstname: 'Pablo', zip: 112200 });
  });

  test('Emit value when middle property', async () => {
    const extractor = new NumberExtractor('zip');

    const inputTokens = ['{"firstname": "Pablo", ', '"zip": 1122', '00,', '"lastname": "Picasso"}'];
    const outputTokens: string[] = [];

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['1122', '00']);
    expect(extractor.value).toEqual(112200);
    expect(JSON.parse(extractor.buffer)).toEqual({
      firstname: 'Pablo',
      zip: 112200,
      lastname: 'Picasso'
    });
  });
});
