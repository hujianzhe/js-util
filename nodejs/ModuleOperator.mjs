import module from 'internal/process/esm_loader'; // --expose-internals
import path from 'path';
import url from 'url';

export class ModuleOperator {
    static async pathReload(module_path) {
        const module_url = url.pathToFileURL(path.resolve(module_path)).href;
        if (module.esmLoader) {
            module.esmLoader.moduleMap.delete(module_url);
        }
        else {
            module.ESMLoader.moduleMap.delete(module_url);
        }
        await import(module_url);
    }
}