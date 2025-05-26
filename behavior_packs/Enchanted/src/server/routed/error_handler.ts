import { ResponseJson } from "../../common/Response";

export interface ErrorHandler {
  /**
  * This method is called everytime an error is thrown in some route. The error is passed and a ResponseJson is expected to be sent to the client.
  */
  on_errored(error: Error, route: string, body: any, params: Record<string, string>, client: string, reqid: number): ResponseJson;
}
