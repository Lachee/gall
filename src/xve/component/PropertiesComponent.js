import { Component } from "./Component";
import "./ProjectComponent.scss";

export class PropertiesComponent extends Component {
    
    /** @var xve the xve  */
    xve = null;
    static current;

    constructor(xve) {
        super();
        this.xve = xve;
    }

    getTitle() { return "Inspector" }
    getName() { return "PropertyComponent" }

    /** Opens the properties components to a collection of nodes */
    static open(layout, node) {
        if (PropertiesComponent.current) {
            //Update the state
            PropertiesComponent.current.setState( { node } );
            
        } else {        

            //Create a new container
            layout.root.contentItems[0].addChild({
                title: 'Properties',
                type: 'component',
                componentName: 'PropertyComponent',
                componentState: { node }
            });
        }
    }

    async build(container, state) {

        //When we close, we want to unset the property instance so we can open it later
        container.on('destroy', () => {
            if (container == PropertiesComponent.current) 
                PropertiesComponent.current = null;
        });

        //When we open, we want to subscribe to the state change event
        container.on('open', () => {
            container.tab.contentItem.on('stateChanged', (state) => {
                this.#buildContent(container, container.getState())
            });
        });

        //Finally build the content
        await this.#buildContent(container, state);
    }

    async #buildContent(container, state) {
        PropertiesComponent.current = container;
        const root = container.getElement();

        // Get hte node we have selected
        let node = state.node;
        if (state.nodes) {
            for(var k in state.nodes) {
                node = state.nodes[k];
                break;
            }
        }
        
        //Create the holder
        root.addClass("ProjectComponent");
        root.html('');

        this.#addMetadata(root, node);
        this.#addBindings(root, node);
        this.#addProperties(root, node);
    }

    #addMetadata(parent, node) {        
        let list = $('<ul class="hierarchy-list" id="metadata"></ul>');
        this.#addListItem(list, 'id', node.id);
        this.#addListItem(list, 'position', node.pos);
        this.#addListItem(list, 'size', node.size);
        this.#addListItem(list, 'style', node.style);
        this.#addListItem(list, 'type', node.type);
        
        parent.append(`<h3>${node.title}</h3>`);
        parent.append(list);
    }

    #addBindings(parent, node) {

        if (!node.hasBindings) return;

        let list = $('<ul class="hierarchy-list"></ul>');
        for (let key in node.inputs) {
            let input = node.inputs[key];
            if (input.binding) {
                this.#addListItem(list, input.label, input.binding.getValue());
            }
        }
        parent.append('<h3>Defaults</h3>');
        parent.append(list);
    }
    
    #addProperties(parent, node) {
        //For every item, append the graph config
        let list = $('<ul class="hierarchy-list"></ul>');
        for(var key in node.properties) {  
            if (key[0] == '#' || key[0] == '_') continue; 
            this.#addListItem(list, key, node.properties[key]);
        }

        parent.append('<h3>Properties</h3>');
        parent.append(list);
    }
    
    #addListItem(list, key, value) {
        let template = `
            <li class="hierarchy-item">
                <span class="icon"><i class="fal fa-window"></i></span>
                <span class="label">
                    <div class="title">${key}</div>
                    <div class="subtitle">${value}</div>
                </span>
            </li>
        `;

        let container = $(template);
        list.append(container);
    }
}