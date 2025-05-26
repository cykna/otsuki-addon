import { ResponseJson } from "../../common/Response";

export interface RoutingGuard {
  /**
  * Returns void if the guarded passed, if else, returns the Response to the client.
  */
  on_requested(route: string, body: any, params: Record<string, string>, client: string, reqid: number): ResponseJson | void

}
