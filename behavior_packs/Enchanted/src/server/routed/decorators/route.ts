import { Reflection } from "@abraham/reflection";

import { DecoratorKeys } from "./keys";
export function Route(route: string) {
  return function(target: Function, ctx: string) {
    Reflection.defineMetadata(DecoratorKeys.ROUTE, route, target[ctx]);
  }
}

export function get_route(target: Function): string {
  return Reflection.getMetadata(DecoratorKeys.ROUTE, target)!;
}
