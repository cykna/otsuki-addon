//imma call it mdtp -> minecraft data transfer protocol
import { ROUTES_KEY } from "./decorators.js";
import Memoirist from "memoirist";
import { Response } from "../common/Response";
import { EnchantedServer } from "./server.js";
export class ErrorHandler {
    handle(e) {
        return Response.InternalError(e.message);
    }
}
export class RouteServer extends EnchantedServer {
    constructor(config){
        super(config), this.inner = new Memoirist(), this.accept_all = false, this.accepted_clients = new Set(), this.error_handler = new ErrorHandler;
        this.config = config;
    }
    configure(config) {
        if (config.accepted_clients == "*") this.accept_all = true;
        else config.accepted_clients.forEach((client)=>this.accepted_clients.add(client));
    }
    route(route, fn) {
        this.inner.add('GET', route, fn);
        return this;
    }
    async handle(obj, target, id) {
        const handler = this.inner.find('GET', obj.route);
        if (handler == null) return Response.NotFound(`Route '${obj.route}' was not found!`);
        try {
            const result = handler.store(obj.content, handler.params, target, id);
            return result instanceof Promise ? result.then((e)=>typeof e != 'object' ? Response.Success(e) : e).catch((e)=>this.error_handler.handle(e)) : typeof result != 'object' ? Response.Success(result) : result;
        } catch (e) {
            return this.error_handler.handle(e);
        }
    }
    /**
  * Must implement better the controller system.
  */ use_controller(controller) {
        const controller_instance = new controller();
        let controller_route = controller_instance.route;
        if (controller_route == null) for (const [route, handler] of Object.entries(controller_instance[ROUTES_KEY]))this.route(route, handler.bind(controller_instance));
        else {
            if (controller_route.endsWith("/")) controller_route = controller_route.slice(0, -1);
            for (let [route, handler] of Object.entries(controller_instance[ROUTES_KEY])){
                if (route[0] == "/") route = route.slice(1);
                this.route(controller_route + "/" + route, handler.bind(controller_instance));
            }
        }
    }
    async handle_request(req, client, req_id) {
        if (!this.accept_all && !this.accepted_clients.has(client)) return Response.Stringify(Response.NotEnoughPermission("Client not able to do requests to this server"));
        return this.handle(JSON.parse(req), client, req_id).then(JSON.stringify);
    }
}
export class RouteServerController {
    constructor(route){
        this.route = route;
    }
}
