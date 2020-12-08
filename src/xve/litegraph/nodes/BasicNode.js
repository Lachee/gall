import { LiteNode } from '../LiteNode';
import { LUtil } from '../LUtil';

export class BasicNode extends LiteNode {

    constructor(instance, type) {
        super(instance, type);


        //Get the definition and apply the properties based of it
        let definition  = this.definition;
        this.properties = LUtil.clone(definition.properties);
        this.size       = LUtil.clone(definition.size);
        
        //Create the inputs
        for(let i in definition.arguments) {
            const slot = LUtil.clone(definition.arguments[i]);
            this.addInput(slot.name, slot.types.join(','), slot);
        }

        //Create the outputs
        for (let i in definition.results) {
            const slot = LUtil.clone(definition.results[i]);
            if (slot.binding) delete slot.binding;
            this.addOutput(slot.name, slot.types.join(','), slot);
        }

        this.setStyle(definition.style);
    }

    /** Gets the current definition */
    get definition() {
        return this.instance.getDefinition(this.type);
    }
}