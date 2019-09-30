"use strict";
var zcrmsdk = require("zcrmsdk");
const s3Tokens = require("./token_mgmt")

/** Zoho class with utility functions */
class Zoho {
	/**
	 * Creates a client to communicate with zoho API.
	 * @constructor
	 */
	constructor() {	}

	async init() { }

	async getClient() {		
		if (!this.client) await zcrmsdk.initialize();
		else {
			let tokenObj = await s3Tokens.getOAuthTokens();			
			let expirytime = tokenObj[0].expirytime;
			var ts = Math.round((new Date()).getTime() );			
			// console.log(ts, expirytime, (ts >= (expirytime - 1000)));

			if (ts >= (expirytime - 1000)) await zcrmsdk.initialize();
		}
		this.client = zcrmsdk;		

		return this.client;
	}

	/**
	 * Fetch records of a module.
	 * @param {Object} params
	 * @param {String} params.module - API name of the module
	 * @param {Number} params.page - page
	 * @param {Number} params.per_page - number of results per page, <=50	 
	 * @param {Number} params.sort_by - Sort by, default Modified_Time
	 * @param {Number} params.sort_order - Order of sorting, default desc
	 * @param {Boolean} params.has_subform - if the module has subform,
	 * 	subforms results are fetched
	 * @returns {Object} response Zoho API Response.
	 * @returns {String} response.body if there are results.
	 */
	async getRecords(params) {		
		if (!params.module) {
			return { error: true };
		}
		let client = await this.getClient();

		let page = params.page ? params.page : 1;
		let per_page = params.per_page ? params.per_page : 50;

		let sort_by = params.sort_by ? params.sort_by : "Modified_Time";
		let sort_order = params.sort_order ? params.sort_order : "desc";

		var input = { module: params.module };
		input.params = { page: page, per_page: per_page, sort_by: sort_by, sort_order: sort_order };
		
		let response = null;
		
		if (!params.has_subform) {
			try {
				response = await client.API.MODULES.get(input);								
				if (response.statusCode != 200) {
					return { records: [], statusCode: response.statusCode, info: jsonResponse.info };
				}				
				let jsonResponse = JSON.parse(response.body);
				return { records: jsonResponse.data, statusCode: response.statusCode, info: jsonResponse.info };
			} catch (error) {
				return { error: true, error_details: error, statusCode: 500 };
			}
		}

		try {
			let response = await client.API.MODULES.get(input);
			
			if (!response.body)
				return { records: [], statusCode: 204 };

			let bodyObj = JSON.parse(response.body);
			let data = bodyObj.data;

			if(!data) return {records: [], statusCode: 204};
			
			let records = [];
			let zoho = new Zoho();

			for (let item of data) {
				let id = item.id;
				let recordResponse = await zoho.getRecord(params.module, id);				
				let recordData = recordResponse.record;
				records.push(recordData);
			}			
			return {records: records, statusCode: 200, info: bodyObj.info};
		} catch (err) {
			console.log(err);
			return { error: true, error_details: err };
		}
	}

	/**
	 * Fetch records of a module modified on or after a given timestamp.
	 * @param {Object} params
	 * @param {String} params.module - API name of the module
	 * @param {String} params.modified_after - modified after timestamp. e.g. - "2019-09-27T10:48:55+02:00"
	 * @param {Number} params.page - page
	 * @param {Number} params.per_page - number of results per page, <=50	 
	 * @param {Boolean} params.has_subform - if the module has subform,
	 * 	subforms results are fetched
	 * @returns {Object} response Zoho API Response.
	 * @returns {List} response.records if there are results.
	 * @returns {Integer} response.count if there are results.
	 */
	async getRecordsModifiedAfter(params) {		
		if (!params.module) {
			return { error: true };
		}

		let modifiedAfter = params.modified_after;

		if (!modifiedAfter) return { error: true, records: null };
		
		let page = params.page ? params.page : 1;
		let per_page = params.per_page ? params.per_page : 100;
		let sort_by = "Modified_Time";
		let sort_order = "desc";		

		let zoho = new Zoho();
		let hasMore = true;
		let resultData = [];

		while(hasMore) {			
			try {				
				let tempParams = { page: page, per_page: per_page, sort_by: sort_by, sort_order: sort_order };
				Object.assign(params, tempParams);
				
				let response = await zoho.getRecords(params);								

				if (!response.records) hasMore = false;
				else {
					let data = response.records;

					for (let item of data) {
						// console.log(item.Modified_Time, modifiedAfter, item.Modified_Time >= modifiedAfter);						
						if (item.Modified_Time >= modifiedAfter) resultData.push(item);
						else {
							hasMore = false;
							break;
						}
					}					
				}				
				page++;
			} catch(err) {				
				hasMore = false;
				return { error: true, count: 0, error_details: err };
			}				
		}		

		return { error: false, records: resultData, count: resultData.length };
	}

	/**
	 * Fetch all records of a module.
	 * @param {Object} params
	 * @param {String} params.module - API name of the module	 	 
	 * @param {Number} params.sort_by - Sort by, default Modified_Time
	 * @param {Number} params.sort_order - Order of sorting, default desc
	 * @param {Boolean} params.has_subform - if the module has subform,
	 * 	subforms results are fetched
	 * @returns {Object} response Zoho API Response.
	 * @returns {Array} response.records if there are results.
	 * @returns {Integer} response.count if there are results.
	 */
	async getAllRecords(params) {
		if (!params.module) {
			return { error: true };
		}

		let page = 1;
		let per_page = params.per_page ? params.per_page : 100;
		let sort_by = params.sort_by ? params.sort_by : "Modified_Time";
		let sort_order = params.sort_order ? params.sort_order : "desc";		
		
		let hasMore = true;
		let resultData = [];

		while(hasMore) {			
			try {				
				let tempParams = { page: page, per_page: per_page, sort_by: sort_by, sort_order: sort_order };
				Object.assign(params, tempParams);
				
				let response = await this.getRecords(params);						
				if (!response.records && response.records.length > 0) hasMore = false;
				else {
					resultData.push(...response.records)					
				}				
				page++;
			} catch(err) {				
				hasMore = false;				
			}				
		}		

		return {records: resultData, count: resultData.length, statusCode: 200};
	}

	/**
	 *
	 * @param {String} module API name of the module
	 * @param {Number} id id of the record
	 * @returns {Object} response
	 * @returns {Object} response.record if there is a record with the id
	 */
	async getRecord(module, id) {				
		var input = { module: module, id: id };
		let client = await this.getClient();
		try {
			let response = await client.API.MODULES.get(input);			
			if (response.body) return {record: JSON.parse(response.body).data[0]}
			else return {}

		} catch (error) {
			return {error: true, error_details: error};
		}
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

		let client = await this.getClient();
		return client.API.MODULES.put(input)
			.then(function(response) {				
				if (response.body) return JSON.parse(response.body);
				return {};
			})
			.catch(function(err) {
				console.log(err)
				return {error: err};
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

		let client = await this.getClient();
		return client.API.MODULES.post(input)
			.then(function(response) {
				return response;
			})
			.catch(function(err) {
				return err;
			});
	}
}

module.exports = Zoho;