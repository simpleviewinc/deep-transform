import { get } from "lodash";
import goatee from "goatee";

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
	/**
	 * Generate an object at this location with the keys assigned to this object
	*/
	obj?: DeepMapSchemaObj
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
	cast?: "string" | "number"
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

	if (schemaItem.template) {
		value = goatee.fill(schemaItem.template, scopes);
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
