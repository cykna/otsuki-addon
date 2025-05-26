import { Reflection } from "@abraham/reflection";
import { DecoratorKeys } from "./keys";
export function ErrorHandle(handler) {
    return function(target) {
        Reflection.defineMetadata(DecoratorKeys.HANDLER, handler, target);
    };
}
export function get_err_handler(target) {
    return Reflection.getMetadata(DecoratorKeys.HANDLER, target);
}
