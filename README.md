# zohoapi

Gateway library for easy access to Zoho V2 api

## Purpose

This is a utility package for handling token mechanism of Zoho crm APIv2 across several projects. The module utilizes s3 as the storage mechanism of the oauth token.

**Note:** This currently works with local install of the module and not global

1. [Register a client](https://www.zoho.com/crm/developer/docs/server-side-sdks/node-js.html#Register_Zoho_Client) to use with Zoho.
2. Generate a self-authorized grant and refresh token as explained in the above link.
3. Create a fill `zoho_token.json` with the following content and add the result you get in step 2.

```
{
	"access_token": "########",
	"expires_in": #######,
	"refresh_token":"##########"
}
```

4. Create an s3 bucket or use an existing one and upload the file.

The module currently supports four operations - `getRecords`, `getRecord`, `updateRecord` and `insertRecord`.

Upon installation of the module, a `.env` file and `resources` folder containing two files - `configuration.properties` and `oauth_configuration.properties` are created in your project. Fill them based your AWS and Zoho credentials.

## Install

Navigate to the root of your project folder and

```
npm install https://github.com/eyzhub/zohoapi.git  --save
```

## Complete .env and files under resources

## Usage examples

```
Zoho = require("zohoapi");
zoho =  new Zoho(); // optional enable debug messages | new Zoho( { debug: true } );
					// optional parallel execution | new Zoho( { records_batch_size: 5 } );
					// optional cache repeating calls | new Zoho( { cache: {} } );
					// compress cache | new Zoho( { cache: {}, compress: true } );
```

1. Fetch records

```
let params = { module: "Accounts", page: 1, per_page: 2, has_subform: true };
let result = await zoho.getRecords(params);

if (result.records) {
	let records = result.records;
	console.log(records.length);
	// loop records
}


```

2. Get a record

```
let result =  await zoho.getRecord("Offers", "1972094000016989067");
console.log(result);

if (result.record) {
	let record = result.record;
}

```

3. Update a record

```
let data = [{ isan: "fooo-bar-nouse" }];
let result = await zoho.updateRecord("Filmv1", "1972094000017015005", data);

// should be 200
console.log(result.statusCode);
console.log(result.body);
```

4. Insert record

```
let data = [{ isan: "fooo-bar-nouse", Name: "New film"}];
let result = await zoho.insertRecord("FilmV1", data);
console.log(result.body);
```

5. Search records

```
let criteria = "(Product_Name:starts_with:Filmin DE)"
let params1 = { module: "Products", page: 1, per_page: 1, criteria: criteria };
let result1 = await zoho.searchRecords(params1);		
console.log(result1);
```

6. Get all records

```
let params = { module: "Products"};
let result = await zoho.getAllRecords(params);

if (result.statusCode == 200) {
	let records = result.records;
	let relatedModules = result.related_modules;
	conso.log(relatedModules.length);
	console.log(records.length);
	// loop records
	// loop records of a relatedModule - relatedModules[0]["records"]
}
```




**Note**

1. Use api names for the modules and field names (Tested).
2. `getAllRecords` and `getRecordsModifiedAfter` 
return related modules of type _multiselectlookup_. 
To turn this off, set `params.fetch_related = false`
3. subforms: To fectch `subforms` for all the data, use `has_subform: true`. 
	To selecitvly get subform pass an object like this: `where_subform: {key1: value1, key2: value2 ...}`. This will be translated into
	`(key1 == value1) && (key2 == value2)`
