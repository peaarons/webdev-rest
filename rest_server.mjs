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
    console.log(req.query); 
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
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    
    res.status(200).type('json').send({}); // <-- you will need to change this
});

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data
    
    res.status(200).type('txt').send('OK'); // <-- you may need to change this
});

// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {
    console.log(req.body); // uploaded data
    
    res.status(200).type('txt').send('OK'); // <-- you may need to change this
});

/********************************************************************
 ***   START SERVER                                               *** 
 ********************************************************************/
// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
