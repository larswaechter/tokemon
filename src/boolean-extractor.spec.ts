import { describe, expect, test } from 'vitest';
import { ExtractionEvent } from './extraction-event.js';
import { BooleanExtractor } from './boolean-extractor.js';

const asyncIterator = async function* (items: string[]) {
  for (const item of items) {
    yield item;
  }
};

describe('BooleanExtractor Test', () => {
  test('Emit value when received in single token', async () => {
    const extractor = new BooleanExtractor('isAdult');

    const inputTokens = ['{"isAdult": true}'];
    const outputTokens: string[] = [];
    let completionValue: boolean | undefined = undefined;

    extractor.on(ExtractionEvent.FIELD_COMPLETED, (val: boolean) => {
      completionValue = val;
    });

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['true']);
    expect(completionValue).toEqual(true);
    expect(extractor.value).toEqual(true);
    expect(JSON.parse(extractor.buffer)).toEqual({ isAdult: true });
  });

  test('Emit value when received in multiple tokens', async () => {
    const extractor = new BooleanExtractor('isAdult');

    const inputTokens = ['{"is', 'Adult"', ': tr', 'u', 'e', '}'];
    const outputTokens: string[] = [];
    let completionValue: boolean | undefined = undefined;

    extractor.on(ExtractionEvent.FIELD_COMPLETED, (val: boolean) => {
      completionValue = val;
    });

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['tr', 'u', 'e']);
    expect(completionValue).toEqual(true);
    expect(extractor.value).toEqual(true);
    expect(JSON.parse(extractor.buffer)).toEqual({ isAdult: true });
  });

  test('Emit value when last property', async () => {
    const extractor = new BooleanExtractor('isAdult');

    const inputTokens = ['{"firstname": "Pablo", ', '"isAdult": tru', 'e}'];
    const outputTokens: string[] = [];

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['tru', 'e']);
    expect(extractor.value).toEqual(true);
    expect(JSON.parse(extractor.buffer)).toEqual({ firstname: 'Pablo', isAdult: true });
  });

  test('Emit value when middle property', async () => {
    const extractor = new BooleanExtractor('isAdult');

    const inputTokens = [
      '{"firstname": "Pablo", ',
      '"isAdult": t',
      'rue, ',
      '"lastname": "Picasso"}'
    ];
    const outputTokens: string[] = [];

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['t', 'rue']);
    expect(extractor.value).toEqual(true);
    expect(JSON.parse(extractor.buffer)).toEqual({
      firstname: 'Pablo',
      isAdult: true,
      lastname: 'Picasso'
    });
  });
});
