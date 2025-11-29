import { BaseExtractor } from './base-extractor.js';

export class NumberExtractor extends BaseExtractor {
  /**
   *
   * @param field the JSON field to extract
   * @param blocking whether to block completion until the field is fully emitted
   */
  constructor(field: string, blocking: boolean = true) {
    super(field, blocking, new RegExp(`"${field}": ?([0-9]+[,}]?)`, 's'));
  }

  /**
   * Gets the value of {@link fieldName}.
   * Can be `undefined` if it was not yet or at all found.
   */
  public get value(): number | undefined {
    return this.fieldValue as number | undefined;
  }

  protected override extractToken(token: string): [token: string | undefined, done: boolean] {
    this._buffer += token;

    // Field is already completely emitted
    if (this.fieldCompleted) {
      return [undefined, true];
    }

    if (this.containsTargetField(this.buffer)) {
      const match = this._buffer.match(this.fieldContentRegex);
      if (match?.length == 2) {
        const fieldContent = match[1]!;
        const closingCharIdx = this.findClosingCharIndex(fieldContent);

        if (closingCharIdx >= 0) {
          this.fieldCompleted = true;

          /**
           * Extract either:
           * - Complete field (if it was sent at once)
           * - Only not yet emitted tokens
           */
          const extractFrom = Math.max(0, fieldContent.length - token.length);
          const finalTokens = fieldContent.substring(extractFrom, closingCharIdx);

          // The actually value of the field
          this.fieldValue = +fieldContent.substring(0, closingCharIdx);

          if (finalTokens.trim().length) {
            return [finalTokens, true];
          }

          return [undefined, true];
        }

        if (this.containsTargetField(token) || token.startsWith(':')) {
          return [fieldContent.match(/[0-9]+/)![0], false];
        }

        return [token, false];
      }
    }

    return [undefined, false];
  }

  private findClosingCharIndex(content: string): number {
    const closingChars = [',', '}'];

    for (let i = 0; i < content.length; i++) {
      if (closingChars.includes(content[i]!)) {
        return i;
      }
    }

    return -1;
  }

  protected override containsTargetField(content: string): boolean {
    return new RegExp(`"${this.fieldName}": ?[0-9]+`).test(content);
  }
}
