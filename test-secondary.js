const PouchDB = require('pouchdb');

var dbName = 'test-secondary',
	nRun = 25,
	nDocs = 50,
	deleteDB = true,
	status = [
		'Lilla Torget', 'Västlänken', 'Kruthusgatan'
	],
	label = [
		'Lilla Torget', 'Västlänken', 'Kruthusgatan',
		'Lilla Torget', 'Västlänken', 'Kruthusgatan',
		'Lilla Torget', 'Västlänken', 'Kruthusgatan',
		'Lilla Torget', 'Västlänken', 'Kruthusgatan',
		'Lilla Torget', 'Västlänken', 'Kruthusgatan',
	],
	machine = [
		'213'
	],
	targetStatusCount = 300,
	targetStatus = 'active',
	targetLabelCount = 3000,
	targetLabel = 'active',
	targetMachineCount = 30000,
	targetMachine = '123',
    db = null;

function setUp() {
	db = new PouchDB({name:dbName});
    var ddoc = {
        _id: '_design/bill',
        views: {
            by_status: {
                map: function(doc) { emit(doc.status); }.toString()
			},
			by_label: {
                map: function(doc) { emit(doc.label); }.toString()
			},
			by_machine: {
                map: function(doc) { emit(doc.machine); }.toString()
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
	descriptions = [
		'', '', '', 'Kunden galen', 'Grus i maskineriet', 'OBS! Fakturera först nästa månad'
	];
	targetStatusCount -= 1;
	targetLabelCount -= 1;
	targetMachineCount -= 1;
	return db.post({
		type: 'entry',
		activity: activities[i % activities.length],
		status: targetStatusCount > 0 ? targetStatus : status[i % status.length],
		label: targetLabelCount > 0 ? targetLabel : status[i % label.length],
		machine: targetMachineCount > 0 ? targetMachine : status[i % machine.length],
		description: descriptions[i % descriptions.length],
	})
}

function query(index, key, i) {
	return new Promise((resolve) => {
		db.query(index, {
			key: key,
		  }).
		then((result) => { 
			resolve()
		});
	})
}

function queryStatus(i) {
	return query('bill/by_status', targetStatus, i)
}

function queryLabel(i) {
	return query('bill/by_label', targetLabel, i)
}

function queryMachine(i) {
	return query('bill/by_machine', targetMachine, i)
}

function prepare(i) {
	return new Promise((resolve) => {
		time(createDocuments, nDocs).
		then(() => { return time(queryStatus, 1) }).
		then(() => { return time(queryLabel, 1) }).
		then(() => { return time(queryMachine, 1) }).
		then(() => { resolve(); });
	});
}

function run(i) {
	return new Promise((resolve) => {
		createDocuments(1).
		then(() => { return time(queryStatus, 1) }).
		then(() => { return time(queryLabel, 1) }).
		then(() => { return time(queryMachine, 1) }).
		then(() => { resolve(); });
	});
}

console.log('Pouch-Couch Benchmark');
console.log('=====================');
console.log(dbName);
console.log(`nRun: ${nRun}, nDocs: ${nDocs}`);

setUp();

Promise.resolve().
// then(function() { return time(createWithIndex, nDocs); }).
then(function() { return time(run, nRun); }).
then(tearDown).
catch(function(e) { console.log(e); tearDown(); throw e });