const PouchDB = require('pouchdb');

var dbName = 'test-relational',
	nRun = 5
	nDocs = 100,
	deleteDB = true,
	status = [
		'Lilla Torget', 'Västlänken', 'Kruthusgatan'
	],
    db = null;

function setUp() {
	db = new PouchDB({name:dbName});
	PouchDB.plugin(require('relational-pouch'));
	PouchDB.plugin(require('pouchdb-find'));
	db.setSchema([
		{
		  singular: 'entry',
		  plural: 'entries',
		  relations: {
			status: {belongsTo: 'entryStatus'},
		  }
		},
		{
		  singular: 'entryStatus',
		  plural: 'entryStatuses',
		  relations: {
			entries: {hasMany: {type: 'entry', options: {queryInverse: 'entry'}}}
		  }
		},
	  ]);
	status.forEach((s) => {
		db.rel.save('entryStatus', {
			id: s,
		  });
	})
}

function tearDown() {
	db.info().then((info) => {
		console.log(info);
		if(deleteDB) {
			db.destroy(function(err, info) {
				if (err) {
					console.log(err);
				}
			});
		}
	})
}

function time(fn, times) {
	var i,
		start = Date.now(),
		result;

	function logStats() {
		var t = Date.now() - start;
		console.log(fn.name + ': ' + t + ' ms, ' + (t / times) + ' ms/run.');
	}

    result = new Promise(function(resolve, reject) {
        function next(i) {
            if (i < times) {
                fn(i).
                then(function() { next(i + 1); }).
                catch(reject);
            } else {
                logStats();
                resolve();
            }
        }

        next(0);
    });

	return result;
}

function createDocuments(i) {
	var activities = [
			'Planering', 'Möte', 'Sprängning', 'Grävarbete',
			'Transport'
		],
		slot = [
			'Skanska', 'Sweco', 'ÅF', 'Privat'
		],
		descriptions = [
			'', '', '', 'Kunden galen', 'Grus i maskineriet', 'OBS! Fakturera först nästa månad'
		];
	const status = status[i % status.length];

	return db.rel.save('entry', {
		activity: activities[i % activities.length],
		status: status,
		slot: slot[i % slot.length],
		time: (((i % 9) + '').replace(/,/g, '.') * 1),
		description: descriptions[i % descriptions.length],
		date: new Date(i * 86400)
	}).then((result) => {
	});
}

function query(i) {
	return new Promise((resolve) => {
		db.rel.find('entryStatus', status[0]).
		then((result) => { 
			console.log(result);
			resolve()
		});
	})
}

function run(i) {
	return new Promise((resolve) => {
		time(createDocuments, nDocs).
		then(() => { return time(query, 1, true) }).
		then(() => { return time(query, 1, true) }).
		then(() => { resolve(); });
	});
}

console.log('Pouch-Couch Benchmark');
console.log('=====================');
console.log(dbName);
console.log(`nRun: ${nRun}, nDocs: ${nDocs}`);

setUp();

Promise.resolve().
then(function() { return time(run, nRun); }).
then(tearDown).
catch(function(e) { console.log(e); tearDown(); throw e });