export class LLink {
    constructor( id, type, origin_id, origin_slot, target_id, target_slot )
    {
        this.id = id;
        this.type = type;
        this.origin_id = origin_id;
        this.origin_slot = origin_slot;
        this.target_id = target_id;
        this.target_slot = target_slot;
        this.anchors = [];
    
        this._data = null;
        //this._pos = new Float32Array(2); //center
        this._start = new Float32Array(2);
        this._end = new Float32Array(2);
    }

    /** Loads the link data */
    load(o)
    {
        if(o.constructor == Array)
        {
            let index = 0;
            //this.id             = o[index++];
            //this.type           = o[index++];
            this.origin_id      = o[index++];
            this.origin_slot    = o[index++];
            this.target_id      = o[index++];
            this.target_slot    = o[index++];
            this.anchors        = o[index++];
        }
        else
        {
            this.id = o.id;
            this.type = o.type;
            this.origin_id = o.origin_id;
            this.origin_slot = o.origin_slot;
            this.target_id = o.target_id;
            this.target_slot = o.target_slot;
            this.anchors = o.anchors;
        }

        return this;
    }

    /** Saves the link data */
    save()
    {
        return [ 
            //this.id, 
            //this.type, 
            this.origin_id, this.origin_slot, 
            this.target_id, this.target_slot,
            this.anchors 
        ];
    }
}