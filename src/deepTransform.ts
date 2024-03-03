import get from "lodash/get";
import lodashSet from "lodash/set";
import lodashPick from "lodash/pick";
import { fill } from "goatee";

export interface DeepTransformScopes {
	current: Record<string, any>
	root: Record<string, any>
}

interface DeepTransformIfOperatorFunc {
	(scopes: DeepTransformScopes): boolean
}

interface DeepTransformIfOperatorObj {
	exists?: DeepTransformSchema
	eq?: DeepTransformSchema
	neq?: DeepTransformSchema
	in?: DeepTransformSchema
	nin?: DeepTransformSchema
}

export type DeepTransformIf = Record<string, DeepTransformIfOperatorObj> | DeepTransformIfOperatorFunc

export interface DeepTransformSwitch {
	if: DeepTransformIf
	then: DeepTransformSchema
}

export interface DeepTransformSchemaOptions {
	/**
	 * The locator for determing what key to use to fill this value.
	 * @default "current"
	 * @example
	 * .foo (shorthand for current.foo)
	 * .foo[0].bar
	 * root.foo
	 * new.bar
	 * current.baz
	 * */
	key?: string
	/**
	 * Generate an object at this location with the keys assigned to this object
	*/
	obj?: DeepTransformSchemaObj
	/**
	 * For each key in the object, create a key at the nested location using lodash.set
	 * @example
	 * set: { "foo.bar.baz": ".data" } === { foo: { bar: { baz: "value at .data" } }
	 */
	set?: DeepTransformSet
	/**
	 * If `true` it will preserve the existing data returned by the locator onto the returned object declared by `obj` or `set`.
	 * This allows you to not have to redeclare keys which you are not manipulating.
	 *
	 * This preserve is applied before `obj` and `set` are executed, so if the same key is declared in `obj` or `set` it will override the initial value.
	*/
	preserveData?: boolean
	/**
	 * If specified then it will preserve the data only from the picked columns
	*/
	preservePick?: string[]
	/**
	 * Returns a static value
	 */
	value?: any
	/** If true and the returned object contains no keys, the object itself will be return as undefined rather than {} */
	omitEmpty?: boolean
	/** If true and the return array contains an undefined key, it will be filtered out so
	 * @example
	 * ["foo", 10, true, undefined, false] -> ["foo", 10, true, false]
	 * */
	omitUndefined?: boolean
	/**
	 * Cast the data
	 */
	cast?: "string" | "number" | "booleanString"
	/**
	 * Use a goatee template to generate the return data, when using this format you must pass an explicit scope for each key
	 * @example
	 * template: "{{current.foo}} - {{current.bar}} - {{:current.something}}Goes here{{/}}"
	 * @see {@link https://github.com/simpleviewinc/goatee}
	 */
	template?: string
	/**
	 * Execute a schema on each item in the array
	 */
	each?: DeepTransformSchema
	/**
	 * Conditionally return a transformation based on whether all keys in the if statement return true.
	 *
	 * If the condition is true, it will return the value at `then` or undefined.
	 *
	 * If the condition is false, it will return the value at `else` or undefined.
	 * @example
	 * // test if the value at ".data" === the value at ".bar"
	 * { ".data": { eq: ".bar" } }
	 * // test if the value at ".data" === "yes"
	 * { ".data": { eq: { value: "yes" } } }
	 * // test if the value at ".data" === the value at ".bar" AND the value at ".another" is not undefined
	 * { ".data": { eq: ".bar" }, ".another": { exists: { value: true } } }
	 * // test with an inline function that the value at current.foo === "fooValue"
	 * (scopes) => scopes.current.foo === "fooValue"
	*/
	if?: DeepTransformIf
	/**
	 * If the `if` condition returns true, then it will return the transformation specified here
	 */
	then?: DeepTransformSchema
	/**
	 * If the `if` condition returns false, then it will return the transformation specified here
	 */
	else?: DeepTransformSchema
	/**
	 * If `true` this will log the the arguments at the current stage of the transformation.
	 */
	log?: boolean
	/**
	 * If `true` this will enable the JS debugger so you can step through deepMap to attempt to diagnose why a given schema is failing.
	 */
	debugger?: boolean
	/**
	 * Process an array of statements, the first statement in the array that evaluates to true will return it's `then` clause.
	 * If no statements in the array match, and no `else` is specified, it will return undefined.
	 * If no statements in the array match, and an `else` is specified, it will return the evaluation of the else.
	 */
	switch?: DeepTransformSwitch[]
}

export type DeepTransformSchema = string | DeepTransformSchemaOptions

type DeepTransformSchemaObj = Record<string, DeepTransformSchema>
type DeepTransformSet = Record<string, DeepTransformSchema>

export default function deepTransform(obj: any, schema: DeepTransformSchema) {
	return processSchema(schema, {
		current: obj,
		root: obj
	})
}

function processSchema(schema: DeepTransformSchema, scopes: DeepTransformScopes) {
	let value: any;

	const schemaItem: DeepTransformSchemaOptions = typeof schema === "string" ? { key: schema } : schema;

	const key = !schemaItem.key ? `current`
		: schemaItem.key.startsWith(".") === true ? `current${schemaItem.key}`
		: schemaItem.key
	;

	if (schemaItem.log === true) {
		console.log("deepTransform log");
		console.log("schema:", schema);
		console.log("scopes:", scopes);
		console.log("key:", key);
	}

	if (schemaItem.debugger === true) {
		// eslint-disable-next-line no-debugger -- Allow debugger to assist in debugging
		debugger;
	}

	value = get(scopes, key);

	if (schemaItem.value !== undefined) {
		value = schemaItem.value;
	} else if (schemaItem.set !== undefined) {
		const newScopes = {
			...scopes,
			current: value
		}

		value = initialResult(value, schemaItem);
		processSet(schemaItem.set, newScopes, value);
	} else if (schemaItem.each !== undefined) {
		if (value !== undefined) {
			if (value instanceof Array === false) {
				throw new Error(`Cannot 'each' over an entity that is not an array. Received: ${JSON.stringify(value)}`);
			}

			const each = schemaItem.each;

			value = value.map(val => processSchema(each, {
				...scopes,
				current: val
			}));
		}
	} else if (schemaItem.template !== undefined) {
		value = fill(schemaItem.template, scopes);
	} else if (schemaItem.obj !== undefined) {
		const newScopes = {
			...scopes,
			current: value
		}

		value = initialResult(value, schemaItem);
		processSchemaObj(schemaItem.obj, newScopes, value);
	} else if (schemaItem.if !== undefined) {
		const cond = processIf(schemaItem.if, scopes);
		if (cond === true) {
			if (schemaItem.then !== undefined) {
				value = processSchema(schemaItem.then, scopes);
			} else {
				value = undefined;
			}
		} else if (cond === false) {
			if (schemaItem.else !== undefined) {
				value = processSchema(schemaItem.else, scopes);
			} else {
				value = undefined;
			}
		}
	} else if (schemaItem.switch !== undefined) {
		let matched = false;

		for (const statement of schemaItem.switch) {
			const cond = processIf(statement.if, scopes);
			if (cond === true) {
				if (statement.then !== undefined) {
					value = processSchema(statement.then, scopes)
				} else {
					value = undefined;
				}

				matched = true;
				break;
			}
		}

		if (matched === false) {
			if (schemaItem.else !== undefined) {
				value = processSchema(schemaItem.else, scopes);
			} else {
				value = undefined;
			}
		}
	}

	if (schemaItem.cast !== undefined && value !== undefined) {
		if (schemaItem.cast === "number") {
			value = Number(value);
		} else if (schemaItem.cast === "string") {
			value = value.toString();
		} else if (schemaItem.cast === "booleanString") {
			value = value === "true" ? true : false;
		}
	}

	if (value !== undefined && schemaItem.omitEmpty === true && Object.keys(value).length === 0) {
		value = undefined;
	}

	if (value !== undefined && schemaItem.omitUndefined === true) {
		value = value.filter(val => val !== undefined);
	}

	return value;
}

/**
 * Adds the obj keys to the result obj
 */
function processSchemaObj(schemaObj: DeepTransformSchemaObj, scopes: DeepTransformScopes, result: Record<string, any>) {
	for (const [key, schema] of Object.entries(schemaObj)) {
		const value = processSchema(schema, scopes);

		if (value !== undefined) {
			result[key] = value;
		}
	}
}

function processIf(obj: DeepTransformIf, scopes: DeepTransformScopes) {
	if (obj instanceof Function) {
		return obj(scopes);
	}

	for (const [key, val] of Object.entries(obj)) {
		const leftVal = processSchema(key, scopes);
		if (val.eq !== undefined) {
			const rightVal = processSchema(val.eq, scopes);
			if (rightVal !== leftVal) {
				return false;
			}
		} else if (val.exists !== undefined) {
			const rightVal = processSchema(val.exists, scopes);
			if (
				(leftVal === undefined && rightVal === true)
				||
				(leftVal !== undefined && rightVal === false)
			) {
				return false;
			}
		} else if (val.neq !== undefined) {
			const rightVal = processSchema(val.neq, scopes);
			if (rightVal === leftVal) {
				return false;
			}
		} else if (val.in !== undefined) {
			const rightVal = processSchema(val.in, scopes);
			if (!rightVal.includes(leftVal)) {
				return false;
			}
		} else if (val.nin !== undefined) {
			const rightVal = processSchema(val.nin, scopes);
			if (rightVal.includes(leftVal)) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Adds the set keys to the result obj
*/
function processSet(set: DeepTransformSet, scopes: DeepTransformScopes, result: Record<string, any>) {
	for (const [path, schema] of Object.entries(set)) {
		const value = processSchema(schema, scopes);

		if (value !== undefined) {
			lodashSet(result, path, value);
		}
	}
}

function initialResult(value: Record<string, any>, schema: DeepTransformSchemaOptions) {
	if (schema.preserveData) {
		return { ...value }
	} else if (schema.preservePick) {
		return lodashPick(value, schema.preservePick);
	} else {
		return {};
	}
}
