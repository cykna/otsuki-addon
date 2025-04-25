import { RequestConfig } from "../client/client";
import { EnchantedResponse, ErrorResponse } from "../common/Response";
import { EnchantedServer } from "./server";

export type RouteFn = <T>(value: T, param: string[], client: string, req_id: number, queries: Map<string, string>) => any;
export interface Routing {
  route?: RouteFn,
  subroutes: Map<string, Routing>,
}

export interface RoutedRequest<T> {
  route: string;
  content: T
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

  handle<T>(obj: RoutedRequest<T>, target: string, id: number): EnchantedResponse<any> {
    if (obj.route == "/" && this.routes.has("/")) {
      return {
        error: false,
        value: this.routes.get("/")!.route?.(obj.content, [], target, id, new Map)
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
    const value = last.route(obj.content, params, target, id, new Map);

    return {
      error: false,
      value
    }
  }
}
