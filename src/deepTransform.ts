import get from "lodash/get";
import lodashSet from "lodash/set";
import { fill } from "goatee";

interface DeepMapScopes {
	current: Record<string, any>
	root: Record<string, any>
}

interface DeepMapSchemaOptions {
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
	obj?: DeepMapSchemaObj
	/**
	 * For each key in the object, create a key at the nested location using lodash.set
	 * @example
	 * set: { "foo.bar.baz": ".data" } === { foo: { bar: { baz: "value at .data" } }
	 */
	set?: DeepMapSet
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
	each?: DeepMapSchema
}

export type DeepMapSchema = string | DeepMapSchemaOptions

type DeepMapSchemaObj = Record<string, DeepMapSchema>
type DeepMapSet = Record<string, DeepMapSchema>

export default function deepTransform(obj: any, schema: DeepMapSchema) {
	return processSchema(schema, {
		current: obj,
		root: obj
	})
}

function processSchema(schema: DeepMapSchema, scopes: DeepMapScopes) {
	let value: any;

	const schemaItem: DeepMapSchemaOptions = typeof schema === "string" ? { key: schema } : schema;

	const key = !schemaItem.key ? `current`
		: schemaItem.key.startsWith(".") === true ? `current${schemaItem.key}`
		: schemaItem.key
	;

	value = get(scopes, key);

	if (schemaItem.value !== undefined) {
		value = schemaItem.value;
	} else if (schemaItem.set !== undefined) {
		value = processSet(schemaItem.set, scopes);
	} else if (schemaItem.each !== undefined && value instanceof Array) {
		const each = schemaItem.each;

		value = value.map(val => processSchema(each, {
			...scopes,
			current: val
		}));
	} else if (schemaItem.template !== undefined) {
		value = fill(schemaItem.template, scopes);
	} else if (schemaItem.obj !== undefined) {
		const newScopes = {
			...scopes,
			current: value
		}

		value = processSchemaObj(schemaItem.obj, newScopes);
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

function processSet(set: DeepMapSet, scopes: DeepMapScopes) {
	const result = {};

	for (const [path, schema] of Object.entries(set)) {
		const value = processSchema(schema, scopes);

		if (value !== undefined) {
			lodashSet(result, path, value);
		}
	}

	return result;
}
