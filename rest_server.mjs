import * as path from 'node:path';
import * as url from 'node:url';
import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

const port = 8100;

let app = express();
app.use(express.json());

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
app.get('/code', (req, res) => {
   // get codes from query parameters
    let codes = req.query.code;
    //if no code or empty space then get all codes
    if(!codes || codes === ' '){
        //SQL query get all codes and incident types
        const sql = `SELECT code, incident_type FROM Codes `;
        dbSelect(sql)
        .then((rows) =>{
            if (rows.length > 0) {
                //change rows into an array of code and incident_type object
                const transformedRows = rows.map(row => ({
                    code: row.code,
                    type: row.incident_type
                }));
                //formate the response in JSON
                const formattedResponse = transformedRows
                .map((row, index, array) =>{
                    if (index !== array.length - 1) {
                        return `{"code": ${row.code}, "type":  "${row.type}"},`;
                    } else {
                        return `{"code": ${row.code}, "type":  "${row.type}"}`;
                    }
                })
                .join('\n');
                //send formatted response
                res.status(200).type('json').send(formattedResponse); 
            } else {
                //if no codes are found
                res.status(404).type('txt').send('Codes not found ');
            }
        })
        .catch((error) => {
            //internal service error
            res.status (500).type('txt').send("Internal Service Error");
        });
    }
    //split comma-seperated code
    codes=codes.split(',');
    //create placeholders for SQL query
    const placeholders = codes.map(() => '?').join(',');
    //SQL query select specific codes and incident types
    const sql = `SELECT code, incident_type FROM Codes WHERE code IN (${placeholders})`;
    const params= codes;
    //console log SQL query and Parameters
    console.log(sql);
    console.log(params)
    //select codes based on the parameters
    dbSelect(sql, params)
    .then((rows) =>{
        if (rows.length > 0) {
            //transform rows into an array of code
            const transformedRows = rows.map(row => ({
                code: row.code,
                type: row.incident_type
            }));
            //format the response in JSON
            const formattedResponse = transformedRows
            .map((row, index, array) =>{
                if (index !== array.length - 1) {
                    return `{"code": ${row.code}, "type":  "${row.type}"},`;
                } else {
                    return `{"code": ${row.code}, "type":  "${row.type}"}`;
                }
            })
            .join('\n');
            //send the formatted response
            res.status(200).type('json').send(formattedResponse); 
        } else {
            //no specifci code found
            res.status(404).type('txt').send('Codes not found ');
        }
    })
    .catch((error) => {
        res.status (500).type('txt').send("Internal Service Error");
    });
});
//http://localhost:8100/neighborhoods?id=
// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    //retrieve neigbohood ID from query parameters 
    let id = req.query.id;
    //if no ID or empty retrieve all neighborhoods ID
    if (!id || id.trim() === '') {
        //SQL query to select all neighborhood numbers and names
        const sql = `SELECT neighborhood_number, neighborhood_name FROM Neighborhoods `;
        dbSelect(sql)
            .then((rows) => {
                if (rows.length > 0) {
                    //change rpws into an arrat of object with ID and names
                    const transformedRows = rows.map(row => ({
                        id: row.neighborhood_number,
                        name: row.neighborhood_name
                    }));
                    //format the response in JSON
                    const formattedResponse = transformedRows
                    .map((row, index, array) =>{
                        if (index !== array.length - 1) {
                            return `{"id": ${row.id}, "name":  "${row.name}"},`;
                        } else {
                            return `{"id": ${row.id}, "name":  "${row.name}"}`;
                        }
                    })
                    .join('\n');
                    //send formatted response
                    res.status(200).type('json').send(formattedResponse); 
                } else {
                    res.status(404).type('txt').send('Neighborhoods not found');
                }
            })
            .catch((error) => {
                res.status(500).type('txt').send("Internal Service Error");
            });
    } else {
        //else split comma-seperated IDs provided
        id = id.split(',');
        //placeholder for SQl query
        const placeholders = id.map(() => '?').join(',');
        //SQL query to select specific neighbohoods based on ID
        const sql = `SELECT neighborhood_number, neighborhood_name FROM Neighborhoods WHERE neighborhood_number IN (${placeholders})`;
        
        dbSelect(sql, id)
            .then((rows) => {
                if (rows.length > 0) {
                    //transform rows into an array of objects with ID and name
                    const transformedRows = rows.map(row => ({
                        id: row.neighborhood_number,
                        name: row.neighborhood_name
                    }));
                    //format in JSON
                    const formattedResponse = transformedRows
                    .map((row, index, array) =>{
                        if (index !== array.length - 1) {
                            return `{"id": ${row.id}, "name":  "${row.name}"},`;
                        } else {
                            return `{"id": ${row.id}, "name":  "${row.name}"}`;
                        }
                    })
                    .join('\n');
                    //send the formatted response
                    res.status(200).type('json').send(formattedResponse); 
                } else {
                    res.status(404).type('txt').send('Neighborhoods not found');
                }
            })
            .catch((error) => {
                //internal service error
                res.status(500).type('txt').send("Internal Service Error");
            });
    }
});

// GET request handler for crime incidents
//http://localhost:8100/incidents?start_date=2019-09-01&end_date=2019-10-31&limit=20
app.get('/incidents', (req, res) => {
        //retrive query parameters for date range, codes, grids, neighbohoods, limit
        const startDate = req.query.start_date || '1900-01-01';
        const endDate = req.query.end_date || startDate;
        const codes = req.query.code ? req.query.code.split(',') : [];
        const grids = req.query.grid ? req.query.grid.split(',') : [];
        const neighborhoods = req.query.neighborhood ? req.query.neighborhood.split(',') : [];
        const limit = req.query.limit ? parseInt(req.query.limit) : 1000;
        //construst SQL query for within a specific date range
        let sql = `SELECT case_number, DATE(date_time) as date, TIME(date_time) as time, code, incident, police_grid, neighborhood_number, block 
                   FROM Incidents 
                   WHERE DATE(date_time) BETWEEN ? AND ?`;
        //start and end parametes
        const queryParams = [startDate, endDate];
        //check conditions based on codes, and grids, and neighborhoods
        if (codes.length > 0) {
            sql += ` AND code IN (${codes.map(() => '?').join(',')})`;
            queryParams.push(...codes);
        }
    
        if (grids.length > 0) {
            sql += ` AND police_grid IN (${grids.map(() => '?').join(',')})`;
            queryParams.push(...grids);
        }
    
        if (neighborhoods.length > 0) {
            sql += ` AND neighborhood_number IN (${neighborhoods.map(() => '?').join(',')})`;
            queryParams.push(...neighborhoods);
        }
        //adding ORDER By and limit clause to the SQL query
        sql += ` ORDER BY date_time DESC LIMIT ?`;
        queryParams.push(limit);
        //execute the SQL query with parameters
        dbSelect(sql, queryParams)
            .then((rows) => {
                //formate the incidents foun in JSON
                if (rows.length > 0) {
                    const formattedResponse = rows.map(row => ({
                        case_number: row.case_number,
                        date: row.date,
                        time: row.time,
                        code: row.code,
                        incident: row.incident,
                        police_grid: row.police_grid,
                        neighborhood_number: row.neighborhood_number,
                        block: row.block
                    }));
                    res.status(200).type('json').send(JSON.stringify(formattedResponse, null, 2));
                } else {
                    res.status(404).type('txt').send('Incidents not found');
                }
            })
            .catch((error) => {
                res.status(500).type('txt').send("Internal Service Error");
            });
    });

//curl -X PUT “http://localhost:8000/new-incident” -H “Content-Type: application/json” -d “{\”case_number\”: 1234, \”date\”: \”2023-11-23\”, \”incident\”: \”student michief\”}
// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data
    let {case_number, date_time, date, time, code, incident, police_grid, neighborhood_number, block} = req.body;

    //for if the user enters a date without a time or a time without a date instead of a DATETIME
    if(date_time===undefined && (time!=undefined || date!=undefined)){
        if(time===undefined){
            time = 'time undefined'
        }
        if(date===undefined){
            date = 'date undefined'
        }
        date_time = date + ' ' + time
    }

    //check to see if exists already
    const sqlCheck = `SELECT * FROM Incidents WHERE case_number = ?`;
    const paramsCheck= [case_number];

    console.log(sqlCheck);
    console.log(paramsCheck);

    dbSelect(sqlCheck, paramsCheck)
    .then((rows) =>{
        if (rows.length > 0) {
            res.status(500).type('txt').send("The Case Number you entered is already in the database"); //already is in database
        } 
    }).catch((error) => {
        console.error(error);
        res.status(500).type('txt').send("Error");
    });

    //insert query
    const sql = `INSERT INTO Incidents (case_number, date_time, code, incident, police_grid, neighborhood_number, block) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params= [case_number, date_time, code, incident, police_grid, neighborhood_number, block]

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
});

//curl -X DELETE “http://localhost:8000/remove-incident” -H “Content-Type: application/json” -d “{\”case_number\”: 1234}”
// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {
    console.log(req.body); // uploaded data
    let {case_number} = req.body;

    //check if in database
    const sqlCheck = `SELECT * FROM Incidents WHERE case_number = ?`;
    const paramsCheck= [case_number];

    console.log(sqlCheck);
    console.log(paramsCheck);

    dbSelect(sqlCheck, paramsCheck)
    .then((rows) =>{
        if (rows.length === 0) {
            res.status(500).type('txt').send("The Case Number you entered is not in the database");
        } 
    }).catch((error) => {
        console.error(error);
        res.status(500).type('txt').send("Error");
    });

    //delete query
    const sql = `DELETE FROM Incidents WHERE case_number = ?;`;
    const params= [case_number]

    console.log(sql);
    console.log(params)

    dbRun(sql, params)
        .then(() => {
            res.status(200).type('txt').send("Incident successfully deleted");
        })
        .catch((error) => {
            console.error(error);
            res.status(500).type('txt').send("Error");
        });
});

/********************************************************************
 ***   START SERVER                                               *** 
 ********************************************************************/
// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
