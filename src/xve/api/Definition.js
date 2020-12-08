import { BaseAPI } from "./BaseAPI";

export class Definition {

    #api = null;
    #id = 0;

    constructor(api, options) {
        this.#api           = api;
        this.#id            = options.id;
        this.title          = options.title;
        this.description    = options.description;
        this.icon           = options.icon;
        this.type           = options.type;

        //Prepare the data
        let data = options.data || options.properties;
        if (typeof data === 'string' || data instanceof String)  data = JSON.parse(data);
        
        this.size       = this.#pop(data, 'size');
        this.class      = this.#pop(data, 'class');
        this.arguments  = this.#pop(data, 'arguments');
        this.results    = this.#pop(data, 'results');
        this.style      = this.#pop(data, 'style');
        
        this.#pop(data, 'description');
        this.#pop(data, 'title');
        this.#pop(data, 'type');
        this.#pop(data, 'icon');
        this.#pop(data, 'file');    // << Deprecated 

        //The rest is the properties
        this.properties = data;
    }

    #pop(obj, key) {
        let result = obj[key];
        delete obj[key];
        return result;
    }
}