var tokens = require("./s3_tokens");

const expiryInterval = 3600;
exports.expiryInterval = expiryInterval;

/**
 * Save token to s3. This function is called by zoho with the token object.
 */
exports.saveOAuthTokens = async (tokenObj) => {
	let validKeys = ["access_token", "expires_in", "refresh_token"];
	for (let validKey of validKeys) {
		if (!tokenObj[validKey]) {
			throw new Error(`saveOAuthTokens: invalid tokenObject received for client ${process.env.CRM_CLIENT_ID} tokenObj ${JSON.stringify(tokenObj)}`);
		}
	}

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
	/*
	Updates dont have refresh_token. So, we take the one stored in s3 and update the zoho token object with it.
	And further check if the token object has all the keys and their values are not null
	*/
	if (!tokenObj.refresh_token) {
		let tokenBody = await tokens.getTokens();
		let token = JSON.parse(tokenBody.Body.toString());
		let oldRefreshToken = token["refresh_token"];
		tokenObj["refresh_token"] = oldRefreshToken;
	}

	let validUpdateKeys = ["access_token", "expires_in", "refresh_token"];
	for (let validKey of validUpdateKeys) {
		if (!tokenObj[validKey]) {
			throw new Error(`updateOAuthTokens: invalid tokenObject received for client ${process.env.CRM_CLIENT_ID} tokenObj ${JSON.stringify(tokenObj)}`);
		}
	}

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
 * Fetch the token. This function is called by Zoho.
 */
exports.getOAuthTokens = async (userIdentifier) => {
	let tokenBody = await tokens.getTokens();
	let token = JSON.parse(tokenBody.Body.toString());

	//console.log(`token will expire at ${token.expires_in}`);

	return new Promise(function(resolve, reject) {
		resolve(token);
	});
};
