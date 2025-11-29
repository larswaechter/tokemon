import { describe, expect, test } from 'vitest';
import { StringExtractor } from './string-extractor.js';
import { ExtractionEvent } from './extraction-event.js';

const asyncIterator = async function* (items: string[]) {
  for (const item of items) {
    yield item;
  }
};

describe('StringExtractor Test', () => {
  test('Emit value when received in single token', async () => {
    const extractor = new StringExtractor('city');

    const inputTokens = ['{"city": "Barcelona"}'];
    const outputTokens: string[] = [];
    let completionValue: string | undefined = undefined;

    extractor.on(ExtractionEvent.FIELD_COMPLETED, (val: string) => {
      completionValue = val;
    });

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['Barcelona']);
    expect(completionValue).toEqual('Barcelona');
    expect(extractor.value).toEqual('Barcelona');
    expect(JSON.parse(extractor.buffer)).toEqual({ city: 'Barcelona' });
  });

  test('Emit value when received with linebreak', async () => {
    const extractor = new StringExtractor('city');

    const inputTokens = ['{"city": "Bar', 'celona', '"\n}'];
    const outputTokens: string[] = [];

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['Bar', 'celona']);
    expect(extractor.value).toEqual('Barcelona');
    expect(JSON.parse(extractor.buffer)).toEqual({ city: 'Barcelona' });
  });

  test('Emit value when received in single token with quotation marks', async () => {
    const extractor = new StringExtractor('city');

    const inputTokens = ['{"city": "\\"Barcelona\\""}'];
    const outputTokens: string[] = [];

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['\\"Barcelona\\"']);
    expect(extractor.value).toEqual('\\"Barcelona\\"');
    expect(JSON.parse(extractor.buffer)).toEqual({ city: '"Barcelona"' });
  });

  test('Emit value when received in multiple tokens', async () => {
    const extractor = new StringExtractor('city');

    const inputTokens = ['{"ci', 'ty"', ': ', '"Bar', 'celona', '"', '}'];
    const outputTokens: string[] = [];

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['Bar', 'celona']);
    expect(extractor.value).toEqual('Barcelona');
    expect(JSON.parse(extractor.buffer)).toEqual({ city: 'Barcelona' });
  });

  test('Emit value when last property', async () => {
    const extractor = new StringExtractor('city');

    const inputTokens = ['{"firstname": "Pablo", ', '"city": "Bar', 'celona"}'];
    const outputTokens: string[] = [];

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['Bar', 'celona']);
    expect(extractor.value).toEqual('Barcelona');
    expect(JSON.parse(extractor.buffer)).toEqual({ firstname: 'Pablo', city: 'Barcelona' });
  });

  test('Emit value when middle property', async () => {
    const extractor = new StringExtractor('city');

    const inputTokens = [
      '{"firstname": "Pablo", ',
      '"city": "Bar',
      'celona", ',
      '"lastname": "Picasso"}'
    ];
    const outputTokens: string[] = [];

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['Bar', 'celona']);
    expect(extractor.value).toEqual('Barcelona');
    expect(JSON.parse(extractor.buffer)).toEqual({
      firstname: 'Pablo',
      city: 'Barcelona',
      lastname: 'Picasso'
    });
  });

  test('Emit value when empty in single token', async () => {
    const extractor = new StringExtractor('city');

    const inputTokens = ['{"city": ""}'];
    const outputTokens: string[] = [];

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['']);
    expect(extractor.value).toEqual('');
    expect(JSON.parse(extractor.buffer)).toEqual({
      city: ''
    });
  });

  test('Emit value when empty in multiple tokens', async () => {
    const extractor = new StringExtractor('city');

    const inputTokens = ['{"city": ', '"', '"', '}'];
    const outputTokens: string[] = [];

    for await (const token of extractor.extract(asyncIterator(inputTokens), (val) => val)) {
      outputTokens.push(token);
    }

    expect(outputTokens).toEqual(['']);
    expect(extractor.value).toEqual('');
    expect(JSON.parse(extractor.buffer)).toEqual({
      city: ''
    });
  });
});
