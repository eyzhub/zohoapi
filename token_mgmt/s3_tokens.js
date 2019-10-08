var AWS = require("aws-sdk");
const dotenv = require("dotenv");
dotenv.config();


console.log('-> S3 Tokens', process.env.AWS_ACCESS_KEY_ID)
let credentials = {
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.SECRET_ACCESS_KEY_ID
};

const s3 = new AWS.S3({
	credentials: credentials
});

const getTokens = async () => {
	var params = { Bucket: process.env.S3_BUCKET, Key: process.env.S3_KEY };
	return s3.getObject(params).promise();
};

const setTokens = async (obj) => {
	var params = {
		Bucket: process.env.S3_BUCKET,
		Key: process.env.S3_KEY,
		Body: JSON.stringify(obj)
	};
	return s3.upload(params).promise();
};

const tokens = {
	setTokens: setTokens,
	getTokens: getTokens
};

module.exports = tokens;
