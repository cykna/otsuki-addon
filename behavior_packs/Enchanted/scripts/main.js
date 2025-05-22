function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
import { system, world } from "@minecraft/server";
import { RouteServer, RouteServerController } from "./server/routed_server";
import { Route } from "./server/decorators";
import { Response } from "./common/Response";
system.run(()=>world.setDynamicProperty('suamae', 'é muito legal cara, amo ela'));
class MainController extends RouteServerController {
    f(body, params) {
        const keys = new Set();
        for(const i in globalThis)keys.add(i);
        for (const i of Reflect.ownKeys(globalThis))keys.add(i);
        for (const key of keys)console.log(key);
        return Response.NotEnoughPermission({
            value: world.getDynamicProperty('suamae'),
            prop: 'suamae'
        });
    }
    constructor(...args){
        super(...args), this.id = 0;
    }
}
_ts_decorate([
    Route("/example/:id")
], MainController.prototype, "f", null);
const server = new RouteServer({
    uuid: "cycro:zetha_server"
});
server.use_controller(MainController);
server.configure({
    accepted_clients: '*'
});
