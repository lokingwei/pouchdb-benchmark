const PouchDB = require('pouchdb');

var dbName = 'test-secondary',
	nRun = 1000,
	nDocs = 100,
	deleteDB = true,
	status = [
		'Lilla Torget', 'Västlänken', 'Kruthusgatan'
	],
	targetCount = 300,
	targetStatus = 'active',
    db = null;

function setUp() {
	db = new PouchDB({name:dbName});
    var ddoc = {
        _id: '_design/bill',
        views: {
            by_status: {
                map: function(doc) { emit(doc.status); }.toString()
            },
        }
    }
    db.put(ddoc);
}

function tearDown() {
	db.info().then(info => console.log(info))
    if(deleteDB) {
        db.destroy(function(err, info) {
            if (err) {
                console.log(err);
            }
        });
    }
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
	targetCount -= 1;
	return db.post({
		type: 'entry',
		activity: activities[i % activities.length],
		status: targetCount > 0 ? targetStatus : status[i % status.length],
		slot: slot[i % slot.length],
		time: (((i % 9) + '').replace(/,/g, '.') * 1),
		description: descriptions[i % descriptions.length],
		date: new Date(i * 86400)
	})
}

function query(i) {
	return new Promise((resolve) => {
		db.query('bill/by_status', {
			key: targetStatus,
		  }).
		then((result) => { 
			console.log(`found: ${result.rows.length}`);
			resolve()
		});
	})
}

function run(i) {
	return new Promise((resolve) => {
		time(createDocuments, nDocs).
		then(() => { return time(query, 1) }).
		// then(() => { return time(query, 1) }).
		// then(() => { return time(createDocuments, 1) }).
		// then(() => { return time(query, 1) }).
		// then(() => { return time(createDocuments, 1) }).
		// then(() => { return time(query, 1) }).
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