import { Definition } from "./Definition";
import { FieldType } from "./FieldType";
import { Project } from "./Project";

export class BaseAPI {

    /** @type {Definition[]} definitions */
    #definitions = null;

    /** @type {FieldType[]} Types */
    #types = null;

    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /** Gets a project
     * @param {Number} projectId 
     * @returns {Project} the project
     */
    async getProject(projectId) {
        let data = await this.fetch('GET', `/project/${projectId}`);
        return new Project(this, data);
    }

    /** Gets a list of definitions
     * @returns {Definition[]} definitions
     */
    async getDefinitions() {            
        //Get all the definitions
        if (this.#definitions) return this.#definitions;
        let data = await this.fetch('GET', '/xve/definition');
        return this.#definitions = data.map(d => new Definition(this, d));
    }

    /** Gets a map of definitions
     * @returns {Definition} definitions
     */
    async getDefinitionsByFolder() {
        //Get all the definitions
        let definitions = this.getDefinitions();
        
        //Map them out as folders
        let map = {};
        for(var i in data) {
            let type = data[i].type;
            let folders = type.split('/');
            let prev = map;

            for (let k = 0; k < folders.length - 1; k++) {
                let f = folders[k];
                if (!prev[f]) prev[f] = {};
                prev = prev[f];
            }

            prev[folders[folders.length - 1]] = data[i];
        }

        return map;
    }

    /** Get types
     * @returns {FieldType}
     */
    async getTypes() {
        if (this.#types) return this.#types;
        let data = await this.fetch('GET', '/xve/type');
        return this.#types = data.map(d => new FieldType(this, d));
    }

    /** Gets the metadata for the url */
    async getProxiedMetadata(url) {
        return await this.fetch('GET', `/proxy?url=${url}`);
    }

    /** Clears the cache */
    clearCache() {
        this.#definitions = null;
        this.#types = null;
    }

    /** Queries the API
     * @param {*} method 
     * @param {*} endpoint 
     */
    async fetch(method, endpoint, data = null) {
        let response = await fetch(`${this.baseUrl}${endpoint}`, { 
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: data ? JSON.stringify(data) : null
        });

        if (!response.ok) {
            console.error("Failed ", method, endpoint, response, await response.json());
            return null;
        }

        let json = await response.json();
        return json.data;
    }
}


