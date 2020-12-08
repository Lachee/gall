export class LUtil {
    
    /** Calcualtes the magnitude */
    static magnitude(vel) 
    {
        return Math.sqrt((vel[0] * vel[0]) + (vel[1] * vel[1]))
    }
    
    /** A very small value */
    static isEpsilon(number)
    {
        return Math.abs(number) < 1e-10;
    }
        
    static compareObjects(a,b)
    {
        for(var i in a)
            if(a[i] != b[i])
                return false;
        return true;
    }

    static distance(a,b)
    {
        return Math.sqrt( (b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]) );
    }

    static colorToString(c)
    {
        return "rgba(" + Math.round(c[0] * 255).toFixed() + "," + Math.round(c[1] * 255).toFixed() + "," + Math.round(c[2] * 255).toFixed() + "," + (c.length == 4 ? c[3].toFixed(2) : "1.0") + ")";
    }

    static isInsideRectangle( x,y, left, top, width, height)
    {
        if (left < x && (left + width) > x &&
            top < y && (top + height) > y)
            return true;
        return false;
    }

    //[minx,miny,maxx,maxy]
    static growBounding( bounding, x,y)
    {
        if(x < bounding[0])
            bounding[0] = x;
        else if(x > bounding[2])
            bounding[2] = x;

        if(y < bounding[1])
            bounding[1] = y;
        else if(y > bounding[3])
            bounding[3] = y;
    }

    //point inside bounding box
    static isInsideBounding(p,bb)
    {
        if (p[0] < bb[0][0] ||
            p[1] < bb[0][1] ||
            p[0] > bb[1][0] ||
            p[1] > bb[1][1])
            return false;
        return true;
    }

    //bounding overlap, format: [ startx, starty, width, height ]
    static overlapBounding(a,b)
    {
        var A_end_x = a[0] + a[2];
        var A_end_y = a[1] + a[3];
        var B_end_x = b[0] + b[2];
        var B_end_y = b[1] + b[3];

        if ( a[0] > B_end_x ||
            a[1] > B_end_y ||
            A_end_x < b[0] ||
            A_end_y < b[1])
            return false;
        return true;
    }

    //Convert a hex value to its decimal value - the inputted hex must be in the
    //	format of a hex triplet - the kind we use for HTML colours. The function
    //	will return an array with three values.
    static hex2num(hex) {
        if(hex.charAt(0) == "#") hex = hex.slice(1); //Remove the '#' char - if there is one.
        hex = hex.toUpperCase();
        var hex_alphabets = "0123456789ABCDEF";
        var value = new Array(3);
        var k = 0;
        var int1,int2;
        for(var i=0;i<6;i+=2) {
            int1 = hex_alphabets.indexOf(hex.charAt(i));
            int2 = hex_alphabets.indexOf(hex.charAt(i+1));
            value[k] = (int1 * 16) + int2;
            k++;
        }
        return(value);
    }

    //Give a array with three values as the argument and the function will return
    //	the corresponding hex triplet.
    static num2hex(triplet) {
        var hex_alphabets = "0123456789ABCDEF";
        var hex = "#";
        var int1,int2;
        for(var i=0;i<3;i++) {
            int1 = triplet[i] / 16;
            int2 = triplet[i] % 16;

            hex += hex_alphabets.charAt(int1) + hex_alphabets.charAt(int2);
        }
        return(hex);
    }

    /** Clamps a value */
    static clamp(v,a,b) { return (a > v ? a : (b < v ? b : v)); }

    /** Copies the object into a new object */
    static clone(object) { return Object.assign({}, object); }

}


//Scale and Offset
export class DragAndScale {
    constructor( element, skip_events )
    {
        this.offset = new Float32Array([0,0]);
        this.scale = 1;
        this.max_scale = 10;
        this.min_scale = 0.1;
        this.onredraw = null;
        this.enabled = true;
        this.last_mouse = [0,0];
        this.element = null;
        this.visible_area = new Float32Array(4);

        if(element)
        {
            this.element = element;
            if(!skip_events)
                this.bindEvents( element );
        }
    }

    bindEvents( element )
    {
        this.last_mouse = new Float32Array(2);

        this._binded_mouse_callback = this.onMouse.bind(this);

        element.addEventListener("mousedown", this._binded_mouse_callback );
        element.addEventListener("mousemove", this._binded_mouse_callback );

        element.addEventListener("mousewheel", this._binded_mouse_callback, false);
        element.addEventListener("wheel", this._binded_mouse_callback, false);
    }

    computeVisibleArea()
    {
        if(!this.element)
        {
            this.visible_area[0] = this.visible_area[1] = this.visible_area[2] = this.visible_area[3] = 0;
            return;
        }
        var width = this.element.width;
        var height = this.element.height;
        var startx = -this.offset[0];
        var starty = -this.offset[1];
        var endx = startx + width / this.scale;
        var endy = starty + height / this.scale;
        this.visible_area[0] = startx;
        this.visible_area[1] = starty;
        this.visible_area[2] = endx - startx;
        this.visible_area[3] = endy - starty;
    }

    onMouse(e)
    {
        if(!this.enabled)
            return;

        var canvas = this.element;
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        e.canvasx = x;
        e.canvasy = y;
        e.dragging = this.dragging;

        var ignore = false;
        if(this.onmouse)
            ignore = this.onmouse(e);

        if(e.type == "mousedown")
        {
            this.dragging = true;
            canvas.removeEventListener("mousemove", this._binded_mouse_callback );
            document.body.addEventListener("mousemove", this._binded_mouse_callback  );
            document.body.addEventListener("mouseup", this._binded_mouse_callback );
        }
        else if(e.type == "mousemove")
        {
            if(!ignore)
            {
                var deltax = x - this.last_mouse[0];
                var deltay = y - this.last_mouse[1];
                if( this.dragging )
                    this.mouseDrag( deltax, deltay );
            }
        }
        else if(e.type == "mouseup")
        {
            this.dragging = false;
            document.body.removeEventListener("mousemove", this._binded_mouse_callback );
            document.body.removeEventListener("mouseup", this._binded_mouse_callback );
            canvas.addEventListener("mousemove", this._binded_mouse_callback  );
        }
        else if(e.type == "mousewheel" || e.type == "wheel" || e.type == "DOMMouseScroll")
        { 
            e.eventType = "mousewheel";
            if(e.type == "wheel")
                e.wheel = -e.deltaY;
            else
                e.wheel = (e.wheelDeltaY != null ? e.wheelDeltaY : e.detail * -60);

            //from stack overflow
            e.delta = e.wheelDelta ? e.wheelDelta/40 : e.deltaY ? -e.deltaY/3 : 0;
            this.changeDeltaScale(1.0 + e.delta * 0.05);
        }

        this.last_mouse[0] = x;
        this.last_mouse[1] = y;

        e.preventDefault();
        //l e.stopPropagation();
        return false;
    }

    toCanvasContext( ctx )
    {
        ctx.scale( this.scale, this.scale );
        ctx.translate( this.offset[0], this.offset[1] );
    }

    convertOffsetToCanvas(pos)
    {
        //return [pos[0] / this.scale - this.offset[0], pos[1] / this.scale - this.offset[1]];
        return [ (pos[0] + this.offset[0]) * this.scale, (pos[1] + this.offset[1]) * this.scale ];
    }

    convertCanvasToOffset(pos, out)
    {
        out = out || [0,0];
        out[0] = pos[0] / this.scale - this.offset[0];
        out[1] = pos[1] / this.scale - this.offset[1];
        return out;
    }

    mouseDrag(x,y)
    {
        this.offset[0] += x / this.scale;
        this.offset[1] += y / this.scale;

        if(	this.onredraw )
            this.onredraw( this );
    }

    changeScale( value, zooming_center )
    {
        if(value < this.min_scale)
            value = this.min_scale;
        else if(value > this.max_scale)
            value = this.max_scale;

        if(value == this.scale)
            return;

        if(!this.element)
            return;

        var rect = this.element.getBoundingClientRect();
        if(!rect)
            return;

        zooming_center = zooming_center || [rect.width * 0.5,rect.height * 0.5];
        var center = this.convertCanvasToOffset( zooming_center );
        this.scale = value;
        if( Math.abs( this.scale - 1 ) < 0.01 )
            this.scale = 1;

        var new_center = this.convertCanvasToOffset( zooming_center );
        var delta_offset = [new_center[0] - center[0], new_center[1] - center[1]];

        this.offset[0] += delta_offset[0];
        this.offset[1] += delta_offset[1];

        if(	this.onredraw )
            this.onredraw( this );
    }

    changeDeltaScale( value, zooming_center )
    {
        this.changeScale( this.scale * value, zooming_center );
    }

    reset()
    {
        this.scale = 1;
        this.offset[0] = 0;
        this.offset[1] = 0;
    }
}

// Node Styling
export const NodeStyle = {
    default: {
        headerColor: '#232323',
        bodyColor: '#353535',
        fontColor: '#FFF',
    },
    ASYNC: {
        headerColor: '#7b62b6',
        bodyColor: '#353535',
        fontColor: '#FFF',
    },
    EVENT:  {
        headerColor: '#7b62b6',
        bodyColor: '#353535',
        fontColor: '#FFF',
    },
    IO_INPUT: {
        headerColor: '#1aa57e',
        bodyColor: '#353535',
        fontColor: '#FFF',
    },
    IO_OUTPUT: {
        headerColor: '#1aa57e',
        bodyColor: '#353535',
        fontColor: '#FFF',
    }, 
    IO_EVENT: {
        headerColor: '#2abad0',
        bodyColor: '#353535',
        fontColor: '#FFF',
    },
    SUBNODE: {        
        headerColor: '#A7194E',
        bodyColor: '#353535',
        fontColor: '#FFF',
    }
};

//shapes are used for nodes but also for slots
export const NodeShape = {
    BOX_SHAPE: 1,
    ROUND_SHAPE: 2,
    CIRCLE_SHAPE: 3,
    CARD_SHAPE: 4,
    ARROW_SHAPE: 5,
    ARRAY_SHAPE: 6,
    ICON_SHAPE: 7,
    READONLY_SHAPE: 8,
}

export const ValidNodeShapes = ["default","box","round","card"];