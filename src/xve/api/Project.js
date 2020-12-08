
import { BaseAPI } from "./BaseAPI";
import { Graph } from "./Graph";

export class Project {

    #id = 0;

    /** @type {Graph[]} Graphs */
    #graphs = null;
    
    /** @type {BaseAPI} API */
    #api = null;

    /**
     * Creates a new project
     * @param {BaseAPI} api 
     * @param {*} options 
     */
    constructor(api, options) {
        
        this.#api = api;
        this.#id = options.id || 0;
        this.title = options.title || 'Untitled Project (JS)';
        this.description = options.description || '';

    }

    /** Get all the graphs */
    async getGraphs() {
        if (this.#graphs != null) return this.#graphs;
        let graphs = await this.#api.fetch('GET', `/project/${this.#id}/graphs`);
        this.#graphs = graphs.map(g => new Graph(this.#api, g));
        return this.#graphs;
    }

    /** Gets a specific graph
     * @param {string} id 
     * @return {Graph} the graph, otherwise null.
     */
    async getGraph(id) {
        const graphs = await this.getGraphs();
        for(var i in graphs) 
            if (graphs[i].id == id)
                return graphs[i];
        return null;
    }

    /** Creates a new graph
     * @param {Object|Graph} graph the graph to create
     */
    async createGraph(graph) {
        
        //Create the graph
        const data = await this.#api.fetch('POST', `/project/${this.#id}/graphs`, {
            title:  graph.title,
            event:  graph.event,
            type:   graph.type
        });
        if (data == null) {
            console.error("Failed to save the graph");
            return false;
        }
        
        //Get the graph object and push it to our list
        const real = new Graph(this.#api, data);
        console.log("Created Graph", real, data);

        await real.setData(graph.data);
        console.log("Saved Data", real, data);
        
        //Store our state and return the newly created graph.
        this.#graphs.push(real);
        return real;
    }

    /** Gets the Abstract Syntax Tree */
    async ast() {
        return this.#api.fetch('GET', `/project/${this.#id}/ast`);
    }

    /** Clears the graph cache */
    clearCache() {
        this.#graphs = null;
    }
}