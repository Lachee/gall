import { BaseAPI } from "./BaseAPI";

export class FieldType {
    
    /** @type {BaseAPI} */
    #api;

    /** @type {Field[]} */
    #fields;

    constructor(api, options) {
        this.#api       = api;
        this.name       = options.name;
        this.color      = options.color;
        this.icon       = options.icon ? kiss.FA.getIcon(options.icon) : null;
        this.#fields    = options.fields && options.fields.length ? options.fields : null;
    }

    /**
     * Gets the fields
     * @return {Field[]} the fields
     */
    async getFields() {
        if (this.#fields != null) return this.#fields;
        let data = await this.#api.fetch('GET', `/xve/type/${this.name}`);
        this.#fields = data.fields.map(f => new Field(f));
        return this.#fields;
    }


    /** Gets the style */
    get style() {
        return {
            color:      this.color,
            color_on:   this.color,
            icon:       this.icon ? String.fromCodePoint(parseInt(this.icon.unicode, 16)) : null,
            shape:      0,
        };
    }

    /**
     * Clears the field cache
     */
    clearCache() {
        this.#fields = null;
    }
}

export class Field {
    constructor(options) {
        this.accessor = options.accessor;
        this.label = options.label;
        this.type = options.type;
    }
}