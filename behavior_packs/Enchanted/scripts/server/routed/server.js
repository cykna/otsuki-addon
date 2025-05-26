//imma call it mdtp -> minecraft data transfer protocol
import Memoirist from "memoirist";
import { Response } from "../../common/Response";
import { EnchantedServer } from "../server.js";
import { get_route } from "./decorators/route.js";
import { get_guard } from "./decorators/guarded.js";
import { get_err_handler } from "./decorators/error_handler.js";
export class RouteServer extends EnchantedServer {
    constructor(config){
        super(config), this.inner = new Memoirist(), this.accept_all = false, this.accepted_clients = new Set();
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
        return result.then((e)=>typeof e != 'object' ? Response.Success(e) : e).catch(Response.InternalError);
    }
    route_f(route, f, handler) {
        console.log("Adding route:", route);
        this.inner.add('GET', route, async (req, params, client, id)=>{
            try {
                return await f(req, params, client, id);
            } catch (e) {
                if (handler) return handler.on_errored(e, route, req, params, client, id);
                else throw e;
            }
        });
    }
    //Must implement better the controller system.
    use_controller(controller) {
        const controller_instance = new controller();
        let controller_route = controller_instance.route;
        const error_handler = get_err_handler(controller);
        switch(true){
            case controller_route == null:
                for (const key of Reflect.ownKeys(controller.prototype)){
                    const route = get_route(controller_instance[key]);
                    if (route) this.route_f(route, controller[key].bind(controller_instance), error_handler);
                }
                return;
            case controller_route?.endsWith("/"):
                controller_route = controller_route.slice(0, -1);
                break;
        }
        for (const key of Reflect.ownKeys(controller.prototype)){
            const route = get_route(controller_instance[key]);
            console.log(route, key);
            if (route) this.route_f(controller_route + route, controller_instance[key].bind(controller_instance), error_handler);
        }
    }
    async handle_request(req, client, req_id) {
        if (!this.accept_all && !this.accepted_clients.has(client)) return Response.Stringify(Response.NotEnoughPermission("Client not able to do requests to this server"));
        return this.handle(JSON.parse(req), client, req_id).then(JSON.stringify);
    }
}
