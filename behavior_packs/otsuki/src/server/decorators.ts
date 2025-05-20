import "reflect-metadata";
import { RoutingFunc } from "../common/types";

export const ROUTES_KEY = Symbol("ZethaRouting");
export const ROUTE_BODY_TYPE_KEY = Symbol("ZethaBodyT");

export function Route(path: string) {
  return function(target: Function, property: string | symbol): void {
    if (target[ROUTES_KEY] == null) target[ROUTES_KEY] = {} as Record<string, RoutingFunc>;
    target[ROUTES_KEY][path] = target[property];
  }
}

export function Body(type: any) {
  return function(target: Function, property: string | symbol): void {
    Reflect.defineMetadata(ROUTE_BODY_TYPE_KEY, type, target);
  }
}
export namespace Helpers {
  export function BodyType(f: Function) {
    return Reflect.getMetadata(ROUTE_BODY_TYPE_KEY, f);
  }
}
