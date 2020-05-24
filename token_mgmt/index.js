var tokens = require("./s3_tokens");

const expiryInterval = 3600;
exports.expiryInterval = expiryInterval;

const verifyToken = (tokenObj) => {
	// if (
	// 	Object.prototype.hasOwnProperty.call(tokenObj, "access_token") &&
	// 	Object.prototype.hasOwnProperty.call(tokenObj, "expires_in") &&
	// 	Object.prototype.hasOwnProperty.call(tokenObj, "refresh_token")
	// ) {
	// 	return true;
	// }

	if (tokenObj.hasOwnProperty("access_token") && tokenObj.hasOwnProperty("expires_in") && tokenObj.hasOwnProperty("refresh_token")) {
		return true;
	}
	return false;
};

/**
 * Save token to s3. This function is called by zoho with the token object.
 */
exports.saveOAuthTokens = async (tokenObj) => {
	console.log('saveOAuthTokens', tokenObj);
	
	try {
		if (verifyToken(tokenObj)) {
			await tokens.setTokens(tokenObj);
			return tokenObj;
		} else {
			console.log("recieved token is invalid in saveOAuthTokens");
			return {};
		}		
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
	console.log(tokenObj, 'tokenObj');

	try {
		if (verifyToken(tokenObj)) {
			await tokens.setTokens(tokenObj);		
			return tokenObj;
		} else {
			console.log("recieved token is invalid in updateOAuthTokens");
			return {};
		}
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
	console.log('getOAuthTokens');
	let tokenBody = await tokens.getTokens();
	let token = JSON.parse(tokenBody.Body.toString());
	
	console.log('returning token from s3', token);

	return new Promise(function(resolve, reject) {
		resolve(token);
	});
};
