import { LUtil, NodeShape, NodeStyle } from "./LUtil";
import { LLink } from "./LLink";
import { LiteInstance } from "./LiteInstance";

export class LiteNode {

    #position   = new Float32Array(2);
    #size       = new Float32Array(2);
    #shape      = NodeShape.BOX_SHAPE;

    /** @type {LiteInstance} */
    instance;

    /** Creates a new node
     * @param { LiteInstance } instance 
     * @param { String } type
     */
    constructor(instance, type) {
        this.instance = instance;
        this.type = type;
        
        this.#position[0] = 0;
        this.#position[1] = 20;

        this.title = type;
        this.size = [ this.instance ? this.instance.NODE_WIDTH : 100, 60];
        this.graph = null;

        this.id = -1; //not know till not added

        //inputs available: array of inputs
        this.inputs = [];
        this.outputs = [];
        this.connections = [];

        //local data
        this.properties = { _test: 'fishy' }; //for the values
        this.properties_info = []; //for the info

        this.flags = {};
    }
        
    get pos() { return this.#position; }
    set pos(v) {         
        if(!v || v.length < 2) return;
        this.#position[0] = v[0];
        this.#position[1] = v[1];
    }

    get size() { return this.#size; }
    set size(v) {
        if (!v || v.length < 2) return;
        this.#size[0] = v[0];
        this.#size[1] = v[1];
    }

    get shape() { return this.#shape; }
    set shape(v) {
        switch(v)
        {
            case "box": this.#shape = NodeShape.BOX_SHAPE; break;
            case "round": this.#shape = NodeShape.ROUND_SHAPE; break;
            case "circle": this.#shape = NodeShape.CIRCLE_SHAPE; break;
            case "card": this.#shape = NodeShape.CARD_SHAPE; break;
            default: this.#shape = v; break;
        }
    }

    /** Loads the node from the data */
    async load(node) {
        if (this.onPreload) {
            let promise = this.onPreload();
            if (promise && promise instanceof Promise) await promise;
        }

        this.id         = node.id;
        this.pos        = node.pos || this.pos;
        this.size       = node.size || this.size;
        this.properties = node.properties || this.properties;
        //this.title      = node.title || this.title;
        //this.resizable  = node.resizable;
        //this.removable  = node.removable;
        //this.clonable   = node.clonable;
        //this.flags      = node.flags;

        if (this.onLoad) {            
            let promise = this.onLoad();
            if (promise && promise instanceof Promise) await promise;
        }

        return this;
    }

    /** Saves the node and returns the data */
    async save() {
        if (this.onSave)  {            
            let promise = this.onSave();
            if (promise && promise instanceof Promise) await promise;
        }

        return {
            id:         this.id,
            type:       this.type,
            pos:        this.pos,
            size:       this.size,
            properties: this.properties,
            //title:      this.title,
            //resizable:  this.resizable,
            //removable:  this.removable,
            //clonable:   this.clonable,
        }
    }

    getTitleHeight()
    {
        let events = this.getMaximumEvents();
        let max = Math.max(events[0], events[1], 1);
        let height = max * this.instance.NODE_SLOT_HEIGHT;
        return height;
    }

    connectedOutputs() 
    {
        let slots = [];
        for (let os in this.outputs)
        {
            if (this.outputs[os].links && this.outputs[os].links.length > 0)
            {
                slots.push(os);
            }
        }

        return slots;
    }

    /**
    * configure a node from an object containing the serialized info
    * @method configure
    */
    configure(info)
    {
        if(this.graph)
            this.graph._version++;

        for (var j in info)
        {
            if(j == "properties")
            {
                //i don't want to clone properties, I want to reuse the old container
                for(var k in info.properties)
                {
                    this.properties[k] = info.properties[k];
                    if(this.onPropertyChanged)
                        this.onPropertyChanged(k,info.properties[k]);
                }
                continue;
            }

            if(info[j] == null)
                continue;

            else if (typeof(info[j]) == 'object') //object
            {
                if(this[j] && this[j].configure)
                    this[j].configure( info[j] );
                else
                    this[j] = this.instance.cloneObject(info[j], this[j]);
            }
            else //value
                this[j] = info[j];
        }

        if(!info.title)
            this.title = this.constructor.title;

        if(this.onConnectionsChange)
        {
            if(this.inputs)
            for(var i = 0; i < this.inputs.length; ++i)
            {
                var input = this.inputs[i];
                var link_info = this.graph ? this.graph.links[ input.link ] : null;
                this.onConnectionsChange( this.instance.INPUT, i, true, link_info, input ); //link_info has been created now, so its updated
            }

            if(this.outputs)
            for(var i = 0; i < this.outputs.length; ++i)
            {
                var output = this.outputs[i];
                if(!output.links)
                    continue;
                for(var j = 0; j < output.links.length; ++j)
                {
                    var link_info = this.graph ? this.graph.links[ output.links[j] ] : null;
                    this.onConnectionsChange( this.instance.OUTPUT, i, true, link_info, output ); //link_info has been created now, so its updated
                }
            }
        }

        if(info.widgets_values && this.widgets)
        {
            for(var i = 0; i < info.widgets_values.length; ++i)
                if( this.widgets[i] )
                    this.widgets[i].value = info.widgets_values[i];
        }

        if( this.onConfigure )
            this.onConfigure( info );
    }

    /**
    * serialize the content
    * @method serialize
    */
    serialize()
    {
        //create serialization object
        var o = {
            id: this.id,
            type: this.type,
            pos: this.pos,
            size: this.size,
            flags: this.instance.cloneObject(this.flags),
            mode: this.mode
        };

        //special case for when there were errors
        if( this.constructor === LGraphNode && this.last_serialization )
            return this.last_serialization;

        if( this.inputs )
            o.inputs = this.inputs;

        if( this.outputs )
        {
            //clear outputs last data (because data in connections is never serialized but stored inside the outputs info)
            for(var i = 0; i < this.outputs.length; i++)
                delete this.outputs[i]._data;
            o.outputs = this.outputs;
        }

        if( this.title && this.title != this.constructor.title )
            o.title = this.title;

        if( this.properties )
            o.properties = this.instance.cloneObject( this.properties );

        if( this.widgets && this.serialize_widgets )
        {
            o.widgets_values = [];
            for(var i = 0; i < this.widgets.length; ++i)
                o.widgets_values[i] = this.widgets[i].value;
        }

        if( !o.type )
            o.type = this.constructor.type;

        if( this.color )
            o.color = this.color;
        if( this.bgcolor )
            o.bgcolor = this.bgcolor;
        if( this.boxcolor )
            o.boxcolor = this.boxcolor;
        if( this.shape )
            o.shape = this.shape;

        if(this.onSerialize)
        {
            if( this.onSerialize(o) )
                console.warn("node onSerialize shouldnt return anything, data should be stored in the object pass in the first parameter");
        }

        return o;
    }

    /* Creates a clone of this node */
    clone()
    {
        var node = this.instance.createNode(this.type);
        if(!node)
            return null;

        //we clone it because serialize returns shared containers
        var data = this.instance.cloneObject( this.serialize() );

        //remove links
        if(data.inputs)
            for(var i = 0; i < data.inputs.length; ++i)
                data.inputs[i].link = null;

        if(data.outputs)
            for(var i = 0; i < data.outputs.length; ++i)
            {
                if(data.outputs[i].links)
                    data.outputs[i].links.length = 0;
            }

        delete data["id"];
        //remove links
        node.configure(data);

        return node;
    }


    /**
    * serialize and stringify
    * @method toString
    */
    toString() { return JSON.stringify( this.serialize() ); }
    //deserialize(info) {} //this cannot be done from within, must be done in this.instance

    /**
    * get the title string
    * @method getTitle
    */
    getTitle() { return this.title || this.constructor.title; }

    // Execution *************************
    /**
    * sets the output data
    * @method setOutputData
    * @param {number} slot
    * @param {*} data
    */
    setOutputData(slot, data)
    {
        if(!this.outputs)
            return;

        //this maybe slow and a niche case
        //if(slot && slot.constructor === String)
        //	slot = this.findOutputSlot(slot);

        if(slot == -1 || slot >= this.outputs.length)
            return;

        var output_info = this.outputs[slot];
        if(!output_info)
            return;

        //store data in the output itself in case we want to debug
        output_info._data = data;

        //if there are connections, pass the data to the connections
        if( this.outputs[slot].links )
        {
            for(var i = 0; i < this.outputs[slot].links.length; i++)
            {
                var link_id = this.outputs[slot].links[i];
                this.graph.links[ link_id ].data = data;
            }
        }
    }

    /**
    * sets the output data type, useful when you want to be able to overwrite the data type
    * @method setOutputDataType
    * @param {number} slot
    * @param {String} datatype
    */
    setOutputDataType(slot, type)
    {
        if(!this.outputs)
            return;
        if(slot == -1 || slot >= this.outputs.length)
            return;
        var output_info = this.outputs[slot];
        if(!output_info)
            return;
        //store data in the output itself in case we want to debug
        output_info.type = type;

        //if there are connections, pass the data to the connections
        if( this.outputs[slot].links )
        {
            for(var i = 0; i < this.outputs[slot].links.length; i++)
            {
                var link_id = this.outputs[slot].links[i];
                this.graph.links[ link_id ].type = type;
            }
        }
    }


    /**
    * sets the output data type, useful when you want to be able to overwrite the data type
    * @method setOutputDataType
    * @param {number} slot
    * @param {String} datatype
    */
    setInputType(slot, type)
    {
        if(!this.inputs)
            return;
        if(slot == -1 || slot >= this.inputs.length)
            return;
        var input_info = this.inputs[slot];
        if(!input_info)
            return;
        //store data in the output itself in case we want to debug
        input_info.type = type;

        //if there are connections, pass the data to the connections
        if( this.inputs[slot].link )
        {
            var link_id = this.inputs[slot].link;
            this.graph.links[ link_id ].type = type;
        }
    }

    /**
    * sets the output data type, useful when you want to be able to overwrite the data type
    * @method setOutputDataType
    * @param {number} slot
    * @param {String} datatype
    */
    setOutputType(slot, type)
    {
        if(!this.outputs)
            return;
        if(slot == -1 || slot >= this.outputs.length)
            return;
        var input_info = this.outputs[slot];
        if(!input_info)
            return;
        //store data in the output itself in case we want to debug
        input_info.type = type;

        //if there are connections, pass the data to the connections
        if( this.outputs[slot].link )
        {
            var link_id = this.outputs[slot].link;
            this.graph.links[ link_id ].type = type;
        }
    }

    /**
    * Retrieves the input data (data traveling through the connection) from one slot
    * @method getInputData
    * @param {number} slot
    * @param {boolean} force_update if set to true it will force the connected node of this slot to output data into this link
    * @return {*} data or if it is not connected returns undefined
    */
    getInputData( slot, force_update )
    {
        if(!this.inputs)
            return; //undefined;

        if(slot >= this.inputs.length || this.inputs[slot].link == null)
            return;

        var link_id = this.inputs[slot].link;
        var link = this.graph.links[ link_id ];
        if(!link) //bug: weird case but it happens sometimes
            return null;

        if(!force_update)
            return link.data;

        //special case: used to extract data from the incoming connection before the graph has been executed
        var node = this.graph.getNodeById( link.origin_id );
        if(!node)
            return link.data;

        if(node.updateOutputData)
            node.updateOutputData( link.origin_slot );
        else if(node.onExecute)
            node.onExecute();

        return link.data;
    }

    /**
    * Retrieves the input data type (in case this supports multiple input types)
    * @method getInputDataType
    * @param {number} slot
    * @return {String} datatype in string format
    */
    getInputDataType( slot )
    {
        if(!this.inputs)
            return null; //undefined;

        if(slot >= this.inputs.length || this.inputs[slot].link == null)
            return null;
        var link_id = this.inputs[slot].link;
        var link = this.graph.links[ link_id ];
        if(!link) //bug: weird case but it happens sometimes
            return null;
        var node = this.graph.getNodeById( link.origin_id );
        if(!node)
            return link.type;
        var output_info = node.outputs[ link.origin_slot ];
        if(output_info)
            return output_info.type;
        return null;
    }

    /**
    * Retrieves the input data from one slot using its name instead of slot number
    * @method getInputDataByName
    * @param {String} slot_name
    * @param {boolean} force_update if set to true it will force the connected node of this slot to output data into this link
    * @return {*} data or if it is not connected returns null
    */
    getInputDataByName( slot_name, force_update )
    {
        var slot = this.findInputSlot( slot_name );
        if( slot == -1 )
            return null;
        return this.getInputData( slot, force_update );
    }


    /**
    * tells you if there is a connection in one input slot
    * @method isInputConnected
    * @param {number} slot
    * @return {boolean}
    */
    isInputConnected(slot)
    {
        if(!this.inputs)
            return false;
        return (slot < this.inputs.length && this.inputs[slot].link != null);
    }

    /**
    * tells you info about an input connection (which node, type, etc)
    * @method getInputInfo
    * @param {number} slot
    * @return {Object} object or null { link: id, name: string, type: string or 0 }
    */
    getInputInfo(slot)
    {
        if(!this.inputs)
            return null;
        if(slot < this.inputs.length)
            return this.inputs[slot];
        return null;
    }

    /**
    * returns the node connected in the input slot
    * @method getInputNode
    * @param {number} slot
    * @return {LGraphNode} node or null
    */
    getInputNode( slot )
    {
        if(!this.inputs)
            return null;
        if(slot >= this.inputs.length)
            return null;
        var input = this.inputs[slot];
        if(!input || input.link === null)
            return null;
        var link_info = this.graph.links[ input.link ];
        if(!link_info)
            return null;
        return this.graph.getNodeById( link_info.origin_id );
    }

    getInputLink(slot)
    {
        if(!this.inputs)
            return null;

        if(slot >= this.inputs.length)
            return null;

        var input = this.inputs[slot];
        if(!input || input.link === null) return null;

        var link_info = this.graph.links[input.link];
        return link_info;
    }

    getLinkedOutputInfo(slot) 
    {
        if(!this.inputs)
            return null;

        if(slot >= this.inputs.length)
            return null;

        var input = this.inputs[slot];
        if(!input || input.link === null) return null;

        var link_info = this.graph.links[ input.link ];
        if(!link_info) return null;

        var node = this.graph.getNodeById(link_info.origin_id);
        if (!node) return null;

        return node.getOutputInfo(link_info.origin_slot);
    }

    getLink = function (link) 
    {
        return this.graph.links[link];
    }

    /**
    * returns the value of an input with this name, otherwise checks if there is a property with that name
    * @method getInputOrProperty
    * @param {string} name
    * @return {*} value
    */
    getInputOrProperty( name )
    {
        if(!this.inputs || !this.inputs.length)
            return this.properties ? this.properties[name] : null;

        for(var i = 0, l = this.inputs.length; i < l; ++i)
        {
            var input_info = this.inputs[i];
            if(name == input_info.name && input_info.link != null)
            {
                var link = this.graph.links[ input_info.link ];
                if(link)
                    return link.data;
            }
        }
        return this.properties[ name ];
    }




    /**
    * tells you the last output data that went in that slot
    * @method getOutputData
    * @param {number} slot
    * @return {Object}  object or null
    */
    getOutputData(slot)
    {
        if(!this.outputs)
            return null;
        if(slot >= this.outputs.length)
            return null;

        var info = this.outputs[slot];
        return info._data;
    }


    /**
    * tells you info about an output connection (which node, type, etc)
    * @method getOutputInfo
    * @param {number} slot
    * @return {Object}  object or null { name: string, type: string, links: [ ids of links in number ] }
    */
    getOutputInfo(slot)
    {
        if(!this.outputs)
            return null;
        if(slot < this.outputs.length)
            return this.outputs[slot];
        return null;
    }


    /**
    * tells you if there is a connection in one output slot
    * @method isOutputConnected
    * @param {number} slot
    * @return {boolean}
    */
    isOutputConnected(slot)
    {
        if(!this.outputs)
            return false;
        return (slot < this.outputs.length && this.outputs[slot].links && this.outputs[slot].links.length);
    }

    /**
    * tells you if there is any connection in the output slots
    * @method isAnyOutputConnected
    * @return {boolean}
    */
    isAnyOutputConnected()
    {
        if(!this.outputs)
            return false;
        for(var i = 0; i < this.outputs.length; ++i)
            if( this.outputs[i].links && this.outputs[i].links.length )
                return true;
        return false;
    }


    /**
    * retrieves all the nodes connected to this output slot
    * @method getOutputNodes
    * @param {number} slot
    * @return {array}
    */
    getOutputNodes(slot)
    {
        if(!this.outputs || this.outputs.length == 0)
            return null;

        if(slot >= this.outputs.length)
            return null;

        var output = this.outputs[slot];
        if(!output.links || output.links.length == 0)
            return null;

        var r = [];
        for(var i = 0; i < output.links.length; i++)
        {
            var link_id = output.links[i];
            var link = this.graph.links[ link_id ];
            if(link)
            {
                var target_node = this.graph.getNodeById( link.target_id );
                if( target_node )
                    r.push( target_node );
            }
        }
        return r;
    }

    /**
    * Triggers an event in this node, this will trigger any output with the same name
    * @method trigger
    * @param {String} event name ( "on_play", ... ) if action is equivalent to false then the event is send to all
    * @param {*} param
    */
    trigger( action, param )
    {
        if( !this.outputs || !this.outputs.length )
            return;

        if(this.graph)
            this.graph._last_trigger_time = this.instance.getTime();

        for(var i = 0; i < this.outputs.length; ++i)
        {
            var output = this.outputs[ i ];
            if(!output || output.type !== this.instance.EVENT || (action && output.name != action) )
                continue;
            this.triggerSlot( i, param );
        }
    }

    /**
    * Triggers an slot event in this node
    * @method triggerSlot
    * @param {Number} slot the index of the output slot
    * @param {*} param
    * @param {Number} link_id [optional] in case you want to trigger and specific output link in a slot
    */
    triggerSlot( slot, param, link_id )
    {
        if( !this.outputs )
            return;

        var output = this.outputs[ slot ];
        if( !output )
            return;

        var links = output.links;
        if(!links || !links.length)
            return;

        if(this.graph)
            this.graph._last_trigger_time = this.instance.getTime();

        //for every link attached here
        for(var k = 0; k < links.length; ++k)
        {
            var id = links[k];
            if( link_id != null && link_id != id ) //to skip links
                continue;
            var link_info = this.graph.links[ links[k] ];
            if(!link_info) //not connected
                continue;
            link_info._last_time = this.instance.getTime();
            var node = this.graph.getNodeById( link_info.target_id );
            if(!node) //node not found?
                continue;

            //used to mark events in graph
            var target_connection = node.inputs[ link_info.target_slot ];

            if(node.onAction)
                node.onAction( target_connection.name, param );
            else if(node.mode === this.instance.ON_TRIGGER)
            {
                if(node.onExecute)
                    node.onExecute(param);
            }
        }
    }

    /**
    * clears the trigger slot animation
    * @method clearTriggeredSlot
    * @param {Number} slot the index of the output slot
    * @param {Number} link_id [optional] in case you want to trigger and specific output link in a slot
    */
    clearTriggeredSlot( slot, link_id )
    {
        if( !this.outputs )
            return;

        var output = this.outputs[ slot ];
        if( !output )
            return;

        var links = output.links;
        if(!links || !links.length)
            return;

        //for every link attached here
        for(var k = 0; k < links.length; ++k)
        {
            var id = links[k];
            if( link_id != null && link_id != id ) //to skip links
                continue;
            var link_info = this.graph.links[ links[k] ];
            if(!link_info) //not connected
                continue;
            link_info._last_time = 0;
        }
    }

    /**
    * add a new property to this node
    * @method addProperty
    * @param {string} name
    * @param {*} default_value
    * @param {string} type string defining the output type ("vec3","number",...)
    * @param {Object} extra_info this can be used to have special properties of the property (like values, etc)
    */
    addProperty( name, default_value, type, extra_info )
    {
        var o = { name: name, type: type, default_value: default_value };
        if(extra_info)
            for(var i in extra_info)
                o[i] = extra_info[i];
        if(!this.properties_info)
            this.properties_info = [];
        this.properties_info.push(o);
        if(!this.properties)
            this.properties = {};
        this.properties[ name ] = default_value;
        return o;
    }


    //connections

    /**
    * add a new output slot to use in this node
    * @method addOutput
    * @param {string} name
    * @param {string} type string defining the output type ("vec3","number",...)
    * @param {Object} extra_info this can be used to have special properties of an output (label, special color, position, etc)
    */
    addOutput(name,type,extra_info)
    {
        //var o = { name: name, type: type, links: null };    
        var o = this._createSlot(name, type, null);

        if(extra_info)
            for(var i in extra_info)
                o[i] = extra_info[i];

        //Outputs don't exist yet, so init
        if(!this.outputs) this.outputs = [];

        //Push to the array and call the event
        this.outputs.push(o); 
        if(this.onOutputAdded) this.onOutputAdded(o);

        //Update the size of the table
        this.size = this.computeSize();
        this.setDirtyCanvas(true,true);
        return o;
    }

    /**
    * add a new output slot to use in this node
    * @method addOutputs
    * @param {Array} array of triplets like [[name,type,extra_info],[...]]
    */
    addOutputs(array)
    {
        for(var i = 0; i < array.length; ++i)
        {
            var info = array[i];
            var o = {name:info[0],type:info[1],link:null};
            if(array[2])
                for(var j in info[2])
                    o[j] = info[2][j];

            if(!this.outputs)
                this.outputs = [];
            this.outputs.push(o);
            if(this.onOutputAdded)
                this.onOutputAdded(o);
        }

        this.size = this.computeSize();
        this.setDirtyCanvas(true,true);
    }

    /**
    * remove an existing output slot
    * @method removeOutput
    * @param {number} slot
    */
    removeOutput(slot)
    {
        //We gave it a string, we should probably look for the string
        if (slot.constructor === String)
        {
            slot = slot.toLowerCase();
            for (let slot_index in this.outputs)
            {
                if (this.outputs[slot_index].name.toLowerCase() == slot)
                {
                    slot = slot_index;
                    break;
                }
            }
        }
        
        //Disconnect the things
        this.disconnectOutput(slot);
        this.outputs.splice(slot,1);
        for(var i = slot; i < this.outputs.length; ++i)
        {
            if( !this.outputs[i] || !this.outputs[i].links )
                continue;
            var links = this.outputs[i].links;
            for(var j = 0; j < links.length; ++j)
            {
                var link = this.graph.links[ links[j] ];
                if(!link)
                    continue;
                link.origin_slot -= 1;
            }
        }
        

        this.size = this.computeSize();
        if(this.onOutputRemoved)
            this.onOutputRemoved(slot);
        this.setDirtyCanvas(true,true);
    }

    removeAllOutputs()
    {
        if (!this.outputs) return false;

        //Increment the version
        this._version++;

        //Do the events
        for(var i = 0; i < this.outputs.length; i++) 
        {
            this.disconnectOutput(i);            
            if(this.onOutputRemoved)
                this.onOutputRemoved(i);
        }

        //Clear the arrary
        this.outputs = [];    
        this.size = this.computeSize();

        //Do the input output event
        this.setDirtyCanvas(true,true);
        return true;
    }

    /**
    * add a new input slot to use in this node
    * @method addInput
    * @param {string} name
    * @param {string} type string defining the input type ("vec3","number",...), it its a generic one use 0
    * @param {Object} extra_info this can be used to have special properties of an input (label, color, position, etc)
    */
    addInput(name, type, extra_info)
    {
        type = type || 0;
        
        //var o = {name:name,type:type,link:null};
        var o = this._createSlot(name, type, null);
        if(extra_info)
            for(var i in extra_info)
                o[i] = extra_info[i];

        if(!this.inputs)
            this.inputs = [];
            
            
        if (type && extra_info && extra_info.binding)
        {
            let binding = extra_info.binding;
            let property = binding.property || binding.bind;

            o.binding = { 
                property:       property,
                type:           binding.type || type.toLowerCase(),
                placeholder:    binding.default || binding.bind || null,
                title:          name,
                onValidate:     binding.onValidate ? binding.onValidate.bind(this) : null,

                setValue: binding.setValue || function(value)
                { 
                    if (type == "number") value = Number(value);
                    if (type == "boolean") value = value == "true";
                    this.properties[property] = value;
                    if (this.onPropertyChanged) this.onPropertyChanged(property, value);
                    graph.runStep(1, false);
                }.bind(this),
                
                getValue: binding.getValue || function() 
                { 
                    //If the properties are missing, we need to "smartly" figure out the correct one
                    if (this.properties == null || this.properties[property] == null) {

                        //These do nothing and its entirely dependent oin the defaults of the Binding.php
                        switch(type) {
                            case "number":	return 0;
                            case "boolean":	return false;
                            case "string": 	return "";
                            case "emoji":	return "😃";
                            case "color":	return "#99AAB5";
                            default: 		return null;
                        }	
                    }

                    if (type == "number") return Number(this.properties[property]);
                    if (type == "boolean") return this.properties[property] == "true";
                    return this.properties[property];  
                }.bind(this),
            };

            //o.widget = this.addWidget("text", extra_info.bind, "", function(v) 
            //{
            //    this.properties[extra_info.bind] = v;
            //    if (this.onPropertyChanged) this.onPropertyChanged(extra_info.bind, v);
            //}.bind(this));
            //
            //o.widget.modalInput = { 
            //    type: type.toLowerCase() == "string" ? "text" : type, 
            //    placeholder: extra_info.bind,
            //    onValidate: extra_info.onValidateBind.bind(this),
            //    getValue: function() { return this.properties[extra_info.bind];  }.bind(this)
            //};
            //
            //o.widget.slot = this.inputs.length - 1;
        }
        
        this.inputs.push(o);        
        this.size = this.computeSize();
        if(this.onInputAdded)
            this.onInputAdded(o);

        this.hasBindings = o.binding != null;
        this.setDirtyCanvas(true,true);
        return o;
    }


    _createSlot(name, type, link = null)
    {
        let style = this.instance.getTypeStyle(type);
        return { name: name, type: type, link: link, 
                    color_on: style.color_on, 
                    color_off: style.color_off };

    }

    /**
    * add several new input slots in this node
    * @method addInputs
    * @param {Array} array of triplets like [[name,type,extra_info],[...]]
    */
    addInputs(array)
    {
        for(var i = 0; i < array.length; ++i)
        {
            var info = array[i];
            var o = {name:info[0], type:info[1], link:null};
            if(array[2])
                for(var j in info[2])
                    o[j] = info[2][j];

            if(!this.inputs)
                this.inputs = [];
            this.inputs.push(o);
            if(this.onInputAdded)
                this.onInputAdded(o);
        }

        this.size = this.computeSize();
        this.setDirtyCanvas(true,true);
    }

    /**
    * remove an existing input slot
    * @method removeInput
    * @param {number} slot
    */
    removeInput(slot)
    {
        this.disconnectInput(slot);
        this.inputs.splice(slot,1);
        for(var i = slot; i < this.inputs.length; ++i)
        {
            if(!this.inputs[i])
                continue;
            var link = this.graph.links[ this.inputs[i].link ];
            if(!link)
                continue;
            link.target_slot -= 1;
        }
        this.size = this.computeSize();
        if(this.onInputRemoved)
            this.onInputRemoved(slot);
        this.setDirtyCanvas(true,true);
    }

    removeAllInputs()
    {
        if (!this.inputs) return false;

        //Increment the version
        this._version++;

        //Do the events
        for(var i = 0; i < this.inputs.length; i++) 
        {
            this.removeInput(i);
        }

        this.inputs = [];    
        
        //Return true
        return true;
    }
    /**
    * add an special connection to this node (used for special kinds of graphs)
    * @method addConnection
    * @param {string} name
    * @param {string} type string defining the input type ("vec3","number",...)
    * @param {[x,y]} pos position of the connection inside the node
    * @param {string} direction if is input or output
    */
    addConnection(name,type,pos,direction)
    {
        var o = {
            name: name,
            type: type,
            pos: pos,
            direction: direction,
            links: null
        };
        this.connections.push( o );
        return o;
    }

    /**
    * computes the size of a node according to its inputs and output slots
    * @method computeSize
    * @param {number} minHeight
    * @return {number} the total size
    */
    computeSize(minHeight, out )
    {
        if( this.constructor.size )
            return this.constructor.size.concat();

        var events = this.getMaximumEvents();
        var rows = Math.max( this.inputs ? this.inputs.length - events[0] : 1, this.outputs ? this.outputs.length- events[1] : 1);
        var size = out || new Float32Array([0,0]);
        var font_size = this.instance.NODE_TEXT_SIZE; //although it should be graphcanvas.inner_text_font size
        
        size[1] = (this.constructor.slot_start_y || 0) + rows * this.instance.NODE_SLOT_HEIGHT;
        
        /*
        var widgets_height = 0;
        if( this.widgets && this.widgets.length )
            widgets_height = this.widgets.length * (this.instance.NODE_WIDGET_HEIGHT + 4) + 8;
        if( this.widgets_up )
            size[1] = Math.max(size[1], widgets_height);
        else
            size[1] += widgets_height;
        */


        var font_size = font_size;
        var title_width = compute_text_size( this.title );
        var input_width = 0;
        var output_width = 0;

        if(this.inputs)
            for(var i = 0, l = this.inputs.length; i < l; ++i)
            {
                var input = this.inputs[i];
                var text = input.label || input.name || "";
                var text_width = compute_text_size( text );
                if(input_width < text_width)
                    input_width = text_width;
            }

        if(this.outputs)
            for(var i = 0, l = this.outputs.length; i < l; ++i)
            {
                var output = this.outputs[i];
                var text = output.label || output.name || "";
                var text_width = compute_text_size( text );
                if(output_width < text_width)
                    output_width = text_width;
            }

        //Set the widths
        size[0] = Math.max( input_width + output_width + 10, title_width );
        size[0] = Math.max( size[0], this.instance.NODE_WIDTH );
        //if(this.widgets && this.widgets.length)
        //	size[0] = Math.max( size[0], this.instance.NODE_WIDTH * 1.5 );


        //if(this.constructor.min_height && size[1] < this.constructor.min_height)
        //	size[1] = this.constructor.min_height;

        size[1] += 6; //margin
        size[1] += this.expandable ? 10 : 0 ;

        //Increase the height by the margin
        if (this.widgets) {
            for(let w = 0; w < this.widgets.length; w++) {
                //TODO: Height Checks
                size[1] += 20;
            }
        }

        if(this.onResize)
            this.onResize(size);
        
        function compute_text_size( text )
        {
            if(!text) return 0;
            return font_size * text.length * 0.6;
        }

        //Round it to the nearest chunk
        if (this.instance && this.instance.snapToGrid) {            
            size[0] = this.instance.CANVAS_GRID_SIZE * Math.ceil(size[0] / this.instance.CANVAS_GRID_SIZE);
            size[1] = this.instance.CANVAS_GRID_SIZE * Math.ceil(size[1] / this.instance.CANVAS_GRID_SIZE);
        }

        //console.log(this, this.expandable, size[1]);
        return size;
    }

    /**
    * Allows to pass 
    * 
    * @method addWidget
    * @return {Object} the created widget
    */
    addWidget( type, name, value, callback, options )
    {
        if(!this.widgets)
            this.widgets = [];
        var w = {
            type: type.toLowerCase(),
            name: name,
            value: value,
            callback: callback,
            options: options || {}
        };

        if(w.options.y !== undefined )
            w.y = w.options.y;

        if( !callback )
            console.warn("this.instance addWidget(...) without a callback");
        if( type == "combo" && !w.options.values )
            throw("this.instance addWidget('combo',...) requires to pass values in options: { values:['red','blue'] }");
        this.widgets.push(w);
        return w;
    }

    addCustomWidget( custom_widget )
    {
        if(!this.widgets)
            this.widgets = [];
        this.widgets.push(custom_widget);
        return custom_widget;
    }


    /**
    * returns the bounding of the object, used for rendering purposes
    * bounding is: [topleft_cornerx, topleft_cornery, width, height]
    * @method getBounding
    * @return {Float32Array[4]} the total size
    */
    getBounding( out )
    {
        let th = this.getTitleHeight();
        out = out || new Float32Array(4);
        out[0] = this.pos[0] - 4;
        out[1] = this.pos[1] - th;
        out[2] = this.size[0] + 4;
        out[3] = this.size[1] + th;

        if( this.onBounding )
            this.onBounding( out );
        return out;
    }

    /**
    * checks if a point is inside the shape of a node
    * @method isPointInside
    * @param {number} x
    * @param {number} y
    * @return {boolean}
    */
    isPointInside( x, y, margin, skip_title )
    {
        let title_height = this.getTitleHeight ? this.getTitleHeight() : this.instance.NODE_SLOT_HEIGHT;
        let height = this.size[1];

        margin = margin || 0;

        if (this.expandable)
            height += 10;

        //var margin_top = this.graph && this.graph.isLive() ? 0 : 20;
        var margin_top = title_height;
        if(skip_title) margin_top = 0;
        if(this.flags && this.flags.collapsed)
        {
            //if ( distance([x,y], [this.pos[0] + this.size[0]*0.5, this.pos[1] + this.size[1]*0.5]) < this.instance.NODE_COLLAPSED_RADIUS)
            if( LUtil.isInsideRectangle( x, y, this.pos[0] - margin, this.pos[1] - title_height - margin, (this._collapsed_width||this.instance.NODE_COLLAPSED_WIDTH) + 2 * margin, title_height + 2 * margin ) )
                return true;
        }
        else if ( (this.pos[0] - 4 - margin) < x && (this.pos[0] + this.size[0] + 4 + margin) > x
            && (this.pos[1] - margin_top - margin) < y && (this.pos[1] + height + margin) > y)
            return true;
        return false;
    }

    /**
    * checks if a point is inside a node slot, and returns info about which slot
    * @method getSlotInPosition
    * @param {number} x
    * @param {number} y
    * @return {Object} if found the object contains { input|output: slot object, slot: number, link_pos: [x,y] }
    */
    getSlotInPosition( x, y )
    {
        //search for inputs
        var link_pos = new Float32Array(2);
        if(this.inputs)
            for(var i = 0, l = this.inputs.length; i < l; ++i)
            {
                var input = this.inputs[i];
                this.getConnectionPos( true,i, link_pos );
                if( LUtil.isInsideRectangle(x, y, link_pos[0] - 10, link_pos[1] - 5, 20,10) )
                    return { input: input, slot: i, link_pos: link_pos, locked: input.locked };
            }

        if(this.outputs)
            for(var i = 0, l = this.outputs.length; i < l; ++i)
            {
                var output = this.outputs[i];
                this.getConnectionPos(false,i,link_pos);
                if( LUtil.isInsideRectangle(x, y, link_pos[0] - 10, link_pos[1] - 5, 20,10) )
                    return { output: output, slot: i, link_pos: link_pos, locked: output.locked };
            }

        return null;
    }

    /**
    * returns the input slot with a given name (used for dynamic slots), -1 if not found
    * @method findInputSlot
    * @param {string} name the name of the slot
    * @return {number} the slot (-1 if not found)
    */
    findInputSlot(name)
    {
        if(!this.inputs)
            return -1;
        for(var i = 0, l = this.inputs.length; i < l; ++i)
            if(name == this.inputs[i].name)
                return i;
        return -1;
    }

    /**
    * returns the output slot with a given name (used for dynamic slots), -1 if not found
    * @method findOutputSlot
    * @param {string} name the name of the slot
    * @return {number} the slot (-1 if not found)
    */
    findOutputSlot(name)
    {
        if(!this.outputs) return -1;
        for(var i = 0, l = this.outputs.length; i < l; ++i)
            if(name == this.outputs[i].name)
                return i;
        return -1;
    }

    /**
     * Connects the link data as a new link.
     * @param {LLink|Array} link the link data    
     * @return {Object} the link_info is created, otherwise null
     */
    connectLink(link) {
        let l = link;
        if(typeof o === 'Array')
        {
            l = new LLink();
            l.load(link);
        }
        return this.connect(l.origin_slot, l.target_id, l.target_slot, l.anchors);
    }

    /**
    * connect this node output to the input of another node
    * @method connect
    * @param {number|string} slot (could be the number of the slot or the string with the name of the slot)
    * @param {LGraphNode} node the target node
    * @param {number|string} target_slot the input slot of the target node (could be the number of the slot or the string with the name of the slot, or -1 to connect a trigger)
    * @return {Object} the link_info is created, otherwise null
    */
    connect( slot, target_node, target_slot, anchors = [])
    {
        target_slot = target_slot || 0;

        if(!this.graph) //could be connected before adding it to a graph
        {
            console.log("Connect: Error, node doesn\'t belong to any graph. Nodes must be added first to a graph before connecting them."); //due to link ids being associated with graphs
            return null;
        }


        //seek for the output slot
        if( slot.constructor === String )
        {
            slot = this.findOutputSlot(slot);
            if(slot == -1)
            {
                console.warn("Connect: Error, no slot of name " + slot);
                return null;
            }
        }
        else if(!this.outputs || slot >= this.outputs.length)
        {
            console.warn("Connect: Error, slot number not found");
            return null;
        }

        if(target_node && target_node.constructor === Number)
            target_node = this.graph.getNodeById( target_node );
            
        if(!target_node)
            throw("target node is null. Looking for ");

        //avoid loopback
        if(target_node == this)
            return null;

        //you can specify the slot by name
        if(target_slot.constructor === String)
        {
            target_slot = target_node.findInputSlot( target_slot );
            if(target_slot == -1)
            {
                console.warn("Connect: Error, no slot of name " + target_slot);
                return null;
            }
        }
        else if( target_slot === this.instance.EVENT )
        {
            //search for first slot with event?
            /*
            //create input for trigger
            var input = target_node.addInput("onTrigger", this.instance.EVENT );
            target_slot = target_node.inputs.length - 1; //last one is the one created
            target_node.mode = this.instance.ON_TRIGGER;
            */
            return null;
        }
        else if( !target_node.inputs || target_slot >= target_node.inputs.length )
        {
            console.warn("Connect: Error, slot number not found");
            return null;
        }

        //why here??
        //this.setDirtyCanvas(false,true);
        //this.graph.connectionChange( this );

        var output = this.outputs[slot];

        //allows nodes to block connection
        if(target_node.onConnectInput)
            if( target_node.onConnectInput( target_slot, output.type, output ) === false)
                return null;

        var input = target_node.inputs[target_slot];
        var link_info = null;

        if( this.instance.isValidConnection( output.type, input.type ) )
        {
            
            //if there is something already plugged there, disconnect
            if(target_node.inputs[ target_slot ].link != null )
                target_node.disconnectInput( target_slot );


            link_info = new LLink( this.graph.last_link_id++, output.type, this.id, slot, target_node.id, target_slot );
            link_info.anchors = anchors;

            //add to graph links list
            this.graph.links[ link_info.id ] = link_info;
            if (this.instance.history) this.instance.history.record("LINK_CREATED", link_info);

            //connect in output
            if( output.links == null )
                output.links = [];
            output.links.push( link_info.id );
            //connect in input
            target_node.inputs[target_slot].link = link_info.id;
            
            if(this.graph)
                this.graph._version++;
            
            if(this.onConnectionsChange)
                this.onConnectionsChange( this.instance.OUTPUT, slot, true, link_info, output ); //link_info has been created now, so its updated
            
            if(target_node.onConnectionsChange)
                target_node.onConnectionsChange( this.instance.INPUT, target_slot, true, link_info, input );
            
            if( this.graph && this.graph.onNodeConnectionChange )
            {
                this.graph.onNodeConnectionChange( this.instance.INPUT, target_node, target_slot, this, slot );
                this.graph.onNodeConnectionChange( this.instance.OUTPUT, this, slot, target_node, target_slot );
            }
        }

        this.setDirtyCanvas(false,true);
        this.graph.connectionChange( this, link_info );

        return link_info;
    }

    /**
    * disconnect one output to an specific node
    * @method disconnectOutput
    * @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
    * @param {LGraphNode} target_node the target node to which this slot is connected [Optional, if not target_node is specified all nodes will be disconnected]
    * @return {boolean} if it was disconnected successfully
    */
    disconnectOutput( slot, target_node )
    {
        
        //if (this.instance.history)
        //this.instance.history.record("OUTPUT_DISCONNECT", {
        //    id: this.id,
        //    slot: slot,
        //    
        //});

        if( slot.constructor === String )
        {
            slot = this.findOutputSlot(slot);
            if(slot == -1)
            {
                    console.log("Connect: Error, no slot of name " + slot);
                return false;
            }
        }
        else if(!this.outputs || slot >= this.outputs.length)
        {
            console.log("Connect: Error, slot number not found");
            return false;
        }

        //get output slot
        var output = this.outputs[slot];
        if(!output || !output.links || output.links.length == 0)
            return false;

        //one of the output links in this slot
        if(target_node)
        {
            if(target_node.constructor === Number)
                target_node = this.graph.getNodeById( target_node );
            if(!target_node)
                throw("Target Node not found");

            for(var i = 0, l = output.links.length; i < l; i++)
            {
                var link_id = output.links[i];
                var link_info = this.graph.links[ link_id ];

                //is the link we are searching for...
                if( link_info.target_id == target_node.id )
                {
                    output.links.splice(i,1); //remove here
                    var input = target_node.inputs[ link_info.target_slot ];
                    input.link = null; //remove there
                    
                    delete this.graph.links[ link_id ]; //remove the link from the links pool
                    if (this.instance.history) this.instance.history.record("LINK_REMOVED", link_info);

                    if(this.graph)
                        this.graph._version++;
                    if(target_node.onConnectionsChange)
                        target_node.onConnectionsChange( this.instance.INPUT, link_info.target_slot, false, link_info, input ); //link_info hasn't been modified so its ok
                    if(this.onConnectionsChange)
                        this.onConnectionsChange( this.instance.OUTPUT, slot, false, link_info, output );
                    if( this.graph && this.graph.onNodeConnectionChange )
                        this.graph.onNodeConnectionChange( this.instance.OUTPUT, this, slot );
                    if( this.graph && this.graph.onNodeConnectionChange )
                    {
                        this.graph.onNodeConnectionChange( this.instance.OUTPUT, this, slot );
                        this.graph.onNodeConnectionChange( this.instance.INPUT, target_node, link_info.target_slot );
                    }
                    
                    
                    if (this.instance.history)
                    this.instance.history.record("OUTPUT_DISCONNECT", {
                        id: this.id,
                        slot: slot,
                        target: target_node.id,
                        target_slot: link_info.target_slot,
                    });
                    
                    break;
                }
            }
            
        }
        else //all the links in this output slot
        {
            for(var i = 0, l = output.links.length; i < l; i++)
            {
                var link_id = output.links[i];
                var link_info = this.graph.links[ link_id ];
                if(!link_info) //bug: it happens sometimes
                    continue;

                var target_node = this.graph.getNodeById( link_info.target_id );
                var input = null;
                if(this.graph)
                    this.graph._version++;
                if(target_node)
                {
                    input = target_node.inputs[ link_info.target_slot ];
                    input.link = null; //remove other side link
                    if(target_node.onConnectionsChange)
                        target_node.onConnectionsChange( this.instance.INPUT, link_info.target_slot, false, link_info, input ); //link_info hasn't been modified so its ok
                    if( this.graph && this.graph.onNodeConnectionChange )
                        this.graph.onNodeConnectionChange( this.instance.INPUT, target_node, link_info.target_slot );
                                
                }

                delete this.graph.links[ link_id ]; //remove the link from the links pool
                if (this.instance.history) this.instance.history.record("LINK_REMOVED", link_info);

                if(this.onConnectionsChange)
                    this.onConnectionsChange( this.instance.OUTPUT, slot, false, link_info, output );
                if( this.graph && this.graph.onNodeConnectionChange )
                {
                    this.graph.onNodeConnectionChange( this.instance.OUTPUT, this, slot );
                    this.graph.onNodeConnectionChange( this.instance.INPUT, target_node, link_info.target_slot );
                }
            }
            output.links = null;
        }
        

        this.setDirtyCanvas(false,true);
        this.graph.connectionChange( this );
        return true;
    }


    /**
    * disconnect one input
    * @method disconnectInput
    * @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
    * @return {boolean} if it was disconnected successfully
    */
    disconnectInput( slot )
    {
        //seek for the output slot
        if( slot.constructor === String )
        {
            slot = this.findInputSlot(slot);
            if(slot == -1)
            {
                if(this.instance.debug)
                    console.log("Connect: Error, no slot of name " + slot);
                return false;
            }
        }
        else if(!this.inputs || slot >= this.inputs.length)
        {
            if(this.instance.debug)
                console.log("Connect: Error, slot number not found");
            return false;
        }


        var input = this.inputs[slot];
        if(!input)
            return false;

        var link_id = this.inputs[slot].link;
        this.inputs[slot].link = null;

        //remove other side
        var link_info = this.graph.links[ link_id ];
        if( link_info )
        {
            var target_node = this.graph.getNodeById( link_info.origin_id );
            if(!target_node)
                return false;

            var output = target_node.outputs[ link_info.origin_slot ];
            if(!output || !output.links || output.links.length == 0)
                return false;

            //search in the inputs list for this link
            for(var i = 0, l = output.links.length; i < l; i++)
            {
                if( output.links[i] == link_id )
                {
                    output.links.splice(i,1);
                    break;
                }
            }


            delete this.graph.links[ link_id ]; //remove from the pool
            if (this.instance.history) this.instance.history.record("LINK_REMOVED", link_info);

            if(this.graph)
                this.graph._version++;
            if( this.onConnectionsChange )
                this.onConnectionsChange( this.instance.INPUT, slot, false, link_info, input );
            if( target_node.onConnectionsChange )
                target_node.onConnectionsChange( this.instance.OUTPUT, i, false, link_info, output );
                

            if( this.graph && this.graph.onNodeConnectionChange )
            {
                this.graph.onNodeConnectionChange( this.instance.OUTPUT, target_node, i );
                this.graph.onNodeConnectionChange( this.instance.INPUT, this, slot );
            }
        }

        if (this.onDisconnectInput)
            this.onDisconnectInput(slot);

            
        this.setDirtyCanvas(false,true);
        this.graph.connectionChange( this );
        return true;
    }

    getMaximumEvents()
    {
        let i = 0;
        let o = 0;
        for (let index in this.inputs)
            if (this.inputs[index].type == '-1') i++;
            else break;

        for (let index in this.outputs)
            if (this.outputs[index].type == '-1') o++;
            else break;

        return [i, o];
    }

    /**
    * returns the center of a connection point in canvas coords
    * @method getConnectionPos
    * @param {boolean} is_input true if if a input slot, false if it is an output
    * @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
    * @param {vec2} out [optional] a place to store the output, to free garbage
    * @return {[x,y]} the position
    **/
    getConnectionPos( is_input, slot_number, out )
    {
        out = out || new Float32Array(2);
        var num_slots = 0;
        if( is_input && this.inputs )
            num_slots = this.inputs.length;
        if( !is_input && this.outputs )
            num_slots = this.outputs.length;


        //Slot Offset
        let offset = this.instance.NODE_SLOT_HEIGHT * 0.5 - 7;
        
        //Collapsed
        if(this.flags.collapsed)
        {
            out[0] = this.pos[0] + (is_input ? 0 : (this._collapsed_width || this.instance.NODE_COLLAPSED_WIDTH));
            out[1] = this.pos[1] - this.instance.NODE_TITLE_HEIGHT * 0.5;
            return out;
        }

        //hard-coded pos
        if(is_input && num_slots > slot_number && this.inputs[ slot_number ].pos)
        {
            out[0] = this.pos[0] + this.inputs[slot_number].pos[0];
            out[1] = this.pos[1] + this.inputs[slot_number].pos[1];
            return out;
        }
        
        if(!is_input && num_slots > slot_number && this.outputs[ slot_number ].pos)
        {
            out[0] = this.pos[0] + this.outputs[slot_number].pos[0];
            out[1] = this.pos[1] + this.outputs[slot_number].pos[1];
            return out;
        }

        //default vertical slots
        if(is_input) 	out[0] = this.pos[0] + offset;
        else 			out[0] = this.pos[0] + this.size[0] + 1 - offset;

        let events = this.getMaximumEvents();
        let cap = events[is_input ? 0 : 1];
        let max = Math.max(events[0], events[1], 1);

        if (slot_number >= cap)
        {	
            //Below events
            let snum = slot_number - cap;
            out[1] = this.pos[1] + (snum * this.instance.NODE_SLOT_HEIGHT) + (this.instance.NODE_TITLE_HEIGHT * 0.5);	

            //Offset by the widget count
            if (this.widgets) {
                for(let w = 0; w < this.widgets.length; w++) {
                    //TODO: Height Checks
                    out[1] += 20;
                }
            }
        }
        else
        {
            //Events
            let snum = slot_number - max;
            out[1] = this.pos[1] + (snum * this.instance.NODE_SLOT_HEIGHT) + (this.instance.NODE_SLOT_HEIGHT * 0.5);
        }

        return out;
    }

    /* Force align to grid */
    alignToGrid()
    {
        this.pos[0] = this.instance.CANVAS_GRID_SIZE * Math.round(this.pos[0] / this.instance.CANVAS_GRID_SIZE);
        this.pos[1] = this.instance.CANVAS_GRID_SIZE * Math.round(this.pos[1] / this.instance.CANVAS_GRID_SIZE);
    }


    /* Console output */
    trace(msg)
    {
        if(!this.console)
            this.console = [];
        this.console.push(msg);
        if(this.console.length > LGraphNode.MAX_CONSOLE)
            this.console.shift();

        this.graph.onNodeTrace(this,msg);
    }

    /* Forces to redraw or the main canvas (LGraphNode) or the bg canvas (links) */
    setDirtyCanvas(dirty_foreground, dirty_background)
    {
        if(!this.graph)
            return;
        this.graph.sendActionToCanvas("setDirty",[dirty_foreground, dirty_background]);
    }

    loadImage(url)
    {
        var img = new Image();
        img.src = this.instance.node_images_path + url;
        img.ready = false;

        var that = this;
        img.onload = function() {
            this.ready = true;
            that.setDirtyCanvas(true);
        }
        return img;
    }

    //safe LGraphNode action execution (not sure if safe)
    /*
    executeAction(action)
    {
        if(action == "") return false;

        if( action.indexOf(";") != -1 || action.indexOf("}") != -1)
        {
            this.trace("Error: Action contains unsafe characters");
            return false;
        }

        var tokens = action.split("(");
        var func_name = tokens[0];
        if( typeof(this[func_name]) != "function")
        {
            this.trace("Error: Action not found on node: " + func_name);
            return false;
        }

        var code = action;

        try
        {
            var _foo = eval;
            eval = null;
            (new Function("with(this) { " + code + "}")).call(this);
            eval = _foo;
        }
        catch (err)
        {
            this.trace("Error executing action {" + action + "} :" + err);
            return false;
        }

        return true;
    }
    */

    /* Allows to get onMouseMove and onMouseUp events even if the mouse is out of focus */
    captureInput(v)
    {
        if(!this.graph || !this.graph.list_of_graphcanvas)
            return;

        var list = this.graph.list_of_graphcanvas;

        for(var i = 0; i < list.length; ++i)
        {
            var c = list[i];
            //releasing somebody elses capture?!
            if(!v && c.node_capturing_input != this)
                continue;

            //change
            c.node_capturing_input = v ? this : null;
        }
    }

    /**
    * Collapse the node to make it smaller on the canvas
    * @method collapse
    **/
    collapse( force )
    {
        this.graph._version++;
        if(this.constructor.collapsable === false && !force)
            return;
        if(!this.flags.collapsed)
            this.flags.collapsed = true;
        else
            this.flags.collapsed = false;
        this.setDirtyCanvas(true,true);
    }

    /**
    * Forces the node to do not move or realign on Z
    * @method pin
    **/

    pin(v)
    {
        this.graph._version++;
        if(v === undefined)
            this.flags.pinned = !this.flags.pinned;
        else
            this.flags.pinned = v;
    }

    localToScreen(x,y, graphcanvas)
    {
        return [(x + this.pos[0]) * graphcanvas.scale + graphcanvas.offset[0],
            (y + this.pos[1]) * graphcanvas.scale + graphcanvas.offset[1]];
    }


    /**
    * Changes the type of a global graph input
    * @method changeInputType
    * @param {String} name
    * @param {String} type
    */
    changeInputType(name, type)
    {
        if(!this.inputs[name])
            return false;

        if(this.inputs[name].type && String(this.inputs[name].type).toLowerCase() == String(type).toLowerCase() )
            return;

        this.inputs[name].type = type;
        this._version++;
        this.disconnectInput(name);
        if(this.onInputTypeChanged)
            this.onInputTypeChanged(name, type);
    }

    shiftOutput(fromSlot, toSlot, minSlot = null) {

        let self = this;

        //Cannot shift null outputs
        if (!this.outputs || !this.outputs[fromSlot]) 
            return false;


        //Prepare ourselves and calculate our min position
        if (minSlot === null) {
            for(let i = 0; i < this.outputs.length; i++) {
                if (!this.outputs[i].locked) {
                    minSlot = i;
                    break;
                }
            }
        }

        //Clamp the toSlot to our bounds
        toSlot = Math.clamp(toSlot, minSlot, this.outputs.length);
        
        //Cannot shift to the same spot
        if (fromSlot == toSlot) 
            return false;

        function shift_links(i, index) {
            //Move the links over
            if (self.outputs[i].links) {
                for(let l in self.outputs[i].links) 
                {
                    let link_id = self.outputs[i].links[l];
                    let link 	= self.graph.links[link_id];
                    link.origin_slot = index;
                }
            }
        }
        
        let new_outputs = [];
        let index = 0;

        for(let i in this.outputs) {
            if (i == fromSlot) continue;
            if (i == toSlot) {

                //Move the links over
                shift_links(fromSlot, index);

                //Add to our list
                new_outputs[index] = this.outputs[fromSlot];	
                index++;
            }		

            //Move the links over
            shift_links(i, index);	
            new_outputs[index] = this.outputs[i];
            index++;
        }

        //We need to push the last one?
        if (toSlot == this.outputs.length) {
            shift_links(fromSlot, index);
            new_outputs[index] = this.outputs[fromSlot];
        }

        this.outputs = new_outputs;
        this._version++;
        this.graph.setDirtyCanvas(true, true);
        return true;
    }

    shiftInput(fromSlot, toSlot, minSlot = null) {

        let self = this;

        //Cannot shift null outputs
        if (!this.inputs || !this.inputs[fromSlot]) 
            return false;


        //Prepare ourselves and calculate our min position
        if (minSlot === null) {
            for(let i = 0; i < this.inputs.length; i++) {
                if (!this.inputs[i].locked) {
                    minSlot = i;
                    break;
                }
            }
        }

        //Clamp the toSlot to our bounds
        toSlot = Math.clamp(toSlot, minSlot, this.inputs.length);
        
        //Cannot shift to the same spot
        if (fromSlot == toSlot) 
            return false;

        function shift_link(i, index) {
            //Move the links over
            if (self.inputs[i].link) {
                let link_id = self.inputs[i].link;
                let link 	= self.graph.links[link_id];
                link.target_slot = index;
            }
        }
        
        let new_outputs = [];
        let index = 0;

        for(let i in this.inputs) {
            if (i == fromSlot) continue;
            if (i == toSlot) {

                //Move the links over
                shift_link(fromSlot, index);

                //Add to our list
                new_outputs[index] = this.inputs[fromSlot];	
                index++;
            }		

            //Move the links over
            shift_link(i, index);	
            new_outputs[index] = this.inputs[i];
            index++;
        }

        //We need to push the last one?
        if (toSlot == this.inputs.length) {
            shift_link(fromSlot, index);
            new_outputs[index] = this.inputs[fromSlot];
        }

        this.inputs = new_outputs;
        this._version++;
        this.graph.setDirtyCanvas(true, true);
        return true;
    }

    
    /**
    * Changes the type of a global graph output
    * @method changeOutputType
    * @param {String} name
    * @param {String} type
    */
    changeOutputType(name, type)
    {
        console.log("Change Output Type", name, type);
        if(!this.outputs[name])
            return false;

        if(this.outputs[name].type && String(this.outputs[name].type).toLowerCase() == String(type).toLowerCase() )
            return;

        this.outputs[name].type = type;
        this._version++;

        this.disconnectOutput(Number(name));
        if(this.onOutputTypeChanged)
            this.onOutputTypeChanged(name, type);
    }

    /** Called when the node prelaods */
    onPreload() {
        for(let i in this.widgets) {
            let w = this.widgets[i];
            switch(w.type) {
                default: 
                    console.warn("Preload unavailable for widget " + w.type);
                    break;

                case "combo":
                    this.widgets[i].value = this.properties[w.options.property];
                    break;
            }
        }
    }

    /**
     * Sets hte style of the node
     * @param {string} style 
     * @param {boolean} isEvent 
     */
    setStyle(style) {
        this.style = style;

        if (!NodeStyle[style])
            style = 'default';
        
        let s =  NodeStyle[style];
        this.color = s.headerColor;
        this.bgcolor = s.bodyColor;
        this.textColor = s.fontColor;
        this.shape = NodeShape.BOX_SHAPE;
    }
}