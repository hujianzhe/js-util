import module from 'internal/process/esm_loader'; // --expose-internals
import path from 'path';
import url from 'url';

class ModuleOperator {
    constructor(module_path) {
        this.url = url.pathToFileURL(path.resolve(module_path)).href;
        this.path = module_path;
    }

    async reload() {
        if (module.esmLoader) {
            module.esmLoader.moduleMap.delete(this.url);
        }
        else {
            module.ESMLoader.moduleMap.delete(this.url);
        }
        await import(this.path);
    }
}

module.exports = {
    ModuleOperator
};