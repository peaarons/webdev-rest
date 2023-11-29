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
app.get('/code', (req, res) => {
   // console.log(req.query); 
    let codes = req.query.code;
    if(!codes || codes === ' '){
        const sql = `SELECT code, incident_type FROM Codes `;
        dbSelect(sql)
        .then((rows) =>{
            if (rows.length > 0) {
                const transformedRows = rows.map(row => ({
                    code: row.code,
                    type: row.incident_type
                }));
                const formattedResponse = transformedRows
                .map((row, index, array) =>{
                    if (index !== array.length - 1) {
                        return `{"code": ${row.code}, "type":  "${row.type}"},`;
                    } else {
                        return `{"code": ${row.code}, "type":  "${row.type}"}`;
                    }
                })
                .join('\n');
                res.status(200).type('json').send(formattedResponse); 
            } else {
                res.status(404).type('txt').send('Codes not found ');
            }
        })
        .catch((error) => {
            res.status (500).type('txt').send("Internal Service Error");
        });
    }
    codes=codes.split(',');
    const placeholders = codes.map(() => '?').join(',');

    const sql = `SELECT code, incident_type FROM Codes WHERE code IN (${placeholders})`;
    const params= codes;
    console.log(sql);
    console.log(params)

    dbSelect(sql, params)
    .then((rows) =>{
        if (rows.length > 0) {
            const transformedRows = rows.map(row => ({
                code: row.code,
                type: row.incident_type
            }));
            const formattedResponse = transformedRows
            .map((row, index, array) =>{
                if (index !== array.length - 1) {
                    return `{"code": ${row.code}, "type":  "${row.type}"},`;
                } else {
                    return `{"code": ${row.code}, "type":  "${row.type}"}`;
                }
            })
            .join('\n');
            res.status(200).type('json').send(formattedResponse); 
        } else {
            res.status(404).type('txt').send('Codes not found ');
        }
    })
    .catch((error) => {
        res.status (500).type('txt').send("Internal Service Error");
    });
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    let id = req.query.id;
    if (!id || id.trim() === '') {
        const sql = `SELECT neighborhood_number, neighborhood_name FROM Neighborhoods `;
        dbSelect(sql)
            .then((rows) => {
                if (rows.length > 0) {
                    const transformedRows = rows.map(row => ({
                        id: row.neighborhood_number,
                        name: row.neighborhood_name
                    }));
                    const formattedResponse = transformedRows
                    .map((row, index, array) =>{
                        if (index !== array.length - 1) {
                            return `{"id": ${row.id}, "name":  "${row.name}"},`;
                        } else {
                            return `{"id": ${row.id}, "name":  "${row.name}"}`;
                        }
                    })
                    .join('\n');
                    res.status(200).type('json').send(formattedResponse); 
                } else {
                    res.status(404).type('txt').send('Neighborhoods not found');
                }
            })
            .catch((error) => {
                res.status(500).type('txt').send("Internal Service Error");
            });
    } else {
        id = id.split(',');
        const placeholders = id.map(() => '?').join(',');
        const sql = `SELECT neighborhood_number, neighborhood_name FROM Neighborhoods WHERE neighborhood_number IN (${placeholders})`;
        
        dbSelect(sql, id)
            .then((rows) => {
                if (rows.length > 0) {
                    const transformedRows = rows.map(row => ({
                        id: row.neighborhood_number,
                        name: row.neighborhood_name
                    }));
                    const formattedResponse = transformedRows
                    .map((row, index, array) =>{
                        if (index !== array.length - 1) {
                            return `{"id": ${row.id}, "name":  "${row.name}"},`;
                        } else {
                            return `{"id": ${row.id}, "name":  "${row.name}"}`;
                        }
                    })
                    .join('\n');
                    res.status(200).type('json').send(formattedResponse); 
                } else {
                    res.status(404).type('txt').send('Neighborhoods not found');
                }
            })
            .catch((error) => {
                res.status(500).type('txt').send("Internal Service Error");
            });
    }
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
        const startDate = req.query.start_date || '1900-01-01';
        const endDate = req.query.end_date || startDate;
        const codes = req.query.code ? req.query.code.split(',') : [];
        const grids = req.query.grid ? req.query.grid.split(',') : [];
        const neighborhoods = req.query.neighborhood ? req.query.neighborhood.split(',') : [];
        const limit = req.query.limit ? parseInt(req.query.limit) : 1000;
    
        let sql = `SELECT case_number, DATE(date_time) as date, TIME(date_time) as time, code, incident, police_grid, neighborhood_number, block 
                   FROM Incidents 
                   WHERE DATE(date_time) BETWEEN ? AND ?`;
    
        const queryParams = [startDate, endDate];
    
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
    
        sql += ` ORDER BY date_time DESC LIMIT ?`;
        queryParams.push(limit);
    
        dbSelect(sql, queryParams)
            .then((rows) => {
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


// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data

    let {case_number, date, time, code, incident, police_grid, neighborhood_number, block} = req.body;

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
    const sql = `INSERT INTO Incidents (case_number, date, time, code, incident, police_grid, neighborhood_number, block) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params= [case_number, date, time, code, incident, police_grid, neighborhood_number, block]

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
            res.status(500).type('txt').send("The Case Number you entered is not in the database"); //already is in database
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
