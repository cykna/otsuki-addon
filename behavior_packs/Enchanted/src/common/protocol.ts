import { SuccessCode, NotFoundCode, NotEnoughPermissionCode, InvalidCredentialsCode, InternalErrorCode } from "@zetha/response_code";

export enum ResponseType {
  PacketData = "enchanted:response_data",
  BatchResponse = "enchantend:batch_response",
  SingleResponse = "enchanted:single_response",
  Finalization = "enchanted:response_end"
}

export enum RequestType {
  Initialization = "enchanted:request",
  PacketData = "enchanted:request_data",
  BatchRequest = "enchanted:batch_request",
  SingleRequest = "enchanted:single_request",
  Finalization = "enchanted:finalize_request"
}

export type Throwable<T> = T;
export type RoutingFunc = (reqbody: any, params: Record<string, string>, client_id: string, req_id: number) => Promise<Throwable<ResponseJson>>;

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

