import { Reflection } from "@abraham/reflection";
import { ErrorHandler } from "../error_handler.ts"
import { DecoratorKeys } from "./keys";

export function ErrorHandle<T extends ErrorHandler>(handler: T) {
  return function(target: Function) {
    Reflection.defineMetadata(DecoratorKeys.HANDLER, handler, target);
  }
}

export function get_err_handler(target: Function): ErrorHandler | undefined {
  return Reflection.getMetadata(DecoratorKeys.HANDLER, target);
}
