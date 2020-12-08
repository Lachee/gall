export class Component {
    
    /** Waits for the container's open event before rendering them. */
    waitForOpen = true;
    
    /** The parent layout */
    #layout = null;
    get layout() { return this.#layout; }

    /** List of all instances of windows */
    #windows = {};
    static #wid;

    constructor() { }

    /** Gets the name of the component */
    getName() { return "Component"; }

    /** Gets the titel of the current state
     * @param {*} state 
     * @returns {String} the title of the window
     */
    getTitle(state = null) { return this.getName(); }
    
    /** Gets the data of the component 
     * @deprecated dont use this
    */
    build(container, state) {
        container.getElement().html( '<h2>' + state.label + '</h2>' );
    }

    /** Renders a particular window 
     * @param {Window} window the current instance 
    */
    render(window) {
        return this.build(window.container, window.container.getState() );
    }

    /** Refreshes the window. 
     * The default behaviour is to re-render the entire window, 
     * but it maybe more suitable to override just this function for proportional refreshes
     * @param {Window} window the current isntance
     */
    refresh(window) {
        window.prime();
        this.render(window);
    }

    /** Refreshes all the window instances */
    refreshAll() {
        for(let key in this.#windows) {
            this.refresh(this.#windows[key]);
        }
    }
    
    /** Registers the container */
    register(layout) {
        this.#layout = layout;
        this.#layout.registerComponent(this.getName(), (container, state) => {
            
            //Set the default stuff of the container
            container.setTitle(this.getTitle(state));
            container.getElement().addClass(this.getName());
            this
            if (this.waitForOpen) {
                container.on('open', () => {
                    this.#createWindow(container);
                }, { once: true });
            } else {
                this.#createWindow();
            }

        });
        return this;
    }

    #createWindow(container) {        
        //Push the window
        const id = Component.#wid++;
        const window = this.#windows[id] = new Window(id, container);
        window.title = this.getTitle();

        //Setup the windows destruction
        container.on('destroy', () => {
            delete this.#windows[id];
        });

        //Render the window
        this.render(window);

        //return the window
        return window;
    }
}

export class Window {
    #id;
    #title;
    #container;
    
    constructor(id, container) {
        this.#id = id;
        this.#container = container;
    }

    get id() { return this.#id; }
    
    get state() {  return this.#container.getState() }
    set state(s) { this.#container.setState(state) }

    get title() { return this.#title; }
    set title(t) { this.#title = t; this.#container.setTitle(t); }

    get container() { return this.#container; }
    get root() { return this.#container.getElement() }
    get contentItem() { return this.#container.tab.contentItem; }

    /** Clears out hte HTML and returns the root item */
    prime() { 
        this.root.html('');
        return this.root;
    }

}