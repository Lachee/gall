import { BaseAPI } from "./BaseAPI";

export class Graph {

    #id = 0;
    #data = null; 

    /** @type {BaseAPI} */
    #api = null;

    /** Creates a new graph
     * @param {BaseAPI} api 
     * @param {*} options 
     */
    constructor(api, options) {
        this.#api = api;
        this.#setOptions(options);
    }

    /** Sets the internal data */
    #setOptions(options) {
        this.#id = options.id || 0;
        this.project_id = options.project_id || this.project_id;
        this.title = options.title || this.title;
        this.event = options.event || this.event;
        this.type = options.type || this.type;
        
        this.#data = options.data || this.#data;
        if (typeof this.#data === 'String')
            this.#data = JSON.parse(this.#data);
    }

    /** the current ID */
    get id() { return this.#id; }

    /** Pulls the data from the server */
    async refresh() {
        let options = await this.#api.fetch('GET', `/graph/${this.#id}`);
        this.#setOptions(options);
        return this;
    }

    /** Pushes the data to the server */
    async update() {

    }

    /** The cached data, maybe null. */
    get data() { return this.#data; }

    /** Gets the data, loading it from the server if required. */
    async getData() {
        if (this.#data != null) 
            return this.#data;     
            
        this.#data = await this.#api.fetch('GET', `/graph/${this.#id}/data`);
        return this.#data;
    }

    /** Stores the data, returns a promise of the function */
    async setData(data) {
        if (data == null) return null;
        this.#data = data;
        return await this.#api.fetch('PUT',  `/graph/${this.#id}/data`, data);
    }

}