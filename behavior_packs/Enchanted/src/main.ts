import { ButtonState, InputButton, world } from "@minecraft/server";
import { EnchantedServer } from "./server/server";
import { RouteServer, RouteServerController } from "./server/routed_server";
import { ServerBatchedMessage, ServerFinalizeMessage, ServerSingleResponseMessage } from "./common/messages/server";
import { Route } from "./server/decorators";
import { Response } from "./common/Response";

class MainController extends RouteServerController {
  @Route("/example")
  public f() {
    world.sendMessage("Zetha server executed '/example' route");
    return Response.Success("Hello world!");
  }
}

const server = new RouteServer({
  uuid: "cycro:zetha_server"
});
server.use_controller(MainController);
server.configure({
  accepted_clients: '*'
});
