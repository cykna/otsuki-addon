import "reflect-metadata";
export const ROUTES_KEY = Symbol("ZethaRouting");
export const ROUTE_BODY_TYPE_KEY = Symbol("ZethaBodyT");
export function Route(path) {
    return function(target, property) {
        if (target[ROUTES_KEY] == null) target[ROUTES_KEY] = {};
        target[ROUTES_KEY][path] = target[property];
    };
}
export function Body(type) {
    return function(target, property) {
        Reflect.defineMetadata(ROUTE_BODY_TYPE_KEY, type, target);
    };
}
(function(Helpers) {
    function BodyType(f) {
        return Reflect.getMetadata(ROUTE_BODY_TYPE_KEY, f);
    }
    Helpers.BodyType = BodyType;
})(Helpers || (Helpers = {}));
export var Helpers;
