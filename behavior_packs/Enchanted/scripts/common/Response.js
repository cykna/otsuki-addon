(function(Response) {
    function Stringify(response) {
        return JSON.stringify(response);
    }
    Response.Stringify = Stringify;
    function ResponseFrom(raw) {
        try {
            const obj = JSON.parse(raw);
            if (obj.code == undefined || obj.body == undefined) throw 0;
            if (Object.keys(obj).length > 2) throw 0;
            return obj;
        } catch  {
            return {
                code: 3,
                body: JSON.stringify({
                    message: "Raw string failed while parsing to valid JSON"
                })
            };
        }
    }
    Response.ResponseFrom = ResponseFrom;
    function Success(body) {
        return {
            body: JSON.stringify(body),
            code: 0
        };
    }
    Response.Success = Success;
    function NotFound(body) {
        return {
            body: JSON.stringify(body),
            code: 1
        };
    }
    Response.NotFound = NotFound;
    function NotEnoughPermission(body) {
        return {
            body: JSON.stringify(body),
            code: 2
        };
    }
    Response.NotEnoughPermission = NotEnoughPermission;
    function InvalidCredentials(body) {
        return {
            body: JSON.stringify(body),
            code: 3
        };
    }
    Response.InvalidCredentials = InvalidCredentials;
    function InternalError(body) {
        return {
            body: JSON.stringify(body),
            code: 4
        };
    }
    Response.InternalError = InternalError;
})(Response || (Response = {}));
export var Response;
