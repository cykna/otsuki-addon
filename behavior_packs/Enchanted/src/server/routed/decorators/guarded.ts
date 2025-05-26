import { RoutingGuard } from "../guard";
import { DecoratorKeys } from "./keys";
import { Reflection } from "@abraham/reflection";

export function Guard<T extends RoutingGuard>(guard: T) {
  return function(target: Function) {
    Reflection.defineMetadata(DecoratorKeys.GUARD, guard, target);
  }
}

export function get_guard<T extends RoutingGuard>(target: Function): T | undefined {
  return Reflection.getMetadata(DecoratorKeys.GUARD, target);
}

