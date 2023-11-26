import { deepStrictEqual } from "assert";
import { execSync } from "child_process";
import { testArray, TestDef } from "@simpleview/mochalib";

import deepTransform, { DeepMapSchema } from "../deepTransform";

describe(__filename, function() {
	describe("test array", function() {
		interface Test {
			data?: any
			schema: DeepMapSchema
			result: any
		}

		const tests: TestDef<Test>[] = [
			{
				name: "basic map",
				args: {
					data: {
						foo: "fooValue",
						bar: {
							baz: "bazValue"
						}
					},
					schema: {
						obj: {
							newFoo: ".foo",
							newBar: ".bar.baz"
						}
					},
					result: {
						newFoo: "fooValue",
						newBar: "bazValue"
					}
				}
			},
			{
				name: "should allow root key returns",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: ".foo",
					result: "fooValue"
				}
			},
			{
				name: "map using 'current.' keys",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						obj: {
							newFoo: "current.foo"
						}
					},
					result: {
						newFoo: "fooValue"
					}
				}
			},
			{
				name: "should not include a key if data is undefined",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						obj: {
							newFoo: ".foo",
							bar: ".bogus"
						}
					},
					result: {
						newFoo: "fooValue"
					}
				}
			},
			{
				name: "should access nested objects and arrays",
				args: {
					data: {
						foo: "fooValue",
						bar: {
							nestedBar: {
								test: 10
							},
							baz: "bazValue",
							arr: ["e", "f", "g"],
							arrObj: [{ foo: "foo1" }, { foo: "foo2" }, { foo: "foo3" }]
						},
						arr: ["a", "b", "c"],
						numberString: "10"
					},
					schema: {
						obj: {
							newFoo: ".foo",
							bar: ".bar.nestedBar.test",
							baz: ".bar.baz",
							bogus: ".bar.bogus.something.else",
							nestedBogus: ".bogus.bar.something.else",
							nestedArr: ".bar.arr[1]",
							nestedArrObj: ".bar.arrObj[2].foo",
							arr: ".arr[0]",
							arrWhole: ".arr"
						}
					},
					result: {
						newFoo: "fooValue",
						bar: 10,
						baz: "bazValue",
						nestedArr: "f",
						nestedArrObj: "foo3",
						arr: "a",
						arrWhole: ["a", "b", "c"]
					}
				}
			},
			{
				name: "should allow returning and transforming nested data",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						obj: {
							foo: {
								obj: {
									nestedFoo: ".foo"
								}
							}
						}
					},
					result: {
						foo: {
							nestedFoo: "fooValue"
						}
					}
				}
			},
			{
				name: "should create nested object with current and root data",
				args: {
					data: {
						foo: "fooValue",
						bar: {
							baz: "bazValue"
						}
					},
					schema: {
						obj: {
							foo: {
								key: ".bar",
								obj: {
									nestedBaz: ".baz",
									newFoo: "root.foo"
								}
							}
						}
					},
					result: {
						foo: {
							nestedBaz: "bazValue",
							newFoo: "fooValue"
						}
					}
				}
			},
			{
				name: "should omitEmpty on an object",
				args: {
					data: {},
					schema: {
						obj: {
							foo: ".bogus"
						},
						omitEmpty: true
					},
					result: undefined
				}
			},
			{
				name: "should preserve empty object without omitEmpty",
				args: {
					schema: {
						obj: {
							foo: ".bogus"
						}
					},
					result: {}
				}
			},
			{
				name: "should cast data",
				args: {
					data: {
						number: 5,
						numberString: "10",
						trueToTrue: "true",
						falseToFalse: "false",
						oneToFalse: 1,
						zeroToFalse: 0
					},
					schema: {
						obj: {
							stringToNumber: {
								key: ".numberString",
								cast: "number"
							},
							numberToString: {
								key: ".number",
								cast: "string"
							},
							trueToTrue: {
								key: ".trueToTrue",
								cast: "booleanString"
							},
							falseToFalse: {
								key: ".falseToFalse",
								cast: "booleanString"
							},
							oneToFalse: {
								key: ".oneToFalse",
								cast: "booleanString"
							},
							zeroToFalse: {
								key: ".zeroToFalse",
								cast: "booleanString"
							},
							templateValue: {
								template: "5",
								cast: "number"
							}
						}
					},
					result: {
						stringToNumber: 10,
						numberToString: "5",
						trueToTrue: true,
						falseToFalse: false,
						oneToFalse: false,
						zeroToFalse: false,
						templateValue: 5
					}
				}
			},
			{
				name: "convert each entry in root array",
				args: {
					data: ["10", "20", undefined, "30"],
					schema: {
						each: {
							cast: "number"
						}
					},
					result: [10, 20, undefined, 30]
				}
			},
			{
				name: "should omitUndefined on an array",
				args: {
					data: ["10", "20", undefined, "30"],
					schema: {
						each: {
							cast: "number"
						},
						omitUndefined: true
					},
					result: [10, 20, 30]
				}
			},
			{
				name: "should process array of keys into object",
				args: {
					data: ["10", "20", "30"],
					schema: {
						each: {
							obj: {
								value: {
									cast: "number"
								}
							}
						}
					},
					result: [
						{ value: 10 },
						{ value: 20 },
						{ value: 30 }
					]
				}
			},
			{
				name: "should process array of objects array of scalar",
				args: {
					data: [
						{ value: "10" },
						{ value: "20" },
						{ value: "30" }
					],
					schema: {
						each: {
							key: ".value",
							cast: "number"
						}
					},
					result: [10, 20, 30]
				}
			},
			{
				name: "should allow goatee templating of keys",
				args: {
					data: {
						foo: "fooValue",
						bar: "barValue"
					},
					schema: {
						template: "{{current.foo}} - {{current.bar}}"
					},
					result: "fooValue - barValue"
				}
			},
			{
				name: "conditional appending of (deleted) to a key via template",
				args: {
					data: [
						{ region: "Downtown", region_id: 10, is_deleted: true },
						{ region: "Central", region_id: 20, is_deleted: false },
						{ region: "North", region_id: 30, is_deleted: false }
					],
					schema: {
						each: {
							obj: {
								label: {
									template: "{{current.region}}{{:current.is_deleted}} (deleted){{/}}"
								},
								value: {
									key: ".region_id",
									cast: "string"
								}
							}
						}
					},
					result: [
						{ label: "Downtown (deleted)", value: "10" },
						{ label: "Central", value: "20" },
						{ label: "North", value: "30" }
					]
				}
			},
			{
				name: "generating an object with set",
				args: {
					data: {
						foo: "fooValue",
						bar: "barValue",
						nested: {
							farther: {
								farthest: "yes"
							}
						}
					},
					schema: {
						set: {
							"fooNew": ".foo",
							"create.a.very.deep.key": ".bar",
							"create.b": ".foo",
							"create.a.bogus.key": ".bogus"
						}
					},
					result: {
						fooNew: "fooValue",
						create: {
							a: {
								very: {
									deep: {
										key: "barValue"
									}
								}
							},
							b: "fooValue"
						}
					}
				}
			},
			{
				name: "generate an object with set and cast",
				args: {
					data: {
						access: {
							a: {
								deep: "10"
							}
						}
					},
					schema: {
						set: {
							"create.a.deep.key": {
								key: ".access.a.deep",
								cast: "number"
							}
						}
					},
					result: {
						create: {
							a: {
								deep: {
									key: 10
								}
							}
						}
					}
				}
			},
			{
				name: "return a raw value with a string",
				args: {
					data: {
						foo: "fooValue",
						bar: "https://www.google.com/"
					},
					schema: {
						obj: {
							href: ".bar",
							type: {
								value: "drawer"
							}
						}
					},
					result: {
						href: "https://www.google.com/",
						type: "drawer"
					}
				}
			},
			{
				name: "return a raw value with a complex object",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						obj: {
							newFoo: ".foo",
							bar: {
								value: {
									nested: [1,2],
									something: true
								}
							}
						}
					},
					result: {
						newFoo: "fooValue",
						bar: {
							nested: [1, 2],
							something: true
						}
					}
				}
			},
			{
				name: "if statement eq with value using static value and then - truthy",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						if: {
							".foo": {
								eq: {
									value: "fooValue"
								}
							}
						},
						then: {
							value: "pass"
						}
					},
					result: "pass"
				}
			},
			{
				name: "if statement eq with value using static value and then - falsy",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						if: {
							".foo": {
								eq: {
									value: "bogus"
								}
							}
						},
						then: {
							value: "pass"
						}
					},
					result: undefined
				}
			},
			{
				name: "if statement eq with key reference and then - truthy",
				args: {
					data: {
						foo: "fooValue",
						bar: "fooValue"
					},
					schema: {
						if: {
							".foo": {
								eq: ".bar"
							}
						},
						then: {
							value: "pass"
						}
					},
					result: "pass"
				}
			},
			{
				name: "if statement eq with key reference and then - falsy",
				args: {
					data: {
						foo: "fooValue",
						bar: "barValue"
					},
					schema: {
						if: {
							".foo": {
								eq: ".bar"
							}
						},
						then: {
							value: "pass"
						}
					},
					result: undefined
				}
			},
			{
				name: "if statement eq with multiple keys - truthy",
				args: {
					data: {
						foo: "fooValue",
						bar: "barValue"
					},
					schema: {
						if: {
							".foo": {
								eq: { value: "fooValue" }
							},
							".bar": {
								eq: { value: "barValue" }
							}
						},
						then: {
							value: "pass"
						}
					},
					result: "pass"
				}
			},
			{
				name: "if statement eq with multiple keys first false - falsy",
				args: {
					data: {
						foo: "fooValue",
						bar: "barValue"
					},
					schema: {
						if: {
							".foo": {
								eq: { value: "bogus" }
							},
							".bar": {
								eq: { value: "barValue" }
							}
						},
						then: {
							value: "pass"
						}
					},
					result: undefined
				}
			},
			{
				name: "if statement eq with multiple keys second false - falsy",
				args: {
					data: {
						foo: "fooValue",
						bar: "barValue"
					},
					schema: {
						if: {
							".foo": {
								eq: { value: "fooValue" }
							},
							".bar": {
								eq: { value: "bogus" }
							}
						},
						then: {
							value: "pass"
						}
					},
					result: undefined
				}
			},
			{
				name: "if statement eq with else - truthy",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						if: {
							".foo": {
								eq: { value: "fooValue" }
							}
						},
						else: {
							value: "fail"
						}
					},
					result: undefined
				}
			},
			{
				name: "if statement eq with else - falsy",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						if: {
							".foo": {
								eq: { value: "bogus" }
							}
						},
						else: {
							value: "pass"
						}
					},
					result: "pass"
				}
			},
			{
				name: "if statement exists true - truthy",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						if: {
							".foo": {
								exists: {
									value: true
								}
							}
						},
						then: {
							value: "pass"
						}
					},
					result: "pass"
				}
			},
			{
				name: "if statement exists true - falsy",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						if: {
							".bar": {
								exists: {
									value: true
								}
							}
						},
						then: {
							value: "pass"
						}
					},
					result: undefined
				}
			},
			{
				name: "if statement exists false - truthy",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						if: {
							".bar": {
								exists: {
									value: false
								}
							}
						},
						then: {
							value: "pass"
						}
					},
					result: "pass"
				}
			},
			{
				name: "if statement exists false - falsy",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						if: {
							".foo": {
								exists: {
									value: false
								}
							}
						},
						then: {
							value: "pass"
						}
					},
					result: undefined
				}
			},
			{
				name: "if statement neq - truthy",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						if: {
							".foo": {
								neq: {
									value: "barValue"
								}
							}
						},
						then: {
							value: "pass"
						}
					},
					result: "pass"
				}
			},
			{
				name: "if statement neq - falsy",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						if: {
							".foo": {
								neq: {
									value: "fooValue"
								}
							}
						},
						then: {
							value: "pass"
						}
					},
					result: undefined
				}
			},
			{
				name: "if statement function - truthy",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						if: (scopes) => { return scopes.current.foo === "fooValue" },
						then: {
							value: "pass"
						}
					},
					result: "pass"
				}
			},
			{
				name: "if statement function - falsy",
				args: {
					data: {
						foo: "fooValue"
					},
					schema: {
						if: (scopes) => scopes.current.foo === "barValue",
						then: {
							value: "pass"
						}
					},
					result: undefined
				}
			}
		]

		testArray(tests, function(test) {
			const result = deepTransform(test.data, test.schema);

			deepStrictEqual(result, test.result);
		});
	});

	it("Verify types", async () => {
		execSync("yarn run types", { stdio: "inherit" });
	});

	it("Run linter", async () => {
		execSync("yarn run style", { stdio: "inherit" });
	});
});
