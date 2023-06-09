# @simpleview/deep-transform

## Getting Started

```
npm install @simpleview/deep-transform
```

```
import transform from "@simpleview/deep-transform";
```

## Overview

`deep-transform` is a utility library to convert an object or array of one structure into an entirely different array or object. This is especially useful in scenarios where you want to process the object declaratively via a JSON/Object-style definition and can't write traditional imperative `.map`, `.filter`.

See the typescript signature for `deepTransform` for all arguments and their functionality.


Examples:

```typescript
// Process an object into another object
transform({
	foo: "fooValue",
	bar: "barValue"
}, {
	obj: {
		newFoo: ".foo",
		newBar: ".bar"
	}
}) === {
	newFoo: "fooValue",
	newBar: "barValue"
}

// Process an object reaching into deeply nested data and arrays
transform({
	foo: {
		bar: {
			baz: 10,
			items: [
				{ title: "First Title" },
				{ title: "Second Title" }
			]
		}
	}
}, {
	obj: {
		firstTitle: ".foo.baz.items[0].title",
		secondTitle: ".foo.baz.items[1].title"
	}
}) === {
	firstTitle: "First Title",
	secondTitle: "Second Title"
}

// Cast data
transform({
	foo: 10,
	bar: "10"
}, {
	obj: {
		foo: {
			key: ".foo"
			cast: "string"
		},
		bar: {
			key: ".bar",
			cast: "number"
		}
	}
}) === {
	foo: "10",
	bar: 10
}

// Process an array of objects into a simple array
transform({
	values: [
		{ label: "First", value: "1" },
		{ label: "Second", value: "2" },
		{ label: "Third", value: "3" }
	]
}, {
	key: ".values",
	each: {
		key: ".value",
		cast: "number"
	}
}) === [1, 2, 3]

// Process an array of objects into an array of objects
transform([
	{ region: "Downtown", region_id: 10 },
	{ region: "Central", region_id : 2 },
	{ region: "North", region_id: 3 }
], {
	each: {
		obj: {
			label: ".region",
			value: {
				key: ".region_id",
				cast: "string"
			}
		}
	}
}) === [
	{ label: "Downtown", value: "10" },
	{ label: "Central", value: "2" },
	{ label: "North", value: "3" }
]
```
