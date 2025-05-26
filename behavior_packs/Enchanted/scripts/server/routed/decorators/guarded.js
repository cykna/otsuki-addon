import { DecoratorKeys } from "./keys";
import { Reflection } from "@abraham/reflection";
export function Guard(guard) {
    return function(target) {
        Reflection.defineMetadata(DecoratorKeys.GUARD, guard, target);
    };
}
export function get_guard(target) {
    return Reflection.getMetadata(DecoratorKeys.GUARD, target);
}
