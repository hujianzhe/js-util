var js_util = js_util || {};
js_util.Common = js_util.Common || {};

js_util.Common.HOST_ENV = {
    UNKKNOW : 0,
    BROWSER : 1,
    NODE: 2
};

js_util.Common.get_host_env = function() {
    return (new Function("\
    try {\
        if (this === window)\
            return js_util.Common.HOST_ENV.BROWSER;\
        if (this === global)\
            return js_util.Common.HOST_ENV.NODE;\
    } catch(e) {}\
    return js_util.Common.HOST_ENV.UNKKNOW;"))();
};

js_util.Common.get_host_env_name = function () {
    const env = js_util.Common.get_host_env();
    switch (env) {
        case js_util.Common.HOST_ENV.BROWSER:
            return "browser";
        case js_util.Common.HOST_ENV.NODE:
            return "node";
    }
    return "";
};