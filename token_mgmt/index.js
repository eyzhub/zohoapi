var tokens = require("./s3_tokens");

/**
 * Save token to s3. This function is called by zoho with the token object.
 */
exports.saveOAuthTokens = async (tokenObj) => {
	//console.log(tokenObj);

	try {
		await tokens.setTokens(tokenObj);
		return tokenObj;
	} catch (err) {
		console.log("problem writing tokens");
		console.log(err);
		return {};
	}
};

/**
 * Update the token stored in s3.
 * This function is called by zoho with the token object.
 */
exports.updateOAuthTokens = async (tokenObj) => {
	//console.log(tokenObj);

	if (!tokenObj.refresh_token) {
		let tokenBody = await tokens.getTokens();
		let token = JSON.parse(tokenBody.Body.toString());
		tokenObj.refresh_token = token.refresh_token;
	}

	try {
		await tokens.setTokens(tokenObj);
		//console.log("updated to");
		return tokenObj;
	} catch (err) {
		console.log("problem writing tokens");
		console.log(err);
		return {};
	}
};

/**
 * Fetch the token. This function is called by Zoho.
 */
exports.getOAuthTokens = async (userIdentifier) => {
	let tokenBody = await tokens.getTokens();
	let token = JSON.parse(tokenBody.Body.toString());
	//console.log(token);

	//console.log(`token will expire at ${token.expires_in}`);
	var result = {};

	return new Promise(function(resolve, reject) {
		result.accesstoken = token.access_token;
		result.expirytime = token.expires_in + 3600;
		result.refreshtoken = token.refresh_token;

		var result_array = [];
		result_array.push(result);

		resolve(result_array);
	});
};
