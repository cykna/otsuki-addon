//imma call it matp -> minecraft addons transfering protocol
import { ROUTES_KEY } from "./decorators.ts";
import { ClientConfig } from "../common/typings/client.ts"
import Memoirist from "memoirist";
import { Response, ResponseJson } from "../common/Response";
//import { EnchantedServer } from "./server";
import { RoutingFunc, Throwable } from "../common/types";

class EnchantedServer {
  constructor(config: ClientConfig) { }
}

export interface RoutedRequest<T> {
  route: string;
  content: T
}

export interface ServerConfiguration {
  accepted_clients: string[] | '*'
}

export class RouteServer extends EnchantedServer {
  protected inner = new Memoirist<RoutingFunc>();
  protected accept_all = false;
  protected accepted_clients = new Set<string>();

  constructor(config: ClientConfig) {
    super(config);
  }

  configure(config: ServerConfiguration) {
    if (config.accepted_clients == "*") {
      this.accept_all = true;
    } else config.accepted_clients.forEach(client => this.accepted_clients.add(client));
  }

  route(route: string, fn: RoutingFunc) {
    this.inner.add('GET', route, fn);
    return this;
  }

  async handle<T>(obj: RoutedRequest<T>, target: string, id: number): Throwable<Promise<Throwable<ResponseJson>>> {
    const handler = this.inner.find('GET', obj.route);
    if (handler == null) return Response.NotFound(`Route '${obj.route}' was not found!`);
    const result = handler.store(obj.content, handler.params, target, id);
    return result instanceof Promise ? result.then(v => v).catch(e => Response.InternalError(e)) : result;
  }

  use_controller(controller: typeof RouteServerController) {
    const controller_instance = new controller();
    let controller_route = controller_instance.route;
    if (controller_route == null) {
      for (const [route, handler] of Object.entries(controller_instance[ROUTES_KEY])) {
        this.route(route, handler as RoutingFunc);
      }
    } else {
      if (controller_route.endsWith("/")) controller_route = controller_route.slice(0, -1);
      for (let [route, handler] of Object.entries(controller_instance[ROUTES_KEY])) {
        if (route[0] == "/") route = route.slice(1);
        this.route(controller_route + "/" + route, handler as RoutingFunc);
      }
    }
  }
  async handle_request(req: string, client: string, req_id: number): Promise<string> {
    console.warn(req);
    if (!this.accept_all && !this.accepted_clients.has(client)) return Response.Stringify(Response.NotEnoughPermission("Client not able to do requests to this server"));
    return this.handle(JSON.parse(req), client, req_id).then(JSON.stringify);
  }
}
export class RouteServerController {
  public readonly route?: string;
  constructor(route?: string) {
    this.route = route;
  }
}
