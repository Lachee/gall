import { LiteCanvas } from "../litegraph/LiteCanvas";
import { LiteGraph } from "../litegraph/LiteGraph";
import { LiteInstance } from "../litegraph/LiteInstance";
import { Component } from "./Component";
import interact from "interactjs";
import { PropertiesComponent } from "./PropertiesComponent";
import { XVE } from "../xve";
import Swal from 'sweetalert2';

export class GraphComponent extends Component {
    
    /** @type {XVE} the xve  */
    xve = null;

    instances = {};

    constructor(xve) {
        super();
        this.xve = xve;
    }
    
    getName() { return "GraphComponent" }
    getTitle(state) {  return 'Graph'; }

    /** @inheritdoc */
    async render(window) {
        const $root = window.prime();
        
        //Create the instance and then reload its content in the background
        if (!this.instances[window.state.graphId]) {
            await this.#createGraphInstance(window.state.graphId);
            this.reload(window.state.graphId);
        }

        //Create the canvas
        let $canvas = $('<canvas></canvas>');
        $root.append($canvas);
        
        //Setup the events that will open the options
        let canvas = new LiteCanvas($canvas.get(0), this.instances[window.state.graphId].litegraph, window.state.options || {});
        canvas.on('bindings:selected', (e) => { PropertiesComponent.open(this.layout, e.node); });
        canvas.on('context:properties', (e) => { PropertiesComponent.open(this.layout, e.node); });

        //Setupt he resize event
        window.container.on('resize', () => canvas.resize());
        window.container.setTitle( this.instances[window.state.graphId].graph.title);

        //Setup the interaction
        const that = this;
        interact($root).dropzone({
            accept: ".hierarchy-item",
            overlap: 0.25,

            ondrop: function (event) {
                let other = event.relatedTarget;
                let type = other.getAttribute('data-type');
                let node = that.instances[window.state.graphId].litegraph.create(type);
                node.pos = canvas.convertEventToCanvasOffset(event.dragEvent);
            }
        });
    }

    /** Loads the graph instances */
    async #createGraphInstance(graphId) {
        console.log("Creating Graph Instance", graphId);

       // Get the graph
       let graph = await this.xve.project.getGraph(graphId);
       if (graph == null) { 
           console.error("Couldn't find the graph with the id " , graphId);
           return false;
       }

        //Setup the graph
        let litegraph = await this.createLiteGraph();
        litegraph.id = graphId;

        //Store the instance
        this.instances[graphId] = {
            litegraph:  litegraph,
            graph:      graph,
        };
    }

    /** Reloads the data in the graph */
    async reload(graphId) {       
        console.log("Reloading Graph", graphId);

        // Get the graph's data
        let data = await this.instances[graphId].graph.getData();
        if (data == null) {
            console.error("Couldn't find the graph data");
            return false;
        }

        //Create the instance
        if (!this.instances[graphId])
            await this.#createGraphInstance(graphId);

        //Load its data
        await this.instances[graphId].litegraph.load(data);
        Swal.fire({
            position: 'top-end',
            text: `${this.instances[graphId].graph.title} loaded`,
            showConfirmButton: false,
            timer: 1000, timerProgressBar: true,
            backdrop: false,
        });
    }

    /** Reloads the current graph  */
    async reloadCurrent() {
        return await this.reload(LiteCanvas.active.graph.id);
    }

    /** Saves a specific graph instance */
    async save(graphId) {
        
        //Validate we can actually save it
        if (!this.instances[graphId] || !this.instances[graphId].graph || !this.instances[graphId].litegraph) {
            console.error("Cannot save graph " + graphId + " because it doesnt exist");
            return false;
        }

        //Perform the save
        const inst = this.instances[graphId];
        const data = await inst.litegraph.save();
        const resp = await inst.graph.setData(data);
        console.log("Saved Data", inst.graph.id, data, resp);

        Swal.fire({
            icon: 'success',
            position: 'top-end',
            text: `${inst.graph.title} Saved`,
            showConfirmButton: false,
            timer: 2500, timerProgressBar: true,
            backdrop: false,
        });
    }
    
    /** Saves all the graphs */
    async saveAll() {
        let promises = [];
        for(let graphId in this.instances)
            promises.push(this.save(graphId));

        await Promise.all(promises);
        Swal.fire({
            icon: 'success',
            position: 'top-end',
            text: `All graphs saved`,
            showConfirmButton: false,
            timer: 2500, timerProgressBar: true,
            backdrop: false,
        });
    }
    
    /** Saves the most recently activated graph */
    async saveCurrent() {
        return await this.save(LiteCanvas.active.graph.id);
    }

    /** Creates a new LiteGraph instance */
    async createLiteGraph(defaultNode = null) {

        //Create the graph
        const graph = new LiteGraph(this.xve.liteInstance);
        if (defaultNode != null) {
            if (typeof defaultNode === 'string') {
                graph.create(defaultNode);
            } else {
                for(let k in defaultNode) 
                graph.create(defaultNode[k]);
            }
        }

        //Return the data
        return graph;
    }
}