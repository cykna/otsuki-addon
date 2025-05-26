import { Reflection } from "@abraham/reflection";
import { DecoratorKeys } from "./keys";
export function Route(route) {
    return function(target, ctx) {
        Reflection.defineMetadata(DecoratorKeys.ROUTE, route, target);
    };
}
export function get_route(target) {
    return Reflection.getMetadata(DecoratorKeys.ROUTE, target);
}
