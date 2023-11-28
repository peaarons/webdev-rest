import * as path from 'node:path';
import * as url from 'node:url';
import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

const port = 8000;

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
                    type: row.incident_type.toUpperCase() // Convert incident_type to uppercase
                }));
                res.status(200).type('json').send(transformedRows.map(row => JSON.stringify(row) + '\n').join('')); // Sending retrieved data directly     
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

    //const codeParam = req.query.code;
    const sql = `SELECT code, incident_type FROM Codes WHERE code IN (${placeholders})`;
    const params= codes;

    console.log(sql);
    console.log(params)


    dbSelect(sql, params)
    .then((rows) =>{
        if (rows.length > 0) {
            const transformedRows = rows.map(row => ({
                code: row.code,
                type: row.incident_type.toUpperCase() // Convert incident_type to uppercase
            }));
            res.status(200).type('json').send(transformedRows.map(row => JSON.stringify(row) + '\n').join('')); // Sending retrieved data directly     
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
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    
    res.status(200).type('json').send({}); // <-- you will need to change this
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    
    res.status(200).type('json').send({}); // <-- you will need to change this
});

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data

    

    let {case_number, date_time, code, incident, police_grid, neighborhood_number, block} = req.body;

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
