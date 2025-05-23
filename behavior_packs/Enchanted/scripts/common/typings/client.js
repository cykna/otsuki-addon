export var CachingOption = /*#__PURE__*/ function(CachingOption) {
    CachingOption[CachingOption["None"] = 0] = "None";
    CachingOption[CachingOption["Normal"] = 1] = "Normal";
    CachingOption[CachingOption["Continuous"] = 2] = "Continuous";
    return CachingOption;
}({});
export function default_request_config() {
    return {
        batch: false,
        blocks: false,
        cache: 0
    };
}
