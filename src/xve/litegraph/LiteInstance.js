import { Definition } from "../api/Definition";
import { LiteNode } from "./LiteNode";
import { NodeShape } from "./LUtil";
import { FieldType } from "../api/FieldType";

export class LiteInstance {

	/** @type { Definition[] } List of definitions */
	#definitions = {};

	/** @type { FieldType[] } List of types */
	#types = {};

	constructor(options) {
		//Set the defaults
		this.#setProperties({

			AVAILABLE_NODE_CLASSES: {
				BasicNode: 		require('./nodes/BasicNode').BasicNode,
				SwizzleNode:	require('./nodes/SwizzleNode').SwizzleNode
			},

			PALETTE: {
				shadow: 	'rgba(0,0,0,0.5)',
				outline: 	'#000000aa',
				node: 		"#333",
				node_bg: 	"#353535",
				node_box:	"#666",
				text: 		"#AAA",
			},

			VERSION: 0.4,

			CANVAS_GRID_SIZE: 10,
			
			NODE_TITLE_HEIGHT: 30,
			NODE_TITLE_TEXT_X: 20,
			NODE_TITLE_TEXT_Y: 15,
			NODE_SLOT_HEIGHT: 20,
			NODE_WIDGET_HEIGHT: 18,
			NODE_WIDTH: 160,
			NODE_MIN_WIDTH: 50,
			NODE_COLLAPSED_RADIUS: 10,
			NODE_COLLAPSED_WIDTH: 80,
			NODE_TEXT_SIZE: 8,
			
			NODE_SUBTEXT_SIZE: 8,
			
			NODE_DEFAULT_SHAPE: "box",
			DEFAULT_GROUP_FONT: 24,
			
			BINDING_WIDTH: 62,
			BINDING_HEIGHT: 15,
			BINDING_MARGIN: 12,
			AUTO_WRAP_BINDINGS: true,


			MAX_NUMBER_OF_NODES: 1000, //avoid infinite loops
			DEFAULT_POSITION: [100,100],//default node position

			//enums
			INPUT: 1,
			OUTPUT: 2,

			EVENT: -1, //for outputs
			ACTION: -1, //for inputs

			ALWAYS: 0,
			ON_EVENT: 1,
			NEVER: 2,
			ON_TRIGGER: 3,

			UP: 1,
			DOWN:2,
			LEFT:3,
			RIGHT:4,
			CENTER:5,

			STRAIGHT_LINK: 0,
			LINEAR_LINK: 1,
			SPLINE_LINK: 2,

			NORMAL_TITLE: 0,
			NO_TITLE: 1,
			TRANSPARENT_TITLE: 2,
			AUTOHIDE_TITLE: 3,

			TYPE_DESIGN: {
				'default':  { shape: 3, style: 2, color_on: "#fafafa", color_off: "#FF00FF" },
				'invalid':  { color_on: "#1c1c1c",  shape: 8 , strike: true, label_color: "#1c1c1c"},
				'object':   { icon: "\uf61f" },
				'array':    { type: "object",  shape: 1 },
				'boolean':  { color_on: "#e6194B"  },
				'number':   { color_on: "#4363d8"  },
				'string':   { color_on: "#bfef45"  }, 
				'regex':    { color_on: "#bfef45", shape: 8 },
				'-1':       { type: "event", color_on: "#FFB6C1" , shape: 5, dashed: false }, 
			},
			
			snapToGrid: true,

			debug: false,
			catch_exceptions: true,
			throw_errors: true,
			
			allow_scripts: false, //if set to true some nodes like Formula would be allowed to evaluate code that comes from unsafe sources (like node configuration), which could lead to exploits
			registered_node_types: {}, //nodetypes by string
			
			proxy: null, //used to redirect calls
			node_images_path: "",
			node_types_by_file_extension: {}, //used for dropping files in the canvas
			Nodes: {}, //node types by classname

			searchbox_extras: {}, //used to add extra features to the search box
			_histroy: [],

		});
	
	
		//Define the timer
		if(typeof(performance) != "undefined")
			this.getTime = performance.now.bind(performance);
		else if(typeof(Date) != "undefined" && Date.now)
			this.getTime = Date.now.bind(Date);
		else if(typeof(process) != "undefined")
			this.getTime = function(){
				var t = process.hrtime();
				return t[0]*0.001 + t[1]*(1e-6);
			}
		else
			this.getTime = function getTime() { return (new Date).getTime(); }		

		//Finally set what we passed
		this.#setProperties(options);
	}

	/** Gets the names of a function's parameters */
	static getParameterNames(func) {
		return (func + '')
		  .replace(/[/][/].*$/mg,'') // strip single-line comments
		  .replace(/\s+/g, '') // strip white space
		  .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments  /**/
		  .split('){', 1)[0].replace(/^[^(]*[(]/, '') // extract the parameters
		  .replace(/=[^,]+/g, '') // strip any ES6 defaults
		  .split(',').filter(Boolean); // split & filter [""]
	}
	
	/** Adds a type styling */
	addTypeStyle(name, stype, options)  { this.TYPE_DESIGN[name.toString().toLowerCase()] = style; }

	/** Sets a type styling */
	getTypeStyle(type) 
	{
		//No type, return object
		if (!type || type === 0) 
			return this.getTypeStyle('object');

		//Prepare the name
		let typename = type.toString().toLowerCase();
		let isArray = false;
		let subname = "";

		let types = typename.split(',');
		for (let v = 0; v < types.length; v++) {

			subname = types[v];
			isArray = false;
			
			if (!isArray && subname.endsWith("<>"))
			{
				isArray = true;
				subname = subname.substr(0, subname.length - 2);
			}

			if (!isArray && subname.endsWith("[]"))
			{
				isArray = true;
				subname = subname.substr(0, subname.length - 2);
			} 
			
			//Return the first matching
			//if (this.TYPE_DESIGN[subname]) 
			const baseStyle = this.TYPE_DESIGN['default'];
			let style = {};
			if (subname == '-1' || this.TYPE_DESIGN[subname]) 
			{
				Object.assign(style,  baseStyle,  this.TYPE_DESIGN[subname]);
			} 
			else
			{
				let type = this.getType(subname);
				if (type != null)
				{
					Object.assign(style,  baseStyle,  type.style);
				}
				else 
				{
					console.warn("Failed to find type", subname);
					style = baseStyle;
				}
			}

			//Slap on the array modifier
			style.type = subname;
			if (isArray) Object.assign(style, this.TYPE_DESIGN['array']);
			return style;
		}

		//Return default
		return this.TYPE_DESIGN['default'];
	}
			
	/** Gets a type styling */
	getTypeStyles(types) {		
		if (!Array.isArray(types)) { types = types.split(','); }
		if (types.length == 1) return [this.getTypeStyle(types[0])];

		let styles = [];
		for(let t in types) {
			styles.push(this.getTypeStyle(types[t]));
		}

		return styles;
	}

	/*
	///** Add type fields 
	addTypeFields(name, fields) 
	{ 
		//Prepare the array
		var n = name.toString().toLowerCase();
		this.TYPE_FIELDS[n] = {}; 

		//Each every field
		for(var key in fields)
		{
			let type = key.toLowerCase();
			let value = fields[key];
			if (value.constructor === String) 
				value = { 'type': value.toLowerCase(), 'label': value };

			value.type = value.type.toLowerCase();
			this.TYPE_FIELDS[n][type] = value;
		}
	}

	///** Adds a type field 
	addTypeField(name, field, type, label = null) {
		let n = name.toString().toLowerCase();
		if (!this.TYPE_FIELDS[n]) this.TYPE_FIELDS[n] = {};
		this.TYPE_FIELDS[n][field.toLowerCase()] = { 'type': type.toLowerCase(), 'label': label || type };
	}
	///** Get the fields for the type 
	getTypeFields(name) { 
		return this.TYPE_FIELDS[name.toString().toLowerCase()];
	}
	///** Get the data for the field type 
	getTypeField(name, field) { 
		return this.getTypeFields(name)[field.toLowerCase()];
	}

	addTypeOptions(name, options) 
	{ 
		this.TYPE_OPTIONS[name.toString().toLowerCase()] = options; 
	}
	getTypeOptions(name) { 
		return this.TYPE_OPTIONS[name.toString().toLowerCase()];
	}

	///** Adds a type 
	addType(name, fields, style, options = null)
	{
		if (style != null)
			this.addTypeStyle(name, style);
		
		if (fields != null)
			this.addTypeFields(name, fields);

		if (options != null)
			this.addTypeOptions(name, options);
	}
	*/

	undo() {}
	redo() {}
	addHistory(event, data) 
	{
		this._histroy.push({ e: event, d: data });
	}

	/** Registers a definition
	 * @param { Definition } definition 
	 */
	registerDefinition(definition) {
		this.#definitions[definition.type] = definition;
		let className = this.AVAILABLE_NODE_CLASSES[definition.class] || this.AVAILABLE_NODE_CLASSES['BasicNode'];
		if (className == null) {
			console.error("Cannot register definition as it has no node type", definition);
			return false;
		}

		this.registerNodeType(definition.type, className);
		return true;
	}

	/** Gets the definition from the type name
	 * @param { String } type name of the definition
	 * @return { Definition } the definition
	 */
	getDefinition(type) {
		return this.#definitions[type];
	}


	/**
	 * Registers a field type
	 * @param { FieldType } type 
	 */
	registerType(type) {
		this.#types[type.name] = type;
		return this;
	}

	/**
	 * Returns a field type
	 * @param { string } name 
	 * @return { FieldType } type
	 */
	getType(name) {
		return this.#types[name];
	}

	/**
	* Register a node class so it can be listed when the user wants to create a new one
	* @method registerNodeType
	* @param {String} type name of the node and path
	* @param {Class} base_class class containing the structure of a node
	*/
	registerNodeType(type, base_class)
	{
		if(!base_class.prototype)
			throw("Cannot register a simple object, it must be a class with a prototype");

			base_class.type = type;

		if(this.debug)
			console.log("Node registered: " + type);

		var categories = type.split("/");
		var classname = base_class.name;

		var pos = type.lastIndexOf("/");
		base_class.category = type.substr(0,pos);

		if(!base_class.title)
			base_class.title = classname;
		//info.name = name.substr(pos+1,name.length - pos);

		//extend class
		if(base_class.prototype) //is a class
			for(var i in LiteNode.prototype)
				if(!base_class.prototype[i])
					base_class.prototype[i] = LiteNode.prototype[i];

		/*
		Object.defineProperty( base_class.prototype, "shape",{
			set: function(v) {
				switch(v)
				{
					case "default": delete this._shape; break;
					case "box": this._shape = this.BOX_SHAPE; break;
					case "round": this._shape = this.ROUND_SHAPE; break;
					case "circle": this._shape = this.CIRCLE_SHAPE; break;
					case "card": this._shape = this.CARD_SHAPE; break;
					default:
						this._shape = v;
				}
			},
			get: function(v)
			{
				return this._shape;
			},
			enumerable: true
		});
		*/

		this.registered_node_types[ type ] = base_class;
		if(base_class.constructor.name)
			this.Nodes[ classname ] = base_class;

		//warnings
		//if(base_class.prototype.onPropertyChange)
		//	console.warn("this node class " + type + " has onPropertyChange method, it must be called onPropertyChanged with d at the end");
		//
		//if( base_class.supported_extensions )
		//{
		//	for(var i in base_class.supported_extensions )
		//		this.node_types_by_file_extension[ base_class.supported_extensions[i].toLowerCase() ] = base_class;
		//}
	}

	/**
	* Create a new nodetype by passing a function, it wraps it with a proper class and generates inputs according to the parameters of the function.
	* Useful to wrap simple methods that do not require properties, and that only process some input to generate an output.
	* @method wrapFunctionAsNode
	* @param {String} name node name with namespace (p.e.: 'math/sum')
	* @param {Function} func
	* @param {Array} param_types [optional] an array containing the type of every parameter, otherwise parameters will accept any type
	* @param {String} return_type [optional] string with the return type, otherwise it will be generic
	* @param {Object} properties [optional] properties to be configurable
	*/
	wrapFunctionAsNode( name, func, param_types, return_type, properties,  resolve_input = null)
	{
		var params = Array(func.length);
		var code = "";
		var bindings = "";
		var default_binding = "";
		var lower_param_type = "";
		var names = this.getParameterNames( func );
		var drop_types = {}

		for(var i = 0; i < names.length; ++i)
		{
			bindings = "";
			lower_param_type = param_types[i].toLowerCase();
			drop_types[i] = lower_param_type;
			if (this.AUTO_WRAP_BINDINGS &&  (lower_param_type == "string" || lower_param_type == "number"))
			{
				bindings = "bind: 'input_"+names[i]+"'";
				if (!properties) properties = {};
				
				if (!properties.defaultValue) 
				{
					default_binding = names[i];
					if (lower_param_type == "number") 	default_binding = 0;
					if (lower_param_type == "boolean") 	default_binding = false;
					if (lower_param_type == "emoji") 	default_binding = "😃";
					properties['input_' + names[i]] = default_binding;
				}
				else
				{
					properties['input_' + names[i]] = properties.defaultValue;
				}
			}

			code += "this.addInput('"+names[i]+"',"+(param_types && param_types[i] ? "'" + param_types[i] + "'" : "0") + ", {"+bindings+"});\n";
		}
		code += "this.addOutput('out',"+( return_type ? "'" + return_type + "'" : 0 )+");\n";
		if(properties)
			code += "this.properties = " + JSON.stringify(properties) + ";\n";
			
		var classobj = Function(code);
		classobj.title = name.split("/").pop();
		classobj.desc = "Generated from " + func.name;
		classobj.dropTypes = drop_types;

		classobj.prototype.onExecute = function onExecute()
		{
			for(var i = 0; i < params.length; ++i)
				params[i] = this.getInputData(i);
			var r = func.apply( this, params );
			this.setOutputData(0,r);
		}
		
		if (resolve_input) 
		{
			//console.log("Adding Resolve Input", resolve_input);
			classobj.prototype.resolveInput = resolve_input;
		}
		else
		{
			classobj.prototype.resolveInput = function(get, output)
			{
				let variable_name = gen.getNodeName(this);
				let function_name = gen.getTypeName(this);
				
				gen.declareFunction(function_name, func);
				gen.declareVariable(variable_name, function_name + "(" + params + ")");
				return { isValueType: false, value: variable_name };
			}
		}

		this.registerNodeType( name, classobj );
		return classobj;
	}

	/**
	* Adds this method to all nodetypes, existing and to be created
	* (You can add it to LGraphNode.prototype but then existing node types wont have it)
	* @method addNodeMethod
	* @param {Function} func
	*/
	addNodeMethod(name, func)
	{
		LGraphNode.prototype[name] = func;
		for(var i in this.registered_node_types)
		{
			var type = this.registered_node_types[i];
			if(type.prototype[name])
				type.prototype["_" + name] = type.prototype[name]; //keep old in case of replacing
			type.prototype[name] = func;
		}
	}

	/**
	* Create a node of a given type with a name. The node is not attached to any graph yet.
	* @method createNode
	* @param {String} type full name of the node class. p.e. "math/sin"
	* @param {String} name a name to distinguish from other nodes
	* @param {Object} options to set options
	* @return {LiteNode} the newly created node, otherwise null.
	*/

	createNode( type, title, options )
	{
		var base_class = this.registered_node_types[type];
		if (!base_class)
		{
			//if(this.debug)
				console.log("GraphNode type \"" + type + "\" not registered.");
			return null;
		}

		var prototype = base_class.prototype || base_class;

		title = title || base_class.title || type;

		var node = null;

		if( this.catch_exceptions )
		{
			try
			{
				node = new base_class( this, type );
			}
			catch (err)
			{
				console.error(err);
				return null;
			}
		}
		else
			node = new base_class( this, type );

		node.type = type;
		node.instance = this;

		if(!node.title && title) node.title = title;
		if(!node.properties) node.properties = {};
		if(!node.properties_info) node.properties_info = [];
		if(!node.flags) node.flags = {};
		if(!node.size) node.size = node.computeSize();
		if(!node.pos) node.pos = this.DEFAULT_POSITION.concat();
		if(!node.mode) node.mode = this.ALWAYS;

		//extra options
		if(options)
		{
			for(var i in options)
				node[i] = options[i];
		}

		return node;
	}

	/**
	* Returns a registered node type with a given name
	* @method getNodeType
	* @param {String} type full name of the node class. p.e. "math/sin"
	* @return {Class} the node class
	*/
	getNodeType(type)
	{
		return this.registered_node_types[type];
	}

	/**
	* Returns a list of node types matching one category
	* @method getNodeType
	* @param {String} category category name
	* @return {Array} array with all the node classes
	*/

	getNodeTypesInCategory( category, filter )
	{
		var r = [];
		for(var i in this.registered_node_types)
		{
			var type = this.registered_node_types[i];
			if(filter && type.filter && type.filter != filter)
				continue;

			if(category == "" )
			{
				if (type.category == null)
					r.push(type);
			}
			else if (type.category == category)
				r.push(type);
		}

		return r;
	}

	/**
	* Returns a list with all the node type categories
	* @method getNodeTypesCategories
	* @return {Array} array with all the names of the categories
	*/

	getNodeTypesCategories()
	{
		var categories = {"":1};
		for(var i in this.registered_node_types)
			if(this.registered_node_types[i].category && !this.registered_node_types[i].skip_list)
				categories[ this.registered_node_types[i].category ] = 1;
		var result = [];
		for(var i in categories)
			result.push(i);
		return result;
	}

	//debug purposes: reloads all the js scripts that matches a wildcard
	reloadNodes(folder_wildcard)
	{
		var tmp = document.getElementsByTagName("script");
		//weird, this array changes by its own, so we use a copy
		var script_files = [];
		for(var i in tmp)
			script_files.push(tmp[i]);


		var docHeadObj = document.getElementsByTagName("head")[0];
		folder_wildcard = document.location.href + folder_wildcard;

		for(var i in script_files)
		{
			var src = script_files[i].src;
			if( !src || src.substr(0,folder_wildcard.length ) != folder_wildcard)
				continue;

			try
			{
				if(this.debug)
					console.log("Reloading: " + src);
				var dynamicScript = document.createElement("script");
				dynamicScript.type = "text/javascript";
				dynamicScript.src = src;
				docHeadObj.appendChild(dynamicScript);
				docHeadObj.removeChild(script_files[i]);
			}
			catch (err)
			{
				if(this.throw_errors)
					throw err;
				if(this.debug)
					console.log("Error while reloading " + src);
			}
		}

		if(this.debug)
			console.log("Nodes reloaded");
	}

	//separated just to improve if it doesn't work
	cloneObject(obj, target)
	{
		if(obj == null) return null;
		var r = JSON.parse( JSON.stringify( obj ) );
		if(!target) return r;

		for(var i in r)
			target[i] = r[i];
		return target;
	}

	hasType(type_a, type_b)
	{
		// Check all permutations to see if one is valid
		var supported_types_a = type_a.toString().split(",");
		var supported_types_b = type_b.toString().split(",");
		for(var i = 0; i < supported_types_a.length; ++i)
			for(var j = 0; j < supported_types_b.length; ++j) 
				if(supported_types_a[i] == supported_types_b[j])
					return true;
		return false;
	}

	isValidConnection( type_a, type_b )
	{
		//Events can ONLY connect to events
		if ((type_a == "-1") != (type_b == "-1"))
			return false;

		if( !type_a || 
			!type_b ||
			type_a == type_b)
		return true;

		// Enforce string type to handle toLowerCase call (-1 number not ok)
		type_a = String(type_a); 
		type_b = String(type_b);
		type_a = type_a.toLowerCase();
		type_b = type_b.toLowerCase();

		// For nodes supporting multiple connection types
		if( type_a.indexOf(",") == -1 && type_b.indexOf(",") == -1 )
			return this.canTypesConnect(type_a, type_b);

		// Check all permutations to see if one is valid
		var supported_types_a = type_a.split(",");
		var supported_types_b = type_b.split(",");
		for(var i = 0; i < supported_types_a.length; ++i)
			for(var j = 0; j < supported_types_b.length; ++j) {
				if(this.canTypesConnect(supported_types_a[i], supported_types_b[j]))
					return true;
			}

		return false;
	}

	canTypesConnect(type_a, type_b)
	{
		//They are both events, so they can ONLY connect to events
		if (type_a == "-1" != type_b == "-1")
			return false;

		if (type_a == "invalid" || type_b == "invalid")
			return false;

		//If any are undefined then be so
		if (!type_a || !type_b)
			return true;

		//They both need to end with or not end with array.
		if (type_a.endsWith("<>") != type_b.endsWith("<>")) 
			return false;

		//They both need to end with or not end with collection.
		if (type_a.endsWith("[]") != type_b.endsWith("[]")) 
			return false;

		//Objects can accept anything, otherwise they need to match
		return type_a == type_b || type_b.startsWith("object");
	}

	registerSearchboxExtra( node_type, description, data )
	{
		this.searchbox_extras[ description ] = { type: node_type, desc: description, data: data };
	}

	/** Sets the properties */
	#setProperties(properties) {
		for (var key in properties) {
			this[key] = properties[key];
		}
	}
}