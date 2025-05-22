import { SuccessCode, NotFoundCode, NotEnoughPermissionCode, InvalidCredentialsCode, InternalErrorCode } from "@zetha/response_code"



export interface ResponseJson {
  code: number,
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
        code: InvalidCredentialsCode,
        body: JSON.stringify({
          message: "Raw string failed while parsing to valid JSON"
        })
      };
    }
  }
  export function Success<T>(body: T): ResponseJson {
    return {
      body: JSON.stringify(body),
      code: SuccessCode
    }
  }
  export function NotFound<T>(body: T): ResponseJson {
    return {
      body: JSON.stringify(body),
      code: NotFoundCode
    }
  }
  export function NotEnoughPermission<T>(body: T): ResponseJson {
    return {
      body: JSON.stringify(body),
      code: NotEnoughPermissionCode
    }
  }
  export function InvalidCredentials<T>(body: T): ResponseJson {
    return {
      body: JSON.stringify(body),
      code: InvalidCredentialsCode
    }
  }
  export function InternalError<T>(body: T): ResponseJson {
    return {
      body: JSON.stringify(body),
      code: InternalErrorCode
    }
  }
}

