"use strict";
var zcrmsdk = require("zcrmsdk");
const s3Tokens = require("./token_mgmt")
const request = require('request')
const fs = require('fs');
let module_options = {}

function requestPromise(options) {
	return new Promise(function (resolve, reject) {
		request(options, function (error, response, body) {
			if (error) return reject(error);
			try {
				resolve(body);
			} catch (e) {
				reject(e);
			}
		});
	});
}

function execShellCommand(cmd) {
	const exec = require('child_process').exec;
	return new Promise((resolve, reject) => {
		exec(cmd, (error, stdout, stderr) => {
			if (error) {
				console.warn(error);
			}
			resolve(stdout ? stdout : stderr);
		});
	});
}

/** Zoho class with utility functions */
class Zoho {
	/**
	 * Creates a client to communicate with zoho API.
	 * @constructor
	 */
	constructor(params) {
		if (params) module_options = params
	}

	async init() { }

	async getClient(generate = false) {
		let tokenObj = await s3Tokens.getOAuthTokens();
		let expirytime = tokenObj[0].expirytime;
		let refreshToken = tokenObj[0].refreshtoken;
		var ts = Math.round((new Date()).getTime());

		if (!this.client) await zcrmsdk.initialize();

		let toInit = ts >= (expirytime - 1000);


		if (toInit) await zcrmsdk.initialize();

		this.client = zcrmsdk;

		if (toInit && generate) {
			await zcrmsdk.generateAuthTokenfromRefreshToken(null, refreshToken);
		}

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
	 * @returns {List} response.records if there are records.
	 */
	async getRecords(params) {
		if (module_options.debug) console.log('ZohoAPI getRecords', JSON.stringify(params))
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

			if (!data) return { records: [], statusCode: 204 };

			let records = [];
			let zoho = new Zoho();

			for (let item of data) {
				let id = item.id;
				let recordResponse = await zoho.getRecord(params.module, id);
				let recordData = recordResponse.record;
				records.push(recordData);
			}
			return { records: records, statusCode: 200, info: bodyObj.info };
		} catch (err) {
			console.log(err);
			return { error: true, error_details: err };
		}
	}

	/**
	 * Search records of a module. Note: subforms are not supported.
	 * @param {Object} params
	 * @param {String} params.module - API name of the module
	 * @param {String} params.criteria - field:operator:value
	 * supported operators: equals, starts_with.
	 * Chanining multiple criteria: (criterium1 AND/OR criterium2 ...)
	 * @param {Number} params.page - page
	 * @param {Number} params.per_page - number of results per page, <=50	 
	 * @param {Number} params.sort_by - Sort by, default Modified_Time
	 * @param {Number} params.sort_order - Order of sorting, default desc	 
	 * @returns {Object} response Zoho API Response.
	 * @returns {List} response.records if there are records.
	 */
	async searchRecords(params) {
		if (module_options.debug) console.log('ZohoAPI searchRecords', JSON.stringify(params))
		if (!params.module) {
			return { error: true };
		}

		let client = await this.getClient();

		let page = params.page ? params.page : 1;
		let per_page = params.per_page ? params.per_page : 50;

		let sort_by = params.sort_by ? params.sort_by : "Modified_Time";
		let sort_order = params.sort_order ? params.sort_order : "desc";

		var input = { module: params.module };
		input.params = {
			page: page,
			per_page: per_page,
			sort_by: sort_by,
			sort_order: sort_order,
			criteria: params.criteria
		};

		let response = null;

		try {
			response = await client.API.MODULES.search(input);
			if (response.statusCode != 200) {
				return { records: [], statusCode: response.statusCode };
			}
			let jsonResponse = JSON.parse(response.body);
			return { records: jsonResponse.data, statusCode: response.statusCode, info: jsonResponse.info };
		} catch (error) {
			return { error: true, error_details: error, statusCode: 500 };
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
		if (module_options.debug) console.log('ZohoAPI getRecordsModifiedAfter', JSON.stringify(params))
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

		while (hasMore) {
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
			} catch (err) {
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
		if (module_options.debug) console.log('ZohoAPI getAllRecords', JSON.stringify(params))
		if (!params.module) {
			return { error: true };
		}

		let page = 1;
		let per_page = params.per_page ? params.per_page : 100;
		let sort_by = params.sort_by ? params.sort_by : "Modified_Time";
		let sort_order = params.sort_order ? params.sort_order : "desc";

		let hasMore = true;
		let resultData = [];

		while (hasMore) {
			try {
				let tempParams = { page: page, per_page: per_page, sort_by: sort_by, sort_order: sort_order };
				Object.assign(params, tempParams);

				let response = await this.getRecords(params);
				if (!response.records && response.records.length > 0) hasMore = false;
				else {
					resultData.push(...response.records)
				}
				page++;
			} catch (err) {
				hasMore = false;
			}
		}
		return { records: resultData, count: resultData.length, statusCode: 200 };
	}


	async bulkRead(id) {
		if (module_options.debug) console.log('ZohoAPI bulkRead', id)
		await this.getClient();

		let url = `https://www.zohoapis.com/crm/bulk/v2/read/${id}`;

		let tokenObj = await s3Tokens.getOAuthTokens();
		let accessToken = tokenObj[0].accesstoken;

		var options = {
			method: 'get',
			url: url,
			headers: {
				Authorization: `Zoho-oauthtoken  ${accessToken}`
			}
		}
		try {
			let responseS = await requestPromise(options);
			let response = JSON.parse(responseS);

			if (!response.data) return { success: false, code: response.code };
			let data = response.data[0];

			return { success: true, data: data };
		} catch (error) {
			return { success: false, error: console.error() };
		}
	}

	async bulkReadCreate(module) {
		if (module_options.debug) console.log('ZohoAPI bulkReadCreate', JSON.stringify(module))
		if (!module) {
			return { error: true };
		}

		await this.getClient(true);

		let tokenObj = await s3Tokens.getOAuthTokens();
		let accessToken = tokenObj[0].accesstoken;

		let url = "https://www.zohoapis.com/crm/bulk/v2/read";
		let jsonBody = { query: { module: module } };

		var options = {
			method: 'post',
			body: jsonBody,
			json: true,
			url: url,
			headers: {
				Authorization: `Zoho-oauthtoken  ${accessToken}`
			}
		}

		try {
			let response = await requestPromise(options);
			if (!response.data) return { success: false, code: response.code };
			let data = response.data[0];
			let details = data.details;

			return { success: true, details: details };
		} catch (error) {
			return { success: false, error: console.error() };
		}
	}

	async bulkReadDownload(jobId, destination) {
		if (module_options.debug) console.log('ZohoAPI bulkReadDownload', JSON.stringify(module))
		if (!destination.endsWith(".zip")) return { success: false };

		await this.getClient();

		let tokenObj = await s3Tokens.getOAuthTokens();
		let accessToken = tokenObj[0].accesstoken;
		// console.log(accessToken);

		let url = `https://www.zohoapis.com/crm/bulk/v2/read/${jobId}/result`;

		let cmd = `curl -o ${destination} "${url}" -X GET -H "Authorization: Zoho-oauthtoken ${accessToken}"`;

		try {
			// console.log(cmd);
			await execShellCommand(cmd);
			await execShellCommand(`unzip ${destination}`);
			console.log(`extracted file - ${jobId}.csv`);
			return { success: true };
		} catch (error) {
			console.log(error);
			return { success: false };
		}
	}

	async _checkStatus(jobId, destination) {		
		var intervalId = null;
		let zoho = new Zoho();

		var state = async function () {
			let resp = await zoho.bulkRead(jobId);
			let jState = resp.data.state;
			if (jState == "COMPLETED") {
				// console.log(jState);				
				await zoho.bulkReadDownload(jobId, destination);
			}
			return jState;
		}

		return new Promise((resolve, reject) => {
			intervalId = setInterval(() => {
				state()
					.then((data) => {
						console.log(data);
						if (!["ADDED", "COMPLETED", "IN PROGRESS", "QUEUED"].includes(data)) {
							reject(false);
						} else if (data === 'COMPLETED') {
							clearInterval(intervalId);
							resolve(true);
						}
					});
			}, 10000);
		});
	}

	async downloadModule(module, destination) {
		if (module_options.debug) console.log('ZohoAPI downloadModule', JSON.stringify(module), destination)
		let bulkReadCreateResult = null;
		let bulkReadResult = null;
		let jobId = null;

		try {
			bulkReadCreateResult = await this.bulkReadCreate(module);
			if (!bulkReadCreateResult.success) return { success: false };
		} catch (error) {
			return { success: false };
		}

		try {
			jobId = bulkReadCreateResult.details.id;
			bulkReadResult = await this.bulkRead(jobId);
			if (!bulkReadResult.data) return { success: false };

		} catch (error) {
			return { success: false };
		}

		console.log(`started with jobId ${jobId}`);

		try {
			await this._checkStatus(jobId, destination);
			return { success: true, jobId: jobId };
		} catch (err) {
			return { success: false, jobId: jobId };
		}
	}

	/**
	 *
	 * @param {String} module API name of the module
	 * @param {Number} id id of the record
	 * @returns {Object} response
	 * @returns {Object} response.record if there is a record with the id
	 */
	async getRecord(module, id) {
		if (module_options.debug) console.log('ZohoAPI getRecord', JSON.stringify(module), id)
		var input = { module: module, id: id };
		let client = await this.getClient();
		try {
			let response = await client.API.MODULES.get(input);
			if (response.body) return { record: JSON.parse(response.body).data[0] }
			else return {}

		} catch (error) {
			return { error: true, error_details: error };
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
		if (module_options.debug) console.log('ZohoAPI updateRecord', JSON.stringify(module), id)
		var input = { module: module, id: id };
		input.body = { data: data };

		let client = await this.getClient();
		return client.API.MODULES.put(input)
			.then(function (response) {
				if (response.body) return JSON.parse(response.body);
				return {};
			})
			.catch(function (err) {
				console.log(err)
				return { error: err };
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
		if (module_options.debug) console.log('ZohoAPI insertRecord', JSON.stringify(module))
		var input = { module: module };
		input.body = { data: data };

		let client = await this.getClient();
		return client.API.MODULES.post(input)
			.then(function (response) {
				return response;
			})
			.catch(function (err) {
				return err;
			});
	}
}

module.exports = Zoho;