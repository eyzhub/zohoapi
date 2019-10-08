const fs = require("fs");
const path = require("path");

const checkPathExists = (path) => {
	let exists = fs.existsSync(path);
	console.log(`checking ${path} exists -> ${exists}`);
	return exists;
};

const createResourcesDir = async (dir) => {
	if (!checkPathExists(dir)) {
		try {
			fs.mkdirSync(dir, { recursive: true });
		} catch (err) {
			console.log(err);
			if (err.code !== "EEXIST") throw err;
		}
	}
};

const createEnv = async (dir) => {
	if (!checkPathExists(dir)) {
		let envContent = 'NODE_ENV=development\n'
		envContent += `AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID}\n`
		envContent += `SECRET_ACCESS_KEY_ID=${process.env.SECRET_ACCESS_KEY_ID}\n`
		envContent += `S3_BUCKET=${process.env.S3_BUCKET}\n`
		envContent += `S3_KEY=zoho_token.json`

		fs.writeFileSync(dir, envContent)
		checkPathExists(dir)
		// , function(err) {
		// 	if (err) {
		// 		return console.log(err);
		// 	}
		// 	console.log(`.env created with ${envContent}`, checkPathExists(configurationPropertiesPath));
		// });
	}
};

const createConfgigurationProperties = async (rootDir, dir) => {
	let configurationPropertiesPath = path.resolve(path.join(dir, "configuration.properties"));
	if (!checkPathExists(configurationPropertiesPath)) {
		let apiTokenMgmtPath = '/'+path.join('app','node_modules','zohoapi',"token_mgmt", "index.js");
		console.log('-> process.env.DYNO', process.env.DYNO)
		if (process.env.DYNO) apiTokenMgmtPath = '/'+path.join('app','node_modules','zohoapi',"token_mgmt", "index.js");
		let configurationPropertiesContent = '[crm]\n'
		configurationPropertiesContent += 'api.url=www.zohoapis.com\n'
		configurationPropertiesContent += `api.user_identifier=${process.env.api_user_identifier}\n`
		configurationPropertiesContent += `api.tokenmanagement=${apiTokenMgmtPath}`

		fs.writeFileSync(configurationPropertiesPath, configurationPropertiesContent)
		checkPathExists(configurationPropertiesPath)
		// 	, function(err) {
		// 	if (err) {
		// 		console.log(`Failed created ${configurationPropertiesPath}`);
		// 	}
		// 	console.log(`Created ${configurationPropertiesContent}`, configurationPropertiesPath, checkPathExists(configurationPropertiesPath));
		// });
	}
};

const createOauthProperties = async (dir) => {
	let oauthConfigurationPropertiesPath = path.join(dir, "oauth_configuration.properties");

	if (!checkPathExists(oauthConfigurationPropertiesPath)) {
		let oauthConfigurationPropertiesContent = '[zoho]\n'
		oauthConfigurationPropertiesContent += 'crm.iamurl=accounts.zoho.com\n'
		oauthConfigurationPropertiesContent += `crm.clientid=${process.env.crm_clientid}\n`
		oauthConfigurationPropertiesContent += `crm.clientsecret=${process.env.crm_clientsecret}\n`
		oauthConfigurationPropertiesContent += `crm.redirecturl=${process.env.crm_redirecturl}\n`

		fs.writeFileSync(
			oauthConfigurationPropertiesPath,
			oauthConfigurationPropertiesContent
			// function(err) {
			// 	if (err) {
			// 		console.log(`Failed created ${oauthConfigurationPropertiesPath}`);
			// 	}
			// 	console.log(`Created ${oauthConfigurationPropertiesContent}`, oauthConfigurationPropertiesPath, checkPathExists(oauthConfigurationPropertiesPath));
			// }
		);
		checkPathExists(oauthConfigurationPropertiesPath)
	}
};


/**
 * Checks if credentials and config related zoho folders/files exist(s), if not creates.
 *
 */
const main = async () => {
	if (process.env.INIT_CWD) {
		let rootDir = process.env.INIT_CWD;
		//let resourcesPath = path.join(rootDir, "resources");

		// 1. create .env for token management data using s3
		createEnv(path.join(rootDir, ".env"));

		try {
			// 2. create resources folder
			await createResourcesDir(path.join(rootDir, "resources"));
			// 3. create resources/configuration.properties
			createConfgigurationProperties(rootDir, path.join(rootDir, "resources"));
			// 3. create resources/oauth_configuration.properties
			createOauthProperties(path.join(rootDir, "resources"));

			console.log("\n##################################\n");
			console.log("Please update\n");
			console.log(`1. ${path.join(rootDir, ".env")}\n`);
			console.log(`2. ${path.join(rootDir, "resources")}\n`);
			console.log(`\t2.1 ${path.join(rootDir, "resources", "configuration.properties")}\n`);
			console.log(`\t2.1 ${path.join(rootDir, "resources", "oauth_configuration.properties")}\n`);

			console.log("##################################\n");


		} catch (e) {
			console.log("Error: Failed creating resources dir");
		}
	} else {
		console.log("Could not create resources and .env. Please create in your local folder.");
	}
};

main();
