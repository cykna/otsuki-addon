import { ButtonState, InputButton, system, world } from "@minecraft/server";
import { EnchantedServer } from "./server/server";
import { RouteServer, RouteServerController } from "./server/routed_server";
import { ServerBatchedMessage, ServerFinalizeMessage, ServerSingleResponseMessage } from "./common/messages/server";
import { Route } from "./server/decorators";
import { Response } from "./common/Response";

system.run(() => world.setDynamicProperty('suamae', 'é muito legal cara, amo ela'));

class MainController extends RouteServerController {
  id = 0;
  @Route("/example/:id")
  public f(body: any, params: Record<string, string>) {
    return Response.Success({
      value: world.getDynamicProperty('suamae'),
      prop: 'suamae'
    });
  }
}

const server = new RouteServer({
  uuid: "cycro:zetha_server"
});
server.use_controller(MainController);
server.configure({
  accepted_clients: '*'
});
