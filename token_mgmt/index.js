var tokens = require("./s3_tokens");

const expiryInterval = 3600;
exports.expiryInterval = expiryInterval;

const printToken = (tokenObj) => {
    let formatted = {};
    Object.keys(tokenObj).map(v => {
        formatted[v] = `${tokenObj[v]}`.slice(0, 15)
    });
    return JSON.stringify(formatted);
}


const verifyToken = (tokenObj) => {
	console.log('ZohoAPI verifyToken', printToken(tokenObj) );

	if (tokenObj.hasOwnProperty("access_token") && 
		tokenObj.hasOwnProperty("expires_in") && 
		tokenObj.hasOwnProperty("refresh_token")) return true;

	return false;
};

/**
 * Save token to s3. This function is called by zoho with the token object.
 */
exports.saveOAuthTokens = async (tokenObj) => {
	console.log('ZohoAPI saveOAuthTokens', printToken(tokenObj) );
	
	try {
		if (verifyToken(tokenObj)) {
			console.log('ZohoAPI saveOAuthTokens valid', printToken(tokenObj) );
			await tokens.setTokens(tokenObj);
			return tokenObj;
		} else {
			console.log('ZohoAPI saveOAuthTokens invalid', printToken(tokenObj) );
			return {};
		}		
	} catch (err) {
		console.log('ZohoAPI saveOAuthTokens error', err );
		return {};
	}
};

/**
 * Update the token stored in s3.
 * This function is called by zoho with the token object.
 */
exports.updateOAuthTokens = async (tokenObj) => {
	console.log('ZohoAPI updateOAuthTokens', printToken(tokenObj) );

	try {
		if (verifyToken(tokenObj)) {
			console.log('ZohoAPI updateOAuthTokens valid', printToken(tokenObj) );
			await tokens.setTokens(tokenObj);		
			return tokenObj;
		} else {
			console.log('ZohoAPI updateOAuthTokens invalid', printToken(tokenObj) );
			return {};
		}
	} catch (err) {
		console.log('ZohoAPI updateOAuthTokens error', err );
		return {};
	}
};

/**
 * Fetch the token. This function is called by Zoho.
 */
exports.getOAuthTokens = (userIdentifier) => {
	return new Promise(async(resolve, reject) => {
		/* too verbose */
		// console.log('ZohoAPI getOAuthTokens userIdentifier', userIdentifier);
		
		let tokenBody = await tokens.getTokens();
		let tokenObj = JSON.parse(tokenBody.Body.toString());
		
		if (tokenObj.hasOwnProperty("access_token") && 
			tokenObj.hasOwnProperty("expires_in") && 
			tokenObj.hasOwnProperty("refresh_token")) return resolve(tokenObj);
		else {
			console.log('ZohoAPI getOAuthTokens S3 invalid', printToken(tokenObj) );
			return reject({error: 'invalid token'})
		}

		
	});
};
