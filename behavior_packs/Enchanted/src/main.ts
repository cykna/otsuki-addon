import { system, world } from "@minecraft/server";

import { QueuedRouteServer } from "./server/routed/queued.ts";
import { CachingOption } from "./common/typings/client";
import { RouteServerController } from "./server/routed/controller";
import { Route } from "./server/routed/decorators/route";


system.run(() => world.setDynamicProperty('suamae', 'é muito legal cara, amo ela'));

export class Controller extends RouteServerController {

  @Route("/example/:id")
  async awaited(body: any, params: Record<string, string>, client: string, id: number) {
    console.log("Server received param: ", params.id);
    console.log("Imma wait 2 seconds, idc");
    await system.waitTicks(40);
    return Response.Success("Yeah, you've got it");
  }
}

function main() {
  const server = new QueuedRouteServer({
    uuid: 'cycro:zetha_server',
    block_request: false,
    caching: CachingOption.Normal
  });
  server.use_controller(Controller);
  server.configure({
    accepted_clients: '*'
  })
  server.listen();
}
main();
