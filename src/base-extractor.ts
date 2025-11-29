import EventEmitter from 'events';
import { ExtractionEvent } from './extraction-event.js';

export abstract class BaseExtractor extends EventEmitter {
  /**
   *
   */
  protected blocking: boolean;

  /**
   * The buffer that contains the received tokens.
   */
  protected _buffer: string = '';

  /**
   * The name of the field to lookup
   */
  protected fieldName: string;

  /**
   * The value of {@link fieldName}
   */
  protected fieldValue?: unknown = undefined;

  /**
   * The regex that matches the content of {@link fieldName}
   */
  protected fieldContentRegex: RegExp;

  /**
   * Whether the value of {@link fieldName} was completly emitted
   */
  protected fieldCompleted: boolean = false;

  /**
   *
   * @param field the JSON field to extract
   */
  constructor(field: string, blocking: boolean, fieldContentRegex: RegExp) {
    super();
    this.fieldName = field;
    this.blocking = blocking;
    this.fieldContentRegex = fieldContentRegex;
  }

  /**
   * Gets the accumulated JSON buffer
   */
  public get buffer(): string {
    return this._buffer;
  }

  /**
   * Extracts the value of the target field from the given token.
   * Returns a tuple of [token, done] where `token` is the extracted part (or `undefined` if nothing to emit)
   * and `done` indicates whether the field was completely emitted.
   *
   * @param token input token
   * @returns tuple of [token, done]
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected extractToken(token: string): [token: string | undefined, done: boolean] {
    throw new Error('Method not implemented.');
  }

  /**
   * Checks whether the given content contains the {@link fieldName}
   *
   * @param content
   * @returns whether the field is included or not
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected containsTargetField(content: string): boolean {
    throw new Error('Method not implemented.');
  }

  /**
   * Extracts the value of the target field from the given async iterator of tokens.
   *
   * @param iter async iterator
   * @param mapper mapper to convert iterator values to strings
   * @returns async iterable of extracted tokens
   */
  public extract<T>(
    iter: AsyncIterator<T>,
    mapper: (value: T, index: number) => string
  ): AsyncIterable<string> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    return {
      async *[Symbol.asyncIterator]() {
        let index = 0;

        while (true) {
          const result = await iter.next();
          if (result.done) return;

          const mapped = mapper(result.value, index++);
          const [val, done] = self.extractToken(mapped);

          if (val !== undefined) {
            yield val;
          }

          if (done) {
            self.emit(ExtractionEvent.FIELD_COMPLETED, self.fieldValue);
            if (!self.blocking) {
              return;
            }
          }
        }
      }
    };
  }
}
