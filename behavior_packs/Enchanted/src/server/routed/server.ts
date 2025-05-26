//imma call it mdtp -> minecraft data transfer protocol

import Memoirist from "memoirist";
import { Response, ResponseJson } from "../../common/Response";
import { EnchantedServer, ServerConfig } from "../server.ts";
import { RoutingFunc, Throwable } from "../../common/types";
import { get_route } from "./decorators/route.ts";
import { RouteServerController } from "./controller.ts";
import { get_guard } from "./decorators/guarded.ts";
import { get_err_handler } from "./decorators/error_handler.ts";
import { ErrorHandler } from "./error_handler.ts";


export interface RoutedRequest<T> {
  route: string;
  content: T
}

export interface ServerConfiguration {
  accepted_clients: string[] | '*'
}

export interface ErrorHandlerInterface {
  handle(e: Error): ResponseJson;
}

export class RouteServer extends EnchantedServer {

  protected inner = new Memoirist<RoutingFunc>();
  protected accept_all = false;
  protected accepted_clients = new Set<string>();

  constructor(config: ServerConfig) {
    super(config);
    this.config = config;
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
    console.log("Tentando achar a rota", obj.route);
    const handler = this.inner.find('GET', obj.route);
    if (handler == null) return Response.NotFound(`Route '${obj.route}' was not found!`);
    {
      const guard = get_guard(handler.store);
      if (guard) {
        const result = guard.on_requested(obj.route, obj.content, handler.params, target, id);
        if (result) return result;
      }
    }
    const result = handler.store(obj.content, handler.params, target, id);
    return result.then(e => typeof e != 'object' ? Response.Success(e) : e).catch(Response.InternalError)

  }

  private route_f(route: string, f: Function, handler?: ErrorHandler) {
    console.log("Adding route:", route);
    this.inner.add('GET', route, async (req, params, client, id) => {
      try {
        return await f(req, params, client, id);
      } catch (e) {
        if (handler) return handler.on_errored(e, route, req, params, client, id);
        else throw e;
      }
    })
  }

  //Must implement better the controller system.
  use_controller(controller: typeof RouteServerController) {

    const controller_instance = new controller();
    let controller_route = controller_instance.route;
    const error_handler = get_err_handler(controller);

    switch (true) {
      case controller_route == null: {
        for (const key of Reflect.ownKeys(controller.prototype)) {
          const route = get_route(controller_instance[key as keyof typeof controller_instance] as any);

          if (route) this.route_f(route, controller[key].bind(controller_instance), error_handler);
        }
        return;
      }
      case controller_route?.endsWith("/"): (controller_route = controller_route.slice(0, -1)); break;
    }
    for (const key of Reflect.ownKeys(controller.prototype)) {
      const route = get_route(controller_instance[key] as any);
      console.log(route, key);
      if (route) this.route_f(controller_route + route, controller_instance[key].bind(controller_instance), error_handler);
    }
  }

  async handle_request(req: string, client: string, req_id: number): Promise<string> {
    if (!this.accept_all && !this.accepted_clients.has(client)) return Response.Stringify(Response.NotEnoughPermission("Client not able to do requests to this server"));
    return this.handle(JSON.parse(req), client, req_id).then(JSON.stringify);
  }
}
