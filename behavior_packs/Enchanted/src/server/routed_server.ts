import { RequestConfig } from "../client/client";
import { EnchantedResponse, ErrorResponse } from "./Response";
import { EnchantedServer } from "./server";

export type RouteFn = (param: string[], client: string, req_id: number, queries: Map<string, string>) => any;
export interface Routing {
  route?: RouteFn,
  subroutes: Map<string, Routing>,
}

export interface RoutedRequest {
  route: string;
}

export class RouteServer extends EnchantedServer {
  private routes = new Map<string, Routing>();
  constructor(config: RequestConfig) {
    super(config);
  }
  route(route: string, fn: RouteFn) {
    if (route == "/") return (this.routes.set("/", {
      route: fn,
      subroutes: new Map
    }), this);
    const split = route.split("/");
    split.shift();
    const last = split.pop()!;
    let current = this.routes;
    for (const path of split) {
      current.set(path, {
        subroutes: current = new Map,
      });
    }
    current.set(last, {
      subroutes: new Map,
      route: fn
    });
    return this;
  }

  handle(obj: RoutedRequest, target: string, id: number): EnchantedResponse<any> {
    if (obj.route == "/" && this.routes.has("/")) {
      return {
        error: false,
        value: this.routes.get("/")!.route?.([], target, id, new Map)
      }
    }
    const pathname = obj.route.split('/');
    pathname.shift();
    let lastpath = pathname.pop();
    let current = this.routes;
    const params: string[] = [];

    for (const path of pathname) {

      if (current.has(path)) current = current.get(path)!.subroutes;
      else if (current.has("dynroute")) {
        current = current.get("dynroute")!.subroutes;
      } else {
        return new ErrorResponse(new Error("Not a valid route named: " + obj.route));
      }
    }
    const last = current.get(lastpath!) ?? (current.has("dynroute") && params.push(lastpath!), current.get("dynroute"));

    if (!last?.route) {
      return new ErrorResponse(new Error("Not a valid route named: " + obj.route))
    };

    return {
      error: false,
      value: last.route(params, target, id, new Map)
    }
  }
}
