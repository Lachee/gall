import { Component } from "./Component";
import "./ProjectComponent.scss";

import interact from "interactjs";
import { ContextMenu } from "../litegraph/ContextMenu";

export class FunctionComponent extends Component {
    
    /** @var xve the xve  */
    xve = null;

    constructor(xve) {
        super();
        this.xve = xve;
    }

    getTitle() { return "Functions" }
    getName() { return "FunctionComponent" }

    async build(container, state) {
        //Set the loading
        const root = container.getElement();
        this.#buildLoading(root);

        //Get all the graphs
        // This will cache to the project remember.
        let defs = await this.xve.api.getDefinitions();

        //Create the holder
        root.addClass("ProjectComponent");
        root.html('');
        
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
        root.append($(search));
        
        let list = $('<ul class="hierarchy-list"></ul>');
        root.append(list);
        for(let i in defs) {
            let definition = defs[i];

            let template = `
                <li class="hierarchy-item" data-type="${definition.type}">
                    <span class="icon"><i class="fal fa-${definition.icon}"></i></span>
                    <span class="label">
                        <div class="title">${definition.title}</div>
                        <div class="subtitle">${definition.description}</div>
                    </span>
                </li>
            `;

            let container = $(template);
            list.append(container);
        }

        interact('.FunctionComponent .hierarchy-item').draggable({
            listeners: { 
                move: FunctionComponent.#dragMove,
                end: FunctionComponent.#dragEnd,
                start: FunctionComponent.#dragStart,
            }
        });

        
    }

    buildFolder(defs, folder) {
    }

    #buildLoading(element) {
        element.html("LOADING");
    }
    
    static #dragStart(event) {
        let target = event.target;
        target.classList.add('drag');
    }

    static #dragEnd(event) {
        let target = event.target;

        // translate the element
        target.style.webkitTransform =
          target.style.transform = null;
          
        target.setAttribute('data-x', 0)
        target.setAttribute('data-y', 0)
        target.classList.remove('drag');
    }

    static #dragMove(event) {
        var target = event.target
        // keep the dragged position in the data-x/data-y attributes
        var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
        var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy
      
        // translate the element
        target.style.webkitTransform =
          target.style.transform =
            'translate(' + x + 'px, ' + y + 'px)'
      
        // update the posiion attributes
        target.setAttribute('data-x', x)
        target.setAttribute('data-y', y)
    }
}