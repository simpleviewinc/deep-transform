import { get } from "lodash";

// // Creates a new object with the form of the schema by cherry-picking fields from the obj
// // Can move keys from one part of the object to another, add keys to an array, remove keys from an array
// // Note: In locators "root." will always refer to the root of the object.
// // Note: In locators "current." will refer to where you are in the current structure. In example inside an object in array will refer to that object.
// // Note: Object/arrays, if the value at the locator for 'key' is an object then 'current' will become that object
// // Note: Object/arrays, if the value at the locator for 'key' is an array then each iteration of the array will become 'current'
// // Note: Undefined values are automatically stripped, use trimEmpty to have array and object be stripped:
// // map syntax
// //	{
// //	keyName : "locator" ("root.foo", "current.foo", "root.0.foo.bar", "current.foo.0.bar")
// //  or
// //	keyName : {
// //		key : "locator" // see notes on how this is treated for object/array
// //		map : map (same syntax as root),
// //		trimEmpty : boolean (default false, if true will trim empty arrays and objects with no keys)
// //		template : goatee template to return the value
// //		cast : cast the return using typecaster
// //		conditional : array { filter(s), result } of possible checks for a value return allowing a different map criteria based on whether the filter matched
// //		addToSet : array { filter(s), result } of checks for a value returning a unique array of results for all matching checks
// //		value : static value to utilize
// //		exec : javascript function string or function to execute
// //	}
// // see unit tests for examples
// export default function deepMap(obj, map) {
// 	var returnData = {};
// 	return _deepMap_walk(map, { current : obj, root : obj, rootNew : returnData, new : returnData, var : {} });
// }

// var _deepMap_lookup = function(path, scopes) {
// 	var arr = path.split(".");
// 	var current = scopes;

// 	for(var i = 0; i < arr.length; i++) {
// 		var val = arr[i];
// 		current = current[val];

// 		if (current === undefined) {
// 			break;
// 		} else if (current instanceof Array && current.hasOwnProperty(arr[i + 1]) === true) {
// 			continue;
// 		} else if (current instanceof Array && i < arr.length - 1) {
// 			// if we hit an array, we have to loop over each entry and find it's nested value, we only want to do this if we aren't at the end of the lookup
// 			// and the next value in the lookup can't be casted to a number such as "foo.0.bar" which shouldn't match while "foo.bar", if foo is an array and
// 			// bar is an object will match this if condition
// 			var temp = current;
// 			current = temp.map(function(val) {
// 				return _deepMap_lookup(arr.slice(i + 1).join("."), val);
// 			});
// 			break;
// 		}
// 	}

// 	return current;
// }

// var _deepMap_resolveKey = function(dataKey, scopes) {
// 	if (
// 		dataKey instanceof Array ||
// 		typeof dataKey !== "object"
// 	) {
// 		return dataKey;
// 	}

// 	return _deepMap_lookup(dataKey.key, scopes);
// }

// var _deepMap_testFilter = function(filter, scopes) {
// 	var filters = filter instanceof Array ? filter : [filter];

// 	// some() returns true on match, false on no match, every() returns true on no match, false on match

// 	// if one filter matches (true return) we return true, if no filter matches it will return false
// 	return filters.some(function(filter, i) {
// 		// test each filter, if the filter didn't match (false return) it causes it to iterate again, if one filter matches returns true
// 		return Object.keys(filter).every(function(val, i) {
// 			var source = _deepMap_lookup(val, scopes);

// 			var filterKey = filter[val];

// 			if (filterKey instanceof RegExp) {
// 				return filterKey.test(source);
// 			} else if (filterKey instanceof Object) {
// 				var keys = Object.keys(filterKey);

// 				if (keys.indexOf("$in") > -1) {
// 					var sourceArr = source instanceof Array ? source : [source];

// 					var data = _deepMap_resolveKey(filterKey.$in, scopes);

// 					return (data || []).some(function(val) {
// 						return sourceArr.indexOf(val) > -1;
// 					});
// 				} else if (keys.indexOf("$nin") > -1) {
// 					var sourceArr = source instanceof Array ? source : [source];

// 					var data = _deepMap_resolveKey(filterKey.$nin, scopes);

// 					return data.every(function(val) {
// 						return sourceArr.indexOf(val) === -1;
// 					});
// 				} else if (keys.indexOf("$ne") > -1) {
// 					return source !== filterKey.$ne;
// 				} else if (keys.indexOf("$exists") > -1) {
// 					return (source === undefined) !== filterKey.$exists;
// 				} else if (keys.indexOf("key") > -1) {
// 					return source === _deepMap_lookup(filterKey.key, scopes);
// 				} else if (keys.indexOf("$gt") > -1) {
// 					return source > filterKey.$gt;
// 				} else if (keys.indexOf("$lt") > -1) {
// 					return source < filterKey.$lt;
// 				} else if (keys.indexOf("$gte") > -1) {
// 					return source >= filterKey.$gte;
// 				} else if (keys.indexOf("$lte") > -1) {
// 					return source <= filterKey.$lte;
// 				} else {
// 					throw new Error("Unrecognized filter object mechanism");
// 				}
// 			} else {
// 				// check source against filterKey and if true keep looping
// 				return source === filterKey;
// 			}
// 		});
// 	});
// }

// var _deepMap_getErrorString = function(msg, schema) {
// 	return msg + " At schema entry '" + JSON.stringify(schema) + "'.";
// }

// var _deepMap_getValue = function(schema, scopes) {
// 	var value;

// 	if (schema.log === true) {
// 		console.log("deepMap log");
// 		console.log("schema");
// 		console.dir(schema, { depth : 10 });
// 		console.log("scopes");
// 		console.dir(scopes, { depth : 10 });
// 	}

// 	if (schema.if !== undefined) {
// 		schema.conditional = [{ if : schema.if, then : schema.then, else : schema.else }];
// 	}

// 	if (schema.conditional !== undefined) {
// 		schema.conditional.some(function(val2, i2) {
// 			// map if => filter and then => result for easier syntax readability
// 			if (val2.if !== undefined) { val2.filter = val2.if; }
// 			if (val2.then !== undefined) { val2.result = val2.then; }
// 			if (val2.result === undefined && val2.else === undefined) {
// 				// if neither filter/if or result/else is passed then we assume it returns the boolean state of the condition
// 				val2.result = { value : true };
// 				val2.else = { value : false };
// 			}

// 			var matches = val2.filter !== undefined ? _deepMap_testFilter(val2.filter, scopes) : true;
// 			if (matches === true) {
// 				// matched value, exit some loop by returning true
// 				value = _deepMap_getValue(val2.result, scopes);
// 				return true;
// 			}

// 			if (val2.else !== undefined) {
// 				value = _deepMap_getValue(val2.else, scopes);
// 				return true;
// 			}

// 			return false;
// 		});
// 	} else if (schema.addToSet !== undefined) {
// 		value = [];
// 		schema.addToSet.forEach(function(val2, i2) {
// 			// map if => filter and then => result for easier syntax readability
// 			if (val2.if !== undefined) { val2.filter = val2.if; }
// 			if (val2.then !== undefined) { val2.result = val2.then; }

// 			var matches = val2.filter !== undefined ? _deepMap_testFilter(val2.filter, scopes) : true;
// 			if (matches === true) {
// 				var tempValue = _deepMap_getValue(val2.result, scopes);
// 				if (tempValue === undefined) { return; }

// 				value.push[val2.each === true ? "apply" : "call"](value, tempValue);
// 			}
// 		});
// 		value = arrayLib.unique(value);
// 	} else if (schema.filterArray !== undefined) {
// 		if (typeof schema.filterArray.cond !== "object") { throw new Error("filterArray.cond requires an object or array of objects, received '" + schema.filterArray.cond + "'."); }
// 		if (typeof schema.filterArray.input !== "object") { throw new Error("filterArray.input requires an object, received '" + schema.filterArray.input + "'."); }

// 		// filter the elements in an array
// 		var tempValue = _deepMap_getValue(schema.filterArray.input, scopes) || [];
// 		value = tempValue.filter(function(val2, i2) {
// 			var newScopes = extend({}, scopes, { current : val2 });
// 			return _deepMap_testFilter(schema.filterArray.cond, newScopes);
// 		});
// 	} else if (schema.template !== undefined) {
// 		value = goatee.fill(schema.template, scopes);
// 	} else if (schema.map !== undefined) {
// 		if (schema.key === undefined) {
// 			throw new Error(_deepMap_getErrorString("When using 'map', you must also pass a 'key' for what key will represent the 'current' scope.", schema));
// 		}

// 		if (typeof schema.map !== "object") {
// 			throw new Error(_deepMap_getErrorString("When using 'map', you must pass an object for 'map'.", schema));
// 		}

// 		var source = _deepMap_lookup(schema.key, scopes);
// 		if (source instanceof Array) {
// 			var newArr = [];

// 			value = source.map(function(val2) {
// 				var newScopes = extend({}, scopes, { current : val2, new : {} });
// 				return _deepMap_walk(schema.map, newScopes);
// 			});
// 		} else {
// 			// var newScopes = Object.assign({}, scopes, { current : source, new : {} });
// 			var newScopes = extend({}, scopes, { current : source, new : {} });
// 			value = _deepMap_walk(schema.map, newScopes);
// 		}
// 	} else if (schema.value !== undefined) {
// 		value = schema.value;
// 	} else if (schema.key !== undefined) {
// 		value = _deepMap_lookup(schema.key, scopes);
// 	} else if (schema.exec !== undefined) {
// 		if (typeof schema.exec === "string") {
// 			var fn = new Function("window", "require", "global", "process", "document", "module", "exports", "__dirname", "__filename", "scopes", schema.exec);
// 			value = fn(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, scopes);
// 		} else if (typeof schema.exec === "function") {
// 			value = schema.exec(scopes);
// 		} else {
// 			throw new Error(_deepMap_getErrorString("When using 'exec', it must either be a function or a string.", schema));
// 		}
// 	}

// 	if (value !== undefined && schema.trimEmpty === true) {
// 		if (value instanceof Array) {
// 			value = value.filter(_deepMap_isNotEmpty);

// 			if (value.length === 0) {
// 				return undefined;
// 			}
// 		} else if (typeof value === "object") {
// 			var temp = _deepMap_isNotEmpty(value);
// 			if (temp === false) {
// 				return undefined;
// 			}
// 		}
// 	}

// 	if (value !== undefined && schema.cast !== undefined) {
// 		if (value instanceof Array) {
// 			value = value.map(function(val) { return caster.convert(val, schema.cast) });
// 		} else {
// 			value = caster.convert(value, schema.cast);
// 		}
// 	}

// 	return value;
// }

// var _deepMap_isNotEmpty = function(val) {
// 	return val === undefined ? false : typeof val === "object" ? Object.keys(val).length > 0 : true;
// }

// var _deepMap_walk = function(userSchema, scopes) {
// 	for(var i in userSchema) {
// 		var val = userSchema[i];
// 		var schema = val instanceof Object ? val : { key : val };
// 		var value = _deepMap_getValue(schema, scopes);
// 		var isVar = schema.var === undefined ? false : schema.var;

// 		if (value !== undefined && isVar === false) { scopes.new[i] = value; }
// 		if (value !== undefined && isVar === true) { scopes.var[i] = value; }
// 	}

// 	return scopes.new;
// }

interface DeepMapScopes {
	current: Record<string, any>
	root: Record<string, any>
}

interface DeepMapSchemaOptions {
	/**
	 * The locator for determing what key to use to fill this value.
	 * @example
	 * .foo (shorthand for current.foo)
	 * .foo[0].bar
	 * root.foo
	 * new.bar
	 * current.baz
	 * */
	key?: string
	obj?: DeepMapSchemaObj
	omitEmpty?: boolean
	omitUndefined?: boolean
	cast?: "string" | "number"
	each?: DeepMapSchema
}

export type DeepMapSchema = string | DeepMapSchemaOptions

type DeepMapSchemaObj = Record<string, DeepMapSchema>

export default function deepTransform(obj: any, schema: DeepMapSchema) {
	return processSchema(schema, {
		current: obj,
		root: obj
	})
}

function processSchema(schema: DeepMapSchema, scopes: DeepMapScopes) {
	let value: any;

	const schemaItem = typeof schema === "string" ? { key: schema } : schema;

	const key = !schemaItem.key ? `current`
		: schemaItem.key.startsWith(".") === true ? `current${schemaItem.key}`
		: schemaItem.key
	;

	value = get(scopes, key);

	if (schemaItem.cast !== undefined && value !== undefined) {
		if (schemaItem.cast === "number") {
			value = Number(value);
		} else if (schemaItem.cast === "string") {
			value = value.toString();
		}
	}

	if (schemaItem.each !== undefined && value instanceof Array) {
		const each = schemaItem.each;

		value = value.map(val => processSchema(each, {
			...scopes,
			current: val
		}));
	}

	if (schemaItem.obj !== undefined) {
		const newScopes = {
			...scopes,
			current: value
		}

		value = processSchemaObj(schemaItem.obj, newScopes);
	}

	if (value !== undefined && schemaItem.omitEmpty === true && Object.keys(value).length === 0) {
		value = undefined;
	}

	if (value !== undefined && schemaItem.omitUndefined === true) {
		value = value.filter(val => val !== undefined);
	}

	return value;
}

function processSchemaObj(schemaObj: DeepMapSchemaObj, scopes: DeepMapScopes) {
	const result = {};

	for (const [key, schema] of Object.entries(schemaObj)) {
		const value = processSchema(schema, scopes);

		if (value !== undefined) {
			result[key] = value;
		}
	}

	return result;
}
