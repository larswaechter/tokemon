# Examples

The following page provides multiple examples on how to use tokemon.

## Basic

A simple setup with a custom `AsyncIterator`.

```ts
import { StringExtractor } from 'tokemon';

const stream = (async function* () {
  yield '{"answer": "';
  yield 'Hello, ';
  yield 'world!"';
  yield '}';
})();

const asyncIter = stream[Symbol.asyncIterator]();

const extractor = new StringExtractor('answer');
const mapper = (token: string): string => token;

for await (const token of extractor.extract(asyncIter, mapper)) {
  process.stdout.write(token + '\n');
}
```

## Ollama

> NOTE: This example requires [ollama](https://www.npmjs.com/package/ollama) package.

This example shows how to use tokemon with [Ollama](https://ollama.com/).

```ts
import ollama, { type ChatResponse } from 'ollama';
import { StringExtractor } from 'tokemon';

const response = await ollama.chat({
  model: 'llama3.1',
  messages: [
    {
      role: 'system',
      content: `
      You are a question / answer bot.
      Your task is to answer the given question in max. 3 sentences and identify an appropriate topic.
      Respond in JSON format like this:
      {
        "answer": "<answer>",
        "topic": "<topic>"
      }
      `
    },
    { role: 'user', content: 'How does an LLM work?' }
  ],
  stream: true,
  format: {
    type: 'object',
    properties: {
      answer: { type: 'string' },
      topic: { type: 'string' }
    }
  }
});

const asyncIter = response[Symbol.asyncIterator]();

const extractor = new StringExtractor('answer');
const mapper = (token: ChatResponse): string => token.message.content;

for await (const token of extractor.extract(asyncIter, mapper)) {
  process.stdout.write(token);
}
```

## Server-Sent Events (SSE)

> NOTE: This example requires [express](https://www.npmjs.com/package/express) and [ollama](https://www.npmjs.com/package/ollama) package.

This example shows how to use tokemon for sending SSE using express.

Use the following `curl` command for sending a request:

```bash
curl --location 'http://localhost:3000/question?question=How%20does%20an%20LLM%20work%3F'
```

```ts
import express from 'express';

import ollama, { type ChatResponse } from 'ollama';
import { StringExtractor } from 'tokemon';

const ask = (question: string) =>
  ollama.chat({
    model: 'llama3.1',
    messages: [
      {
        role: 'system',
        content: `
      You are a question / answer bot.
      Your task is to answer the given question in max. 3 sentences and identify an appropriate topic.
      Respond in JSON format like this:
      {
        "answer": "<answer>",
        "topic": "<topic>"
      }
      `
      },
      { role: 'user', content: question }
    ],
    stream: true,
    format: {
      type: 'object',
      properties: {
        answer: { type: 'string' },
        topic: { type: 'string' }
      }
    }
  });

const app = express();
const PORT = 3000;

app.get('/question', async (req, res) => {
  const { question } = req.query;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const llmResponse = await ask(String(question));
  const asyncIter = llmResponse[Symbol.asyncIterator]();

  const extractor = new StringExtractor('answer');
  const mapper = (token: ChatResponse): string => token.message.content;

  for await (const token of extractor.extract(asyncIter, mapper)) {
    res.write(`data: ${token}\n\n`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
```
