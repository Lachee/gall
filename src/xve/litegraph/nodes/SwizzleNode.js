import { BasicNode } from "./BasicNode";

export class SwizzleNode extends BasicNode {
    /** Creates a new node
     * @param { LiteInstance } instance 
     * @param { String } type
     */
    constructor(instance, type) {
        super(instance, type);
    }

    getTitle() {
        if (this.inputs[0] && this.inputs[0].link) 
        {
            let data = this.getLinkedOutputInfo(0);
            let name = data.name;
    
            //Update the name
            this.inputs[0].label = name;
    
            //Update the title
            this.title = name;
            let connected = this.connectedOutputs();
            if (connected && connected.length == 1)
            {
                let out = this.outputs[connected[0]];
                this.title += "." + out.name;
            }
        }
        else
        {
            this.title = "__title__";
        }
    
        return this.title;
    }

    async onLoad() 
    {
        //Update our type then our stored input type
        if (!this.properties.ref) this.properties.ref = "Object,Object[],Object<>";
        if (!this.properties.in) this.properties.in = "Object,Object[],Object<>";
        await this.changeType(this.properties.ref, true);
        this.changeInputType(this.properties.in);
    }

    onConnectionsChange(side, slot, connected, link_info, input_info)
    {
        //Only inputs will trigger this
        //TODO Replace INPUT
        if (side != this.instance.INPUT) return;

        //Always update our name
        if (connected && this.inputs[0] && this.inputs[0].link) 
        {
            let data = this.getLinkedOutputInfo(0);
            let type = data.type;

            //Update the output and then update our input to reflect our new type
            this.changeType(type);
            this.changeInputType(type + ",Object,Object[],Object<>");

        }
        else
        {
            //Reset the label
            this.inputs[slot].label = "object";
            this.changeInputType("Object,Object[],Object<>");
        }
    }

    /** Changes the type of the swizzle */
    async changeType(type, force = false)
    {
        if (this.properties.ref == null) 
            this.properties.ref = 'Object';

        //Skip because it already matches
        if (!force && this.properties.ref.toLowerCase() == type.toLowerCase())
        {
            console.warn("Skipping because they match", this.properties.ref, type);
            return;
        }
        
        let baseType = this.properties.refraw = type.toLowerCase();
        if (type.toLowerCase().endsWith("[]")) { 
            type = 'array';
        }

        if (type.toLowerCase().endsWith("<>")) { 
            baseType = type.slice(0, type.length - 2);
            type = 'collection';
        }
        
        let fieldType = this.instance.getType(type);
        if (!fieldType)
        {
            console.warn("Failed to swizzle because type doesnt have a handler.", type);
            return;
        }

        //Get allt he fields. We will iterate and replace all the swizzle fields with correct ones
        let handler = await fieldType.getFields();
        for(let key in handler) {
            if (handler[key].type == 'swizzle') {
                handler[key].type = baseType;
                console.log(baseType, this.properties.ref);
            }
        }

        //Get the old handler (if any) and prepare a list of links to reattach
        let links = [];
        let prevFieldType = this.instance.getType(this.properties.ref);
        if (prevFieldType != null) {
            let prevHandler = await prevFieldType.getFields();
            if (prevHandler) 
            {
                //Iterate over every property. If the property matches the name and the type,
                // store the link information so we can relink it later.
                for (let outputName in handler)
                {
                    //Check if it is a match.
                    let match = Object.keys(prevHandler).some((e) => {
                        return e.toLowerCase() == outputName.toLowerCase() && prevHandler[e].type.toLowerCase() == handler[outputName].type.toLowerCase();
                    });

                    //Its a match, so lets get the original output for that and add its links.
                    if (match)
                    {
                        for (let slot in this.outputs)
                        {
                            if (this.outputs[slot].links && this.outputs[slot].name.toLowerCase() == outputName.toLowerCase())
                            {
                                for (let l in this.outputs[slot].links)
                                {
                                    //Add each link to the list. We will record the origin node as a name instead
                                    let lnk = this.getLink(this.outputs[slot].links[l]);
                                    links.push({
                                        origin: outputName,
                                        target_id: lnk.target_id,
                                        target_slot: lnk.target_slot,
                                        anchors: lnk.anchors,
                                    })
                                }
                                break;
                            }
                        }
                    }
                }        
            }
            else
            {
                console.warn("Could not map " + this.properties.ref + " to " + type);
            }
        }

        //Remove all the outputs
        this.removeAllOutputs();

        //Update our property and type
        this.properties.ref = type;
        this.properties.cnt = Object.keys(handler).length;
        
        //Iterate over every item in the handler, creating a new output node for it
        for (let name in handler) 
        {
            let slot_label = handler[name].label || name;
            let slot_type = handler[name].type;
            if (slot_type == 'inherit') 
            {
                if (this.properties.refraw) 
                {
                    slot_type = this.properties.refraw;
                    if (slot_type.endsWith("[]") || slot_type.endsWith("<>"))
                        slot_type = slot_type.substr(0, slot_type.length - 2);
                }
                else
                {
                    slot_type = 'object';
                }
            } 
            this.addOutput(slot_label, slot_type);
        }
            
        //Relink all the nodes again
        for (let l in links)
        {
            let link = links[l];
            console.log("Relinked", link, l, links);
            let result = this.connect(link.origin, link.target_id, link.target_slot, link.anchors);
        }
    }

    /** Changes the type of the input */
    changeInputType(type)
    {
        //Update the output and store the type
        this.setInputType(0, type);
        this.properties.in = type;
    }
}