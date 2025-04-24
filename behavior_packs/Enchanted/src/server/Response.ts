export interface EnchantedResponse<T> {
  error: boolean;
  value: T
}

export class ErrorResponse<T extends Error> implements EnchantedResponse<T> {
  error = true;
  constructor(public value: T) { }
  toJSON() {
    return {
      error: true, value: this.value.toString()
    }
  }
}


