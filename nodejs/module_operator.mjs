//import module from 'internal/process/esm_loader'; // --expose-internals
import std_path from 'path';
import std_url from 'url';

export class ModuleOperator {
    static _reload_url_map = new Map(); // file_url -> version number
    static _class_cache_map = new Map(); // class_name -> cache_info<Object>
    static _file_class_map = new Map(); // file_url -> class_name<Set>

    static async reloadURL(module_url) {
        /*
        if (module.esmLoader) {
            module.esmLoader.moduleMap.delete(module_url);
        }
        else {
            module.ESMLoader.moduleMap.delete(module_url);
        }
        await import(module_url);
        */
        let v = ModuleOperator._reload_url_map.get(module_url) || 0;
        v += 1;
        ModuleOperator._reload_url_map.set(module_url, v);
        await import(`${module_url}?v=${v}`);
    }

    static async promiseReloadClass(class_name) {
        let cache_info = ModuleOperator._class_cache_map.get(class_name);
        if (!cache_info) {
            return;
        }
        cache_info.reload_flag = true;
        try {
            await ModuleOperator.reloadURL(cache_info.file_url);
        }
        catch (e) {
            cache_info.reload_flag = false;
            throw e;
        }
    };

    static async promiseReloadPath(file_path) {
        const module_url = std_url.pathToFileURL(std_path.resolve(file_path)).href;
        const class_name_set = ModuleOperator._file_class_map.get(module_url);
        if (!class_name_set || class_name_set.size <= 0) {
            return;
        }
        let reload_cache_infos = [];
        for (const class_name of class_name_set) {
            let cache_info = ModuleOperator._class_cache_map.get(class_name);
            if (!cache_info) {
                continue;
            }
            cache_info.reload_flag = true;
            reload_cache_infos.push(cache_info);
        }
        try {
            await ModuleOperator.reloadURL(module_url);
        }
        catch (e) {
            for (let cache_info of reload_cache_infos) {
                cache_info.reload_flag = false;
            }
            throw e;
        }
    }

    static classDef(file_url, class_expr, on_load) {
        const q_idx = file_url.indexOf('?');
        if (q_idx != -1) {
            file_url = file_url.substring(0, q_idx);
        }
        let cache_info = ModuleOperator._class_cache_map.get(class_expr.name);
        if (!cache_info) {
            ModuleOperator._class_cache_map.set(class_expr.name, {
                class_expr: class_expr,
                file_url: file_url,
                reload_flag: false,
                on_load: on_load
            });
            let class_name_set = ModuleOperator._file_class_map.get(file_url);
            if (!class_name_set) {
                class_name_set = new Set();
                ModuleOperator._file_class_map.set(file_url, class_name_set);
            }
            class_name_set.add(class_expr.name);
            if (on_load) {
                on_load(class_expr, false);
            }
            return class_expr;
        }
        if (cache_info.file_url != file_url) {
            throw new Error(`${class_expr.name} Redefined In ${cache_info.file_url}`);
        }
        if (!cache_info.reload_flag) {
            return cache_info.class_expr;
        }
        cache_info.reload_flag = false;
        let old_class = cache_info.class_expr;
        // static assign
        let props = Object.getOwnPropertyNames(class_expr);
        for (const k of props) {
            if (typeof class_expr[k] === 'function') {
                old_class[k] = class_expr[k];
                continue;
            }
            try {
                if (old_class[k]) {
                    class_expr[k] = old_class[k];
                }
                else {
                    old_class[k] = class_expr[k];
                }
            } catch(e) {
                void e;
            }
        }
        // prototype assign
        let old_prototype = old_class.prototype;
        let new_prototype = class_expr.prototype;
        props = Object.getOwnPropertyNames(new_prototype);
        for (const k of props) {
            if (typeof new_prototype[k] === 'function') {
                old_prototype[k] = new_prototype[k];
                continue;
            }
        }
        // reload callback
        if (cache_info.on_load) {
            cache_info.on_load(old_class, true);
        }
        return old_class;
    }
}