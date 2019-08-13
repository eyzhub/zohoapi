"use strict";
var zcrmsdk = require("zcrmsdk");

/** Zoho class with utility functions */
class Zoho {
	/**
	 * Creates a client to communicate with zoho API.
	 * @constructor
	 */
	constructor() {
		zcrmsdk.initialize();
		this.client = zcrmsdk;
	}

	test() {
		var input = { module: "Accounts" };
		var params = { page: 1, per_page: 5 };
		input.params = params;

		return this.client.API.MODULES.get(input)
			.then(function(response) {
				console.log("get records");
				console.log(response.body);
				console.log("\n\n");
				return response;
			})
			.catch(function(err) {
				console.log(err);
				console.log("error");
				return err;
			});
	}

	/**
	 * Fetch records of a module.
	 * @param {Object} params
	 * @param {String} params.module - API name of the module
	 * @param {Number} params.page - page
	 * @param {Number} params.per_page - number of results per page, <=50
	 * @param {Boolean} params.has_subform - if the module has subform,
	 * 	subforms results are fetched
	 * @returns {Object} response Zoho API Response.
	 * @returns {String} response.body if there are results.
	 */
	async getRecords(params) {
		if (!params.module) {
			return { error: True };
		}
		let page = params.page ? params.page : 1;
		let per_page = params.per_page ? params.per_page : 50;

		var input = { module: params.module };
		input.params = { page: page, per_page: per_page };
		console.log("getRecords");

		if (!params.has_subform) return this.client.API.MODULES.get(input);

		try {
			let response = await this.client.API.MODULES.get(input);
			if (!response.body) return response;

			let bodyObj = JSON.parse(response.body);
			let data = bodyObj.data;

			if(!data) return response;

			let result = { body: null };
			let records = { data: [] };
			let zoho = new Zoho();

			for (let item of data) {
				let id = item.id;
				console.log(`fetching for -> ${id}`);

				let recordResponse = await zoho.getRecord(params.module, id);
				let record = recordResponse.body;
				let recordData = JSON.parse(record).data[0];
				records.data.push(recordData);
			}
			result.body = JSON.stringify(records);
			return result;
		} catch (err) {
			console.log(err);
			return err;
		}
	}

	/**
	 *
	 * @param {String} module API name of the module
	 * @param {Number} id id of the record
	 * @returns {Object} response
	 * @returns {String} response.body if there is a record with the id
	 */
	async getRecord(module, id) {
		var input = { module: module, id: id };
		return this.client.API.MODULES.get(input);
	}

	/**
	 * Update a record of a module by its id
	 * @param {String} module API name of the module
	 * @param {String} id of the record
	 * @param {Array} data Array of objects, e.g. [{apiname:value, apiname2:value2, ...}]
	 * @returns {Object} response
	 */
	async updateRecord(module, id, data) {
		var input = { module: module, id: id };
		input.body = { data: data };

		return this.client.API.MODULES.put(input)
			.then(function(response) {
				return response;
			})
			.catch(function(err) {
				return err;
			});
	}

	/**
	 * Insert a record of a module by its id. The data object needs to an array
	 * 	with an object and it should have the mandatory Name field.
	 * @param {String} module API name of the module
	 * @param {String} id of the record
	 * @param {Array} data Array of objects, e.g. [{Name:value, apiname_ofthefield:value2, ...}]
	 * @returns {Object} response
	 * @returns {String} response.status success | error
	 */
	async insertRecord(module, data) {
		var input = { module: module};
		input.body = { data: data };

		return this.client.API.MODULES.post(input)
			.then(function(response) {
				return response;
			})
			.catch(function(err) {
				return err;
			});
	}
}

module.exports = Zoho;
