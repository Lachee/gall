
import { XVE } from "../xve";
import { Component } from "./Component";
import "./ProjectComponent.scss";

export class ProjectComponent extends Component {
    
    /** @type {XVE} the xve  */
    xve = null;

    constructor(xve) {
        super();
        this.xve = xve;
    }

    getTitle() { return "Project" }
    getName() { return "ProjectComponent" }

    /** @inheritdoc */
    async render(window) {
        //Start loading
        const $root = window.root;
        
        //Get the graphs
        $root.html('<button class="button is-loading">Loading</button>');
        let graphs = await this.xve.project.getGraphs();
        
        //Now build
        window.prime();

        //Search
        let search = `
        <div class="field has-addons">
            <p class="control is-expanded has-icons-left">
                <input class="input" type="text" placeholder="Search Functions">
                <span class="icon is-small is-left">
                    <i class="fal fa-search"></i>
                </span>
            </p>
            <p class="control">
                <button class="button"> Search </button>
            </p>
        </div>`;
        $root.append($(search));

        
        //For every item, append the graph config
        let $list = $('<ul class="hierarchy-list"></ul>');
        $root.append($list);
        for(var i in graphs) {   
            const graph = graphs[i];
            
            //Create the HTML
            let template = `
                <li class="hierarchy-item">
                    <span class="icon"><i class="fal fa-window"></i></span>
                    <span class="label">
                        <div class="title">${graph.title}</div>
                        <div class="subtitle">${graph.event}</div>
                    </span>
                </li>
            `;
            const $item = $(template);
            $list.append($item);

            //Create the drag source that will open the graph component
            this.layout.createDragSource($item, {
                title:          graph.title,
                type:           'component',
                componentName:  'GraphComponent',
                componentState: { projectId: window.state.projectId, graphId: graph.id }
            });
        }
    }
}