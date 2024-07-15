// connection/mysql_connection.js

const mysql = require('mysql');

const dbCon = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'allp_allpass_live'
});

dbCon.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

module.exports = dbCon;
