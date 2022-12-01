import { strictEqual, rejects, deepStrictEqual } from "assert";
import { execSync } from "child_process";
import { testArray, TestDef } from "@simpleview/mochalib";

import deepTransform, { DeepMapSchema } from "../deepTransform";

const maybe: DeepMapSchema = {
	key: ".foo"
}

const wut: DeepMapSchema = "test";

const testObj = {
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
}

describe(__filename, function() {
	describe.only("test array", function() {
		interface Test {
			data?: any
			schema: DeepMapSchema
			result: any
		}

		const tests: TestDef<Test>[] = [
			{
				name: "basic map",
				args: {
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
					schema: ".foo",
					result: "fooValue"
				}
			},
			{
				name: "map using 'current.' keys",
				args: {
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
				name: "should map using nested key syntax",
				args: {
					schema: {
						obj: {
							newFoo: {
								key: ".foo"
							}
						}
					},
					result: {
						newFoo: "fooValue"
					}
				}
			},
			{
				name: "should not map a key if undefined",
				args: {
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
				name: "should allow transforming nested data",
				args: {
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
					schema: {
						obj: {
							foo: {
								obj: {
									bogus: ".bogus"
								},
								omitEmpty: true
							}
						}
					},
					result: {}
				}
			},
			{
				name: "should preserve empty object without omitEmpty",
				args: {
					schema: {
						obj: {
							foo: {
								obj: {
									bogus: ".bogus"
								}
							}
						}
					},
					result: {
						foo: {}
					}
				}
			},
			{
				name: "should cast data",
				args: {
					data: {
						number: 5,
						numberString: "10"
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
							}
						}
					},
					result: {
						stringToNumber: 10,
						numberToString: "5"
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
			}
		]

		testArray(tests, function(test) {
			const data = test.data ?? testObj;

			const result = deepTransform(data, test.schema);

			console.log("result", result, test.result);

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
