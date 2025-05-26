function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
import { system, world } from "@minecraft/server";
import { QueuedRouteServer } from "./server/routed/queued.js";
import { CachingOption } from "./common/typings/client";
import { RouteServerController } from "./server/routed/controller";
import { Route } from "./server/routed/decorators/route";
import { Response } from "./common/Response.js";
system.run(()=>world.setDynamicProperty('suamae', 'é muito legal cara, amo ela'));
export class Controller extends RouteServerController {
    async awaited(body, params, client, id) {
        console.log("Server received param: ", params.id);
        console.log("Imma wait 2 seconds, idc");
        await system.waitTicks(40);
        return Response.Success("Yeah, you've got it");
    }
}
_ts_decorate([
    Route("/suamae/:id")
], Controller.prototype, "awaited", null);
function main() {
    const server = new QueuedRouteServer({
        uuid: 'cycro:zetha_server',
        block_request: false,
        caching: CachingOption.Normal
    });
    server.use_controller(Controller);
    server.configure({
        accepted_clients: '*'
    });
    server.listen();
}
main();
