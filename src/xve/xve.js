import $ from 'jquery';

import GoldenLayout from "golden-layout";
import 'golden-layout/src/css/goldenlayout-base.css';
import 'golden-layout/src/css/goldenlayout-light-theme.css';

import { BaseAPI } from "./api/BaseAPI";
import { ProjectComponent } from "./component/ProjectComponent";
import { GraphComponent } from "./component/GraphComponent";
import { FunctionComponent } from "./component/FunctionComponent";
import { LiteInstance } from './litegraph/LiteInstance';
import { PropertiesComponent } from './component/PropertiesComponent';

import './xve.scss';
import { PageComponent } from './component/PageComponent';
import { Toolbar, ToolbarButton, ToolbarDropdown } from './toolbar';
import { LiteCanvas } from './litegraph/LiteCanvas';
import { Project } from './api/Project';
import { Modal } from '../../kiss/src/bulma/modal';
import { CreateEventModal } from './modal/CreateEventModal';
import { LiteGraph } from './litegraph/LiteGraph';
import { Graph } from './api/Graph';
import Swal from 'sweetalert2';

export class XVE {

    /** @type {BaseAPI} the base API */
    api;

    /** @type {LiteInstance} the lite instance */
    liteInstance;

    /** @type {GoldenLayout} the layouting engine */
    layout;

    /** @type {Project} the current project */
    project;

    constructor(options = []) {

        //Prepare the API
        this.api = new BaseAPI(options.baseUrl || '/api');
        this.projectId = options.project;

        //Prepare the DOM
        this.editorElement  = options.editor;
        this.toolbarElement = options.toolbar;
        this.layout = null;

        //Create LiteGraph instance
        this.liteInstance = new LiteInstance();
    }

    async init() {
        //Load the proejct
        this.project = await this.api.getProject(this.projectId);

        //Preload the KISS FA
        await kiss.FA.load();

        //Load the definitions
        await this.#initLiteInstance();
        await this.#initToolbar();
        await this.#initGoldenLayout();
    }

    async #initToolbar() {

        //new CreateEventModal({
        //    events: (await this.api.getDefinitions()).filter(d => d.type.startsWith('event/')),
        //    onSubmit: (e) => console.log("FORM SUBMITTED", e)
        //});

        let items = [
            new ToolbarDropdown({
                icon: 'fa-cloud',
                items: [
                    { label: 'Save', action: () => this.components.graph.saveCurrent() },
                    { label: 'Save All', action: () => this.components.graph.saveAll() },
                    { label: 'Reload', action: () => this.components.graph.reloadCurrent() },
                    '-',
                    { label: 'Push' },
                    '-',
                    { label: 'Help' },
                    { label: 'About' },
                ]
            }),
            new ToolbarDropdown({
                icon: 'fa-pencil',
                items: [
                    { label: 'Copy' },
                    { label: 'Paste' },
                    '-',
                    { label: 'Undo' },
                    { label: 'Redo' },
                    '-',
                    { label: 'Inspect Selected' },
                    { label: 'Deselect All' },
                    { label: 'Select All' },
                ]
            }),           
            new ToolbarDropdown({
                icon: 'fa-plus',
                items: [
                    { 
                        label: 'Event',
                        action: async () => { 
                            new CreateEventModal({
                                events: (await this.api.getDefinitions()).filter(d => d.type.startsWith('event/')),
                                onSubmit: async (e) => {
                                    //Get the data and save the graph
                                    const data = await (await this.components.graph.createLiteGraph(e.form['event'].value)).save();
                                    const graph = await this.project.createGraph({ 
                                        title: e.form['title'].value,
                                        event: e.form['event'].value,
                                        data:  data,
                                        type: 'event', 
                                    });

                                    //Alert its completion
                                    this.components.project.refreshAll();
                                    Swal.fire({
                                        position: 'top-end',
                                        text: `${graph.title} has been created`,
                                        showConfirmButton: false,
                                        timer: 5000, timerProgressBar: true,
                                        backdrop: false,
                                    });
                                }
                            });
                        }
                    },
                    { label: 'Command'  },
                    { label: 'Function' },
                ]
            }),

            new ToolbarDropdown({
                icon: 'fa-eye',
                isRight: true,
                items: [
                    { label: 'Project', action: () => this.openContainer('ProjectComponent', { projectId: this.projectId }) },
                    { label: 'Functions', action: () => this.openContainer('FunctionComponent') },
                    { label: 'Inspector', action: () => this.openContainer('PropertyComponent', { node: null })},
                    '-',
                    { label: 'Reset Zoom', action: () => LiteCanvas.active.resetZoom() },
                    '-',
                    { label: 'Welcome', action: () => this.openContainer('PageComponent', { url: 'https://lachee.github.io/xve-docs/welcome', title: 'Welcome' }) },
                    { label: 'Quick Help', action: () => this.openContainer('PageComponent', { url: 'https://lachee.github.io/xve-docs/', title: 'Quick Help' }) },
                    { label: 'Todo List', action: () => this.openContainer('PageComponent', { url: 'https://trello.com/b/WM7G6Ysu.html', title: 'Todo List' }) },

                ]
            }),
            new ToolbarButton({
                icon: 'fa-bug',
                isRight: true,
                action: () => {
                    Swal.fire({
                        icon: 'success',
                        position: 'top-end',
                        text: `Test Notifcation`,
                        showConfirmButton: false,
                        timer: 2500, timerProgressBar: true,
                        backdrop: false,
                    });
                }
            }),
            new ToolbarButton({
                icon: 'fa-question',
                isRight: true,
                action: () => this.openContainer('PageComponent', { url: 'https://lachee.github.io/xve-docs/', title: 'Quick Help' })
            })
        ];
        this.toolbar = new Toolbar(this.toolbarElement, items);
        this.toolbar.init();
    }

    async #initGoldenLayout() {
        //Load the Golden Layout
        var config = 
        {
            settings: {
                showPopoutIcon: false,
            },
            content: [
                {
                    type: "row",
                    content: [
                        {
                            type: "column",
                            id: "default-left-panel",
                            width: 25,
                            content: [
                                {
                                    type: "stack",
                                    height: 25,
                                    content: [
                                        { type: "component", componentName: "ProjectComponent", componentState: {  projectId: this.projectId }, }
                                    ]
                                },
                                {
                                    type: "stack",
                                    height: 75,
                                    content: [
                                        { type: "component", componentName: "FunctionComponent"  }
                                    ]
                                }
                            ]
                        },
                        {
                            type: "stack",
                            id: "default-right-panel",
                            width: 75,
                            content: [
                                {
                                    type: "component", 
                                    componentName: "PageComponent", 
                                    componentState: {  title: 'Welcome', url: 'https://lachee.github.io/xve-docs/welcome', }, 
                                },
                                {
                                    type: "component", 
                                    componentName: "PageComponent", 
                                    componentState: {  title: 'Todo List', url: 'https://trello.com/b/WM7G6Ysu.html', }, 
                                }
                            ]
                        }
                    ]
                }
            ],
        };

        //Create hte layout
        this.layout = new GoldenLayout( config, this.editorElement );
        this.#registerComponents();
        this.layout.init();
    }


    async #initLiteInstance() {
        //Register the definitions
        let definitions = await this.api.getDefinitions();
        for(let key in definitions) 
            this.liteInstance.registerDefinition(definitions[key]);
        
        //Register the types
        let types = await this.api.getTypes();
        for (let key in types) 
            this.liteInstance.registerType(types[key]);
    }

  
    
    /** Opens a container */
    openContainer(component, state = {}) {
        let items = this.layout.root.getItemsById('default-right-panel');
        let elm = items[0] || this.layout.root.contentItems[0];
        elm.addChild(
            {
                type: "component", 
                componentName: component, 
                componentState: state,
            }
        );
    }

    #registerComponents() {
        return this.components = {
            project:    (new ProjectComponent(this)).register(this.layout),
            graph:      (new GraphComponent(this)).register(this.layout),
            function:   (new FunctionComponent(this)).register(this.layout),
            properties: (new PropertiesComponent(this)).register(this.layout),
            page:       (new PageComponent(this)).register(this.layout),
        }
    }
}