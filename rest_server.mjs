import * as path from 'node:path';
import * as url from 'node:url';
import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';
import { default as cors } from 'cors';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

const port = 8100;

let app = express();
app.use(express.json());
app.use(cors());

/********************************************************************
 ***   DATABASE FUNCTIONS                                         *** 
 ********************************************************************/
// Open SQLite3 database (in read-write mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});

// Create Promise for SQLite3 database SELECT query 
function dbSelect(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
}

// Create Promise for SQLite3 database INSERT or DELETE query
function dbRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

/********************************************************************
 ***   REST REQUEST HANDLERS                                      *** 
 ********************************************************************/
// GET request handler for crime codes
//http://localhost:8100/code?code=
app.get('/codes', (req, res) => {
    //console.log(req.query); // query object (key-value pairs after the ? in the url)

    let sql = 'SELECT code, incident_type as type FROM Codes';
    let sqlparams = [];

    if ('code' in req.query) {
        const codes = req.query.code.split(',');
        const placeholders = codes.map(() => '?').join(', ');

        sql += ` WHERE code IN (${placeholders})`;
        sqlparams = codes.map(code => parseInt(code));
    }
    //Order from least to greatest
    sql += " ORDER BY code;"
    // console.log(sql);
    // console.log('PARAMETER: ', sqlparams);

    dbSelect(sql, sqlparams)
        .then(rows => {
            //console.log(rows);
            res.status(200).type('json').send(rows);
        }).catch((error) => {
            res.status(500).type('txt').send(error);
        });
});

//http://localhost:8100/neighborhoods?id=
// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    let sql = 'SELECT neighborhood_number as id, neighborhood_name as name FROM Neighborhoods';
    let params = [];
    if (req.query.hasOwnProperty('id')) {
        let ids = req.query.id.split(',');
        sql += ' WHERE neighborhood_number = ?';
        params.push(parseInt(ids[0]));
        for (let i = 1; i < ids.length; i++) {
            sql += ' OR neighborhood_number = ?';
            params.push(parseInt(ids[i]));
        }
    }
    sql += " ORDER BY id;"
    //console.log(sql);
    //console.log('PARAM: ', params);

    dbSelect(sql, params)
        .then(rows => {
            console.log(rows);
            res.status(200).type('json').send(rows);
        }).catch((error) => {
            res.status(500).type('txt').send(error);
        });
});

// GET request handler for crime incidents
//http://localhost:8100/incidents?start_date=2019-09-01&end_date=2019-10-31&limit=20
app.get('/incidents', (req, res) => {
    let sql = `
    SELECT
        case_number,
        date(date_time) AS date,
        time(date_time) AS time,
        code,
        incident,
        police_grid,
        neighborhood_number,
        block
    FROM
        Incidents
`;

    let params = [];

    const addCondition = (condition, value) => {
        sql += count === 0 ? ` WHERE ${condition}` : ` AND ${condition}`;
        params.push(value);
        count++;
    };

    let count = 0;

    if (req.query.start_date) {
        addCondition('date(date_time) >= ?', req.query.start_date);
    }

    if (req.query.end_date) {
        addCondition('date(date_time) <= ?', req.query.end_date);
    }

    if (req.query.neighborhood) {
        let neighborhoods = req.query.neighborhood.split(',');
        addCondition(`neighborhood_number IN (${neighborhoods.map(_ => '?').join(', ')})`, ...neighborhoods.map(parseInt));
    }

    if (req.query.code) {
        let codes = req.query.code.split(',');
        addCondition(`code IN (${codes.map(_ => '?').join(', ')})`, ...codes.map(parseInt));
    }

    if (req.query.grid) {
        let grids = req.query.grid.split(',');
        addCondition(`police_grid IN (${grids.map(_ => '?').join(', ')})`, ...grids.map(parseInt));
    }

    if (req.query.limit) {
        let limit = parseInt(req.query.limit);
        params.push(limit);
        sql += ' ORDER BY date_time DESC LIMIT ?';
    }
    else{
        sql += ' ORDER BY date_time DESC';
    }



    dbSelect(sql, params)
        .then(rows => {

            res.status(200).type('json').send(rows);
        }).catch((error) => {
            res.status(500).type('txt').send(error);
        });
});

//curl -X PUT “http://localhost:8000/new-incident” -H “Content-Type: application/json” -d “{\”case_number\”: 1234, \”date\”: \”2023-11-23\”, \”incident\”: \”student michief\”}
// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    //console.log(req.body); // uploaded data
    let { case_number, date_time, date, time, code, incident, police_grid, neighborhood_number, block } = req.body;

    //for if the user enters a date without a time or a time without a date instead of a DATETIME
    if (date_time === undefined && (time != undefined || date != undefined)) {
        if (time === undefined) {
            time = 'time undefined'
        }
        if (date === undefined) {
            date = 'date undefined'
        }
        date_time = date + ' ' + time
    }

    //for updating the map boudarys
    //map.leaflet.getBounds()._northWEST.lat

    //check to see if exists already
    const sqlCheck = `SELECT * FROM Incidents WHERE case_number = ?`;
    const paramsCheck = [case_number];

    console.log(sqlCheck);
    console.log(paramsCheck);

    dbSelect(sqlCheck, paramsCheck)
        .then((rows) => {
            if (rows.length > 0) {
                res.status(409).type('txt').send("The Case Number you entered is already in the database"); //already is in database
            } else {
                //insert query
                const sql = `INSERT INTO Incidents (case_number, date_time, code, incident, police_grid, neighborhood_number, block) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
                const params = [case_number, date_time, code, incident, police_grid, neighborhood_number, block]

                console.log(sql);
                console.log(params)

                dbRun(sql, params)
                    .then(() => {
                        res.status(200).type('txt').send("Incident successfully added");
                    })
                    .catch((error) => {
                        console.error(error);
                        res.status(500).type('txt').send("Error");
                    });
            }
        }).catch((error) => {
            console.error(error);
            res.status(500).type('txt').send("Error");
        });
});

//curl -X DELETE “http://localhost:8000/remove-incident” -H “Content-Type: application/json” -d “{\”case_number\”: 1234}”
// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {
    //console.log(req.body); // uploaded data
    let { case_number } = req.body;

    //check if in database
    const sqlCheck = `SELECT * FROM Incidents WHERE case_number = ?`;
    const paramsCheck = [case_number];

    //console.log(sqlCheck);
    //console.log(paramsCheck);

    dbSelect(sqlCheck, paramsCheck)
        .then((rows) => {
            if (rows.length === 0) {
                res.status(500).type('txt').send("The Case Number you entered is not in the database");
            } else {
                //delete query
                const sql = `DELETE FROM Incidents WHERE case_number = ?;`;
                const params = [case_number]
                //console.log(sql);
                //console.log(params)
                dbRun(sql, params)
                    .then(() => {
                        res.status(200).type('txt').send("Incident successfully deleted");
                    })
                    .catch((error) => {
                        console.error(error);
                        res.status(500).type('txt').send(error);
                    });
            }
        })
        .catch((error) => {
            console.error(error);
            res.status(500).type('txt').send(error);
        });
});

/********************************************************************
 ***   START SERVER                                               *** 
 ********************************************************************/
// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
