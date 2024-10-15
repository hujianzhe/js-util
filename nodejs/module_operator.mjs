import module from 'internal/process/esm_loader'; // --expose-internals
import path from 'path';
import url from 'url';

export class ModuleOperator {
    static pathToURL(module_path) {
        return url.pathToFileURL(path.resolve(module_path)).href;
    }
    static async reloadURL(module_url) {
        if (module.esmLoader) {
            module.esmLoader.moduleMap.delete(module_url);
        }
        else {
            module.ESMLoader.moduleMap.delete(module_url);
        }
        await import(module_url);
    }
}