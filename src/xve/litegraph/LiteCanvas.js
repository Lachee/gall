import { LUtil, DragAndScale, NodeShape, ValidNodeShapes } from "./LUtil";
import { ContextMenu } from "./ContextMenu";
import { EventEmitter } from "events";

import "./LiteCanvas.scss";
import { LiteGraph } from "./LiteGraph";

export class LiteCanvas extends EventEmitter {

    /** @type {LiteCanvas} currently active canvas */
    static active;
    static gradients = {}; //cache of gradients
    
    #tempSlotSize      = new Float32Array(2);
    #tempNodeArea      = new Float32Array(4);
    #margin_area       = new Float32Array(4);
    #link_bounding     = new Float32Array(4);
    #tempConnectionA   = new Float32Array(2);
    #tempConnectionB   = new Float32Array(2);

    /** @type {LiteGraph} graph */
    graph;

    constructor( canvas, graph, options )
    {
        super();
        options = options || {};

        if(graph === undefined)
            throw ("No graph assigned");
    
        //Setup the instance
        this.instance = graph.instance;
    
        this.background_image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQBJREFUeNrs1rEKwjAUhlETUkj3vP9rdmr1Ysammk2w5wdxuLgcMHyptfawuZX4pJSWZTnfnu/lnIe/jNNxHHGNn//HNbbv+4dr6V+11uF527arU7+u63qfa/bnmh8sWLBgwYJlqRf8MEptXPBXJXa37BSl3ixYsGDBMliwFLyCV/DeLIMFCxYsWLBMwSt4Be/NggXLYMGCBUvBK3iNruC9WbBgwYJlsGApeAWv4L1ZBgsWLFiwYJmCV/AK3psFC5bBggULloJX8BpdwXuzYMGCBctgwVLwCl7Be7MMFixYsGDBsu8FH1FaSmExVfAxBa/gvVmwYMGCZbBg/W4vAQYA5tRF9QYlv/QAAAAASUVORK5CYII='
        //this.background_image = "images/grid.png";
        //this.background_image = "images/grid_dots.png";
        //this.background_image = null;
        
        this.render_grid				= false;
        this.render_grid_pattern 		= './images/grid_dots.png';
        this.render_grid_image			= null;
    
        if(canvas && canvas.constructor === String )
            canvas = document.querySelector( canvas );
            
        this.ds = new DragAndScale();
        this.zoom_modify_alpha = true; //otherwise it generates ugly patterns when scaling down too much
    
        this.title_text_font = ""+this.instance.NODE_TEXT_SIZE+"px Arial";
        this.inner_text_font = "normal "+this.instance.NODE_SUBTEXT_SIZE+"px Arial";
        
        this.stretchy = false;  //Stretchy animations when moving nodes around
        
        this.highquality_render = true;
        this.use_gradients = false; //set to true to render titlebar with gradients
        this.editor_alpha = 1; //used for transition
        this.pause_rendering = false;
        this.clear_background = true;
    
        this.gravity = 0;//0.125;
        this.spline_distance = null;//200;
        this.decelleration = 1.3;
    
        this.animated_links = true;
        this.show_biezer_controls = false;
    
        this.render_history = true;
        this.render_only_selected = true;
        this.live_mode = false;
        this.show_info = true;
        this.allow_dragcanvas = true;
        this.allow_dragnodes = true;
        this.allow_interaction = true; //allow to control widgets, buttons, collapse, etc
        this.allow_searchbox = true;
        this.allow_reconnect_links = true; //allows to change a connection with having to redo it again
    
        this.drag_mode = false;
        this.dragging_rectangle = null;
    
        this.filter = null; //allows to filter to only accept some type of nodes in a graph
    
        this.always_render_background 	= false;
        this.render_shadows 			= false;
        this.render_outline				= true;
        this.render_canvas_border		= true;
        this.render_connections_shadows = false; //too much cpu
        this.render_connections_border 	= false;
        this.render_curved_connections 	= false;
        this.render_connection_arrows 	= false;
        this.render_collapsed_slots 	= true;
        this.render_execution_order 	= false;
    
        this.use_alpha					= true;
    
        this.render_link_arrows			= true;	//render hte arrows on variable links
    
        this.render_mode = null;
    
        this.canvas_mouse = [0,0]; //mouse in canvas graph coordinates, where 0,0 is the top-left corner of the blue rectangle
    
        //to personalize the search box
        this.onSearchBox = null;
        this.onSearchBoxSelection = null;
    
        //callbacks
        this.onMouse = null;
        this.onDrawBackground = null; //to render background objects (behind nodes and connections) in the canvas affected by transform
        this.onDrawForeground = null; //to render foreground objects (above nodes and connections) in the canvas affected by transform
        this.onDrawOverlay = null; //to render foreground objects not affected by transform (for GUIs)
    
        this.connections_width = 3;
        this.round_radius = 8;
    
        this.current_node = null;
        this.node_widget = null; //used for widgets
        this.last_mouse_position = [0,0];
        this.visible_area = this.ds.visible_area;
        this.visible_links = [];
        
        this.slot_dragged = 2;
        this.slot_dragged_offset = 0;
        this.slot_dragged_node = null;
        this.slot_dragged_side = this.instance.OUTPUT;
    
        this.tooltip = { x: -100, y: -100, content: null };
    
        if (options.mobile)
            this.setLowFidelityMode();
    
        //link canvas and graph
        if(graph)
            graph.attachCanvas(this);
    
        canvas.webgl_enabled = true;
        this.setCanvas( canvas );
        this.clear();
    
        if(!options.skip_render)
            this.startRendering();
    
        this.autoresize = options.autoresize;
        this.disabled = false;
        
    }

    /** Marks the current canvas as the active one */
    #activate() {
        if (LiteCanvas.active != null) {
            LiteCanvas.active.emit('canvas:deactivate', {});
            LiteCanvas.active.setDirty(true,true);
        }
        LiteCanvas.active = this;
        this.emit('canvas:activate', {});
        this.setDirty(true,true);
        console.log('Active', LiteCanvas.active);
    }
    
    setTooltip(content, x, y, width, height)
    {
        //The mouse isnt in the space, so dont set the tooltip
        if (!LUtil.isInsideRectangle(this.canvas_mouse[0], this.canvas_mouse[1], x, y, width, height))
            return;

        //Update the tooltip
        this.tooltip.x = x;
        this.tooltip.y = y;
        this.tooltip.content = content;
    }

    setLowFidelityMode() {
        this.highquality_render = false;
        this.animated_links = false;
        this.render_mode = this.instance.LINEAR_LINK;
        this.render_grid = true;
        this.render_grid_pattern = './images/grid_dots.png';
        this.render_link_arrows = false;
    }

    /**
    * clears all the data inside
    *
    * @method clear
    */
    clear()
    {
        this.frame = 0;
        this.last_draw_time = 0;
        this.render_time = 0;
        this.fps = 0;

        //this.scale = 1;
        //this.offset = [0,0];

        this.dragging_rectangle = null;

        this.selected_nodes = {};
        this.selected_group = null;

        this.visible_nodes = [];
        this.node_dragged = null;
        this.node_dragged_velocity = [0, 0];
        this.last_node_dragged_id = 0;

        this.last_mouse_time = 0;
        this.node_over = null;
        this.node_capturing_input = null;
        this.connecting_node = null;
        this.connecting_anchors = null;
        this.highlighted_links = {};

        this.shift_disconnects = false;
        this.ctrl_disconnects = true;

        this.dirty_canvas = true;
        this.dirty_bgcanvas = true;
        this.dirty_area = null;

        this.node_in_panel = null;
        this.node_widget = null;

        this.last_mouse = [0,0];
        this.last_mouseclick = 0;
        this.visible_area.set([0,0,0,0]);


        if(this.onClear)
            this.onClear();
    }

    /**
    * assigns a graph, you can reassign graphs to the same canvas
    *
    * @method setGraph
    * @param {LGraph} graph
    */
    setGraph( graph, skip_clear )
    {
        if(this.graph == graph)
            return;

        if(!skip_clear)
            this.clear();

        if(!graph && this.graph)
        {
            this.graph.detachCanvas(this);
            return;
        }

        /*
        if(this.graph)
            this.graph.canvas = null; //remove old graph link to the canvas
        this.graph = graph;
        if(this.graph)
            this.graph.canvas = this;
        */
        graph.attachCanvas(this);
        this.setDirty(true,true);
    }

    /**
    * opens a graph contained inside a node in the current graph
    *
    * @method openSubgraph
    * @param {LGraph} graph
    */
    openSubgraph(graph)
    {
        if(!graph)
            throw("graph cannot be null");

        if(this.graph == graph)
            throw("graph cannot be the same");

        this.clear();

        if(this.graph)
        {
            if(!this._graph_stack)
                this._graph_stack = [];
            this._graph_stack.push(this.graph);
        }

        graph.attachCanvas(this);
        this.setDirty(true,true);
    }

    /**
    * closes a subgraph contained inside a node
    *
    * @method closeSubgraph
    * @param {LGraph} assigns a graph
    */
    closeSubgraph()
    {
        if(!this._graph_stack || this._graph_stack.length == 0)
            return;
        var subgraph_node = this.graph._subgraph_node;
        var graph = this._graph_stack.pop();
        this.selected_nodes = {};
        this.highlighted_links = {};
        graph.attachCanvas(this);
        this.setDirty(true,true);
        if( subgraph_node )
        {
            this.centerOnNode( subgraph_node );
            this.selectNodes( [subgraph_node] );
        }
    }

    /**
    * assigns a canvas
    *
    * @method setCanvas
    * @param {Canvas} assigns a canvas (also accepts the ID of the element (not a selector)
    */
    setCanvas( canvas, skip_events )
    {
        var that = this;

        if(canvas)
        {
            if( canvas.constructor === String )
            {
                canvas = document.getElementById(canvas);
                if(!canvas)
                    throw("Error creating LiteGraph canvas: Canvas not found");
            }
        }

        if(canvas === this.canvas)
            return;

        if(!canvas && this.canvas)
        {
            //maybe detach events from old_canvas
            if(!skip_events)
                this.unbindEvents();
        }

        this.canvas = canvas;
        this.ds.element = canvas;

        if(!canvas)
            return;

        //this.canvas.tabindex = "1000";
        canvas.className += " LiteCanvas";
        canvas.data = this;
        canvas.tabindex = '1'; //to allow key events

        //bg canvas: used for non changing stuff
        this.bgcanvas = null;
        if(!this.bgcanvas)
        {
            this.bgcanvas = document.createElement("canvas");
            this.bgcanvas.width = this.canvas.width;
            this.bgcanvas.height = this.canvas.height;
        }

        if(canvas.getContext == null)
        {
            if( canvas.localName != "canvas" )
                throw("Element supplied for LiteCanvas must be a <canvas> element, you passed a " + canvas.localName );
            throw("This browser doesn't support Canvas");
        }

        console.log("Creating Context");
        var ctx = this.ctx = canvas.getContext("2d", { alpha: this.use_alpha });
        if(ctx == null)
        {
            if(!canvas.webgl_enabled) console.warn("This canvas seems to be WebGL, enabling WebGL renderer");
            this.enableWebGL();
        }

        ctx.roundRect = function (x, y, width, height, radius, radius_low) {
            if ( radius === undefined ) {
              radius = 5;
            }
          
            if(radius_low === undefined)
               radius_low  = radius;
          
            this.moveTo(x + radius, y);
            this.lineTo(x + width - radius, y);
            this.quadraticCurveTo(x + width, y, x + width, y + radius);
          
            this.lineTo(x + width, y + height - radius_low);
            this.quadraticCurveTo(x + width, y + height, x + width - radius_low, y + height);
            this.lineTo(x + radius_low, y + height);
            this.quadraticCurveTo(x, y + height, x, y + height - radius_low);
            this.lineTo(x, y + radius);
            this.quadraticCurveTo(x, y, x + radius, y);
        }

        //input:  (move and up could be unbinded)
        this._mousemove_callback = this.processMouseMove.bind(this);
        this._mouseup_callback = this.processMouseUp.bind(this);

        if(!skip_events)
            this.bindEvents();
    }

    //used in some events to capture them
    #doNothing(e) { e.preventDefault(); return true; }
    #doReturnTrue(e) { e.preventDefault(); return true; }

    /**
    * binds mouse, keyboard, touch and drag events to the canvas
    * @method bindEvents
    **/
    bindEvents()
    {
        if(	this._events_binded )
        {
            console.warn("LiteCanvas: events already binded");
            return;
        }

        var canvas = this.canvas;
        var ref_window = this.getCanvasWindow();
        var document = ref_window.document; //hack used when moving canvas between windows

        this._mousedown_callback = this.processMouseDown.bind(this);
        this._mousewheel_callback = this.processMouseWheel.bind(this);
        this._dblclick_callback = this.processDoubleClick.bind(this);
        this._touch_callback = this.touchHandler.bind(this);

        canvas.addEventListener("mousedown", this._mousedown_callback, true ); //down do not need to store the binded
        canvas.addEventListener("mousemove", this._mousemove_callback );
        canvas.addEventListener("mousewheel", this._mousewheel_callback, false);

        canvas.addEventListener("dblclick", this._dblclick_callback);

        canvas.addEventListener("contextmenu", this.#doNothing );
        canvas.addEventListener("DOMMouseScroll", this._mousewheel_callback, false);

        //touch events
        //if( 'touchstart' in document.documentElement )
        {
            canvas.addEventListener("touchstart", this._touch_callback, true);
            canvas.addEventListener("touchmove", this._touch_callback, true);
            canvas.addEventListener("touchend", this._touch_callback, true);
            canvas.addEventListener("touchcancel", this._touch_callback, true);
        }

        //Keyboard ******************
        this._key_callback = this.processKey.bind(this);

        document.addEventListener("keydown", this._key_callback, true );
        document.addEventListener("keyup", this._key_callback, true ); //in document, otherwise it doesn't fire keyup

        //Dropping Stuff over nodes ************************************
        this._ondrop_callback = this.processDrop.bind(this);

        canvas.addEventListener("dragover", this.#doNothing, false );
        canvas.addEventListener("dragend", this.#doNothing, false );
        canvas.addEventListener("drop", this._ondrop_callback, false );
        canvas.addEventListener("dragenter", this.#doReturnTrue, false );

        this._events_binded = true;
    }

    /**
    * unbinds mouse events from the canvas
    * @method unbindEvents
    **/
    unbindEvents()
    {
        if(	!this._events_binded )
        {
            console.warn("LiteCanvas: no events binded");
            return;
        }

        var ref_window = this.getCanvasWindow();
        var document = ref_window.document;

        this.canvas.removeEventListener( "mousedown", this._mousedown_callback );
        this.canvas.removeEventListener( "mousewheel", this._mousewheel_callback );
        this.canvas.removeEventListener( "DOMMouseScroll", this._mousewheel_callback );
        this.canvas.removeEventListener( "keydown", this._key_callback );
        document.removeEventListener( "keyup", this._key_callback );
        this.canvas.removeEventListener( "contextmenu", this.#doNothing );
        this.canvas.removeEventListener( "drop", this._ondrop_callback );
        this.canvas.removeEventListener( "dragenter", this.#doReturnTrue );

        this.canvas.removeEventListener("touchstart", this.touchHandler );
        this.canvas.removeEventListener("touchmove", this.touchHandler );
        this.canvas.removeEventListener("touchend", this.touchHandler );
        this.canvas.removeEventListener("touchcancel", this.touchHandler );

        this._mousedown_callback = null;
        this._mousewheel_callback = null;
        this._key_callback = null;
        this._ondrop_callback = null;

        this._events_binded = false;

    }

    static getFileExtension = function (url)
    {
        var question = url.indexOf("?");
        if(question != -1)
            url = url.substr(0,question);
        var point = url.lastIndexOf(".");
        if(point == -1)
            return "";
        return url.substr(point+1).toLowerCase();
    }

    /**
    * this function allows to render the canvas using WebGL instead of Canvas2D
    * this is useful if you plant to render 3D objects inside your nodes, it uses litegl.js for webgl and canvas2DtoWebGL to emulate the Canvas2D calls in webGL
    * @method enableWebGL
    **/
    enableWebGL()
    {
        if(typeof(GL) === undefined)
            throw("litegl.js must be included to use a WebGL canvas");
        if(typeof(enableWebGLCanvas) === undefined)
            throw("webglCanvas.js must be included to use this feature");

        this.gl = this.ctx = enableWebGLCanvas(this.canvas);
        this.ctx.webgl = true;
        this.bgcanvas = this.canvas;
        this.bgctx = this.gl;
        this.canvas.webgl_enabled = true;

        console.log("WebGL Mode Enabled");

        /*
        GL.create({ canvas: this.bgcanvas });
        this.bgctx = enableWebGLCanvas( this.bgcanvas );
        window.gl = this.gl;
        */
    }


    /**
    * marks as dirty the canvas, this way it will be rendered again
    *
    * @class LiteCanvas
    * @method setDirty
    * @param {bool} fgcanvas if the foreground canvas is dirty (the one containing the nodes)
    * @param {bool} bgcanvas if the background canvas is dirty (the one containing the wires)
    */
    setDirty( fgcanvas, bgcanvas )
    {
        if(fgcanvas)
            this.dirty_canvas = true;
        if(bgcanvas)
            this.dirty_bgcanvas = true;
    }

    /**
    * Used to attach the canvas in a popup
    *
    * @method getCanvasWindow
    * @return {window} returns the window where the canvas is attached (the DOM root node)
    */
    getCanvasWindow()
    {
        if(!this.canvas)
            return window;
        var doc = this.canvas.ownerDocument;
        return doc.defaultView || doc.parentWindow;
    }

    /**
    * starts rendering the content of the canvas when needed
    *
    * @method startRendering
    */
    startRendering()
    {
        if(this.is_rendering)
            return; //already rendering

        this.is_rendering = true;
        renderFrame.call(this);

        function renderFrame()
        {
            if(!this.pause_rendering)
                this.draw();

            var window = this.getCanvasWindow();
            if(this.is_rendering)
                window.requestAnimationFrame( renderFrame.bind(this) );
        }
    }

    /**
    * stops rendering the content of the canvas (to save resources)
    *
    * @method stopRendering
    */
    stopRendering()
    {
        this.is_rendering = false;
        /*
        if(this.rendering_timer_id)
        {
            clearInterval(this.rendering_timer_id);
            this.rendering_timer_id = null;
        }
        */
    }

    /* LiteGraphCanvas input */
    processDoubleClick(e) {
        if (!this.graph) return;
        if (this.disabled) return;

        //Do nothing because processMouseDOwn handles the double click
    }

    processMouseDown(e)
    {
        if(!this.graph)
            return;

        if (this.disabled) 
            return;

        this.adjustMouseEvent(e);
        if (this.graph.history) this.graph.history.createGroup(this.graph);

        var ref_window = this.getCanvasWindow();
        var document = ref_window.document;        
        var that = this;
        this.#activate();

        //move mouse move event to the window in case it drags outside of the canvas
        this.canvas.removeEventListener("mousemove", this._mousemove_callback );
        ref_window.document.addEventListener("mousemove", this._mousemove_callback, true ); //catch for the entire window
        ref_window.document.addEventListener("mouseup", this._mouseup_callback, true );

        var node = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visible_nodes, 5 );
        var skip_dragging = false;
        var skip_action = false;
        var now = this.instance.getTime();
        var is_double_click = (now - this.last_mouseclick) < 300;

        this.canvas_mouse[0] = e.canvasX;
        this.canvas_mouse[1] = e.canvasY;
        this.canvas.focus();

        ContextMenu.closeAllContextMenus( ref_window );
        if(this.onMouse)
        {
            if( this.onMouse(e) == true )
                return;
        }
    
        if (!node)
        {
            var bindingNode = this.graph.getNodeOnPos( e.canvasX + this.instance.BINDING_WIDTH, e.canvasY, this.visible_nodes, 5 );
            this.processNodeBindings(bindingNode, this.canvas_mouse, e);
        }

        if(e.which == 1) //left button mouse
        {
            //when clicked on top of a node
            //and it is not interactive
            if( node && this.allow_interaction && !skip_action )
            {
                if( !this.live_mode && !node.flags.pinned )
                    this.bringToFront( node ); //if it wasn't selected?

                //not dragging mouse to connect two slots
                if(!this.connecting_node && !node.flags.collapsed && !this.live_mode)
                {
                    //Search for corner for resize
                    if( !skip_action && node.resizable !== false && LUtil.isInsideRectangle( e.canvasX, e.canvasY, node.pos[0] + node.size[0] - 5, node.pos[1] + node.size[1] - 5 ,10,10 ))
                    {
                        this.resizing_node = node;
                        this.setCursor("se-resize");
                        skip_action = true;
                    }
                    else
                    {
                        //search for outputs
                        if(node.outputs)
                            for(var i = 0, l = node.outputs.length; i < l; ++i)
                            {
                                var output = node.outputs[i];
                                var link_pos = node.getConnectionPos(false,i);
                                if( LUtil.isInsideRectangle( e.canvasX, e.canvasY, link_pos[0] - 15, link_pos[1] - 10, 30,20) && !this.instance.hasType(output.type, "invalid"))
                                {
                                    console.log(output);
                                    this._highlight_input = null;
                                    this.connecting_node = node;
                                    this.connecting_anchors = [];
                                    this.connecting_output = output;
                                    this.connecting_pos = node.getConnectionPos(false,i);
                                    this.connecting_slot = i;

                                    if((this.shift_disconnects && e.shiftKey) || (this.ctrl_disconnects && e.ctrlKey))
                                        node.disconnectOutput(i);

                                    if (is_double_click) {
                                        if (node.onOutputDblClick)
                                            node.onOutputDblClick(i, e);
                                    } else {
                                        if (node.onOutputClick)
                                            node.onOutputClick(i, e);
                                    }

                                    skip_action = true;
                                    break;
                                }
                            }

                        //search for inputs
                        if(node.inputs)
                            for(var i = 0, l = node.inputs.length; i < l; ++i)
                            {
                                var input = node.inputs[i];
                                var link_pos = node.getConnectionPos( true, i );
                                if( LUtil.isInsideRectangle(e.canvasX, e.canvasY, link_pos[0] - 15, link_pos[1] - 10, 30,20) )
                                {
                                    if (is_double_click) {
                                        if (node.onInputDblClick)
                                            node.onInputDblClick(i, e);
                                    } else {
                                        if (node.onInputClick)
                                            node.onInputClick(i, e);
                                    }

                                    if(input.link !== null)
                                    {
                                        var link_info = this.graph.links[ input.link ]; //before disconnecting
                                        node.disconnectInput(i);

                                        if( this.allow_reconnect_links || e.shiftKey )
                                        {
                                            this.connecting_node = this.graph._nodes_by_id[ link_info.origin_id ];
                                            this.connecting_anchors = link_info.anchors;
                                            this.connecting_slot = link_info.origin_slot;
                                            this.connecting_output = this.connecting_node.outputs[ this.connecting_slot ];
                                            this.connecting_pos = this.connecting_node.getConnectionPos( false, this.connecting_slot );
                                        }

                                        this.dirty_bgcanvas = true;
                                        skip_action = true;
                                    }
                                }
                            }
                    } //not resizing
                }

                //Search for corner for collapsing
                /*
                if( !skip_action && LUtil.isInsideRectangle( e.canvasX, e.canvasY, node.pos[0], node.pos[1] - this.instance.NODE_TITLE_HEIGHT, this.instance.NODE_TITLE_HEIGHT, this.instance.NODE_TITLE_HEIGHT ))
                {
                    node.collapse();
                    skip_action = true;
                }
                */

                //it wasn't clicked on the links boxes
                if(!skip_action)
                {
                    var block_drag_node = false;

                    //widgets
                    var widget = this.processNodeWidgets( node, this.canvas_mouse, e );
                    if(widget)
                    {
                        block_drag_node = true;
                        this.node_widget = [node, widget];
                    }

                    //double clicking
                    if (is_double_click && this.selected_nodes[ node.id ])
                    {
                        //double click node
                        if( node.onDblClick)
                            node.onDblClick(e,[e.canvasX - node.pos[0], e.canvasY - node.pos[1]], this);
                        this.processNodeDblClicked( node );
                        block_drag_node = true;
                    }

                    //if do not capture mouse
                    if( node.onMouseDown && node.onMouseDown( e, [e.canvasX - node.pos[0], e.canvasY - node.pos[1]], this ) )
                    {
                        block_drag_node = true;
                    }
                    else if(this.live_mode)
                    {
                        clicking_canvas_bg = true;
                        block_drag_node = true;
                    }

                    if (node.expandable) {
                        //ctx.rect((size[0] / 2) - 8, size[1] - 6, 17, 12);
                        if (this.isOverNodePoint(node, e.canvasX, e.canvasY, (node.size[0] / 2) - 8, node.size[1] - 6, 17, 12))
                        {
                            if (node.expandable == "output")
                                node.addOutput('New Slot', 'object');
                            
                            if (node.expandable == 'input')
                                node.addInput('New Slot', 'object');
                        } else {
                            for(let nsi in node[node.expandable + 's']) {
                                let slot = node[node.expandable + 's'][nsi];
                                if (slot && !slot.locked) {
                                    let dir =  node.expandable == "input" ? 1 : -1;
                                    let pos = node.getConnectionPos( node.expandable == "input", nsi );
                                    
                                    //DELETE
                                    if (LUtil.isInsideRectangle(e.canvasX, e.canvasY, pos[0] + 88 * dir, pos[1] - 4, 9, 9)) {			

                                        if(node.expandable == "input") node.removeInput( nsi );
                                        else node.removeOutput( nsi );
                                        block_drag_node = true;
                                    }				
                                    
                                    //EDIT
                                    if (LUtil.isInsideRectangle(e.canvasX, e.canvasY, pos[0] + (88-14) * dir, pos[1] - 4, 9, 9)) {		
                                        
                                        let type = slot.type || "object";
                                        let settings = {
                                            name: slot.label || "",
                                            type: type == "-1" ? "event" : type,
                                            allowedTypes: []
                                        }
                                        for(let t in this.instance.TYPE_DESIGN)
                                        {
                                            if (t == 'array' || t == 'collection') continue;
                                            if (t == '-1' && node.expandable == 'output') continue;

                                            //Edge case for commands to make only things we can cast in this list.
                                            if (node.type == "event/command") {
                                                options = this.instance.getTypeOptions(t);
                                                if (!options || !options.cmd) continue;
                                            }

                                            settings.allowedTypes.push(this.instance.TYPE_DESIGN[t]);
                                        }
                                    
                                        this.createSlotEditModal(settings, function(data) {
                                            if (data.type == "event") data.type = "-1";
                                            if (node.expandable == "input") {
                                                node.changeInputType(nsi, data.type);
                                                slot.label = data.name || "New Slot";
                                                
                                                if (data.type == "-1") 
                                                    node.shiftInput(nsi, 0);

                                            } else {
                                                if (data.type != 'event') {
                                                    node.changeOutputType(nsi, data.type);
                                                    slot.label = data.name || "New Slot";
                                                }
                                            }	
                                        });
                                        
                                        block_drag_node = true;
                                    }

                                    //DRAG
                                    if (LUtil.isInsideRectangle(e.canvasX, e.canvasY, pos[0] + (88+14) * dir, pos[1] - 4, 9, 9)) {	
                                        console.log("DING");
                                        this.slot_dragged = nsi;
                                        this.slot_dragged_side = node.expandable == "input" ? this.instance.INPUT : this.instance.OUTPUT;
                                        this.slot_dragged_node = node;
                                        this.slot_dragged_offset = 0;
                                        block_drag_node = true;
                                    }
                                }
                            }
                        }
                    }

                    if(!block_drag_node)
                    {
                        if(this.allow_dragnodes) 
                        {
                            this.node_dragged = node;

                            if (this.graph.history)
                            {
                                if (this.selected_nodes && Object.keys(this.selected_nodes).length > 0)
                                {
                                    for (var n in this.selected_nodes)
                                    {
                                        this.graph.history.recordNode(this.selected_nodes[n], ['pos']);
                                    }
                                }   
                                else
                                {
                                    this.graph.history.recordNode(node);
                                }
                            }

                            //if (this.graph.history)
                            //    this.graph.history.record('NODE_MOVE', {id: node.id, pos: [ node.pos[0], node.pos[1] ] });
                        }

                        if(!this.selected_nodes[ node.id ])
                            this.processNodeSelected( node, e );
                    }

                    this.dirty_canvas = true;
                }
            }
            else //clicked outside of nodes
            {

                //search for link connector
                for(var i = 0; i < this.visible_links.length; ++i)
                {
                    let foundLink = false;
                    var link = this.visible_links[i];
                    var linkRadius = 4;

                    //getConnectionPos
                                    
                    if (link.anchors.length > 0) 
                    {
                        for(var k = 0; k < link.anchors.length + 1; k++) 
                        {
                            let a = k == 0 ? link._start : link.anchors[k - 1];
                            let b = k >= link.anchors.length ? link._end : link.anchors[k];

                            let x = a[0] + ((b[0] - a[0]) / 2);
                            let y = a[1] + ((b[1] - a[1]) / 2);

                            if (e.canvasX >= x - linkRadius && e.canvasX <= x + linkRadius && e.canvasY >= y - linkRadius && e.canvasY <= y + linkRadius)
                            {
                                foundLink = true;
                                break;
                            }
                        }
                    }
                    else
                    {
                        let x = link._start[0] + ((link._end[0] - link._start[0]) / 2);
                        let y = link._start[1] + ((link._end[1] - link._start[1]) / 2);
                        foundLink = e.canvasX >= x - linkRadius && e.canvasX <= x + linkRadius && e.canvasY >= y - linkRadius && e.canvasY <= y + linkRadius;
                    }

                    //link clicked
                    if (foundLink) 
                    {
                        this.showLinkMenu( link, e );
                        skip_action = true;
                        break;
                    }
                }

                this.selected_group = this.graph.getGroupOnPos( e.canvasX, e.canvasY );
                this.selected_group_resizing = false;
                if( this.selected_group )
                {
                    //if( e.ctrlKey )
                        this.dragging_rectangle = null;

                    var dist = LUtil.distance( [e.canvasX, e.canvasY], [ this.selected_group.pos[0] + this.selected_group.size[0], this.selected_group.pos[1] + this.selected_group.size[1] ] );
                    if( (dist * this.ds.scale) < 10 )
                        this.selected_group_resizing = true;
                    else
                        this.selected_group.recomputeInsideNodes();
                        
                    skip_action = true;
                }

                //DISABLED SEARCH BOX
                //if( is_double_click )
                //	this.showSearchBox( e );
                
                let clicking_canvas_bg = true;
                
            
                if (!skip_action)
                {
                    this.dragging_rectangle = new Float32Array(4);
                    this.dragging_rectangle[0] = e.canvasX;
                    this.dragging_rectangle[1] = e.canvasY;
                    this.dragging_rectangle[2] = 1;
                    this.dragging_rectangle[3] = 1;
                    skip_action = true;
                }
            }

            //if( !skip_action && clicking_canvas_bg && this.allow_dragcanvas )
            //{
            //	this.dragging_canvas = true;
            //}
        }
        else if (e.which == 2) //middle button
        {
            this.dragging_canvas = true;
        }
        else if (e.which == 3) //right button
        {
            if (this.connecting_node) 
            {
                //Create Anchor
                this.connecting_anchors.push([
                Math.round(this.canvas_mouse[0]), 
                Math.round(this.canvas_mouse[1])
                ]);
                console.log(this.connecting_anchors);
            }
            else
            {
                //CREATE CONTEXT MENU
                this.processContextMenu( node, e );
            }
        }

        //TODO
        //if(this.node_selected != prev_selected)
        //	this.onNodeSelectionChange(this.node_selected);

        this.last_mouse[0] = e.localX;
        this.last_mouse[1] = e.localY;
        this.last_mouseclick = this.instance.getTime();
        this.last_mouse_dragging = true;

        /*
        if( (this.dirty_canvas || this.dirty_bgcanvas) && this.rendering_timer_id == null)
            this.draw();
        */

        this.graph.change();

        //this is to ensure to defocus(blur) if a text input element is on focus
        //if(!ref_window.document.activeElement || (ref_window.document.activeElement.nodeName.toLowerCase() != "input" && ref_window.document.activeElement.nodeName.toLowerCase() != "textarea"))
        //	e.preventDefault();
        
        //	//l e.stopPropagation();

        if(this.onMouseDown)
            this.onMouseDown(e);

        return false;
    }

    setCursor(cursor = null)
    {
        //Skip if its the same
        if (this.cursor && this.cursor == cursor)
            return;

        this.canvas.style.cursor = cursor;
        this.cursor = cursor;
    }

    /**
    * Called when a mouse move event has to be processed
    * @method processMouseMove
    **/
    processMouseMove(e)
    {
        if (this.disabled) 
            return;
            
        if(this.autoresize)
            this.resize();

        if(!this.graph)
            return;
            
        // this.#activate();

        this.setCursor();
        this.adjustMouseEvent(e);
        var mouse = [e.localX, e.localY];
        
        var delta = [mouse[0] - this.last_mouse[0], mouse[1] - this.last_mouse[1]];

        if (this.animated_links && (this.node_dragged || this.connecting_node)) 
        {
            this.last_node_dragged_id = this.node_dragged  ? this.node_dragged.id : this.connecting_node.id;
            if (delta[0] != 0)
                this.node_dragged_velocity[0] += ((e.canvasX - this.canvas_mouse[0]));

            if (delta[1] != 0)
                this.node_dragged_velocity[1] += ((e.canvasY - this.canvas_mouse[1]));
        }

        this.last_mouse = mouse;
        this.canvas_mouse[0] = e.canvasX;
        this.canvas_mouse[1] = e.canvasY;
        e.dragging = this.last_mouse_dragging;
        

        //this.dirty_canvas = true;
        
        //this.processNodeBindings(node, this.canvas_mouse, e);

        var bindingNode = this.graph.getNodeOnPos( e.canvasX + this.instance.BINDING_WIDTH, e.canvasY, this.visible_nodes, 5 );
        this.processNodeBindings(bindingNode, this.canvas_mouse, e);

        if( this.node_widget )
        {
            this.processNodeWidgets( this.node_widget[0], this.canvas_mouse, e, this.node_widget[1] );
            this.dirty_canvas = true;
        }

        if( this.dragging_rectangle )
        {
            this.setCursor('crosshair');
            this.dragging_rectangle[2] = e.canvasX - this.dragging_rectangle[0];
            this.dragging_rectangle[3] = e.canvasY - this.dragging_rectangle[1];
            this.dirty_canvas = true;
        }
        else if (this.selected_group) //moving/resizing a group
        {
            if( this.selected_group_resizing )
                this.selected_group.size = [ e.canvasX - this.selected_group.pos[0], e.canvasY - this.selected_group.pos[1] ];
            else
            {
                var deltax = delta[0] / this.ds.scale;
                var deltay = delta[1] / this.ds.scale;
                this.selected_group.move( deltax, deltay, e.ctrlKey );
                if( this.selected_group._nodes.length)
                    this.dirty_canvas = true;
            }
            this.dirty_bgcanvas = true;
        }
        else if(this.dragging_canvas)
        {  
            this.setCursor('move');
            this.ds.offset[0] += delta[0] / this.ds.scale;
            this.ds.offset[1] += delta[1] / this.ds.scale;
            this.dirty_canvas = true;
            this.dirty_bgcanvas = true;
        }
        else if(this.allow_interaction)
        {
            if(this.connecting_node) {
                this.dirty_canvas = true;		
                this.setCursor('grabbing');
            }

            //get node over
            var node = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visible_nodes );

            //remove mouseover flag
            for(var i = 0, l = this.graph._nodes.length; i < l; ++i)
            {
                if(this.graph._nodes[i].mouseOver && node != this.graph._nodes[i])
                {
                    //mouse leave
                    this.graph._nodes[i].mouseOver = false;
                    if(this.node_over && this.node_over.onMouseLeave)
                        this.node_over.onMouseLeave(e);
                    this.node_over = null;
                    this.dirty_canvas = true;
                }
            }

            //mouse over a node
            if(node)
            {
                //this.setCursor('grab');
                if(!node.mouseOver)
                {
                    //mouse enter
                    node.mouseOver = true;
                    this.node_over = node;
                    this.dirty_canvas = true;

                    if(node.onMouseEnter) node.onMouseEnter(e);
                }

                //in case the node wants to do something
                if(node.onMouseMove)
                    node.onMouseMove(e, [e.canvasX - node.pos[0], e.canvasY - node.pos[1]], this);

                //if dragging a link 
                if(this.connecting_node)
                {
                    var pos = this._highlight_input || [0,0]; //to store the output of isOverNodeInput
                    //on top of input
                    if( this.isOverNodeBox( node, e.canvasX, e.canvasY ) )
                    {
                        //mouse on top of the corner box, don't know what to do
                    }
                    else
                    {
                        //check if I have a slot below de mouse
                        var slot = this.isOverNodeInput( node, e.canvasX, e.canvasY, pos );
                        if(slot != -1 && node.inputs[slot] )
                        {
                            var slot_type = node.inputs[slot].type;
                            if( this.instance.isValidConnection( this.connecting_output.type, slot_type ) )
                                this._highlight_input = pos;
                        }
                        else
                            this._highlight_input = null;
                    }
                } else if (node.expandable) {
                    if (this.isOverNodePoint(node, e.canvasX, e.canvasY, (node.size[0] / 2) - 8, node.size[1] - 6, 17, 50)) {
                        this.setCursor('pointer');
                    } else {
                        for(let nsi in node[node.expandable + 's']) {
                            let slot = node[node.expandable + 's'][nsi];
                            if (slot && !slot.locked) {
                                let dir =  node.expandable == "input" ? 1 : -1;
                                let pos = node.getConnectionPos( node.expandable == "input", nsi );
                                
                                //DELETE
                                if (LUtil.isInsideRectangle(e.canvasX, e.canvasY, pos[0] + 88 * dir, pos[1] - 4, 9, 9)) {			
                                    this.setCursor('pointer');
                                }				
                                
                                //EDIT
                                if (LUtil.isInsideRectangle(e.canvasX, e.canvasY, pos[0] + (88-14) * dir, pos[1] - 4, 9, 9)) {			
                                    this.setCursor('pointer');		
                                }

                                //Drag
                                if (LUtil.isInsideRectangle(e.canvasX, e.canvasY, pos[0] + (88+14) * dir, pos[1] - 4, 9, 9)) {
                                    this.setCursor('grab');
                                }
                            }
                        }
                    }
                } 
                else
                {
                    //Try to find an output slot
                    var slot = this.isOverNodeOutput(node, e.canvasX, e.canvasY);
                    if (slot > -1 && this.instance.hasType(node.outputs[slot].type, 'invalid')) slot = -1;

                    //If we don't have an output slot, try to find a input slot.
                    if(slot == -1) 
                    {
                        //Try again to find a slot, validating 
                        slot = this.isOverNodeInput(node, e.canvasX, e.canvasY);
                        if (slot > -1 && (!node.inputs[slot].link || this.instance.hasType(node.inputs[slot].type, 'invalid'))) slot = -1;
                    }
                    
                    if (slot != -1)
                    {
                        var link_pos = node.getConnectionPos(false, slot);
                        if (LUtil.isInsideRectangle( e.canvasX, e.canvasY, link_pos[0] - 15, link_pos[1] - 10, 30,20))
                        {
                            this.setCursor("pointer");
                        }
                    }
                    
                    //If we found any slot, then pointer. Otherwise try to add.
                    //if (slot != -1 || (this.isOverNodePoint(node, e.canvasX, e.canvasY, 0, 30, 30, 10)))
                    //{
                    //	this.setCursor("pointer");
                    //}
                }

                //Search for corner
                if(this.canvas)
                {
                    //if( LUtil.isInsideRectangle(e.canvasX, e.canvasY, node.pos[0] + node.size[0] - 5, node.pos[1] + node.size[1] - 5 ,5,5 ))
                    //	this.canvas.style.cursor = "se-resize";
                    //else
                    //	this.canvas.style.cursor = "crosshair";
                }
            }
            else
            {
                //Clear the cursor because nothing interesting
                //this.setCursor();
            }
            //else if(this.canvas)
                

            if(this.node_capturing_input && this.node_capturing_input != node && this.node_capturing_input.onMouseMove)
            {
                this.node_capturing_input.onMouseMove(e);
            }


            if(this.node_dragged && !this.live_mode)
            {
                this.setCursor('grabbing');
                for(var i in this.selected_nodes)
                {
                    var n = this.selected_nodes[i];
                    n.pos[0] += delta[0] / this.ds.scale;
                    n.pos[1] += delta[1] / this.ds.scale;
                }

                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
                if (this.onNodeDragged)
                    this.onNodeDragged(node);
            }

            if (this.slot_dragged_node) {
                this.setCursor('grabbing');
                this.slot_dragged_offset += delta[1] / (this.ds.scale);			
                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
                
                let title_height = this.slot_dragged_node.getTitleHeight() || this.instance.NODE_TITLE_HEIGHT;

                //limit the offset
                let slopos  = this.slot_dragged_node.getConnectionPos(this.slot_dragged_side == this.instance.INPUT, this.slot_dragged);
                let relpos 	= LUtil.clamp(this.slot_dragged_offset + (slopos[1] - this.slot_dragged_node.pos[1]), title_height - 8, this.slot_dragged_node.size[1] - title_height + 8);
                this.slot_dragged_offset = relpos - (slopos[1] - this.slot_dragged_node.pos[1]);
        
                let premove = this.slot_dragged_node.getSlotInPosition( slopos[0], slopos[1] + this.slot_dragged_offset + (this.slot_dragged_offset > 0 ? -4 : 4));
                if (premove && premove.slot != this.slot_dragged) {
                    
                    let posmove = premove.slot +  (this.slot_dragged_offset > 0 ? 1 : 0);
                    if ((this.slot_dragged_side == this.instance.INPUT && this.slot_dragged_node.shiftInput(this.slot_dragged, posmove)) || (this.slot_dragged_side == this.instance.OUTPUT && this.slot_dragged_node.shiftOutput(this.slot_dragged, posmove))) {
                        this.slot_dragged = premove.slot;
                        this.slot_dragged_offset += 16 * (this.slot_dragged_offset > 0 ? -1 : 1);	
                    }
                }
            }

            if(this.resizing_node && !this.live_mode)
            {
                //convert mouse to node space
                this.resizing_node.size[0] = e.canvasX - this.resizing_node.pos[0];
                this.resizing_node.size[1] = e.canvasY - this.resizing_node.pos[1];

                //constraint size
                var max_slots = Math.max( this.resizing_node.inputs ? this.resizing_node.inputs.length : 0, this.resizing_node.outputs ? this.resizing_node.outputs.length : 0);
                var min_height = max_slots * this.instance.NODE_SLOT_HEIGHT + ( this.resizing_node.widgets ? this.resizing_node.widgets.length : 0 ) * (this.instance.NODE_WIDGET_HEIGHT + 4 ) + 4;
                if(this.resizing_node.size[1] < min_height )
                    this.resizing_node.size[1] = min_height;
                if(this.resizing_node.size[0] < this.instance.NODE_MIN_WIDTH)
                    this.resizing_node.size[0] = this.instance.NODE_MIN_WIDTH;

                //this.canvas.style.cursor = "se-resize";
                this.setCursor("se-resize");
                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
            }
        }

        //Commented out to fix the document handler shit
        //e.preventDefault();
        return false;
    }

    /**
    * Called when a mouse up event has to be processed
    * @method processMouseUp
    **/
    processMouseUp(e)
    {
        if(!this.graph)
            return;

        if (this.graph.history) this.graph.history.createGroup(this.graph);

        var window = this.getCanvasWindow();
        var document = window.document;
        // this.#activate();
        

        //Reset our velocities
        if (this.connecting_node)
            this.node_dragged_velocity = [0, 0];

        this.setCursor();


        //restore the mousemove event back to the canvas
        //Dont know what this did so I just removed it
        //TODO: This breaks the node creation but not having it breaks the page
        //document.removeEventListener("mousemove", this._mousemove_callback, true );
        //this.canvas.addEventListener("mousemove", this._mousemove_callback, true);
        //document.removeEventListener("mouseup", this._mouseup_callback, true );

        this.adjustMouseEvent(e);
        var now = this.instance.getTime();
        e.click_time = (now - this.last_mouseclick);
        this.last_mouse_dragging = false;

        if (e.which == 1) //left button
        {
            this.node_widget = null;

            if( this.selected_group )
            {
                var diffx = this.selected_group.pos[0] - Math.round( this.selected_group.pos[0] );
                var diffy = this.selected_group.pos[1] - Math.round( this.selected_group.pos[1] );
                this.selected_group.move( diffx, diffy, e.ctrlKey );
                this.selected_group.pos[0] = Math.round( this.selected_group.pos[0] );
                this.selected_group.pos[1] = Math.round( this.selected_group.pos[1] );
                if( this.selected_group._nodes.length )
                    this.dirty_canvas = true;
                this.selected_group = null;
            }
            this.selected_group_resizing = false;

            if( this.dragging_rectangle )
            {
                if(this.graph)
                {
                    var nodes = this.graph._nodes;
                    var node_bounding = new Float32Array(4);
                    this.deselectAllNodes();
                    //compute bounding and flip if left to right
                    var w = Math.abs( this.dragging_rectangle[2] );
                    var h = Math.abs( this.dragging_rectangle[3] );
                    var startx = this.dragging_rectangle[2] < 0 ? this.dragging_rectangle[0] - w : this.dragging_rectangle[0];
                    var starty = this.dragging_rectangle[3] < 0 ? this.dragging_rectangle[1] - h : this.dragging_rectangle[1];
                    this.dragging_rectangle[0] = startx; this.dragging_rectangle[1] = starty; this.dragging_rectangle[2] = w; this.dragging_rectangle[3] = h;

                    //test against all nodes (not visible because the rectangle maybe start outside
                    var to_select = [];
                    for(var i = 0; i < nodes.length; ++i)
                    {
                        var node = nodes[i];
                        node.getBounding( node_bounding );
                        if(!LUtil.overlapBounding( this.dragging_rectangle, node_bounding ))
                            continue; //out of the visible area
                        to_select.push(node);
                    }
                    if(to_select.length)
                        this.selectNodes(to_select);
                }
                this.dragging_rectangle = null;
            }
            else if(this.connecting_node) //dragging a connection
            {
                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;

                var node = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visible_nodes );

                //node below mouse
                if(node)
                {
                    try 
                    {
                        //CONNECTS NODES TOGETHER
                        //if( this.connecting_output.type == this.instance.EVENT && this.isOverNodeBox( node, e.canvasX, e.canvasY ) )
                        //{
                        //    this.connecting_node.connect( this.connecting_slot, node, this.instance.EVENT, this.connecting_anchors );
                        //}
                        //else
                        {
                            //slot below mouse? connect
                            var slot = this.isOverNodeInput(node, e.canvasX, e.canvasY);
                            if(slot != -1)
                            {
                                this.connecting_node.connect(this.connecting_slot, node, slot, this.connecting_anchors);
                            }
                            else
                            { //not on top of an input
                                var input = node.getInputInfo(0);
                                //auto connect
                                if(this.connecting_output.type == this.instance.EVENT)
                                    this.connecting_node.connect( this.connecting_slot, node, this.instance.EVENT );
                                else
                                    if(input && !input.link && this.instance.isValidConnection( input.type && this.connecting_output.type ) )
                                        this.connecting_node.connect( this.connecting_slot, node, 0, this.connecting_anchors );
                            }
                        }
                    }
                    catch(exception)
                    {
                        console.error("Failed to connect the node", exception);
                        this.connecting_node.disconnectOutput(this.connecting_slot);
                    }
                }
                else
                {   
                    console.log(this.key_shift, this);
                    if (this.key_shift) 
                    {
                        this.showSearchBox(e, {
                            node: this.connecting_node, 
                            id: this.connecting_node.id,
                            slot: this.connecting_slot,
                            type: this.connecting_output.type ,
                        });
                    }
                }

                this.connecting_search_pos = [ this.connecting_pos[0], this.connecting_pos[1] ];
                this.connecting_search_output = this.connecting_output;
                this.connecting_search_node = this.connecting_node;

                this.connecting_pos = null;
                this.connecting_output = null;
                this.connecting_node = null;
                this.connecting_anchors = null;
                this.connecting_slot = -1;
                this._highlight_input = null;
                
                

            }//not dragging connection
            else if(this.resizing_node)
            {
                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
                this.resizing_node = null;
            }
            else if(this.node_dragged) //node being dragged?
            {
                var node = this.node_dragged;
                var title_height = node.getTitleHeight();

                //Collapse the node if we hit the icon
                if( node && e.click_time < 300 && LUtil.isInsideRectangle( e.canvasX, e.canvasY, node.pos[0] + this.instance.NODE_TITLE_TEXT_X, node.pos[1] - title_height + this.instance.NODE_TITLE_TEXT_Y - 10, 10, 10))
                    node.collapse();

                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
                
                this.node_dragged.pos[0] = Math.round(this.node_dragged.pos[0]);
                this.node_dragged.pos[1] = Math.round(this.node_dragged.pos[1]);
                
                if(this.instance.snapToGrid)
                    this.node_dragged.alignToGrid();
                    

                if (this.onNodeDropped)
                    this.onNodeDropped(this.node_dragged);

                this.node_dragged = null;
            }
            else if (this.slot_dragged_node) //slot being dragged?
            {
                var node = this.slot_dragged_node;
                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;

                this.slot_dragged_node = null;
                this.slot_dragged = -1;
                //TODO: Finished Slot Drag
            }
            else //no node being dragged
            {
                //get node over
                var node = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visible_nodes );

                if ( !node && e.click_time < 300 )
                    this.deselectAllNodes();

                this.dirty_canvas = true;
                this.dragging_canvas = false;

                if( this.node_over && this.node_over.onMouseUp )
                    this.node_over.onMouseUp(e, [e.canvasX - this.node_over.pos[0], e.canvasY - this.node_over.pos[1]], this );
                if( this.node_capturing_input && this.node_capturing_input.onMouseUp )
                    this.node_capturing_input.onMouseUp(e, [e.canvasX - this.node_capturing_input.pos[0], e.canvasY - this.node_capturing_input.pos[1]] );
            }
        }
        else if (e.which == 2) //middle button
        {
            //trace("middle");
            this.dirty_canvas = true;
            this.dragging_canvas = false;
        }
        else if (e.which == 3) //right button
        {
            //trace("right");
            this.dirty_canvas = true;
            this.dragging_canvas = false;
        }

        /*
        if((this.dirty_canvas || this.dirty_bgcanvas) && this.rendering_timer_id == null)
            this.draw();
        */

        this.graph.change();

        ////l e.stopPropagation();
        this.key_shift = false;
        //e.preventDefault();
        return false;
    }

    /**
    * Called when a mouse wheel event has to be processed
    * @method processMouseWheel
    **/
    processMouseWheel(e)
    {
        if(!this.graph || !this.allow_dragcanvas)
            return;

        var delta = (e.wheelDeltaY != null ? e.wheelDeltaY : e.detail * -60);

        this.adjustMouseEvent(e, false);

        var scale = this.ds.scale;

        if (delta > 0)
            scale *= 1.1;
        else if (delta < 0)
            scale *= 1/(1.1);

        //this.setZoom( scale, [ e.localX, e.localY ] );
        this.ds.changeScale( scale, [ e.localX, e.localY ] );

        this.graph.change();

        e.preventDefault();
        return false; // prevent default
    }

    /**
    * returns true if a position (in graph space) is on top of a node little corner box
    * @method isOverNodeBox
    **/
    isOverNodeBox( node, canvasx, canvasy )
    {
        var title_height = node.getTitleHeight();
        if( LUtil.isInsideRectangle( canvasx, canvasy, node.pos[0] + 2, node.pos[1] + 2 - title_height, title_height - 4, title_height - 4) )
            return true;
        return false;
    }

    /**
    * returns the slot if the position (in graph space) is on top of a node output slot.
    * @param slot_pos The position of the slot that was found.
    * @method isOverNodeInput
    **/
    isOverNodeOutput(node, canvasx, canvasy, slot_pos)
    {
        if (node.outputs)
        {
            for(var i = 0, l = node.outputs.length; i < l; ++i)
            {
                var input = node.outputs[i];
                var link_pos = node.getConnectionPos(false, i);
                var is_inside = false;
                if( node.horizontal )
                    is_inside = LUtil.isInsideRectangle(canvasx, canvasy, link_pos[0] - 5, link_pos[1] - 10, 10,20)
                else
                    is_inside = LUtil.isInsideRectangle(canvasx, canvasy, link_pos[0] - 10, link_pos[1] - 5, 40,10)
                if(is_inside)
                {
                    if(slot_pos)
                    {
                        slot_pos[0] = link_pos[0];
                        slot_pos[1] = link_pos[1];
                    }
                    return i;
                }
            }
        }

        return -1;
    }

    /**
    * returns the slot if the position (in graph space) is on top of a node input slot.
    * @param slot_pos The position of the slot that was found.
    * @method isOverNodeInput
    **/
    isOverNodeInput(node, canvasx, canvasy, slot_pos )
    {
        if(node.inputs)
            for(var i = 0, l = node.inputs.length; i < l; ++i)
            {
                var input = node.inputs[i];
                var link_pos = node.getConnectionPos( true, i );
                var is_inside = false;
                if( node.horizontal )
                    is_inside = LUtil.isInsideRectangle(canvasx, canvasy, link_pos[0] - 5, link_pos[1] - 10, 10,20)
                else
                    is_inside = LUtil.isInsideRectangle(canvasx, canvasy, link_pos[0] - 10, link_pos[1] - 5, 40,10)
                if(is_inside)
                {
                    if(slot_pos)
                    {
                        slot_pos[0] = link_pos[0];
                        slot_pos[1] = link_pos[1];
                    }
                    return i;
                }
            }
        return -1;
    }

    isOverNodePoint(node, canvasx, canvasy, x, y, width, height )
    {
        return LUtil.isInsideRectangle(canvasx, canvasy, node.pos[0] + x, node.pos[1] + y, width, height);
    }


    /**
    * process a key event
    * @method processKey
    **/
    processKey(e)
    {
        //console.log(e); //debug

        if(!this.graph)
            return;

        var block_default = false;

        if(e.target.localName == "input")
            return;

        if(e.type == "keydown")
        {
            if(e.keyCode == 32) //esc
            {
                this.dragging_canvas = true;
                block_default = true;
            }
            
            if(e.key == 'Shift')
                this.key_shift = true;

            if (this.graph.history && e.ctrlKey && e.key == 'z') {
                if (e.shiftKey) this.graph.history.redo(); 
                else this.graph.history.undo();
            }

            if (this.graph.history && e.ctrlKey && e.key == 'y')
                this.graph.history.redo();


            //select all Control A
            if(e.keyCode == 65 && e.ctrlKey)
            {
                this.selectNodes();
                block_default = true;
            }

            if(e.code == "KeyC" && (e.metaKey || e.ctrlKey) && !e.shiftKey ) //copy
            {
                if(this.selected_nodes)
                {
                    this.copyToClipboard();
                    block_default = true;
                }
            }

            if(e.code == "KeyV" && (e.metaKey || e.ctrlKey) && !e.shiftKey ) //paste
            {
                this.pasteFromClipboard();
            }

            //delete or backspace
            if(e.keyCode == 46 || e.keyCode == 8)
            {
                if(e.target.localName != "input" && e.target.localName != "textarea")
                {
                    this.deleteSelectedNodes();
                    block_default = true;
                }
            }

            //collapse
            //...

            //TODO
            if(this.selected_nodes)
                for (var i in this.selected_nodes)
                    if(this.selected_nodes[i].onKeyDown)
                        this.selected_nodes[i].onKeyDown(e);
        }
        //else if( e.type == "keyup" )
        if( e.type == "keyup" )
        {
            if(e.keyCode == 32)
                this.dragging_canvas = false;

            if(e.key == 'Shift')
                this.key_shift = false;

            if(this.selected_nodes) 
                for (var i in this.selected_nodes)
                    if(this.selected_nodes[i].onKeyUp)
                        this.selected_nodes[i].onKeyUp(e);
                        
            //if (this.connecting_node && e.code == 'Space')
            if (e.key == 't')
            {
                this.showSearchBox( e );
            }
        }

        this.graph.change();

        if(block_default)
        {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
        }
    }

    copyToClipboard()
    {
        var clipboard_info = {
            nodes: [],
            links: []
        };
        var index = 0;
        var selected_nodes_array = [];
        for(var i in this.selected_nodes)
        {
            var node = this.selected_nodes[i];
            node._relative_id = index;
            selected_nodes_array.push( node );
            index += 1;
        }

        for(var i = 0; i < selected_nodes_array.length; ++i)
        {
            var node = selected_nodes_array[i];
            clipboard_info.nodes.push( node.clone().serialize() );
            if(node.inputs && node.inputs.length)
                for(var j = 0; j < node.inputs.length; ++j)
                {
                    var input = node.inputs[j];
                    if(!input || input.link == null)
                        continue;
                    var link_info = this.graph.links[ input.link ];
                    if(!link_info)
                        continue;
                    var target_node = this.graph.getNodeById( link_info.origin_id );
                    if(!target_node || !this.selected_nodes[ target_node.id ] ) //improve this by allowing connections to non-selected nodes
                        continue; //not selected
                    clipboard_info.links.push([ target_node._relative_id, j, node._relative_id, link_info.target_slot ]);
                }
        }
        localStorage.setItem( "litegrapheditor_clipboard", JSON.stringify( clipboard_info ) );
    }

    pasteFromClipboard()
    {
        var data = localStorage.getItem( "litegrapheditor_clipboard" );
        if(!data)
            return;

        //create nodes
        var clipboard_info = JSON.parse(data);
        var nodes = [];
        for(var i = 0; i < clipboard_info.nodes.length; ++i)
        {
            var node_data = clipboard_info.nodes[i];
            var node = this.instance.createNode( node_data.type );
            if(node)
            {
                node.configure(node_data);
                node.pos[0] += 5;
                node.pos[1] += 5;
                this.graph.add( node );
                nodes.push( node );
            }
        }

        //create links
        for(var i = 0; i < clipboard_info.links.length; ++i)
        {
            var link_info = clipboard_info.links[i];
            var origin_node = nodes[ link_info[0] ];
            var target_node = nodes[ link_info[2] ];
            origin_node.connect( link_info[1], target_node, link_info[3] );
        }

        this.selectNodes( nodes );
    }

    /**
    * process a item drop event on top the canvas
    * @method processDrop
    **/
    processDrop(e)
    {
        e.preventDefault();
        this.adjustMouseEvent(e);


        var pos = [e.canvasX,e.canvasY];
        var node = this.graph.getNodeOnPos(pos[0],pos[1]);

        if(!node)
        {
            var r = null;
            if(this.onDropItem)
                r = this.onDropItem( event );
            if(!r)
                this.checkDropItem(e);
            return;
        }

        if( node.onDropFile || node.onDropData )
        {
            var files = e.dataTransfer.files;
            if(files && files.length)
            {
                for(var i=0; i < files.length; i++)
                {
                    var file = e.dataTransfer.files[0];
                    var filename = file.name;
                    var ext = LiteCanvas.getFileExtension( filename );
                    //console.log(file);

                    if(node.onDropFile)
                        node.onDropFile(file);

                    if(node.onDropData)
                    {
                        //prepare reader
                        var reader = new FileReader();
                        reader.onload = function (event) {
                            //console.log(event.target);
                            var data = event.target.result;
                            node.onDropData( data, filename, file );
                        };

                        //read data
                        var type = file.type.split("/")[0];
                        if(type == "text" || type == "")
                            reader.readAsText(file);
                        else if (type == "image")
                            reader.readAsDataURL(file);
                        else
                            reader.readAsArrayBuffer(file);
                    }
                }
            }
        }

        if(node.onDropItem)
        {
            if( node.onDropItem( event ) )
                return true;
        }

        if(this.onDropItem)
            return this.onDropItem( event );

        return false;
    }

    //called if the graph doesn't have a default drop item behaviour
    checkDropItem(e)
    {
        if(e.dataTransfer.files.length)
        {
            var file = e.dataTransfer.files[0];
            var ext = LiteCanvas.getFileExtension( file.name ).toLowerCase();
            var nodetype = this.instance.node_types_by_file_extension[ext];
            if(nodetype)
            {
                var node = this.instance.createNode( nodetype.type );
                node.pos = [e.canvasX, e.canvasY];
                this.graph.add( node );
                if( node.onDropFile )
                    node.onDropFile( file );
            }
        }
    }


    processNodeDblClicked(n)
    {
        if(this.onShowNodePanel)
            this.onShowNodePanel(n);

        if(this.onNodeDblClicked)
            this.onNodeDblClicked(n);

        this.setDirty(true);
    }

    processNodeSelected(node,e)
    {
        this.selectNode( node, e && e.shiftKey );
        if(this.onNodeSelected)
            this.onNodeSelected(node);
    }

    processNodeDeselected(node)
    {
        this.deselectNode(node);
        if(this.onNodeDeselected)
            this.onNodeDeselected(node);
    }

    /**
    * selects a given node (or adds it to the current selection)
    * @method selectNode
    **/
    selectNode( node, add_to_current_selection )
    {
        if(node == null)
            this.deselectAllNodes();
        else
            this.selectNodes([node], add_to_current_selection );
    }

    /**
    * selects several nodes (or adds them to the current selection)
    * @method selectNodes
    **/
    selectNodes( nodes, add_to_current_selection )
    {
        if(!add_to_current_selection)
            this.deselectAllNodes();

        nodes = nodes || this.graph._nodes;
        for(var i = 0; i < nodes.length; ++i)
        {
            var node = nodes[i];
            if(node.is_selected)
                continue;

            if( !node.is_selected && node.onSelected )
                node.onSelected();
            node.is_selected = true;
            
            this.selected_nodes[ node.id ] = node;

            if(node.inputs)
                for(var j = 0; j < node.inputs.length; ++j)
                    this.highlighted_links[ node.inputs[j].link ] = true;
            if(node.outputs)
                for(var j = 0; j < node.outputs.length; ++j)
                {
                    var out = node.outputs[j];
                    if( out.links )
                        for(var k = 0; k < out.links.length; ++k)
                            this.highlighted_links[ out.links[k] ] = true;
                }

        }

        this.emit('nodes:selected', this.selected_nodes);
        this.setDirty(true);
    }

    /**
    * removes a node from the current selection
    * @method deselectNode
    **/
    deselectNode( node )
    {
        if(!node.is_selected)
            return;
        if(node.onDeselected)
            node.onDeselected();
        node.is_selected = false;

        //remove highlighted
        if(node.inputs)
            for(var i = 0; i < node.inputs.length; ++i)
                delete this.highlighted_links[ node.inputs[i].link ];
        if(node.outputs)
            for(var i = 0; i < node.outputs.length; ++i)
            {
                var out = node.outputs[i];
                if( out.links )
                    for(var j = 0; j < out.links.length; ++j)
                        delete this.highlighted_links[ out.links[j] ];
            }
            
        this.emit('nodes:deslected', node);
    }

    /**
    * removes all nodes from the current selection
    * @method deselectAllNodes
    **/
    deselectAllNodes()
    {
        if(!this.graph)
            return;
        var nodes = this.graph._nodes;
        for(var i = 0, l = nodes.length; i < l; ++i)
        {
            var node = nodes[i];
            if(!node.is_selected)
                continue;
            if(node.onDeselected)
                node.onDeselected();
            node.is_selected = false;
        }
        this.selected_nodes = {};
        this.highlighted_links = {};
        this.emit('nodes:deslected', nodes);
        this.setDirty(true);
    }

    /**
    * deletes all nodes in the current selection from the graph
    * @method deleteSelectedNodes
    **/
    deleteSelectedNodes()
    {
        for(var i in this.selected_nodes)
        {
            var m = this.selected_nodes[i];
            //if(m == this.node_in_panel) this.showNodePanel(null);
            this.graph.remove(m);
        }
        this.selected_nodes = {};
        this.highlighted_links = {};
        this.emit('nodes:deleted', this.selected_nodes);
        this.setDirty(true);
    }

    /**
    * centers the camera on a given node
    * @method centerOnNode
    **/
    centerOnNode(node)
    {
        this.ds.offset[0] = -node.pos[0] - node.size[0] * 0.5 + (this.canvas.width * 0.5 / this.ds.scale);
        this.ds.offset[1] = -node.pos[1] - node.size[1] * 0.5 + (this.canvas.height * 0.5 / this.ds.scale);
        this.setDirty(true,true);
    }

    /**
    * adds some useful properties to a mouse event, like the position in graph coordinates
    * @method adjustMouseEvent
    **/
    adjustMouseEvent(e, updateDelta = true)
    {
        if(this.canvas)
        {
            var b = this.canvas.getBoundingClientRect();
            e.localX = e.clientX - b.left;
            e.localY = e.clientY - b.top;
        }
        else
        {
            e.localX = e.clientX;
            e.localY = e.clientY;
        }

        if (updateDelta) { 
            e.deltaX = e.localX - this.last_mouse_position[0];
            e.deltaY = e.localY - this.last_mouse_position[1];
        }

        this.last_mouse_position[0] = e.localX;
        this.last_mouse_position[1] = e.localY;

        e.canvasX = e.localX / this.ds.scale - this.ds.offset[0];
        e.canvasY = e.localY / this.ds.scale - this.ds.offset[1];
    }

    resetZoom() {
        this.setZoom(1, null)
    }

    /**
    * changes the zoom level of the graph (default is 1), you can pass also a place used to pivot the zoom
    * @method setZoom
    **/
    setZoom(value, zooming_center)
    {
        this.ds.changeScale( value, zooming_center);
        /*
        if(!zooming_center && this.canvas)
            zooming_center = [this.canvas.width * 0.5,this.canvas.height * 0.5];

        var center = this.convertOffsetToCanvas( zooming_center );

        this.ds.scale = value;

        if(this.scale > this.max_zoom)
            this.scale = this.max_zoom;
        else if(this.scale < this.min_zoom)
            this.scale = this.min_zoom;

        var new_center = this.convertOffsetToCanvas( zooming_center );
        var delta_offset = [new_center[0] - center[0], new_center[1] - center[1]];

        this.offset[0] += delta_offset[0];
        this.offset[1] += delta_offset[1];
        */

        this.dirty_canvas = true;
        this.dirty_bgcanvas = true;
    }

    /**
    * converts a coordinate from graph coordinates to canvas2D coordinates
    * @method convertOffsetToCanvas
    **/
    convertOffsetToCanvas( pos, out )
    {
        return this.ds.convertOffsetToCanvas( pos, out );
    }

    /**
    * converts a coordinate from Canvas2D coordinates to graph space
    * @method convertCanvasToOffset
    **/
    convertCanvasToOffset( pos, out )
    {
        return this.ds.convertCanvasToOffset( pos, out );
    }

    //converts event coordinates from canvas2D to graph coordinates
    convertEventToCanvasOffset(e)
    {
        var rect = this.canvas.getBoundingClientRect();
        return this.convertCanvasToOffset([e.clientX - rect.left, e.clientY - rect.top]);
    }

    /**
    * brings a node to front (above all other nodes)
    * @method bringToFront
    **/
    bringToFront(node)
    {
        var i = this.graph._nodes.indexOf(node);
        if(i == -1) return;

        this.graph._nodes.splice(i,1);
        this.graph._nodes.push(node);
    }

    /**
    * sends a node to the back (below all other nodes)
    * @method sendToBack
    **/
    sendToBack(node)
    {
        var i = this.graph._nodes.indexOf(node);
        if(i == -1) return;

        this.graph._nodes.splice(i,1);
        this.graph._nodes.unshift(node);
    }

    /* Interaction */

    /**
    * checks which nodes are visible (inside the camera area)
    * @method computeVisibleNodes
    **/
    computeVisibleNodes( nodes, out )
    {
        var temp = new Float32Array(4);

        var visible_nodes = out || [];
        visible_nodes.length = 0;
        nodes = nodes || this.graph._nodes;
        for(var i = 0, l = nodes.length; i < l; ++i)
        {
            var n = nodes[i];

            //skip rendering nodes in live mode
            if( this.live_mode && !n.onDrawBackground && !n.onDrawForeground )
                continue;

            if(!LUtil.overlapBounding( this.visible_area, n.getBounding( temp ) ))
                continue; //out of the visible area

            visible_nodes.push(n);
        }
        return visible_nodes;
    }

    /**
    * renders the whole canvas content, by rendering in two separated canvas, one containing the background grid and the connections, and one containing the nodes)
    * @method draw
    **/
    draw(force_canvas, force_bgcanvas)
    {
        if(!this.canvas) return;

        //fps counting
        var now = this.instance.getTime();
        this.render_time = (now - this.last_draw_time)*0.001;
        this.last_draw_time = now;

        //Clear the tooltip
        this.tooltip.content = null;

        if(this.graph)
            this.ds.computeVisibleArea();

        if(this.dirty_bgcanvas || force_bgcanvas || this.always_render_background || (this.graph && this.graph._last_trigger_time && (now - this.graph._last_trigger_time) < 1000) )
            this.drawBackCanvas();

        if(this.frame < 120 || this.dirty_canvas || force_canvas)
            this.drawFrontCanvas();


        this.fps = this.render_time ? (1.0 / this.render_time) : 0;
        this.frame += 1;

        if (this.animated_links) 
        {
            if (!LUtil.isEpsilon(this.node_dragged_velocity[0]) || !LUtil.isEpsilon(this.node_dragged_velocity[1])) 
            {
                this.node_dragged_velocity[0] /= this.decelleration;
                this.node_dragged_velocity[1] /= this.decelleration;
                this.setDirty(true, true);
            }
        }
    }


    /**
    * draws the front canvas (the one containing all the nodes)
    * @method drawFrontCanvas
    **/
    drawFrontCanvas()
    {
        this.dirty_canvas = false;

        if(!this.ctx)
            this.ctx = this.bgcanvas.getContext("2d");
        var ctx = this.ctx;
        if(!ctx) //maybe is using webgl...
            return;

        if(ctx.start2D)
            ctx.start2D();

        var canvas = this.canvas;

        //reset in case of error
        ctx.restore();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        //clip dirty area if there is one, otherwise work in full canvas
        if(this.dirty_area)
        {
            ctx.save();
            ctx.beginPath();
            ctx.rect(this.dirty_area[0],this.dirty_area[1],this.dirty_area[2],this.dirty_area[3]);
            ctx.clip();
        }

        //clear
        //canvas.width = canvas.width;
        if(this.clear_background)
            ctx.clearRect(0,0,canvas.width, canvas.height);

        //draw bg canvas
        if(this.bgcanvas == this.canvas)
            this.drawBackCanvas();
        else
            ctx.drawImage(this.bgcanvas,0,0);

        if (this.drawVelocity) {
            ctx.beginPath();
            ctx.arc(this.last_mouse_position[0], this.last_mouse_position[1], 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.moveTo(this.last_mouse_position[0], this.last_mouse_position[1]);
            ctx.lineTo(this.last_mouse_position[0] + this.node_dragged_velocity[0], 
                        this.last_mouse_position[1] + this.node_dragged_velocity[1]);
            ctx.stroke();
        }


        //rendering
        if(this.onRender)
            this.onRender(canvas, ctx);

        //info widget
        if(this.show_info)
            this.renderInfo(ctx);

        if(this.graph)
        {
            //apply transformations
            ctx.save();
            this.ds.toCanvasContext( ctx );

            //draw nodes
            var drawn_nodes = 0;
            var visible_nodes = this.computeVisibleNodes( null, this.visible_nodes );

            for (var i = 0; i < visible_nodes.length; ++i)
            {
                var node = visible_nodes[i];

                //transform coords system
                ctx.save();
                ctx.translate( node.pos[0], node.pos[1] );

                //Draw
                this.drawNode( node, ctx );
                drawn_nodes += 1;

                //Restore
                ctx.restore();
            }

            //on top (debug)
            if( this.render_execution_order)
                this.drawExecutionOrder(ctx);


            //connections ontop?
            if(this.links_ontop)
                if(!this.live_mode)
                    this.drawConnections(ctx);

            //current connection (the one being dragged by the mouse)
            if(this.connecting_pos != null)
            {
                ctx.lineWidth = this.connections_width;
                var link_style =  this.instance.getTypeStyle(this.connecting_output.type);
                var link_color = link_style.color_on || link_style.color_on;
                this.setCursor('grabbing');

                //switch( this.connecting_output.type )
                //{
                //	case this.instance.EVENT: link_color = this.instance.EVENT_LINK_COLOR; break;
                //	default:
                //		link_color = this.instance.CONNECTING_LINK_COLOR;
                //}
                
                //the connection being dragged by the mouse
            
                if(this._highlight_input)
                {
                    //ctx.fillStyle = "#ffcc00";
                    //ctx.beginPath();
                    //ctx.arc( this._highlight_input[0], this._highlight_input[1],6,0,Math.PI*2);
                    //ctx.fill();

                    ////By updating the canvas mouse here, we get a snappign effect
                    //if (LUtil.magnitude(this.node_dragged_velocity) < 20) 
                    //{
                    //    this.canvas_mouse[0] = this._highlight_input[0];
                    //    this.canvas_mouse[1]  = this._highlight_input[1];
                    //}
                }

                if (this.connecting_anchors && this.connecting_anchors.length > 0)
                {
                    for(var i = 0; i < this.connecting_anchors.length; i++) 
                    {
                        let anchor = this.connecting_anchors[i];
                        this.renderLink(ctx,  i == 0 ? this.connecting_pos : this.connecting_anchors[i - 1],  anchor, 
                            null, false, null, link_color, 
                            this.connecting_output.dir || (this.connecting_node.horizontal ? this.instance.DOWN : this.instance.RIGHT), this.instance.CENTER );
                    }

                    this.renderLink(ctx,  this.connecting_anchors[ this.connecting_anchors.length - 1],  this.canvas_mouse, 
                        null, false, null, link_color, 
                        this.connecting_output.dir || (this.connecting_node.horizontal ? this.instance.DOWN : this.instance.RIGHT), this.instance.CENTER );
                }
                else
                {
                    this.renderLink( ctx, this.connecting_pos, [ this.canvas_mouse[0], this.canvas_mouse[1] ], null, false, null, link_color, this.connecting_output.dir || (this.connecting_node.horizontal ? this.instance.DOWN : this.instance.RIGHT), this.instance.CENTER );
                }

                
                this.drawSlotShape(ctx, link_style, this.connecting_pos, true, true, false);
                this.drawSlotShape(ctx, link_style, [ this.canvas_mouse[0], this.canvas_mouse[1] ], true, false, true, 2);
            
                //ctx.beginPath();
                //    if (this.connecting_output.shape === this.instance.BOX_SHAPE )
                //        ctx.rect( (this.connecting_pos[0] - 6) + 0.5, (this.connecting_pos[1] - 5) + 0.5,14,10);
                //    else
                //        ctx.arc( this.connecting_pos[0], this.connecting_pos[1],4,0,Math.PI*2);
                //ctx.fill();            
            }
            
            if (this.search_box) {
                ctx.lineWidth = this.connections_width;
                var link_style =  this.instance.getTypeStyle(this.connecting_search_output.type);
                var link_color = link_style.color_on || link_style.color_on;
                this.node_dragged_velocity = [0,0];
                this.renderLink( ctx, this.connecting_search_pos, [ this.search_box.clientX, this.search_box.clientY  ], null, false, null, link_color, this.connecting_search_output.dir || (this.connecting_search_node.horizontal ? this.instance.DOWN : this.instance.RIGHT), this.instance.CENTER );
                this.drawSlotShape(ctx, link_style, this.connecting_search_pos, true, true, false);
                this.drawSlotShape(ctx, link_style, [ this.search_box.clientX, this.search_box.clientY  ] , true, false, true, 2);
            }

            if( this.dragging_rectangle )
            {
                
                //[line width, space width]
                ctx.setLineDash([ 5 ]);   
                ctx.lineDashOffset = this.instance.getTime() * 0.05;            
                ctx.strokeStyle = "#f48942";
                ctx.lineWidth = 1;
                ctx.strokeRect( this.dragging_rectangle[0], this.dragging_rectangle[1], this.dragging_rectangle[2], this.dragging_rectangle[3] );
                this.dirty_canvas = true;
            }

            if( this.onDrawForeground )
                this.onDrawForeground( ctx, this.visible_rect );

                
            //draw the tooltip
            if (this.tooltip.content)
            {
                ctx.fillStyle = "#FFF";
                ctx.rect(this.tooltip.x, this.tooltip.y, 250, 25);
                ctx.fill();
                
                ctx.fillStyle = "#000";
                ctx.fillText(this.tooltip.x + ", " + this.tooltip.y , this.tooltip.x, this.tooltip.y);
            }
            
            ctx.restore();
            
        }


        if( this.onDrawOverlay )
            this.onDrawOverlay( ctx );

        if(this.dirty_area)
        {
            ctx.restore();
            //this.dirty_area = null;
        }
        
        //outline        
        if (LiteCanvas.active === this) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 3;
            ctx.strokeRect(1,1,canvas.width-4,canvas.height-4);
            ctx.lineWidth = 1;
        }

        if(ctx.finish2D) //this is a function I use in webgl renderer
            ctx.finish2D();
    }

    /**
    * draws some useful stats in the corner of the canvas
    * @method renderInfo
    **/
    renderInfo( ctx, x, y )
    {
        x = x || 0;
        y = y || 0;

        ctx.save();
        ctx.translate( x, y );

        ctx.font = "10px Arial";
        ctx.fillStyle = "#888";
        if(this.graph)
        {
            ctx.fillText( "T: " + this.graph.globaltime.toFixed(2)+"s",5,13*1 );
            ctx.fillText( "I: " + this.graph.iteration,5,13*2 );
            ctx.fillText( "N: " + this.graph._nodes.length + " [" + this.visible_nodes.length + "]",5,13*3  );
            ctx.fillText( "V: " + this.graph._version,5,13*4 );
            ctx.fillText( "FPS:" + this.fps.toFixed(2),5,13*5 );
            
            if (this.graph.history && this.render_history) 
            {
                let history = this.graph.history.getCurrent();
                if (history._history)
                {
                    let ysize = 15;
                    let index = 6;

                    if (history._redoGroup && history._redoGroup.actions.length > 0)
                        index = this.drawHistoryGroup(ctx, history._redoGroup, 5, index, ysize, "R");

                    if (history._group && history._group.actions.length > 0)
                        index = this.drawHistoryGroup(ctx, history._group, 5, index, ysize, "-1");

                    for (var h = 0; h < history._history.length; h++)
                    {
                        let group = history._history[history._history.length - 1 - h];
                        index = this.drawHistoryGroup(ctx, group, 5, index, ysize, h);
                    }
                }
            }

        }
        else
            ctx.fillText( "No graph selected",5,13*1 );
        ctx.restore();
    }

    drawHistoryGroup(ctx, group, x, yindex, ysize, title) 
    {
        if (group == null) return;
        //ctx.fillText( title + ":" + group.id, x, yindex++ * ysize);
        //for (var a in group.actions) ctx.fillText(group.actions[a].i + ":" + group.actions[a].e, x + 3, yindex++ * ysize);   
        ctx.fillText( title + ":", x, yindex++ * ysize); 
        for (var a in group.actions) ctx.fillText("-" + group.actions[a].e, x + 5, yindex++ * ysize);    
        return yindex;
    }

    /**
    * draws the back canvas (the one containing the background and the connections)
    * @method drawBackCanvas
    **/
    drawBackCanvas()
    {
        var canvas = this.bgcanvas;
        if(canvas.width != this.canvas.width ||
            canvas.height != this.canvas.height)
        {
            canvas.width = this.canvas.width;
            canvas.height = this.canvas.height;
        }

        if(!this.bgctx)
            this.bgctx = this.bgcanvas.getContext("2d");
        var ctx = this.bgctx;
        if(ctx.start)
            ctx.start();

        //clear
        if(this.clear_background)
            ctx.clearRect(0,0,canvas.width, canvas.height);

        if(this._graph_stack && this._graph_stack.length)
        {
            ctx.save();
            var parent_graph = this._graph_stack[ this._graph_stack.length - 1];
            var subgraph_node = this.graph._subgraph_node;
            ctx.strokeStyle = subgraph_node.bgcolor;
            ctx.lineWidth = 10;
            ctx.strokeRect(1,1,canvas.width-2,canvas.height-2);
            ctx.lineWidth = 1;
            ctx.font = "40px Arial"
            ctx.textAlign = "center";
            ctx.fillStyle = subgraph_node.bgcolor || "#AAA";
            var title = "";
            for(var i = 1; i < this._graph_stack.length; ++i)
                title += this._graph_stack[i]._subgraph_node.getTitle() + " >> ";
            ctx.fillText( title + subgraph_node.getTitle(), canvas.width * 0.5, 40 );
            ctx.restore();
        }

        var bg_already_painted = false;
        if(this.onRenderBackground)
            bg_already_painted = this.onRenderBackground( canvas, ctx );

        //reset in case of error
        ctx.restore();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.visible_links.length = 0;

        if(this.graph)
        {
            //apply transformations
            ctx.save();
            this.ds.toCanvasContext(ctx);

            //render BG
            if(this.background_image && this.ds.scale > 0.5 && !bg_already_painted)
            {
                ctx.globalAlpha = this.editor_alpha;
                if (this.zoom_modify_alpha)
                    ctx.globalAlpha = (1.0 - 0.5 / this.ds.scale) * this.editor_alpha;
                
                    
                ctx.imageSmoothingEnabled = ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = false;
                if(!this._bg_img || this._bg_img.name != this.background_image)
                {
                    this._bg_img = new Image();
                    this._bg_img.name = this.background_image;
                    this._bg_img.src = this.background_image;
                    var that = this;
                    this._bg_img.onload = function() {
                        that.draw(true,true);
                    }
                }

                var pattern = null;
                if(this._pattern == null && this._bg_img.width > 0)
                {
                    pattern = ctx.createPattern( this._bg_img, 'repeat' );
                    this._pattern_img = this._bg_img;
                    this._pattern = pattern;
                }
                else
                    pattern = this._pattern;
                    
                if(pattern)
                {
                    ctx.fillStyle = pattern;
                    ctx.fillRect(this.visible_area[0],this.visible_area[1],this.visible_area[2],this.visible_area[3]);
                    ctx.fillStyle = "transparent";
                }

                ctx.globalAlpha = 1.0;
                ctx.imageSmoothingEnabled = ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = true;
            }

            //groups
            if(this.graph._groups.length && !this.live_mode)
                this.drawGroups(canvas, ctx);

            if( this.onDrawBackground )
                this.onDrawBackground( ctx, this.visible_area );
            if( this.onBackgroundRender ) //LEGACY
            {
                console.error("WARNING! onBackgroundRender deprecated, now is named onDrawBackground ");
                this.onBackgroundRender = null;
            }

            //DEBUG: show clipping area
            //ctx.fillStyle = "red";
            //ctx.fillRect( this.visible_area[0] + 10, this.visible_area[1] + 10, this.visible_area[2] - 20, this.visible_area[3] - 20);

            //bg
            if (this.render_canvas_border) {
                ctx.strokeStyle = "#235";
                ctx.strokeRect(0,0,canvas.width,canvas.height);
            }
            
            let minx = 0;
            let miny = 0;
            let maxx = 0;
            let maxy = 0;

            if (this.render_grid && this.ds.scale > 0.8)
            {
                if (this.render_grid_pattern) {
                    if ((typeof this.render_grid_pattern) == 'string') {
                        let self = this;
                        this.render_grid_image = new Image();
                        this.render_grid_image.src = this.render_grid_pattern;
                        this.render_grid_image.onload = function() {
                            self.render_grid_pattern = ctx.createPattern(this, 'repeat');
                        };

                        this.render_grid_pattern = null;
                    } else {
                        
                        let size = this.instance.CANVAS_GRID_SIZE;
                            
                        if (this.zoom_modify_alpha)
                            ctx.globalAlpha = Math.min(Math.max((this.ds.scale - 0.8)/(1.3-0.8), 0), 1);
                        
                        minx = (Math.ceil(this.visible_area[0] / size) * size) - size;
                        miny = (Math.ceil(this.visible_area[1] / size) * size) - size;
                        maxx = (Math.round(this.visible_area[2]  / size) * size) + size + size;
                        maxy = (Math.round(this.visible_area[3]  / size) * size) + size + size;

                        ctx.imageSmoothingEnabled = false;
                        ctx.fillStyle = this.render_grid_pattern;
                        ctx.fillRect(minx, miny, maxx, maxy);
                        ctx.imageSmoothingEnabled = true;
                    }

                } else {
                    ctx.strokeStyle = "#2a2a2a";
                    let size = this.instance.CANVAS_GRID_SIZE;
                    
                    if (this.zoom_modify_alpha)
                        ctx.globalAlpha = Math.min(Math.max((this.ds.scale - 0.8)/(1.3-0.8), 0), 1);

                    minx = (Math.ceil(this.visible_area[0] / size) * size) - size;
                    miny = (Math.ceil(this.visible_area[1] / size) * size) - size;
                    maxx = minx + (Math.round(this.visible_area[2]  / size) * size) + size + size;
                    maxy = miny + (Math.round(this.visible_area[3]  / size) * size) + size + size;

                    for(let gx = minx; gx < maxx; gx += size)
                    {
                        for(let gy = miny; gy < maxy; gy += size)
                        {
                            ctx.strokeRect(gx, gy, 1, 1);
                        }
                    }
                }
            }

            if(this.render_connections_shadows)
            {
                ctx.shadowColor = "#000";
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.shadowBlur = 6;
            }
            else
                ctx.shadowColor = "rgba(0,0,0,0)";

            //draw connections
            if(!this.live_mode)
                this.drawConnections(ctx);

            ctx.shadowColor = "rgba(0,0,0,0)";

            //restore state
            ctx.restore();
        }


        if(ctx.finish)
            ctx.finish();

        this.dirty_bgcanvas = false;
        this.dirty_canvas = true; //to force to repaint the front canvas with the bgcanvas
    }

    /**
     * Draws a slot
    * @method drawSlot
    **/
    drawSlot(ctx, node, slot_index, side, drawLabel = true, drawBinding = true, drawContext = true, offsetY = 0)
    {

        //Update the global alpha
        let slot = side == this.instance.INPUT ? node.inputs[slot_index] : node.outputs[slot_index];
        let connected = (side == this.instance.INPUT && slot.link != null) || (side == this.instance.OUTPUT && slot.links && slot.links.length);
        let dir = side == this.instance.INPUT ? 1 : -1;
        let styles = this.instance.getTypeStyles(slot.type);

        let style = styles[0];

        ctx.globalAlpha = this.editor_alpha;
        
        //Prepare the colors
        ctx.fillStyle = node.bgcolor || node.constructor.bgcolor || this.instance.NODE_DEFAULT_BGCOLOR;
        if (slot.type == '-1') ctx.fillStyle = node.color || node.constructor.color || this.instance.PALETTE.node;

        //Prepare the relative position
        let pos = node.getConnectionPos(side == this.instance.INPUT, slot_index);
        pos[0] 	-= node.pos[0];
        pos[1] 	-= node.pos[1];

        if (offsetY) {
            pos[0] -= 0 * dir;
            pos[1] += offsetY;
            
            let width = (node.size[0] || this.instance.NODE_WIDTH) - 2;

            ctx.shadowColor = this.instance.PALETTE.shadow;
            ctx.shadowOffsetX = 2 * this.ds.scale;
            ctx.shadowOffsetY = 2 * this.ds.scale;
            ctx.shadowBlur = 3 * this.ds.scale;

            ctx.beginPath();
            ctx.rect(pos[0] + (width * dir), pos[1] - 8, width, 16);
            ctx.fill();
            
            ctx.shadowColor = "transparent";
        }

        //Draw the slot background
        this.drawSlotShape(ctx, style, pos, false, false, true, 4, false);

        //If we are dragging a node, we want to hide invalid nodes.
        if (this.connecting_node && this.connecting_output != slot) 
        {
            //========== DRAW INVISIBLE SLOT
            if (side == this.instance.OUTPUT || !this.instance.isValidConnection(this.connecting_output.type, slot.type))
                ctx.globalAlpha = this.editor_alpha * 0.25;
        }
        else if (drawBinding && slot.binding && !slot.link)
        {
            //=========== DRAW SLOT BINDING
            let width = this.instance.BINDING_WIDTH;
            let height = this.instance.BINDING_HEIGHT;
            let margin = this.instance.BINDING_MARGIN;
            let padding = 5;

            //Draw the shadows / the outlines
            if (this.render_shadows)
            {
                ctx.shadowColor = this.instance.PALETTE.shadow;
                ctx.shadowOffsetX = 2 * this.ds.scale;
                ctx.shadowOffsetY = 2 * this.ds.scale;
                ctx.shadowBlur = 3 * this.ds.scale;
            }
            
            ctx.fillStyle = "#111";
            ctx.strokeStyle = 'rgb(0,0,0,0.75)'; //node.bgcolor || node.constructor.bgcolor || this.instance.NODE_DEFAULT_BGCOLOR;
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.rect(pos[0] - width - margin , pos[1] - (height / 2), width, height);
            ctx.fill();
            
            ctx.shadowColor = "transparent";
            ctx.stroke(); 
            
            //Draw the link
            //this.renderLink(ctx, [pos[0] - margin, pos[1]], [pos[0] - 4, pos[1]], null, true, false, style.color_on);
            ctx.fillStyle = ctx.strokeStyle = (style.color_on || this.default_connection_color.input_on);
            this.renderLine(ctx,                                    //Context
                [pos[0] - margin, pos[1]], [pos[0] - 4, pos[1]],    //X,Y
                null, null,                                         //DX, DY
                1, null, false,                                    //Sublines, Skip Borders, Flow
                this.instance.STRAIGHT_LINK,                           //Style
                0.5, false                                         //Width Mod, Show Direction
                );

            //Draw a little node
            ctx.fillStyle = (style.color_on || this.default_connection_color.input_on);
            this.drawSlotShape(ctx, style, [pos[0] - margin, pos[1]], true, false, false, 1);

            //Draw the contents
            ctx.fillStyle = "#DDD";
            ctx.textAlign = "right";
            if (slot.binding.getValue)
                ctx.fillText(slot.binding.getValue(), pos[0] - margin - padding, pos[1] + height * 0.25, width - (padding * 2));
            ctx.textAlign = "left";
        }
        else if (drawContext && slot.context && !slot.link)
        {
            //=========== DRAW SLOT CONTEXT
            let width = this.instance.BINDING_HEIGHT;
            let height = this.instance.BINDING_HEIGHT;
            let margin = this.instance.BINDING_MARGIN;
            let padding = 3.5;
    
            //Draw teh box
            if (this.render_shadows)
            {
                ctx.shadowColor = this.instance.PALETTE.shadow;
                ctx.shadowOffsetX = 2 * this.ds.scale;
                ctx.shadowOffsetY = 2 * this.ds.scale;
                ctx.shadowBlur = 3 * this.ds.scale;
            }
    
            ctx.fillStyle = "#222";
            ctx.fillStyle = node.bgcolor || node.constructor.bgcolor || this.instance.NODE_DEFAULT_BGCOLOR;
            ctx.lineWidth = 1.5;
    
            //Try to set the tooltip
            //this.setTooltip("Context Variable " + slot.context, (pos[0]+node.pos[0]) - width - margin ,(pos[1]+node.pos[1]) - (height / 2), width, height);

            ctx.beginPath();
            ctx.rect(pos[0] - width - margin , pos[1] - (height / 2), width, height);
            ctx.fill();
            
            ctx.shadowColor = "transparent";
    
            ctx.stroke(); 
            
            //Draw the link
            //this.renderLink(ctx, [pos[0] - margin, pos[1]], [pos[0] - 4, pos[1]], null, true, false, style.color_on);
                ctx.fillStyle = ctx.strokeStyle = (style.color_on || this.default_connection_color.input_on);
                this.renderLine(ctx,                                    //Context
                    [pos[0] - margin, pos[1]], [pos[0] - 4, pos[1]],    //X,Y
                    null, null,                                         //DX, DY
                    1, null, false,                                    //Sublines, Skip Borders, Flow
                    this.instance.STRAIGHT_LINK,                           //Style
                    0.5, false                                         //Width Mod, Show Direction
                    );

            
            //Draw a little node
            ctx.fillStyle = (style.color_on || this.default_connection_color.input_on);
            this.drawSlotShape(ctx, style, [pos[0] - margin, pos[1]], true, false, false, 1);
    
            //Draw the contents
            ctx.fillStyle = "#DDD";
            ctx.textAlign = "right";

            let font = ctx.font;
            let icon = "";
            ctx.font = (connected ? 'bold' : '') + ' 8px "Font Awesome 5 Pro"';
            ctx.fillText(icon, pos[0] - margin - padding, pos[1] + height * 0.2);
            ctx.font = font;

            ctx.textAlign = "left";

        }

        //Update the fill colour

        //Set the fill style
        ctx.fillStyle = (style.color_on || this.default_connection_color.input_on);
        ctx.strokeStyle = (style.color_on || this.default_connection_color.input_on);
        
        //Prepare the possible colours of the slot
        let colors = null;
        if (styles.length > 1) {
            
            //create teh color and track if we have addad an array yet
            colors = [  ];
            let has_array = false;

            for(let s in styles) {
                if (has_array && styles[s].array_type) continue;
                colors.push(styles[s].color || styles[s].color_on);
                has_array = has_array || styles[s].array_type;
            } 
        }

        //Draw the actual slot
        this.drawSlotShape(ctx, style, pos, connected, true, false, 1, false, colors);
        
        let font = ctx.font;

        if (style.icon)
        {
            let icon = style.icon || "";
            ctx.font = (connected ? 'bold' : '') + ' 8px "Font Awesome 5 Pro"';
            ctx.fillText(icon, pos[0] + 7 * dir, pos[1] + 3);
            ctx.font = font;
        }

        //render name
        if(drawLabel)
        {
            let text = slot.label != null ? slot.label : slot.name;
            if(text)
            {
                let offset = style.icon ? 19 : 10;
                ctx.fillStyle = (slot.type == '-1' ? node.textColor : style.labelColor) || this.instance.PALETTE.text;
                ctx.fillText(text, pos[0] + offset * dir, pos[1] + (this.instance.NODE_SUBTEXT_SIZE / 2.5));

                if (style.strike)
                {
                    ctx.strokeStyle = ctx.fillStyle;
                    let txt_len = ctx.measureText(text).width;

                    ctx.beginPath();
                    ctx.moveTo( pos[0] + offset * dir + 2, pos[1] + 2)
                    ctx.lineTo( pos[0] + offset * dir - txt_len - 3, pos[1] + 2)
                    ctx.stroke();
                }
            }
        }
        
        if (node.expandable && !slot.locked) {
            //Render the hit boxes for the edit buttons
            /*
            ctx.strokeStyle = 'red';
            ctx.beginPath();
            ctx.rect(pos[0] + (88+14) * dir, pos[1] - 4, 9, 9);
            ctx.rect(pos[0] + 88 * dir, pos[1] - 4, 9, 9);
            ctx.rect(pos[0] + (88-14) * dir, pos[1] - 4, 9, 9);
            ctx.stroke();
            */
            
            ctx.font = ' 8px "Font Awesome 5 Pro"';
            ctx.fillStyle = this.instance.PALETTE.text;
            
            let alignmentOffset = 0;
            if (dir > 0) alignmentOffset = 9;

            //Render the edit buttons
            ctx.fillStyle = this.instance.PALETTE.text;
            ctx.fillText('\uf7a4', pos[0] + (80+14) * dir + alignmentOffset, pos[1] + 3,  16, this.instance.NODE_SUBTEXT_SIZE);
            ctx.fillText('\uf1f8', pos[0] + 80 * dir + alignmentOffset, pos[1] + 3,  16, this.instance.NODE_SUBTEXT_SIZE);
            ctx.fillText('\uf044', pos[0] + (80-16) * dir + alignmentOffset, pos[1] + 3,  16, this.instance.NODE_SUBTEXT_SIZE);
        }
        
        ctx.font = font;

    }
    drawSlotShape(ctx, style, pos, drawInner = false, drawOutter = true, drawBackground = false, scale = 1, drawShadow = false, colors = null)
    {
        let stroke = ctx.stokeStyle;
        let fill = ctx.fillStyle;
        
        //Draw teh box
        if (drawShadow && this.render_shadows)
        {
            ctx.shadowColor = this.instance.PALETTE.shadow;
            ctx.shadowOffsetX = 2 * this.ds.scale;
            ctx.shadowOffsetY = 2 * this.ds.scale;
            ctx.shadowBlur = 3 * this.ds.scale;
        }

        let font = ctx.font;
        let align = ctx.textAlign;
        let baseline = ctx.textBaseline;
        let icon = '\uf356';
            
        ctx.lineWidth = 1;
        switch(style.shape)
        {
            default:   
                if (drawOutter) 
                {
                    ctx.fillStyle = "#222";


                    //Draw the secondary
                    if (colors && colors.length && colors.length > 1) {
                        
                        //Draw the background
                        ctx.beginPath();    				
                        ctx.arc(pos[0], pos[1], 4 * scale, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.closePath();

                        let cone = (Math.PI * 2) / colors.length;
                        let offset = (Math.PI * 2) / 3;
                        for (let i = 0; i < colors.length; i++) {
                
                            ctx.strokeStyle = colors[i];

                            ctx.beginPath();    				
                            ctx.arc(pos[0], pos[1], 4 * scale, offset + (i * cone), offset + ((i + 1) * cone));
                            ctx.stroke();
                            ctx.closePath();
                        
                        }
                        
                        /*
                        //Draw the primary part
                        ctx.beginPath();    				
                        ctx.arc(pos[0], pos[1], 4 * scale, (Math.PI * 10) / 6, (Math.PI * 4) / 6);
                        ctx.stroke();
                        ctx.closePath();
                        
                        //Draw the secondary part
                        ctx.strokeStyle = style.secondarySlot;
                        ctx.beginPath();    								
                        ctx.arc(pos[0], pos[1], 4 * scale, (Math.PI * 4) / 6, (Math.PI * 10) / 6);
                        ctx.fill();
                        ctx.stroke();
                        ctx.closePath();
                        */

                        ctx.strokeStyle = stroke;

                    } else {

                        //Draw the primary and the background
                        ctx.beginPath();    				
                        ctx.arc(pos[0], pos[1], 4 * scale, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                        ctx.closePath();
                    }
                    
                    ctx.fillStyle = fill;
                }
                
                if (drawInner || drawBackground) 
                {
                    ctx.beginPath();
                    ctx.arc(pos[0], pos[1], 2 * scale, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.closePath();
                    ctx.closePath();
                    ctx.fillStyle = fill;				
                }
                break;

            case NodeShape.READONLY_SHAPE:
                if (drawOutter) 
                {
                    ctx.beginPath();
                    ctx.arc(pos[0], pos[1], 2.5 * scale, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.closePath();
                    ctx.closePath();
                    ctx.fillStyle = fill;
                }
                if (drawBackground) 
                {
                    ctx.beginPath();
                    ctx.arc(pos[0], pos[1], 1.5 * scale, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.closePath();
                    ctx.closePath();
                    ctx.fillStyle = fill;
                }
                break;
            
            case NodeShape.ARROW_SHAPE:

                ctx.textAlign = "center"
                ctx.textBaseline = "middle"

                if (drawBackground)
                {
                    let size = 10  * (scale / 2);
                    ctx.font = 'bold ' + size + 'px "Font Awesome 5 Pro"';
                    ctx.beginPath();    
                    ctx.fillText(pos[0] < 40 ? '\uf355' : '\uf356', pos[0], pos[1]);
                    ctx.closePath();
                }

                if (drawOutter || drawInner) 
                {
                    let size = 13;
                    let bold = drawInner ? 'bold' : '';
                    ctx.font = bold + ' ' + size + 'px "Font Awesome 5 Pro"';
                    ctx.beginPath();    
                    ctx.fillText('\uf356', pos[0], pos[1]);
                    ctx.closePath();
                }
                ctx.font = font;
                ctx.textAlign = align;
                ctx.textBaseline = baseline;
                break;

            case NodeShape.BOX_SHAPE:    
                if (drawOutter) 
                {
                    ctx.fillStyle = "#222";
                    ctx.beginPath();    
                    ctx.rect(pos[0] - 4* scale, pos[1] - 4* scale, 8 * scale, 8 * scale);
                    ctx.fill();
                    ctx.stroke();
                    ctx.closePath();
                    ctx.fillStyle = fill;
                }
                if (drawInner  || drawBackground) 
                {
                    ctx.beginPath();  
                    ctx.rect(pos[0] - 2 * scale, pos[1] - 2* scale, 4 * scale, 4 * scale);
                    ctx.fill(); 
                    ctx.closePath();
                }
                break;

            case NodeShape.ICON_SHAPE:

                icon = style.shape_icon || "";            
                ctx.textAlign = "center"
                ctx.textBaseline = "middle"

                if (drawOutter || drawInner) 
                {
                    ctx.font = (drawInner ? 'Bold ' : '') + (12 * scale) + 'px "Font Awesome 5 Pro"';
                    ctx.beginPath();    
                    ctx.fillText(icon, pos[0], pos[1]);
                    ctx.closePath();
                }
                if (!drawOutter && (drawInner  || drawBackground))
                {
                    ctx.font = 'Bold ' + (6 * scale) + 'px "Font Awesome 5 Pro"';
                    ctx.fillText(icon, pos[0], pos[1]);
                }
                ctx.font = font;
                ctx.textAlign = align;
                ctx.textBaseline = baseline;
                break;
        }
    }

    drawNode(node, ctx )
    {
        var glow = false;
        this.current_node = node;

        var color = node.color || node.constructor.color || this.instance.PALETTE.node;
        var bgcolor = node.bgcolor || node.constructor.bgcolor || this.instance.PALETTE.node_bg;

        if (!node.firstFrameDrawn)
            node.firstFrameDrawn = this.frame;

        if (this.animated_links) {
            if (node.firstFrameDrawn > 1) {
                let diff = ((this.frame - node.firstFrameDrawn) / 0.3) * this.render_time;
                if (diff < 1) {
                    /*
                    let scale = ((1 - diff) * (diff * 2) + (diff * 0.8)) * 1.25;
                    //Grow from center
                    ctx.transform(1, 0, 0, 1, node.size[0] / 2, 0);
                    ctx.transform(scale, 0, 0, scale, 0, 0);
                    ctx.transform(1, 0, 0, 1, -node.size[0] / 2, 0);
                    */
                    
                    //Slide from left
                    //ctx.transform(scale, 0, 0, 1, 0, 0);

                    //Slide from center
                    /*
                    ctx.transform(1, 0, 0, 1, node.size[0] / 2, 0);
                    ctx.transform(scale, 0, 0, 1, 0, 0);
                    ctx.transform(1, 0, 0, 1, -node.size[0] / 2, 0);
                    */
                    this.setDirty(true, false);
                }
            }

            if (this.stretchy && node.is_selected && !this.connecting_pos) {

                let modifier = 2.5;
                let stretchX = LUtil.clamp(Math.abs(this.node_dragged_velocity[0] / (200 * modifier)), 0, 1) + 1;
                let stretchY = LUtil.clamp(Math.abs(this.node_dragged_velocity[1] / (100 * modifier)), 0, 1) + 1;

                let offsetX = this.node_dragged_velocity[0] / (100 * modifier);
                let offsetY = this.node_dragged_velocity[1] / (50 * modifier);

                ctx.transform(1, 0, 0, 1, (node.size[0] / 2) + offsetX, offsetY);
                ctx.transform(stretchX, 0, 0, stretchY, 0, 0);
                ctx.transform(1, 0, 0, 1, (-node.size[0] / 2) - offsetX, -offsetY);

            }
        }

        //shadow and glow
        if (node.mouseOver)
            glow = true;

        //only render if it forces it to do it
        if(this.live_mode)
        {
            if(!node.flags.collapsed)
            {
                ctx.shadowColor = "transparent";
                if(node.onDrawForeground)
                    node.onDrawForeground(ctx, this, this.canvas );
            }
            return;
        }

        var editor_alpha = this.editor_alpha;
        ctx.globalAlpha = editor_alpha;

        if(this.render_shadows)
        {
            ctx.shadowColor = this.instance.PALETTE.shadow;
            ctx.shadowOffsetX = 2 * this.ds.scale;
            ctx.shadowOffsetY = 2 * this.ds.scale;
            ctx.shadowBlur = 3 * this.ds.scale;
        }
        else
            ctx.shadowColor = "transparent";

        //custom draw collapsed method (draw after shadows because they are affected)
        if(node.flags.collapsed && node.onDrawCollapsed && node.onDrawCollapsed(ctx, this) == true)
            return;

        //clip if required (mask)
        var shape = node.shape || NodeShape.BOX_SHAPE;
        var size = this.#tempSlotSize;
        this.#tempSlotSize.set( node.size );
        var horizontal = node.horizontal;// || node.flags.horizontal;

        if( node.flags.collapsed )
        {
            ctx.font = this.inner_text_font;
            var title = node.getTitle ? node.getTitle() : node.title;
            if(title != null)
            {
                node._collapsed_width = Math.min( node.size[0], ctx.measureText(title).width + this.instance.NODE_TITLE_HEIGHT * 2 );//this.instance.NODE_COLLAPSED_WIDTH;
                size[0] = node._collapsed_width;
                size[1] = 0;
            }
        }
        
        if( node.clip_area ) //Start clipping
        {
            ctx.save();
            ctx.beginPath();
            if(shape == NodeShape.BOX_SHAPE)
                ctx.rect(0,0,size[0], size[1]);
            else if (shape == NodeShape.ROUND_SHAPE)
                ctx.roundRect(0,0,size[0], size[1],10);
            else if (shape == NodeShape.CIRCLE_SHAPE)
                ctx.arc(size[0] * 0.5, size[1] * 0.5, size[0] * 0.5, 0, Math.PI*2);
            ctx.clip();
        }

        //draw shape
        if(node.has_errors ) bgcolor = "red";

        //Predraw the node lumps
        //if(node.inputs) 
        //{
        //    ctx.fillStyle =  node.bgcolor || node.constructor.bgcolor || this.instance.NODE_DEFAULT_BGCOLOR;
        //    for(var i = 0; i < node.inputs.length; i++)
        //    {
        //        let style = this.instance.getTypeStyle(node.inputs[i].type);
        //        let pos = node.getConnectionPos(true, i);
        //        pos[0] -= node.pos[0]; pos[1] -= node.pos[1];
        //        this.drawSlotShape(ctx, style, pos, true, false, 3, true);
        //    }
        //}
        

        this.drawNodeShape( node, ctx, size, color, bgcolor, node.is_selected, node.mouseOver);
        ctx.shadowColor = "transparent";

        //draw foreground
        if(node.onDrawForeground)
            node.onDrawForeground( ctx, this, this.canvas );


        //connection slots
        ctx.textAlign = horizontal ? "center" : "left";
        ctx.font = this.inner_text_font;

        var render_text = this.ds.scale > 0.25;

        var out_slot = this.connecting_output;
        ctx.lineWidth = 1;

        var widgetOffset = 0;
        var max_y = 0;
        var slot_pos = new Float32Array(2); //to reuse

        //render inputs and outputs
        if(!node.flags.collapsed)
        {
            //Draw the widgets if we have any	
            if(node.widgets)
            {
                if( horizontal || node.widgets_up  ) max_y = 2;
                this.drawNodeWidgets( node, max_y, ctx, (this.node_widget && this.node_widget[0] == node) ? this.node_widget[1] : null );	
            }

            //input connection slots
            if(node.inputs) 
            {
                let foundDraggedSlot = false;
                for(var i = 0; i < node.inputs.length; i++)
                {			
                    if (i == this.slot_dragged && node == this.slot_dragged_node) {
                        foundDraggedSlot = true;
                        continue;
                    }

                    //function(ctx, node, slot_index, side, drawLabel = true, drawBinding = true, drawContext = true, offsetY = 0)
                    this.drawSlot(ctx, node, i, this.instance.INPUT, render_text && (i != 0 || node.inputs[i].type != '-1'), true, true, widgetOffset);
                }
                
                if (foundDraggedSlot && this.slot_dragged_node) {
                    this.drawSlot(ctx, this.slot_dragged_node, this.slot_dragged, this.instance.INPUT, render_text && (i != 0 || node.inputs[i].type != '-1'), true, true, this.slot_dragged_offset);
                }
            }

            //output connection slots
            if(this.connecting_node)
                ctx.globalAlpha = 0.4 * editor_alpha;

            ctx.textAlign = horizontal ? "center" : "right";
            ctx.strokeStyle = "black";
            
            if (node.outputs) 
            {
                let foundDraggedSlot = false;
                for(var i = 0; i < node.outputs.length; i++)
                {
                    if (i == this.slot_dragged && node == this.slot_dragged_node) {
                        foundDraggedSlot = true;
                        continue;
                    }

                    //function(ctx, node, slot_index, side, drawLabel = true, drawBinding = true, drawContext = true, offsetY = 0)
                    this.drawSlot(ctx, node, i, this.instance.OUTPUT, render_text, true, true, 0);
                }
                
                if (foundDraggedSlot && node == this.slot_dragged_node) {
                    this.drawSlot(ctx, node, this.slot_dragged, this.instance.OUTPUT, render_text, true, true, this.slot_dragged_offset);
                }
            }

            ctx.textAlign = "left";
            ctx.globalAlpha = 1;

            if (node.expandable)
            {
                
                ctx.fillStyle = bgcolor;
                
                ctx.beginPath();	
                ctx.moveTo(size[0] / 2, size[1]);
                ctx.arc(size[0] / 2 + 0.5, size[1], 8, 0, Math.PI * 2);
                ctx.fill();
                
                
                ctx.fillStyle  = this.instance.PALETTE.text;
                ctx.font = '8px "Font Awesome 5 Pro"';
                ctx.fillText('\uf0fe', (size[0] / 2) - 3, size[1] + 3);

                ctx.closePath();

                
                //Collision Box
                /*
                ctx.beginPath();			
                ctx.strokeStyle = "red";
                ctx.rect((size[0] / 2) - 8, size[1] - 6, 17, 12);
                ctx.stroke();
                ctx.closePath();
                */
            }
        }
        else if(this.render_collapsed_slots)//if collapsed
        {
            var input_slot = null;
            var output_slot = null;

            //get first connected slot to render
            if(node.inputs)
            {
                for(var i = 0; i < node.inputs.length; i++)
                {
                    var slot = node.inputs[i];
                    if( slot.link == null )
                        continue;
                    input_slot = slot;
                    break;
                }
            }
            if(node.outputs)
            {
                for(var i = 0; i < node.outputs.length; i++)
                {
                    var slot = node.outputs[i];
                    if(!slot.links || !slot.links.length)
                        continue;
                    output_slot = slot;
                }
            }

            if(input_slot)
            {
                var x = 0;
                var y = this.instance.NODE_TITLE_HEIGHT * -0.5; //center
                if( horizontal )
                {
                    x = node._collapsed_width * 0.5;
                    y = -this.instance.NODE_TITLE_HEIGHT;		
                }
                ctx.fillStyle = "#686";
                ctx.beginPath();
                if (slot.shape === NodeShape.BOX_SHAPE) {
                    ctx.rect(x - 7 + 0.5, y-4,14,8);
                } else if (slot.shape === NodeShape.ARROW_SHAPE) {
                    ctx.moveTo(x + 8, y);
                    ctx.lineTo(x + -4, y - 4);
                    ctx.lineTo(x + -4, y + 4);
                    ctx.closePath();
                } else {
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                }
                ctx.fill();
            }

            if(output_slot)
            {
                var x = node._collapsed_width;
                var y = this.instance.NODE_TITLE_HEIGHT * -0.5; //center
                if( horizontal )
                {
                    x = node._collapsed_width * 0.5;
                    y = 0;
                }
                ctx.fillStyle = "#686";
                ctx.strokeStyle = "black";
                ctx.beginPath();
                if (slot.shape === NodeShape.BOX_SHAPE) {
                    ctx.rect( x - 7 + 0.5, y - 4,14,8);
                } else if (slot.shape === NodeShape.ARROW_SHAPE) {
                    ctx.moveTo(x + 6, y);
                    ctx.lineTo(x - 6, y - 4);
                    ctx.lineTo(x - 6, y + 4);
                    ctx.closePath();
                } else {
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                }
                ctx.fill();
                //ctx.stroke();
            }
        }

        if(node.clip_area)
            ctx.restore();

        ctx.globalAlpha = 1.0;
        
    }

    /**
    * draws the shape of the given node in the canvas
    * @method drawNodeShape
    **/
    drawNodeShape( node, ctx, size, fgcolor, bgcolor, selected, mouse_over )
    {
        //bg rect
        ctx.strokeStyle = fgcolor;
        ctx.fillStyle = bgcolor;

        var title_height = node.getTitleHeight() || this.instance.NODE_TITLE_HEIGHT;
        var low_quality = this.ds.scale < 0.5;

        //render node area depending on shape
        var shape = node.shape || node.constructor.shape || NodeShape.ROUND_SHAPE;

        var title_mode = node.constructor.title_mode;

        var render_title = true;
        if( title_mode == this.instance.TRANSPARENT_TITLE )
            render_title = false;
        else if( title_mode == this.instance.AUTOHIDE_TITLE && mouse_over)
            render_title = true;

        //Calculate the rectangle. x,y,w,h
        var area = this.#tempNodeArea;
        area[0] = 0; 
        area[1] = render_title ? -title_height : 0; 
        area[2] = size[0];
        area[3] = render_title ? size[1] + title_height : size[1];

        var old_alpha = ctx.globalAlpha;

        //full node shape
        if(!node.flags.collapsed)
        {
            ctx.beginPath();
            if(shape == NodeShape.BOX_SHAPE || low_quality )
            {
                ctx.rect(area[0], area[1], area[2], area[3]);

            }
            else if (shape == NodeShape.ROUND_SHAPE || shape == NodeShape.CARD_SHAPE)
            {
                ctx.roundRect( area[0], area[1], area[2], area[3], this.round_radius, shape == NodeShape.CARD_SHAPE ? 0 : this.round_radius);
            }
            else if (shape == NodeShape.CIRCLE_SHAPE)
            {
                ctx.arc(size[0] * 0.5, size[1] * 0.5, size[0] * 0.5, 0, Math.PI*2);
            }
            
            ctx.fill();
            if (this.render_outline)  
            {
                ctx.strokeStyle = this.instance.PALETTE.outline || fgcolor;
                ctx.stroke();
            }

            //This draws the horizontal line
            //ctx.shadowColor = "transparent";
            //ctx.fillStyle = "rgba(0,0,0,0.2)";
            //ctx.fillRect(0,-1, area[2], 2);
        }
        ctx.shadowColor = "transparent";

        if( node.onDrawBackground )
            node.onDrawBackground( ctx, this, this.canvas );

        //title bg (remember, it is rendered ABOVE the node)
        if(render_title)
        {
            var title_color = node.constructor.title_color || fgcolor;

            if(node.flags.collapsed)
                ctx.shadowColor = this.instance.PALETTE.shadow;

            //* gradient test
            if(this.use_gradients)
            {
                var grad = LiteCanvas.gradients[ title_color ];
                if(!grad)
                {
                    grad = LiteCanvas.gradients[ title_color ] = ctx.createLinearGradient(0,0,400,0);
                    grad.addColorStop(0, title_color);
                    grad.addColorStop(1, "#0000FF");
                }
                ctx.fillStyle = grad;
            }
            else
            {
                ctx.fillStyle = title_color;
            }

            let mod = !node.flags.collapsed && this.render_outline ? 0.5 : 0;

            ctx.beginPath();
            if( shape == NodeShape.BOX_SHAPE || low_quality )
            {
                ctx.rect(0 + mod, -title_height + mod, size[0] - mod * 2, title_height);
            }
            else if ( shape == NodeShape.ROUND_SHAPE || shape == NodeShape.CARD_SHAPE )
            {
                ctx.roundRect(0,-title_height,size[0], title_height, this.round_radius, node.flags.collapsed ? this.round_radius : 0);
            }

            //Fill and Stroke (if we are collapsed)
            ctx.fill();
            if (node.flags.collapsed && this.render_outline)  
            {
                ctx.strokeStyle = NodeShape.PALETTE.outline || fgcolor;
                ctx.stroke();
            }

            ctx.fillStyle =  node.textColor || node.constructor.title_text_color || this.node_title_color;
            ctx.font = '10px "Font Awesome 5 Pro"';
            ctx.fillText(node.flags.collapsed ? '' : '', this.instance.NODE_TITLE_TEXT_X, this.instance.NODE_TITLE_TEXT_Y - title_height);
            //ctx.fillRect(this.instance.NODE_TITLE_TEXT_X, this.instance.NODE_TITLE_TEXT_Y - title_height - 10, 10, 10);
            //else
            //{
            //	if( low_quality )
            //	{
            //		ctx.fillStyle = "black";
            //		ctx.fillRect( (title_height - box_size) * 0.5 - 1, (title_height + box_size ) * -0.5 - 1, box_size + 2, box_size + 2);
            //	}
            //	ctx.fillStyle = node.boxcolor || this.instance.NODE_DEFAULT_BOXCOLOR;
            //	ctx.fillRect( (title_height - box_size) * 0.5, (title_height + box_size ) * -0.5, box_size, box_size );
            //}
            ctx.globalAlpha = old_alpha;

            //title text
            if(node.onDrawTitleText)
            {
                node.onDrawTitleText( ctx, title_height, size, this.ds.scale, this.title_text_font, selected);
            }
            if( !low_quality )
            {
                ctx.font = this.title_text_font;
                var title = node.getTitle();
                if(title)
                {
                    ctx.textAlign =  "left";
                    ctx.fillText( title, this.instance.NODE_TITLE_TEXT_X + 15, this.instance.NODE_TITLE_TEXT_Y - title_height );
                }
            }

            if(node.onDrawTitle)
                node.onDrawTitle(ctx);
        }

        //render selection marker
        if(selected)
        {
            if( node.onBounding )
                node.onBounding( area );

            if( title_mode == this.instance.TRANSPARENT_TITLE )
            {
                area[1] -= title_height;
                area[3] += title_height;
            }
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            if( shape == NodeShape.BOX_SHAPE )
                ctx.rect(-6 + area[0],-6 + area[1], 12 + area[2], 12 + area[3] );
            else if (shape == NodeShape.ROUND_SHAPE || (shape == NodeShape.CARD_SHAPE && node.flags.collapsed) )
                ctx.roundRect(-6 + area[0],-6 + area[1], 12 + area[2], 12 + area[3] , this.round_radius * 2);
            else if (shape == NodeShape.CARD_SHAPE)
                ctx.roundRect(-6 + area[0],-6 + area[1], 12 + area[2], 12 + area[3] , this.round_radius * 2, 2);
            else if (shape == NodeShape.CIRCLE_SHAPE)
                ctx.arc(size[0] * 0.5, size[1] * 0.5, size[0] * 0.5 + 6, 0, Math.PI*2);
            ctx.strokeStyle = "#FFF";
            ctx.stroke();
            ctx.strokeStyle = fgcolor;
            ctx.globalAlpha = 1;
        }
    }

    /**
    * draws every connection visible in the canvas
    * OPTIMIZE THIS: pre-catch connections position instead of recomputing them every time
    * @method drawConnections
    **/
    drawConnections(ctx)
    {
        var now = this.instance.getTime();
        var visible_area = this.visible_area;
        this.#margin_area[0] = visible_area[0] - 20; this.#margin_area[1] = visible_area[1] - 20; this.#margin_area[2] = visible_area[2] + 40; this.#margin_area[3] = visible_area[3] + 40;

        //draw connections
        ctx.lineWidth = this.connections_width;

        ctx.fillStyle = "#AAA";
        ctx.strokeStyle = "#AAA";
        ctx.globalAlpha = this.editor_alpha;
        //for every node
        var nodes = this.graph._nodes;
        for (var n = 0, l = nodes.length; n < l; ++n)
        {
            var node = nodes[n];
            //for every input (we render just inputs because it is easier as every slot can only have one input)
            if(!node.inputs || !node.inputs.length)
                continue;
        
            for(var i = 0; i < node.inputs.length; ++i)
            {
                var input = node.inputs[i];
                if(!input || input.link == null)
                    continue;
                var link_id = input.link;
                var link = this.graph.links[ link_id ];
                if(!link)
                    continue;

                //find link info
                var start_node = this.graph.getNodeById( link.origin_id );
                if(start_node == null) continue;
                var start_node_slot = link.origin_slot;
                var start_node_slotpos = null;
                if(start_node_slot == -1)
                    start_node_slotpos = [start_node.pos[0] + 10, start_node.pos[1] + 10];
                else
                    start_node_slotpos = start_node.getConnectionPos( false, start_node_slot, this.#tempConnectionA );
                    
                if (start_node == this.slot_dragged_node && start_node_slot == this.slot_dragged)
                    start_node_slotpos[1] +=  this.slot_dragged_offset;

                var end_node_slotpos = node.getConnectionPos( true, i, this.#tempConnectionB );


                if (node == this.slot_dragged_node && i == this.slot_dragged)
                    end_node_slotpos[1] +=  this.slot_dragged_offset;

                //compute link bounding
                this.#link_bounding[0] = start_node_slotpos[0];
                this.#link_bounding[1] = start_node_slotpos[1];
                this.#link_bounding[2] = end_node_slotpos[0] - start_node_slotpos[0];
                this.#link_bounding[3] = end_node_slotpos[1] - start_node_slotpos[1];
                if( this.#link_bounding[2] < 0 ){
                    this.#link_bounding[0] += this.#link_bounding[2];
                    this.#link_bounding[2] = Math.abs( this.#link_bounding[2] );
                }
                if( this.#link_bounding[3] < 0 ){
                    this.#link_bounding[1] += this.#link_bounding[3];
                    this.#link_bounding[3] = Math.abs( this.#link_bounding[3] );
                }

                //skip links outside of the visible area of the canvas
                if( !LUtil.overlapBounding( this.#link_bounding, this.#margin_area ) )
                    continue;

                var start_slot = start_node.outputs[ start_node_slot ];
                var end_slot = node.inputs[i];
                if(!start_slot || !end_slot) continue;
                var start_dir = start_slot.dir || (start_node.horizontal ? this.instance.DOWN : this.instance.RIGHT);
                var end_dir = end_slot.dir || (node.horizontal ? this.instance.UP : this.instance.LEFT);

                link._start = [ start_node_slotpos[0], start_node_slotpos[1] ];
                link._end = [ end_node_slotpos[0], end_node_slotpos[1] ];

                if (link.anchors && link.anchors.length > 0)
                {
                    for(var k = 0; k < link.anchors.length; k++) 
                    {
                        this.renderLink( ctx, k == 0 ? start_node_slotpos : link.anchors[k - 1], link.anchors[k], link, false, 0, null, start_dir, end_dir );
                    }

                    this.renderLink( ctx, link.anchors[link.anchors.length - 1], end_node_slotpos, link, false, 0, null, start_dir, end_dir );
                }
                else
                {
                    this.renderLink( ctx, start_node_slotpos, end_node_slotpos, link, false, 0, null, start_dir, end_dir );
                }


                //event triggered rendered on top
                if(link && link._last_time && (now - link._last_time) < 1000 )
                {
                    var f = 2.0 - (now - link._last_time) * 0.002;
                    var tmp = ctx.globalAlpha;
                    ctx.globalAlpha = tmp * f;
                    this.renderLink( ctx, start_node_slotpos, end_node_slotpos, link, true, f, "white", start_dir, end_dir );
                    ctx.globalAlpha = tmp;
                    
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    /**
    * draws a link between two points
    * @method renderLink
    * @param {vec2} a start pos
    * @param {vec2} b end pos
    * @param {Object} link the link object with all the link info
    * @param {boolean} skip_border ignore the shadow of the link
    * @param {boolean} flow show flow animation (for events)
    * @param {string} color the color for the link
    * @param {number} start_dir the direction enum 
    * @param {number} end_dir the direction enum 
    * @param {number} num_sublines number of sublines (useful to represent vec3 or rgb)
    **/
    renderLink( ctx, a, b, link, skip_border, flow, color, start_dir, end_dir, num_sublines )
    {
        if(link)
            this.visible_links.push( link );

        //Prepare the type style
        let typeStyle = link ? this.instance.getTypeStyle(link.type) : this.instance.getTypeStyle('default');
        let borderStyle = skip_border ? null : 'rgb(0,0,0,0.75)';
        
        //choose color
        if( !color && link ) color = link.color || typeStyle.color_on//LiteCanvas.link_type_colors[ link.type ];
        if( !color )         color = this.default_link_color;
        ctx.fillStyle = ctx.strokeStyle = color;
        
        //if( link != null && this.highlighted_links[ link.id ] ) 
        //    borderStyle = "1px";


        //Choose Render mode
        var render_mode = null;
        if (render_mode == null && link)    render_mode = typeStyle.style;
        if (render_mode == null)            render_mode = this.render_mode || this.instance.SPLINE_LINK;
        if (link && link.anchors.length )   render_mode = this.instance.LINEAR_LINK;

        //Set the dash
        if (typeStyle.dashed)
            ctx.setLineDash([ 15, 7]);

        //Calculate the animation truths\
        let animations = { start: false, end: false };
        if (link && !this.connecting_node) 
        {
            animations.start    = this.last_node_dragged_id == link.origin_id || (this.selected_nodes && this.selected_nodes[link.origin_id]);
            animations.end      = this.last_node_dragged_id == link.target_id || (this.selected_nodes && this.selected_nodes[link.target_id]);
        }
        else if (!link)
        {
            animations.start = false;
            animations.end = true;
        }

        let render_arrow = link != null && this.render_link_arrows &&  LUtil.distance(a,b) > 700;
        
        //Set the stroke
        //ctx.fillStyle = ctx.strokeStyle = color;
        this.renderLine(ctx, a, b, start_dir, end_dir, num_sublines, borderStyle, flow, render_mode, 1, render_arrow, animations);

        //Reset the dash    
        if (typeStyle.dashed)
            ctx.setLineDash([ 0 ]);
    }

    renderLine(ctx, a, b, start_dir, end_dir, num_sublines, border_color, flow, render_mode, lineWidth = 1, show_direction = true, apply_velocity = {start: false, end: false})
    {

        start_dir = start_dir || this.instance.RIGHT;
        end_dir = end_dir || this.instance.LEFT;

        var dist =  this.spline_distance || LUtil.distance(a,b); //Math.min(this.spline_distance, LUtil.distance(a,b));
        var gravity = this.gravity;

        if (this.render_mode)
            render_mode = this.render_mode;

        if(this.render_connections_border && this.ds.scale > 0.6)
            ctx.lineWidth = lineWidth * this.connections_width + 4;
            
        ctx.lineJoin = "round";
        num_sublines = num_sublines || 1;
        if(num_sublines > 1) ctx.lineWidth = 0.5;

        let cp_start = a;
        let cp_end = b;
        let cp_offset = 0.25;

        //begin line shape
        ctx.beginPath();
        for(var i = 0; i < num_sublines; i += 1)
        {
            var offsety = (i - (num_sublines-1)*0.5)*5;

            if(render_mode == this.instance.SPLINE_LINK)
            {
                ctx.moveTo(a[0],a[1] + offsety);
                var start_offset_x = 0;
                var start_offset_y = 0;
                var end_offset_x = 0;
                var end_offset_y = 0;
                
                switch(start_dir)
                {
                    case this.instance.LEFT: 	start_offset_x 	= dist * -cp_offset; break;
                    case this.instance.RIGHT: 	start_offset_x 	= dist * cp_offset; break;
                    case this.instance.UP: 		start_offset_y 	= dist * -cp_offset; break;
                    case this.instance.DOWN: 	start_offset_y 	= dist * cp_offset; break;
                }
                
                switch(end_dir)
                {
                    case this.instance.LEFT: 	end_offset_x 	= dist * -cp_offset; break;
                    case this.instance.RIGHT: 	end_offset_x 	= dist * cp_offset; break;
                    case this.instance.UP: 		end_offset_y 	= dist * -cp_offset5; break;
                    case this.instance.DOWN: 	end_offset_y 	= dist * cp_offset; break;
                }
                
                let cp_scale = 1;
                cp_start = [ 
                    a[0] + start_offset_x, 
                    a[1] + start_offset_y + 0 + (dist * gravity)
                ];

                cp_end = [ 
                    b[0] + end_offset_x, 
                    b[1] + end_offset_y + 0 + (dist * gravity)
                ];

                
                let velocity_x = this.node_dragged_velocity[0]
                let velocity_y = this.node_dragged_velocity[1]
                if (apply_velocity.start) 
                {
                    cp_start[0] += velocity_x;
                    cp_start[1] -= velocity_y;
                }

                if (apply_velocity.end) 
                {
                    cp_end[0] -= velocity_x;
                    cp_end[1] -= velocity_y;
                }

                ctx.bezierCurveTo(  cp_start[0], cp_start[1],
                                    cp_end[0] , cp_end[1],
                                    b[0], b[1] + offsety);
                                    
                if (this.show_biezer_controls)
                {
                    ctx.moveTo(a[0],a[1] + offsety);
                    ctx.lineTo(cp_start[0], cp_start[1]);
                    ctx.arc(cp_start[0], cp_start[1], 5, 0, Math.PI*2);
                    
                    ctx.moveTo(b[0],b[1] + offsety);
                    ctx.lineTo(cp_end[0], cp_end[1]);
                    ctx.arc(cp_end[0], cp_end[1], 5, 0, Math.PI*2);
                }

            }
            else if(render_mode == this.instance.LINEAR_LINK)
            {
                ctx.moveTo(a[0],a[1] + offsety);
                var start_offset_x = 0;
                var start_offset_y = 0;
                var end_offset_x = 0;
                var end_offset_y = 0;
                switch(start_dir)
                {
                    case this.instance.LEFT: start_offset_x = -1; break;
                    case this.instance.RIGHT: start_offset_x = 1; break;
                    case this.instance.UP: start_offset_y = -1; break;
                    case this.instance.DOWN: start_offset_y = 1; break;
                }
                switch(end_dir)
                {
                    case this.instance.LEFT: end_offset_x = -1; break;
                    case this.instance.RIGHT: end_offset_x = 1; break;
                    case this.instance.UP: end_offset_y = -1; break;
                    case this.instance.DOWN: end_offset_y = 1; break;
                }
                var l = 15;
                ctx.lineTo(a[0] + start_offset_x * l, a[1] + start_offset_y * l + offsety);
                ctx.lineTo(b[0] + end_offset_x * l, b[1] + end_offset_y * l + offsety);
                ctx.lineTo(b[0],b[1] + offsety);
            }
            else if(render_mode == this.instance.STRAIGHT_LINK)
            {
                ctx.moveTo(a[0], a[1]);
                var start_x = a[0];
                var start_y = a[1];
                var end_x = b[0];
                var end_y = b[1];
                if( start_dir == this.instance.RIGHT )
                    start_x += 10;
                else
                    start_y += 10;
                if( end_dir == this.instance.LEFT )
                    end_x -= 10;
                else
                    end_y -= 10;
                ctx.lineTo(start_x, start_y);
                ctx.lineTo((start_x + end_x)*0.5,start_y);
                ctx.lineTo((start_x + end_x)*0.5,end_y);
                ctx.lineTo(end_x, end_y);
                ctx.lineTo(b[0],b[1]);
            }
            else
                return; //unknown
        }

        //rendering the outline of the connection can be a little bit slow
        if(this.render_connections_border && this.ds.scale > 0.6 && border_color)
        {
            var pstroke = ctx.strokeStyle;
            ctx.strokeStyle = border_color; //"rgba(0,0,0,0.5)";
            ctx.stroke();
            ctx.strokeStyle = pstroke;
        }

        ctx.lineWidth = lineWidth * this.connections_width;
        ctx.stroke();
        
        //end line shape
        //var pos = this.computeConnectionPoint( a, b, 0.5, start_dir, end_dir);
        var pos = this.computeBezierPoint(a, cp_start, cp_end, b, 0.5);

        //render arrow in the middle
        if( this.ds.scale >= 0.6 && this.highquality_render && end_dir != this.instance.CENTER )
        {
            //render arrow
            if( this.render_connection_arrows )
            {
                //compute two points in the connection
                var posA = this.computeBezierPoint(a, cp_start, cp_end, b, 0.25); //this.computeConnectionPoint( a, b, 0.25, start_dir, end_dir );
                var posB = this.computeBezierPoint(a, cp_start, cp_end, b, 0.26); //this.computeConnectionPoint( a, b, 0.26, start_dir, end_dir );
                var posC = this.computeBezierPoint(a, cp_start, cp_end, b, 0.75); //this.computeConnectionPoint( a, b, 0.75, start_dir, end_dir );
                var posD = this.computeBezierPoint(a, cp_start, cp_end, b, 0.76); //this.computeConnectionPoint( a, b, 0.76, start_dir, end_dir );

                //compute the angle between them so the arrow points in the right direction
                var angleA = 0;
                var angleB = 0;
                if(this.render_curved_connections)
                {
                    angleA = -Math.atan2( posB[0] - posA[0], posB[1] - posA[1]);
                    angleB = -Math.atan2( posD[0] - posC[0], posD[1] - posC[1]);
                }
                else
                    angleB = angleA = b[1] > a[1] ? 0 : Math.PI;

                //render arrow
                ctx.save();
                ctx.translate(posA[0],posA[1]);
                ctx.rotate(angleA);
                ctx.beginPath();
                ctx.moveTo(-5,-3);
                ctx.lineTo(0,+7);
                ctx.lineTo(+5,-3);
                ctx.fill();
                ctx.restore();
                ctx.save();
                ctx.translate(posC[0],posC[1]);
                ctx.rotate(angleB);
                ctx.beginPath();
                ctx.moveTo(-5,-3);
                ctx.lineTo(0,+7);
                ctx.lineTo(+5,-3);
                ctx.fill();
                ctx.restore();
            }

            //circle
            //ctx.beginPath();
            //ctx.arc(pos[0],pos[1],5,0,Math.PI*2);
            //ctx.fill();
            
            //Shows control points
            //ctx.beginPath();
            //ctx.arc(cp_start[0],cp_start[1],2,0,Math.PI*2);
            //ctx.arc(cp_end[0],cp_end[1],2,0,Math.PI*2);
            //ctx.fill();


            //render arrow
            if (show_direction) 
            {
                
                let bezierDirection = this.computeBezierDirection(a, b, cp_start, cp_end);
                let bezierAngle = Math.atan(bezierDirection[1] / bezierDirection[0]) + (Math.PI / -2) * (cp_end[0] < a[0] ? -1 : 1);
                ctx.save();
                ctx.translate(pos[0], pos[1]);
                ctx.scale(1.5, 1.5);
                ctx.rotate(bezierAngle);
                ctx.beginPath();
                ctx.moveTo(-5,-3);
                ctx.lineTo(0,+7);
                ctx.lineTo(+5,-3);
                ctx.fill();
                ctx.restore();
            }
        }

        //if (this.connecting_anchors)
        //{
        //    for(var i = 0; i < this.connecting_anchors.length; i++) 
        //    {
        //        let anchor = this.connecting_anchors[i];
    //
        //		ctx.beginPath();
        //		ctx.arc(anchor[0],anchor[1], 5, 0, 2*Math.PI);
        //		ctx.fill();
        //    }
        //}


        //ctx.beginPath();
        ////ctx.arc(a[0],a[1], 5, 0, 2*Math.PI);
        //ctx.arc(b[0],b[1], 5, 0, 2*Math.PI);
        //ctx.fill();
        //this.drawSlotShape(ctx, typeStyle, b);

        //render flowing points
        if(flow)
        {
            //ctx.fillStyle = color;
            for(var i = 0; i < 5; ++i)
            {
                var f = (this.instance.getTime() * 0.001 + (i * 0.2)) % 1;
                //var pos = this.computeConnectionPoint(a, b, f, start_dir, end_dir);
                var pos = this.computeBezierPoint(a, cp_start, cp_end, b, f);
                ctx.beginPath();
                ctx.arc(pos[0],pos[1],5,0,2*Math.PI);
                ctx.fill();
            }
        }
        
    }

    computeBezierDirection(a, b, cp1, cp2, t = 0.5) 
    {
        let oneMinusT = 1 - t;
        let bx = 3 * oneMinusT * oneMinusT * (cp1[0] - a[0]) + 6 * t * oneMinusT * (cp2[0] - cp1[0]) + 3 * t * t * (b[0] - cp2[0]);
        let by = 3 * oneMinusT * oneMinusT * (cp1[1] - a[1]) + 6 * t * oneMinusT * (cp2[1] - cp1[1]) + 3 * t * t * (b[1] - cp2[1]);
        return [ bx, by ];
    }

    computeBezierPoint(p0, p1, p2, p3, t)
    {
        var c1 = (1-t)*(1-t)*(1-t);
        var c2 = 3*((1-t)*(1-t))*t;
        var c3 = 3*(1-t)*(t*t);
        var c4 = t*t*t;
        var x = c1*p0[0] + c2*p1[0] + c3*p2[0] + c4*p3[0];
        var y = c1*p0[1] + c2*p1[1] + c3*p2[1] + c4*p3[1];
        return [x, y];
    }

    //returns the link center point based on curvature
    computeConnectionPoint(a,b,t,start_dir,end_dir)
    {
        start_dir = start_dir || this.instance.RIGHT;
        end_dir = end_dir || this.instance.LEFT;

        var dist = LUtil.distance(a,b);
        var p0 = a;
        var p1 = [ a[0], a[1] ];
        var p2 = [ b[0], b[1] ];
        var p3 = b;

        switch(start_dir)
        {
            case this.instance.LEFT: p1[0] += dist*-0.25; break;
            case this.instance.RIGHT: p1[0] += dist*0.25; break;
            case this.instance.UP: p1[1] += dist*-0.25; break;
            case this.instance.DOWN: p1[1] += dist*0.25; break;
        }
        switch(end_dir)
        {
            case this.instance.LEFT: p2[0] += dist*-0.25; break;
            case this.instance.RIGHT: p2[0] += dist*0.25; break;
            case this.instance.UP: p2[1] += dist*-0.25; break;
            case this.instance.DOWN: p2[1] += dist*0.25; break;
        }

        return this.computeBezierPoint(p0, p1, p2, p3, t);
    }

    drawExecutionOrder(ctx)
    {
        ctx.shadowColor = "transparent";
        ctx.globalAlpha = 0.25;

        ctx.textAlign = "center";
        ctx.strokeStyle = "white";
        ctx.globalAlpha = 0.75;

        var visible_nodes = this.visible_nodes;
        for (var i = 0; i < visible_nodes.length; ++i)
        {
            var node = visible_nodes[i];
            ctx.fillStyle = "black";
            ctx.fillRect( node.pos[0] - this.instance.NODE_TITLE_HEIGHT, node.pos[1] - this.instance.NODE_TITLE_HEIGHT, this.instance.NODE_TITLE_HEIGHT, this.instance.NODE_TITLE_HEIGHT );
            if(node.order == 0)
                ctx.strokeRect( node.pos[0] - this.instance.NODE_TITLE_HEIGHT + 0.5, node.pos[1] - this.instance.NODE_TITLE_HEIGHT + 0.5, this.instance.NODE_TITLE_HEIGHT, this.instance.NODE_TITLE_HEIGHT );
            ctx.fillStyle = "#FFF";
            ctx.fillText( node.order, node.pos[0] + this.instance.NODE_TITLE_HEIGHT * -0.5, node.pos[1] - 6 );
        }
        ctx.globalAlpha = 1;
    }


    /**
    * draws the widgets stored inside a node
    * @method drawNodeWidgets
    **/
    drawNodeWidgets( node, posY, ctx, active_widget )
    {
        if(!node.widgets || !node.widgets.length)
            return 0;
        var width = node.size[0];
        var widgets = node.widgets;
        posY += 2;
        var H = this.instance.NODE_WIDGET_HEIGHT;
        var show_text = this.ds.scale > 0.5;
        ctx.save();
        ctx.globalAlpha = this.editor_alpha;
        var outline_color = "#666";
        var background_color = "#222";
        var margin = 20;

        for(var i = 0; i < widgets.length; ++i)
        {
            var w = widgets[i];
            var y = posY;
            
            if(w.y) y = w.y;
            if (w.show === false) continue;

            w.last_y = y;
            ctx.strokeStyle = outline_color;
            ctx.fillStyle = "#222";
            ctx.textAlign = "left";

            switch( w.type )
            {
                case "button": 
                    if(w.clicked)
                    {
                        ctx.fillStyle = "#AAA";
                        w.clicked = false;
                        this.dirty_canvas = true;
                    }
                    ctx.fillRect(margin,y,width-margin*2,H);
                    ctx.strokeRect(margin,y,width-margin*2,H);
                    if(show_text)
                    {
                        ctx.textAlign = "center";
                        ctx.fillStyle = "#AAA";
                        ctx.fillText( w.name, width*0.5, y + H*0.7 );
                    }
                    break;
                case "toggle":
                    ctx.textAlign = "left";
                    ctx.strokeStyle = outline_color;
                    ctx.fillStyle = background_color;
                    ctx.beginPath();
                    ctx.roundRect( margin, posY, width - margin*2, H,H*0.5 );
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = w.value ? "#89A" : "#333";
                    ctx.beginPath();
                    ctx.arc( width - margin*2, y + H*0.5, H * 0.36, 0, Math.PI * 2 );
                    ctx.fill();
                    if(show_text)
                    {
                        ctx.fillStyle = "#999";
                        if(w.name != null)
                            ctx.fillText( w.name, margin*2, y + H*0.7 );
                        ctx.fillStyle = w.value ? "#DDD" : "#888";
                        ctx.textAlign = "right";
                        ctx.fillText( w.value ? (w.options.on || "true") : (w.options.off || "false"), width - 40, y + H*0.7 );
                    }
                    break;
                case "slider": 
                    ctx.fillStyle = background_color;
                    ctx.fillRect(margin,y,width-margin*2,H);
                    var range = w.options.max - w.options.min;
                    var nvalue = (w.value - w.options.min) / range;
                    ctx.fillStyle = active_widget == w ? "#89A" : "#678";
                    ctx.fillRect(margin,y,nvalue*(width-margin*2),H);
                    ctx.strokeRect(margin,y,width-margin*2,H);
                    if( w.marker )
                    {
                        var marker_nvalue = (w.marker - w.options.min) / range;
                        ctx.fillStyle = "#AA9";
                        ctx.fillRect(margin + marker_nvalue*(width-margin*2),y,2,H);
                    }
                    if(show_text)
                    {
                        ctx.textAlign = "center";
                        ctx.fillStyle = "#DDD";
                        ctx.fillText( w.name + "  " + Number(w.value).toFixed(3), width*0.5, y + H*0.7 );
                    }
                    break;
                case "number":
                case "combo":
                    ctx.textAlign = "left";
                    ctx.strokeStyle = outline_color;
                    ctx.fillStyle = background_color;
                    ctx.beginPath();
                    ctx.roundRect( margin, posY, width - margin*2, H,H*0.5 );
                    ctx.fill();
                    ctx.stroke();
                    if(show_text)
                    {
                        ctx.fillStyle = "#AAA";
                        ctx.beginPath();
                        ctx.moveTo( margin + 16, posY + 5 );
                        ctx.lineTo( margin + 6, posY + H*0.5 );
                        ctx.lineTo( margin + 16, posY + H - 5 );
                        ctx.moveTo( width - margin - 16, posY + 5 );
                        ctx.lineTo( width - margin - 6, posY + H*0.5 );
                        ctx.lineTo( width - margin - 16, posY + H - 5 );
                        ctx.fill();
                        ctx.fillStyle = "#999";
                        ctx.fillText( w.name,  margin*2 + 5, y + H*0.7 );
                        ctx.fillStyle = "#DDD";
                        ctx.textAlign = "center";
                        if(w.type == "number")
                            ctx.fillText( Number(w.value).toFixed( w.options.precision !== undefined ? w.options.precision : 3), width - margin*2 - 20, y + H*0.7 );
                        else
                            ctx.fillText( w.value, width/2, y + H*0.7 );
                    }
                    break;
                case "string":
                case "text":
                
                        ctx.textAlign = "left";
                        ctx.strokeStyle = outline_color;
                        ctx.fillStyle = background_color;
                        ctx.beginPath();
                        ctx.roundRect( margin, y, width - margin*2, H,H*0.5 );
                        ctx.fill();
                        ctx.stroke();
                        if(show_text)
                        {
                            ctx.fillStyle = "#999";
                            if(w.name != null)
                                ctx.fillText( w.name, margin*2, y + H*0.7 );
                            ctx.fillStyle = "#DDD";
                            ctx.textAlign = "right";
                            ctx.fillText( w.value, width - margin*2, y + H*0.7 );
                        }
                    break;
                default:
                    if(w.draw)
                        w.draw(ctx,node,w,y,H);
                    break;
            }
            posY += H + 4;
        }
        ctx.restore();
    }

    processNodeBindings( node, cursor, event )
    {        
        if (!node) return;
        if (!node.hasBindings) return;
        if (!node.inputs) return;
        
        for (var i = 0; i < node.inputs.length; i++) 
        {
            if (!node.inputs[i].binding) continue;
            if (node.inputs[i].link) continue;

            let pos = node.getConnectionPos(this.instance.INPUT, i);        
            let x = pos[0];// - node.pos[0];
            let y = pos[1];// - node.pos[1];

            //pos[0] - width - margin
            //pos[1] - (height / 2)
            //width
            //height


            //if (cursor[0] < x - this.instance.BINDING_MARGIN && cursor[0] > x - this.instance.BINDING_WIDTH - this.instance.BINDING_MARGIN)
            //    console.log("X YES");
    //
            //if (cursor[0] < x - this.instance.BINDING_MARGIN && cursor[0] > x - this.instance.BINDING_WIDTH - this.instance.BINDING_MARGIN)
            //    console.log("Y YES");

            if (LUtil.isInsideRectangle(cursor[0], cursor[1],
                x - this.instance.BINDING_WIDTH - this.instance.BINDING_MARGIN, y - (this.instance.BINDING_HEIGHT / 2),
                this.instance.BINDING_WIDTH, this.instance.BINDING_HEIGHT)) {
                    
                this.setCursor('text');

                //this.canvas.style.cursor = "pointer";
                if (event.type == "mousedown")
                {
                    if (this.graph.history) this.graph.history.recordNode(node, ['properties']);                    
                    this.emit('bindings:selected', {
                        node:       node,
                        binding:    node.inputs[i].binding, 
                        set:        node.inputs[i].binding.setValue
                    });

                    //this.createInputModal(node.inputs[i].binding, node.inputs[i].binding.setValue);
                }
            }

        }
    }

    /**
    * process an event on widgets 
    * @method processNodeWidgets
    **/
    processNodeWidgets( node, pos, event, active_widget )
    {
        if(!node.widgets || !node.widgets.length)
            return null;

        var x = pos[0] - node.pos[0];
        var y = pos[1] - node.pos[1];
        var width = node.size[0];
        var that = this;
        var ref_window = this.getCanvasWindow();

        for(var i = 0; i < node.widgets.length; ++i)
        {
            var w = node.widgets[i];
            if( w == active_widget || (x > 6 && x < (width - 12) && y > w.last_y && y < (w.last_y + this.instance.NODE_WIDGET_HEIGHT)) )
            {
                //inside widget
                switch( w.type )
                {
                    case "button": 
                        if(event.type === 'mousemove'){
                            break
                        }
                        if(w.callback)
                            setTimeout( function(){	w.callback( w, that, node, pos ); }, 20 );
                        w.clicked = true;
                        this.dirty_canvas = true;
                        break;
                    case "slider": 
                        var range = w.options.max - w.options.min;
                        var nvalue = LUtil.clamp( (x - 10) / (width - 20), 0, 1);
                        w.value = w.options.min + (w.options.max - w.options.min) * nvalue;
                        if(w.callback)
                            setTimeout( function(){	inner_value_change( w, w.value ); }, 20 );
                        this.dirty_canvas = true;
                        break;
                    case "number": 
                    case "combo": 
                        if(event.type == "mousemove" && w.type == "number")
                        {
                            w.value += (event.deltaX * 0.1) * (w.options.step || 1);
                            if(w.options.min != null && w.value < w.options.min)
                                w.value = w.options.min;
                            if(w.options.max != null && w.value > w.options.max)
                                w.value = w.options.max;
                                
                            if (this.graph.history) this.graph.history.recordNode(node, ['properties']);
                        }
                        else if( event.type == "mousedown" )
                        {
                            var values = w.options.values;
                            if(values && values.constructor === Function)
                                values = w.options.values( w, node );

                            var delta = ( x < 40 ? -1 : ( x > width - 40 ? 1 : 0) );
                            if (w.type == "number")
                            {
                                w.value += delta * 0.1 * (w.options.step || 1);
                                if(w.options.min != null && w.value < w.options.min)
                                    w.value = w.options.min;
                                if(w.options.max != null && w.value > w.options.max)
                                    w.value = w.options.max;
                                    
                                if (this.graph.history) this.graph.history.recordNode(node, ['properties']);
                            }
                            else if(delta)
                            {
                                var index = values.indexOf( w.value ) + delta;
                                if( index >= values.length )
                                    index = 0;
                                if( index < 0 )
                                    index = values.length - 1;

                                w.value = values[ index ];
                                if (this.graph.history) this.graph.history.recordNode(node, ['properties']);
                            }
                            else
                            {
                                var menu = new ContextMenu( values, { scale: Math.max(1,this.ds.scale), event: event, className: "dark", callback: inner_clicked.bind(w) }, ref_window );
                                function inner_clicked( v, option, event )
                                {
                                    if (v != this.value) {
                                        if (this.graph.history) this.graph.history.recordNode(node, ['properties']);
                                        this.value = v;
                                        inner_value_change( this, v );
                                        that.dirty_canvas = true;
                                    }
                                    return false;
                                }
                            }
                        }
                        setTimeout( (function(){ inner_value_change( this, this.value ); }).bind(w), 20 );
                        this.dirty_canvas = true;
                        break;
                    case "toggle":
                        if( event.type == "mousedown" )
                        {
                            w.value = !w.value;
                            if(w.callback)
                                setTimeout( function(){	inner_value_change( w, w.value ); }, 20 );
                        }
                        break;
                    case "string":
                    case "text":
                    case "boolean":
                        if( event.type == "mousedown" )
                        {
                            //this.createValueModal("text", w.name, w.onChangeCallback );
                            this.createInputModal(w.modalInput, w.callback);
                            //this.prompt( "Value", w.value, (function(v){ this.value = v; inner_value_change( this, v ); }).bind(w), event );
                        }
                        break;
                        
                    default: 
                        if( w.mouse )
                            w.mouse( ctx, event, [x,y], node );
                        break;
                }

                return w;
            }
        }

        function inner_value_change( widget, value )
        {
            widget.value = value;
            //if(widget.property && node.properties[ widget.property ] !== undefined )
            //    node.properties[ widget.property ] = value;
                
            //if (widget.callback)
            //    widget.callback(widget);
            if(widget.callback)
                widget.callback( widget.value, that, node, pos, event );			
        }

        return null;
    }

    /**
    * draws every group area in the background
    * @method drawGroups
    **/
    drawGroups(canvas, ctx)
    {
        if(!this.graph)
            return;

        var groups = this.graph._groups;

        ctx.save();
        ctx.globalAlpha = 0.5 * this.editor_alpha;

        for(var i = 0; i < groups.length; ++i)
        {
            var group = groups[i];

            if(!LUtil.overlapBounding( this.visible_area, group._bounding ))
                continue; //out of the visible area

            ctx.fillStyle = group.color || "#335";
            ctx.strokeStyle = group.color || "#335";
            var pos = group._pos;
            var size = group._size;
            ctx.globalAlpha = 0.25 * this.editor_alpha;
            ctx.beginPath();
            ctx.rect( pos[0] + 0.5, pos[1] + 0.5, size[0], size[1] );
            ctx.fill();
            ctx.globalAlpha = this.editor_alpha;;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo( pos[0] + size[0], pos[1] + size[1] );
            ctx.lineTo( pos[0] + size[0] - 10, pos[1] + size[1] );
            ctx.lineTo( pos[0] + size[0], pos[1] + size[1] - 10 );
            ctx.fill();

            var font_size = (group.font_size || this.instance.DEFAULT_GROUP_FONT_SIZE);
            ctx.font = font_size + "px Arial";
            ctx.fillText( group.title, pos[0] + 4, pos[1] + font_size );
        }

        ctx.restore();
    }

    adjustNodesSize()
    {
        var nodes = this.graph._nodes;
        for(var i = 0; i < nodes.length; ++i)
            nodes[i].size = nodes[i].computeSize();
        this.setDirty(true,true);
    }


    /**
    * resizes the canvas to a given size, if no size is passed, then it tries to fill the parentNode
    * @method resize
    **/
    resize(width, height)
    {
        if(!width && !height)
        {
            var parent = this.canvas.parentNode;
            width = parent.offsetWidth;
            height = parent.offsetHeight;
        }

        if(this.canvas.width == width && this.canvas.height == height)
            return;

        this.canvas.width = width;
        this.canvas.height = height;
        this.bgcanvas.width = this.canvas.width;
        this.bgcanvas.height = this.canvas.height;
        this.setDirty(true,true);
    }

    /**
    * switches to live mode (node shapes are not rendered, only the content)
    * this feature was designed when graphs where meant to create user interfaces
    * @method switchLiveMode
    **/
    switchLiveMode(transition)
    {
        if(!transition)
        {
            this.live_mode = !this.live_mode;
            this.dirty_canvas = true;
            this.dirty_bgcanvas = true;
            return;
        }

        var self = this;
        var delta = this.live_mode ? 1.1 : 0.9;
        if(this.live_mode)
        {
            this.live_mode = false;
            this.editor_alpha = 0.1;
        }

        var t = setInterval(function() {
            self.editor_alpha *= delta;
            self.dirty_canvas = true;
            self.dirty_bgcanvas = true;

            if(delta < 1  && self.editor_alpha < 0.01)
            {
                clearInterval(t);
                if(delta < 1)
                    self.live_mode = true;
            }
            if(delta > 1 && self.editor_alpha > 0.99)
            {
                clearInterval(t);
                self.editor_alpha = 1;
            }
        },1);
    }

    onNodeSelectionChange(node)
    {
        return; //disabled
    }

    touchHandler(event)
    {
        //alert("foo");
        var touches = event.changedTouches,
            first = touches[0],
            type = "";

            switch(event.type)
        {
            case "touchstart": type = "mousedown"; break;
            case "touchmove":  type = "mousemove"; break;
            case "touchend":   type = "mouseup"; break;
            default: return;
        }

        //initMouseEvent(type, canBubble, cancelable, view, clickCount,
        //           screenX, screenY, clientX, clientY, ctrlKey,
        //           altKey, shiftKey, metaKey, button, relatedTarget);

        if (event.touches.length > 0) {
            this._previousTouchButton = event.touches.length - 1;
        }

        var window = this.getCanvasWindow();
        var document = window.document;

        var simulatedEvent = document.createEvent("MouseEvent");
        simulatedEvent.initMouseEvent(type, true, true, window, 1,
                                first.screenX, first.screenY,
                                first.clientX, first.clientY, false,
                                false, false, false, this._previousTouchButton, null);
        first.target.dispatchEvent(simulatedEvent);
        event.preventDefault();
    }

    /* CONTEXT MENU ********************/

    static onGroupAdd(info,entry,mouse_event)
    {
        var canvas = LiteCanvas.active;
        var ref_window = canvas.getCanvasWindow();
            
        //MIGRATE: LGraphGroup
        var group = new LGraphGroup();
        group.pos = canvas.convertEventToCanvasOffset( mouse_event );
        canvas.graph.add( group );
    }

    static onMenuAdd( node, options, e, prev_menu )
    {
        var canvas = LiteCanvas.active;
        var ref_window = canvas.getCanvasWindow();

        var values = canvas.instance.getNodeTypesCategories();
        var entries = [];
        for(var i in values) 
        {
            if(values[i])
            {
                entries.push({ value: values[i], content: values[i], has_submenu: true });
            }
        } 

        //show categories
        var menu = new ContextMenu( entries, { event: e, callback: inner_clicked, parentMenu: prev_menu }, ref_window);

        function inner_clicked( v, option, e )
        {
            var category = v.value;
            var node_types = this.instance.getNodeTypesInCategory( category, canvas.filter );
            var values = [];
            for(var i in node_types) 
            {
                if (!node_types[i].skip_list) 
                {
                    values.push( { content: node_types[i].title, value: node_types[i].type });
                }
            }

            new ContextMenu( values, {event: e, callback: inner_create, parentMenu: menu }, ref_window);
            return false;
        }

        function inner_create( v, e )
        {
            var first_event = prev_menu.getFirstEvent();
            canvas.graph.create(v.value, { pos: canvas.convertEventToCanvasOffset( first_event ) });
            //var node = this.instance.createNode( v.value );
            //if(node)
            //{
            //    node.pos = canvas.convertEventToCanvasOffset( first_event );
            //	    canvas.graph.add( node );
            //}
        }

        return false;
    }

    static onMenuCollapseAll()
    {

    }


    static onMenuNodeEdit()
    {

    }

    static showMenuNodeOptionalInputs( v, options, e, prev_menu, node )
    {
        if(!node)
            return;

        var that = this;
        var canvas = LiteCanvas.active;
        var ref_window = canvas.getCanvasWindow();

        var options = node.optional_inputs;
        if(node.onGetInputs)
            options = node.onGetInputs();

        var entries = [];
        if(options)
            for (var i in options)
            {
                var entry = options[i];
                if(!entry)
                {
                    entries.push(null);
                    continue;
                }
                var label = entry[0];
                if(entry[2] && entry[2].label)
                    label = entry[2].label;
                var data = {content: label, value: entry};
                if(entry[1] == this.instance.ACTION)
                    data.className = "event";
                entries.push(data);
            }

        if(this.onMenuNodeInputs)
            entries = this.onMenuNodeInputs( entries );

        if(!entries.length)
            return;

        var menu = new ContextMenu(entries, { event: e, callback: inner_clicked, parentMenu: prev_menu, node: node }, ref_window);

        function inner_clicked(v, e, prev)
        {
            if(!node)
                return;

            if(v.callback)
                v.callback.call( that, node, v, e, prev );

            if(v.value)
            {
                node.addInput(v.value[0],v.value[1], v.value[2]);
                node.setDirtyCanvas(true,true);
            }
        }

        return false;
    }

    static showMenuNodeOptionalOutputs( v, options, e, prev_menu, node )
    {
        if(!node)
            return;

        var that = this;
        var canvas = LiteCanvas.active;
        var ref_window = canvas.getCanvasWindow();

        var options = node.optional_outputs;
        if(node.onGetOutputs)
            options = node.onGetOutputs();

        var entries = [];
        if(options)
            for (var i in options)
            {
                var entry = options[i];
                if(!entry) //separator?
                {
                    entries.push(null);
                    continue;
                }

                if(node.flags && node.flags.skip_repeated_outputs && node.findOutputSlot(entry[0]) != -1)
                    continue; //skip the ones already on
                var label = entry[0];
                if(entry[2] && entry[2].label)
                    label = entry[2].label;
                var data = {content: label, value: entry};
                if(entry[1] == this.instance.EVENT)
                    data.className = "event";
                entries.push(data);
            }

        if(this.onMenuNodeOutputs)
            entries = this.onMenuNodeOutputs( entries );

        if(!entries.length)
            return;

        var menu = new ContextMenu(entries, {event: e, callback: inner_clicked, parentMenu: prev_menu, node: node }, ref_window);

        function inner_clicked( v, e, prev )
        {
            if(!node)
                return;

            if(v.callback)
                v.callback.call( that, node, v, e, prev );

            if(!v.value)
                return;

            var value = v.value[1];

            if(value && (value.constructor === Object || value.constructor === Array)) //submenu why?
            {
                var entries = [];
                for(var i in value)
                    entries.push({ content: i, value: value[i]});
                new ContextMenu( entries, { event: e, callback: inner_clicked, parentMenu: prev_menu, node: node });
                return false;
            }
            else
            {
                node.addOutput( v.value[0], v.value[1], v.value[2]);
                node.setDirtyCanvas(true,true);
            }

        }

        return false;
    }

    static onShowMenuNodeProperties( value, options, e, prev_menu, node )
    {
        var canvas = LiteCanvas.active;
        canvas.emit("context:properties", { value, options, event: e, prev_menu, node });
        /*
        if(!node || !node.properties)
            return;

        var that = this;
        var canvas = LiteCanvas.active;
        var ref_window = canvas.getCanvasWindow();

        var entries = [];
            for (var i in node.properties)
            {
                var value = node.properties[i] !== undefined ? node.properties[i] : " ";
                //value could contain invalid html characters, clean that
                value = LiteCanvas.decodeHTML(value);
                entries.push({content: "<span class='property_name'>" + i + "</span>" + "<span class='property_value'>" + value + "</span>", value: i});
            }
        if(!entries.length)
            return;

        var menu = new ContextMenu(entries, {event: e, callback: inner_clicked, parentMenu: prev_menu, allow_html: true, node: node },ref_window);

        function inner_clicked( v, options, e, prev )
        {
            if(!node)
                return;
            var rect = this.getBoundingClientRect();
            canvas.showEditPropertyValue( node, v.value, { position: [rect.left, rect.top] });
        }
        */
        return false;
    }

    static decodeHTML( str )
    {
        var e = document.createElement("div");
        e.innerText = str;
        return e.innerHTML;
    }

    static onResizeNode( value, options, e, menu, node )
    {
        if(!node)
            return;
        node.size = node.computeSize();
        node.setDirtyCanvas(true,true);
    }

    showLinkMenu( link, e )
    {
        var that = this;

        new ContextMenu(["Delete"], { event: e, callback: inner_clicked });

        function inner_clicked(v)
        {
            switch(v)
            {
                case "Delete": that.graph.removeLink( link.id ); break;
                default:
            }
        }

        return false;
    }

    static onShowPropertyEditor( item, options, e, menu, node )
    {
        var input_html = "";
        var property = item.property || "title";
        var value = node[ property ];

        var dialog = document.createElement("div");
        dialog.className = "graphdialog";
        dialog.innerHTML = "<span class='name'></span><input  data-lpignore='true'  autofocus type='text' class='value'/><button>OK</button>";
        var title = dialog.querySelector(".name");
        title.innerText = property;
        var input = dialog.querySelector("input");
        if(input)
        {
            input.value = value;
            input.addEventListener("blur", function(e){
                this.focus();
            });
            input.addEventListener("keydown", function(e){
                if(e.keyCode != 13)
                    return;
                inner();
                e.preventDefault();
                //l e.stopPropagation();
            });
        }

        var graphcanvas = LiteCanvas.active;
        var canvas = graphcanvas.canvas;

        var rect = canvas.getBoundingClientRect();
        var offsetx = -20;
        var offsety = -20;
        if(rect)
        {
            offsetx -= rect.left;
            offsety -= rect.top;
        }

        if( event )
        {
            dialog.style.left = (event.clientX + offsetx) + "px";
            dialog.style.top = (event.clientY + offsety)+ "px";
        }
        else
        {
            dialog.style.left = (canvas.width * 0.5 + offsetx) + "px";
            dialog.style.top = (canvas.height * 0.5 + offsety) + "px";
        }

        var button = dialog.querySelector("button");
        button.addEventListener("click", inner );
        canvas.parentNode.appendChild( dialog );

        function inner()
        {
            setValue( input.value );
        }

        function setValue(value)
        {
            if( item.type == "Number" )
                value = Number(value);
            else if( item.type == "Boolean" )
                value = Boolean(value);
            node[ property ] = value;
            if(dialog.parentNode)
                dialog.parentNode.removeChild( dialog );
            node.setDirtyCanvas(true,true);
        }
    }

    prompt( title, value, callback, event )
    {
        var that = this;
        var input_html = "";
        title = title || "";

        var modified = false;

        var dialog = document.createElement("div");
        dialog.className = "graphdialog rounded";
        dialog.innerHTML = "<span class='name'></span> <input  data-lpignore='true'  autofocus type='text' class='value'/><button class='rounded'>OK</button>";
        dialog.close = function()
        {
            that.prompt_box = null;
            if(dialog.parentNode)
                dialog.parentNode.removeChild( dialog );
        }

        if(this.ds.scale > 1)
            dialog.style.transform = "scale("+this.ds.scale+")";

        dialog.addEventListener("mouseleave",function(e){
            if(!modified)
                dialog.close();
        });

        if(that.prompt_box)
            that.prompt_box.close();
        that.prompt_box = dialog;

        var first = null;
        var timeout = null;
        var selected = null;

        var name_element = dialog.querySelector(".name");
        name_element.innerText = title;
        var value_element = dialog.querySelector(".value");
        value_element.value = value;

        var input = dialog.querySelector("input");
        input.addEventListener("keydown", function(e){
            modified = true;
            if(e.keyCode == 27) //ESC
                dialog.close();
            else if(e.keyCode == 13)
            {
                if( callback )
                    callback( this.value );
                dialog.close();
            }
            else
                return;
            e.preventDefault();
            //l e.stopPropagation();
        });

        var button = dialog.querySelector("button");
        button.addEventListener("click", function(e){
            if( callback )
                callback( input.value );
            that.setDirty(true);
            dialog.close();		
        });

        var graphcanvas = LiteCanvas.active;
        var canvas = graphcanvas.canvas;

        var rect = canvas.getBoundingClientRect();
        var offsetx = -20;
        var offsety = -20;
        if(rect)
        {
            offsetx -= rect.left;
            offsety -= rect.top;
        }

        if( event )
        {
            dialog.style.left = (event.clientX + offsetx) + "px";
            dialog.style.top = (event.clientY + offsety)+ "px";
        }
        else
        {
            dialog.style.left = (canvas.width * 0.5 + offsetx) + "px";
            dialog.style.top = (canvas.height * 0.5 + offsety) + "px";
        }

        canvas.parentNode.appendChild( dialog );
        setTimeout( function(){	input.focus(); },10 );

        return dialog;
    }


    static search_limit = -1;
    showSearchBox(event, link = null)
    {
        var that = this;
        var input_html = "";

        var dialog = document.createElement("div");
        dialog.className = "litegraph litesearchbox";
        dialog.innerHTML = "<span class='name'><i class='far fa-search'></i></span> <input  data-lpignore='true'  autofocus type='text' class='value rounded'/><div class='helper'></div>";
        dialog.close = function()
        {
            if (link) that.onSearchBox = null;
            that.search_box = null;
            that.setDirty(true, true);
            document.body.focus();
            setTimeout( function(){ that.canvas.focus(); },20 ); //important, if canvas loses focus keys wont be captured
            if(dialog.parentNode)
                dialog.parentNode.removeChild( dialog );
        }

        var timeout_close = null;
        var mouse_has_entered = false;
        var onlyShowDropTypes = false;

        if (link)
        {
            that.onSearchBox =function(str, graphcanvas)
            {           
                let search = str ? str.toLowerCase() : "";
                let results = [];
                for (var i in this.instance.registered_node_types)
                {
                    let type = this.instance.registered_node_types[i];

                    //Skip the unsearchable
                    if (type.searchable !== null && type.searchable === false)
                        continue;

                    if (onlyShowDropTypes && !type.dropTypes)
                        continue;

                    if (str.length > 0 && i.indexOf(search) == -1 && type.title.toLowerCase().indexOf(search) == -1)
                        continue;

                    if (type.dropTypes)
                    {
                        for (var s in type.dropTypes)
                        {
                            if (this.instance.isValidConnection(link.type, type.dropTypes[s]))
                            {
                                results.push({ type: i, extra: { slot: s }});
                                break;
                            }
                        }
                    }
                    else
                    {
                        //console.warn("Performing slow check for " + i);
                        var n = this.instance.createNode(i);
                        if (!n || !n.inputs) continue;

                        for (var s in n.inputs)
                        {
                            if (this.instance.isValidConnection(link.type, n.inputs[s].type))
                            {
                                results.push({ type: i, extra: { slot: s }});
                                break;
                            }
                        }
                    }
                }

                return results;
            }
        }

        //Why would you ever want that?!
        //if(this.ds.scale > 1)
        //	dialog.style.transform = "scale("+this.ds.scale+")";

        dialog.addEventListener("mouseenter",function(e){
            mouse_has_entered = true;
            if(timeout_close)
            {
                clearTimeout(timeout_close);
                timeout_close = null;
            }
        });

        dialog.addEventListener("mouseleave",function(e){
            //dialog.close();
            timeout_close = setTimeout(function(){
                dialog.close();
            },500);
        });

        if(that.search_box)
            that.search_box.close();
        that.search_box = dialog;

        var helper = dialog.querySelector(".helper");

        var first = null;
        var timeout = null;
        var selected = null;

        var input = dialog.querySelector("input");
        if(input)
        {
            input.addEventListener("blur", function(e){ this.focus(); });
            input.addEventListener("keydown", function(e){

                if(e.keyCode == 38) //UP
                    changeSelection(false);
                else if(e.keyCode == 40) //DOWN
                    changeSelection(true);
                else if(e.keyCode == 27) //ESC
                    dialog.close();
                else if(e.keyCode == 13)
                {
                    if(selected)
                        select(selected.innerHTML )
                    else if(first)
                        select(first );
                    else
                        dialog.close();
                }
                else
                {
                    if(timeout) clearInterval(timeout);
                    timeout = setTimeout( refreshHelper, 10 );
                    return;
                }
                e.preventDefault();
                //l e.stopPropagation();
            });
        }

        var graph = this.graph;
        var graphcanvas = this;//LiteCanvas.active;
        var canvas = graphcanvas.canvas;

        var rect = canvas.getBoundingClientRect();
        var offsetx = -20;
        var offsety = -20;
        if(rect)
        {
            offsetx -= rect.left;
            offsety -= rect.top;
        }

        if(event && event.clientX)
        {
            dialog.style.left = (event.clientX) + "px";
            dialog.style.top = (event.clientY )+ "px";
            dialog.clientX = event.canvasX;
            dialog.clientY = event.canvasY + 10;
        }
        else
        {
            dialog.style.left = (canvas.width * 0.5 + offsetx) + "px";
            dialog.style.top = (canvas.height * 0.5 + offsety) + "px";
            dialog.clientX = (canvas.width * 0.5 + offsetx);
            dialog.clientY = (canvas.height * 0.5 + offsety);
            
        }

        //canvas.parentNode.appendChild( dialog );
        document.body.appendChild(dialog);
        input.focus();

        function select(name, extra = null)
        {
            if(name)
            {
                if( that.onSearchBoxSelection )
                {
                    console.log("onSearchBoxSelection", name, this);
                    that.onSearchBoxSelection( name, event, graphcanvas );
                }
                else
                {
                    //var extra = this.instance.searchbox_extras[ name ];
                    //if( extra ) name = extra.type;

                    console.log("Creating Node ", name, this, extra);
                    var new_node = graph.create(name, { pos: [ graphcanvas.canvas_mouse[0], graphcanvas.canvas_mouse[1] ] });
                    if (link && new_node)
                    {
                        console.log("Creating Link", link, extra);
                        link.node.connect(link.slot, new_node, Number(extra.slot) );
                    }
                }
            }

            dialog.close();
        }

        function changeSelection( forward )
        {
            var prev = selected;
            if(selected)
                selected.classList.remove("selected");
            if(!selected)
                selected = forward ? helper.childNodes[0] : helper.childNodes[ helper.childNodes.length ];
            else
            {
                selected = forward ? selected.nextSibling : selected.previousSibling;
                if(!selected)
                    selected = prev;
            }
            if(!selected)
                return;
            
            selected.classList.add("selected");
            selected.scrollIntoView();
        }

        function refreshHelper() {
            timeout = null;
            var str = input.value;
            first = null;
            helper.innerHTML = "";

            if (that.onSearchBox) 
            {
                var list = that.onSearchBox(str, graphcanvas );
                if(list) {
                    for( var i = 0; i < list.length; ++i )
                        addResult(list[i].type, list[i].extra );
                }
            } 
            else 
            {

                //Make sure we have an actual string
                if (!str) return;
                str = str.toLowerCase();

            
                //Legacy support for those who do not have filter
                var c = 0;
                for (var i in this.instance.registered_node_types)
                {
                    let type = this.instance.registered_node_types[i];

                    //Skip the unsearchable
                    if (type.searchable !== null && type.searchable === false)
                        continue;

                    if (i.indexOf(str) != -1 || type.title.toLowerCase().indexOf(str) != -1)
                    {
                        addResult(i, type.title);

                        //Abort with many results
                        if(LiteCanvas.search_limit !== -1 && c++ > LiteCanvas.search_limit)
                            break;
                    }
                }
            }

            function addResult( type, extra )
            {
                var help = document.createElement("div");
                if (!first) first = type;
                
                help.innerText = type;
                help.dataset["type"] = escape(type);
                help.extra = extra;
                help.className = "litegraph lite-search-item";
                //if( className ) help.className +=  " " + className;
                
                help.addEventListener("click", function (e) {
                    select( unescape( this.dataset["type"] ), this.extra );
                });
                helper.appendChild(help);
            }
        }


        if (link)
            refreshHelper();
            
        return dialog;
    }

    showEditPropertyValue( node, property, options )
    {
        if(!node || node.properties[ property ] === undefined )
            return;

        options = options || {};
        var that = this;

        var type = "string";

        if(node.properties[ property ] !== null)
            type = typeof(node.properties[ property ]);

        //for arrays
        if(type == "object")
        {
            if( node.properties[ property ].length )
                type = "array";
        }

        var info = null;
        if(node.getPropertyInfo)
            info = node.getPropertyInfo(property);
        if(node.properties_info)
        {
            for(var i = 0; i < node.properties_info.length; ++i)
            {
                if( node.properties_info[i].name == property )
                {
                    info = node.properties_info[i];
                    break;
                }
            }
        }

        if(info !== undefined && info !== null && info.type )
            type = info.type;

        var input_html = "";

        if(type == "string" || type == "number" || type == "array")
            input_html = "<input  data-lpignore='true'  autofocus type='text' class='value'/>";
        else if(type == "enum" && info.values)
        {
            input_html = "<select autofocus type='text' class='value'>";
            for(var i in info.values)
            {
                var v = info.values.constructor === Array ? info.values[i] : i;
                input_html += "<option value='"+v+"' "+(v == node.properties[property] ? "selected" : "")+">"+info.values[i]+"</option>";
            }
            input_html += "</select>";
        }
        else if(type == "boolean")
        {
            input_html = "<input  data-lpignore='true'  autofocus type='checkbox' class='value' "+(node.properties[property] ? "checked" : "")+"/>";
        }
        else
        {
            console.warn("unknown type: " + type );
            return;
        }

        var dialog = this.createDialog( "<span class='name'>" + property + "</span>"+input_html+"<button>OK</button>" , options );

        if(type == "enum" && info.values)
        {
            var input = dialog.querySelector("select");
            input.addEventListener("change", function(e){
                setValue( e.target.value );
                //var index = e.target.value;
                //setValue( e.options[e.selectedIndex].value );
            });
        }
        else if(type == "boolean")
        {
            var input = dialog.querySelector("input");
            if(input)
            {
                input.addEventListener("click", function(e){
                    setValue( !!input.checked );
                });
            }
        }
        else
        {
            var input = dialog.querySelector("input");
            if(input)
            {
                input.addEventListener("blur", function(e){
                    this.focus();
                });
                input.value = node.properties[ property ] !== undefined ? node.properties[ property ] : "";
                input.addEventListener("keydown", function(e){
                    if(e.keyCode != 13)
                        return;
                    inner();
                    e.preventDefault();
                    //l e.stopPropagation();
                });
            }
        }

        var button = dialog.querySelector("button");
        button.addEventListener("click", inner );

        function inner()
        {
            setValue( input.value );
        }

        function setValue(value)
        {
            if(typeof( node.properties[ property ] ) == "number")
                value = Number(value);
            if(type == "array")
                value = value.split(",").map(Number);
            node.properties[ property ] = value;
            if(node._graph)
                node._graph._version++;
            if(node.onPropertyChanged)
                node.onPropertyChanged( property, value );
            dialog.close();
            node.setDirtyCanvas(true,true);
        }
    }

    createDialog( html, options )
    {
        options = options || {};

        var dialog = document.createElement("div");
        dialog.className = "graphdialog";
        dialog.innerHTML = html;

        var rect = this.canvas.getBoundingClientRect();
        var offsetx = -20;
        var offsety = -20;
        if(rect)
        {
            offsetx -= rect.left;
            offsety -= rect.top;
        }

        if( options.position )
        {
            offsetx += options.position[0];
            offsety += options.position[1];
        }
        else if( options.event )
        {
            offsetx += options.event.clientX;
            offsety += options.event.clientY;
        }
        else //centered
        {
            offsetx += this.canvas.width * 0.5;
            offsety += this.canvas.height * 0.5;
        }

        dialog.style.left = offsetx + "px";
        dialog.style.top = offsety + "px";

        this.canvas.parentNode.appendChild( dialog );

        dialog.close()
        {
            if(this.parentNode)
                this.parentNode.removeChild( this );
        }

        return dialog;
    }


    static onMenuNodeCollapse( value, options, e, menu, node )
    {
        node.collapse();
    }

    static onMenuNodePin( value, options, e, menu, node )
    {
        node.pin();
    }

    static onMenuNodeMode( value, options, e, menu, node )
    {
        new ContextMenu(["Always","On Event","On Trigger","Never"], {event: e, callback: inner_clicked, parentMenu: menu, node: node });

        function inner_clicked(v)
        {
            if(!node)
                return;
            switch(v)
            {
                case "On Event": node.mode = this.instance.ON_EVENT; break;
                case "On Trigger": node.mode = this.instance.ON_TRIGGER; break;
                case "Never": node.mode = this.instance.NEVER; break;
                case "Always":
                default:
                    node.mode = this.instance.ALWAYS; break;
            }
        }

        return false;
    }

    static onMenuNodeColors( value, options, e, menu, node )
    {
        if(!node)
            throw("no node for color");

        var values = [];
        values.push({ value:null, content:"<span style='display: block; padding-left: 4px;'>No color</span>" });

        for(var i in LiteCanvas.node_colors)
        {
            var color = LiteCanvas.node_colors[i];
            var value = { value:i, content:"<span style='display: block; color: #999; padding-left: 4px; border-left: 8px solid "+color.color+"; background-color:"+color.bgcolor+"'>"+i+"</span>" };
            values.push(value);
        }
        new ContextMenu( values, { event: e, callback: inner_clicked, parentMenu: menu, node: node });

        function inner_clicked(v)
        {
            if(!node)
                return;

            var color = v.value ? LiteCanvas.node_colors[ v.value ] : null;
            if(color)
            {
                if(node.constructor === this.instance.LGraphGroup)
                    node.color = color.groupcolor;
                else
                {
                    node.color = color.color;
                    node.bgcolor = color.bgcolor;
                }
            }
            else
            {
                delete node.color;
                delete node.bgcolor;
            }
            node.setDirtyCanvas(true,true);
        }

        return false;
    }

    static onMenuNodeShapes( value, options, e, menu, node )
    {
        if(!node)
            throw("no node passed");

        new ContextMenu( ValidNodeShapes, { event: e, callback: inner_clicked, parentMenu: menu, node: node });

        function inner_clicked(v)
        {
            if(!node) return;
            node.shape = v;
            console.log("Node Shape", node, node.shape);
            node.setDirtyCanvas(true);
        }

        return false;
    }

    static onMenuNodeRemove( value, options, e, menu, node )
    {
        if(!node)
            throw("no node passed");

        if(node.removable === false)
            return;

        node.graph.remove(node);
        node.setDirtyCanvas(true,true);
    }

    static onMenuNodeClone( value, options, e, menu, node )
    {
        if(node.clonable == false) return;
        var newnode = node.clone();
        if(!newnode)
            return;
        newnode.pos = [node.pos[0]+5,node.pos[1]+5];
        node.graph.add(newnode);
        node.setDirtyCanvas(true,true);
    }

    static node_colors = {
        "red": { color:"#322", bgcolor:"#533", groupcolor: "#A88" },
        "brown": { color:"#332922", bgcolor:"#593930", groupcolor: "#b06634" },
        "green": { color:"#232", bgcolor:"#353", groupcolor: "#8A8" },
        "blue": { color:"#223", bgcolor:"#335", groupcolor: "#88A" },
        "pale_blue": { color:"#2a363b", bgcolor:"#3f5159", groupcolor: "#3f789e" },
        "cyan": { color:"#233", bgcolor:"#355", groupcolor: "#8AA" },
        "purple": { color:"#323", bgcolor:"#535", groupcolor: "#a1309b" },
        "yellow": { color:"#432", bgcolor:"#653", groupcolor: "#b58b2a" },
        "black": { color:"#222", bgcolor:"#000", groupcolor: "#444" }
    };

    getCanvasMenuOptions()
    {
        var options = null;
        if(this.getMenuOptions)
            options = this.getMenuOptions();
        else
        {
            options = [
                { content:"Add Node", has_submenu: true, callback: LiteCanvas.onMenuAdd },
                { content:"Add Group", callback: LiteCanvas.onGroupAdd }
                //{content:"Collapse All", callback: LiteCanvas.onMenuCollapseAll }
            ];

            if(this._graph_stack && this._graph_stack.length > 0)
                options.push(null,{content:"Close subgraph", callback: this.closeSubgraph.bind(this) });
        }

        if(this.getExtraMenuOptions)
        {
            var extra = this.getExtraMenuOptions(this,options);
            if(extra)
                options = options.concat( extra );
        }

        return options;
    }

    //called by processContextMenu to extract the menu list
    getNodeMenuOptions( node )
    {
        var options = null;

        if(node.getMenuOptions)
            options = node.getMenuOptions(this);
        else
            options = [
                {content:"Inputs", has_submenu: true, disabled:true, callback: LiteCanvas.showMenuNodeOptionalInputs },
                {content:"Outputs", has_submenu: true, disabled:true, callback: LiteCanvas.showMenuNodeOptionalOutputs },
                null,
                {content:"Properties", has_submenu: true, callback: LiteCanvas.onShowMenuNodeProperties },
                null,
                {content:"Title", callback: LiteCanvas.onShowPropertyEditor },
                {content:"Mode", has_submenu: true, callback: LiteCanvas.onMenuNodeMode },
                {content:"Resize", callback: LiteCanvas.onResizeNode },
                {content:"Collapse", callback: LiteCanvas.onMenuNodeCollapse },
                {content:"Pin", callback: LiteCanvas.onMenuNodePin },
                {content:"Colors", has_submenu: true, callback: LiteCanvas.onMenuNodeColors },
                {content:"Shapes", has_submenu: true, callback: LiteCanvas.onMenuNodeShapes },
                null
            ];

        if(node.onGetInputs)
        {
            var inputs = node.onGetInputs();
            if(inputs && inputs.length)
                options[0].disabled = false;
        }

        if(node.onGetOutputs)
        {
            var outputs = node.onGetOutputs();
            if(outputs && outputs.length )
                options[1].disabled = false;
        }

        if(node.getExtraMenuOptions)
        {
            var extra = node.getExtraMenuOptions(this);
            if(extra)
            {
                extra.push(null);
                options = extra.concat( options );
            }
        }

        if( node.clonable !== false )
                options.push({content:"Clone", callback: LiteCanvas.onMenuNodeClone });
        if( node.removable !== false )
                options.push(null,{content:"Remove", callback: LiteCanvas.onMenuNodeRemove });

        if(node.graph && node.graph.onGetNodeMenuOptions )
            node.graph.onGetNodeMenuOptions( options, node );

        return options;
    }

    getGroupMenuOptions( node )
    {
        var o = [
            {content:"Title", callback: LiteCanvas.onShowPropertyEditor },
            {content:"Color", has_submenu: true, callback: LiteCanvas.onMenuNodeColors },
            {content:"Font size", property: "font_size", type:"Number", callback: LiteCanvas.onShowPropertyEditor },
            null,
            {content:"Remove", callback: LiteCanvas.onMenuNodeRemove }
        ];

        return o;
    }

    processContextMenu( node, event )
    {
        var that = this;
        var canvas = LiteCanvas.active;
        var ref_window = canvas.getCanvasWindow();

        var menu_info = null;
        var options = { event: event, callback: inner_option_clicked, extra: node };

        //check if mouse is in input
        var slot = null;
        if(node)
        {
            slot = node.getSlotInPosition( event.canvasX, event.canvasY );
            LiteCanvas.active_node = node;
        }

        if(slot) //on slot
        {
            menu_info = [];
            if(slot && slot.output && slot.output.links && slot.output.links.length)
                menu_info.push( { content: "Disconnect Links", slot: slot } );

            if (!slot.locked && (node.expandable || slot.unlocked || slot.removable))
                menu_info.push( { content: "Remove Slot", slot: slot } );
            
            menu_info.push( slot.nameLocked ? "Cannot rename" : { content: "Rename Slot", slot: slot, Node: node } );

            if (node.expandable && !slot.locked)
                menu_info.push({content: "Change Type", slot: slot, Node: node });

            options.title = (slot.input ? slot.input.type : slot.output.type) || "*";
            if(slot.input && slot.input.type == this.instance.ACTION)
                options.title = "Action";
            if(slot.output && slot.output.type == this.instance.EVENT)
                options.title = "Event";
        }
        else
        {
            if( node ) //on node
                menu_info = this.getNodeMenuOptions(node);
            else 
            {
                menu_info = this.getCanvasMenuOptions();
                var group = this.graph.getGroupOnPos( event.canvasX, event.canvasY );
                if( group ) //on group
                    menu_info.push(null,{content:"Edit Group", has_submenu: true, submenu: { title:"Group", extra: group, options: this.getGroupMenuOptions( group ) }});
            }
        }

        //show menu
        if(!menu_info)
            return;

        var menu = new ContextMenu( menu_info, options, ref_window );

        function inner_option_clicked( v, options, e )
        {
            if(!v)
                return;

            if(v.content == "Remove Slot")
            {
                var info = v.slot;
                if(info.input)
                    node.removeInput( info.slot );
                else if(info.output)
                    node.removeOutput( info.slot );
                return;
            }
            else if(v.content == "Disconnect Links")
            {
                var info = v.slot;
                if(info.output)
                    node.disconnectOutput( info.slot );
                else if(info.input)
                    node.disconnectInput( info.slot );
                return;
            }
            else if( v.content == "Rename Slot")
            {
                var info = v.slot;
                var slot_info = info.input ? node.getInputInfo( info.slot ) : node.getOutputInfo( info.slot );
                var dialog = that.createDialog( "<span class='name'>Name</span><input data-lpignore='true' autofocus type='text'/><button>OK</button>" , options );
                var input = dialog.querySelector("input");
                if(input && slot_info){
                    input.value = slot_info.label || "";
                }
                dialog.querySelector("button").addEventListener("click",function(e){
                    if(input.value)
                    {
                        if( slot_info )
                            slot_info.label = input.value;
                        that.setDirty(true);
                    }
                    dialog.close();
                });
            }
            else if (v.content == "Change Type")
            {
                alert("obsolete");
                /*


                let types = [];
                let selected = "";
                for(let t in this.instance.TYPE_FIELDS)
                {
                    if (t == 'array' || t == 'collection') continue;
                    
                    //Edge case for commands to make only things we can cast in this list.
                    if (node.type == "event/command") {
                        options = this.instance.getTypeOptions(t);
                        if (!options || !options.cmd) continue;
                    }

                    selected = t == slot_info.type.toLowerCase() ? 'selected' : '';
                    types += "<option " + selected + " value='" + t + "'>" + (t == '-1' ? 'EVENT' : t) + "</option>";
                }
            
                //var dialog = that.createDialog( "<span class='name'>Type</span><input data-lpignore='true' autofocus type='text'/><button>OK</button>" , options );
                var dialog = that.createDialog( "<span class='name'>Type</span><select>"+types+"</select><button>OK</button>" , options );
                var input = dialog.querySelector("select");
                if(input && slot_info) input.value = slot_info.type || "object";

                dialog.querySelector("button").addEventListener("click",function(e){
                    if(input.value && this.instance.getTypeFields(input.value))
                    {
                        if (v.slot.input)
                            v.Node.changeInputType(v.slot.slot, input.value);
                        
                        if (v.slot.output)
                            v.Node.changeOutputType(v.slot.slot, input.value);
                        
                        that.setDirty(true);
                    }

                    dialog.close();
                });
                */
            }

            //if(v.callback)
            //	return v.callback.call(that, node, options, e, menu, that, event );
        }
    }
}