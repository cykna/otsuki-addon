export const enum ResponseCode {
  Success,
  NotFound,
  NotEnoughPermission,
  InvalidCredentials,
  InternalError,
}


export interface ResponseJson {
  code: ResponseCode,
  body: string
}
export namespace Response {
  export function Stringify(response: ResponseJson) {
    return JSON.stringify(response);
  }
  export function ResponseFrom(raw: string): ResponseJson {
    try {
      const obj = JSON.parse(raw);
      if (obj.code == undefined || obj.body == undefined) throw 0;
      if (Object.keys(obj).length > 2) throw 0;
      return obj;
    } catch {
      return {
        code: ResponseCode.InvalidCredentials,
        body: JSON.stringify({
          message: "Raw string failed while parsing to valid JSON"
        })
      };
    }
  }
  export function Success<T>(body: T): ResponseJson {
    return {
      body: JSON.stringify(body),
      code: ResponseCode.Success
    }
  }
  export function NotFound<T>(body: T): ResponseJson {
    return {
      body: JSON.stringify(body),
      code: ResponseCode.NotFound
    }
  }
  export function NotEnoughPermission<T>(body: T): ResponseJson {
    return {
      body: JSON.stringify(body),
      code: ResponseCode.NotEnoughPermission
    }
  }
  export function InvalidCredentials<T>(body: T): ResponseJson {
    return {
      body: JSON.stringify(body),
      code: ResponseCode.InvalidCredentials
    }
  }
  export function InternalError<T>(body: T): ResponseJson {
    return {
      body: JSON.stringify(body),
      code: ResponseCode.InternalError
    }
  }
}

