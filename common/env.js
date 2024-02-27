var js_util = js_util || {};
js_util.Common = js_util.Common || {};

js_util.Common.HOST_ENV = {
    UNKKNOW : 0,
    BROWSER : 1,
    NODE: 2
};

js_util.Common.HOST_BROWSER_ENV = {
    UNKKNOW : 0,
    PC : 1,
    MOBILE : 2
};

js_util.Common.host_env = function() {
    return (new Function("\
    try {\
        if (this === window)\
            return js_util.Common.HOST_ENV.BROWSER;\
        if (this === global)\
            return js_util.Common.HOST_ENV.NODE;\
    } catch(e) {}\
    return js_util.Common.HOST_ENV.UNKKNOW;"))();
};

js_util.Common.host_env_string = function () {
    const env = js_util.Common.host_env();
    switch (env) {
        case js_util.Common.HOST_ENV.BROWSER:
            return "browser";
        case js_util.Common.HOST_ENV.NODE:
            return "node";
    }
    return "";
};

js_util.Common.host_browser_env = function () {
    const env = js_util.Common.host_env();
    if (env != js_util.Common.HOST_ENV.BROWSER) {
        return js_util.Common.HOST_BROWSER_ENV.UNKKNOW;
    }
    if ('ontouchstart' in document) {
        return js_util.Common.HOST_BROWSER_ENV.MOBILE;
    }
    return js_util.Common.HOST_BROWSER_ENV.PC;
};

js_util.Common.host_browser_env_string = function () {
    const env = js_util.Common.host_browser_env();
    switch (env) {
        case js_util.Common.HOST_BROWSER_ENV.PC:
            return "PC";
        case js_util.Common.HOST_BROWSER_ENV.MOBILE:
            return "mobile";
    }
    return "";
};