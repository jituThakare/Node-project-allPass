const { validationResult, check } = require('express-validator');
const dbCon = require('../config/db');
const xlsx = require('xlsx');

class importFile {
    async importTravelDataOld(req, res) {
        await check('event_id', 'Event Id required').notEmpty().run(req);
        await check('user_type', 'User Type is required').notEmpty().run(req);
        await check('added_by', 'Added By is required').notEmpty().run(req);

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ success: 0, message: errors.array()[0].msg });
        }

        let events = [];
        try {   
            const data = {
                event_id: req.body.event_id,
                user_type: req.body.user_type,
                added_by: req.body.added_by
            };
            // console.log(data);
        
            // Get the uploaded file
            const file = req.file;
        
            if (!file) {
                return res.status(400).json({ success: 0, message: 'No file uploaded.' });
            }
            
             // Read the Excel file
            const workbook = xlsx.readFile(file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const excelData = xlsx.utils.sheet_to_json(worksheet);

            // // Mock ImportTravelData class and import method
            // class ImportTravelData {
            //     constructor(data) {
            //         this.data = data;
            //     }

            //     import(fileData) {
            //         // Here you can handle the imported data
            //         console.log('Importing data:', fileData);
            //         console.log('Additional data:', this.data);
            //     }
            // }

            // const importData = new ImportTravelData(data);
            // importData.import(excelData);

            if(excelData) {
                // console.log(excelData);
                for (const row of excelData) { 
                    console.log(row);            
                    const appUserQuery = `SELECT id FROM tbl_app_users where id = ? AND is_delete = 0`;

                    const appUserResults = await new Promise((resolve, reject) => {
                        dbCon.query(appUserQuery, [row.id], (err, results) => {
                            if (err) reject(err);
                            else resolve(results);
                        });
                    });
                    console.log(appUserResults);
                    if (appUserResults.length > 0) {
                        console.log(appUserResults.id);
                        const travelUserQuery = `SELECT id FROM tbl_app_users where event_id = ? AND user_id = ? AND is_delete = 0`;

                        const travelUserResults = await new Promise((resolve, reject) => {
                            dbCon.query(travelUserQuery, [data.event_id, appUserResults.id], (err, results) => {
                                if (err) reject(err);
                                else resolve(results);
                            });
                        });

                        if (travelUserResults.length = 0) { 
                            console.log('travel data not found');
                        }
                    }
                }
            } else {
                res.json({
                    success: 0,
                    message: "Data Row not found."
                });
            }

            // Respond with success
            res.json({ success: 1, message: 'File uploaded successfully.' });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async importTravelData(req, res) {
        await check('event_id', 'Event Id required').notEmpty().run(req);
        await check('user_type', 'User Type is required').notEmpty().run(req);
        await check('added_by', 'Added By is required').notEmpty().run(req);

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ success: 0, message: errors.array()[0].msg });
        }

        let events = [];
        try {
            const data = {
                event_id: req.body.event_id,
                user_type: req.body.user_type,
                added_by: req.body.added_by
            };
            // console.log(data);
        
            // Get the uploaded file
            const file = req.file;
        
            if (!file) {
                return res.status(400).json({ success: 0, message: 'No file uploaded.' });
            }
            
             // Read the Excel file
            const workbook = xlsx.readFile(file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const excelData = xlsx.utils.sheet_to_json(worksheet);

            if(excelData) {
                // console.log(excelData);
                for (const row of excelData) { 
                    // console.log(row);            
                    const appUserQuery = `SELECT id FROM tbl_app_users where id = ? AND is_delete = 0`;

                    const appUserResults = await new Promise((resolve, reject) => {
                        dbCon.query(appUserQuery, [row.id], (err, results) => {
                            if (err) reject(err);
                            else resolve(results);
                        });
                    });
                    // console.log(appUserResults);
                    if (appUserResults.length > 0) {
                        const appUserId = appUserResults[0].id; // Access the id correctly
                        console.log(appUserId);
                        console.log(data.event_id);
                        const travelUserQuery = `SELECT id FROM tbl_travel_details where event_id = ? AND user_id = ? AND is_delete = 0`;

                        const travelUserResults = await new Promise((resolve, reject) => {
                            dbCon.query(travelUserQuery, [data.event_id, appUserId], (err, results) => {
                                if (err) reject(err);
                                else resolve(results);
                            });
                        });

                        if (travelUserResults.length === 0) { 
                            console.log('travel data not found');
                            // console.log('00');
                            // console.log(row.to_from.trim());
                            // Change From, To to 1 or 0
                            let direction = 0;
                            if (row.to_from && row.to_from.trim()) {
                                if (row.to_from.trim().toLowerCase() === 'from') {
                                    direction = 1;
                                }
                            }
                            console.log('01');

                            // Error Handle for Blank
                            const flight_no = row.flight_no ? row.flight_no.trim() : '';
                            const flight_name = row.flight_name ? row.flight_name.trim() : '';
                            const origin = row.origin ? row.origin.trim() : '';
                            const destination = row.destination ? row.destination.trim() : '';                           
                            const dep_time = row.dep_time ? row.dep_time : '';
                            const arr_date = row.arr_date ? row.arr_date.trim() : '';
                            const arr_time = row.arr_time ? row.arr_time : '';
                            const pnr_number = row.pnr_number ? row.pnr_number.trim() : '';

                            let terminal_no = '';
                            if (row.terminal_no && row.terminal_no.trim()) {
                                terminal_no = row.terminal_no.trim();
                            }
                            console.log('02');

                            // SQL query to insert data
                            const travelQuery = `
                                INSERT INTO tbl_travel_details
                                (event_id, user_id, direction, flight_no, flight_name, origin, destination, 
                                departure_date, departure_time, arrival_date, arrival_time, flight_ticket_path, 
                                boarding_pass_path, pnr_number, terminal_no, user_type, added_by, status, is_delete) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `;
                            // console.log(travelQuery);

                            // const values = [data.event_id, row.id, direction, flight_no, flight_name, origin, destination, dep_date, dep_time, 
                            //     arr_date, arr_time, '', '', pnr_number, terminal_no, data.user_type, data.added_by, 1, 0 ];
                            // console.log(values);

                            // Execute the query
                            dbCon.query(travelQuery, [data.event_id, row.id, direction, flight_no, flight_name, origin, destination, dep_date, dep_time, arr_date, arr_time, '', '', pnr_number, terminal_no, data.user_type, data.added_by, 1, 0 ], (err, results) => {
                                if (err) {
                                    // throw err;
                                    console.error('Error adding:', err);
                                    return res.status(500).json({ error: 'Error adding' });
                                }
                                console.log('Inserted travel data with ID:', results.insertId);
                            });
                            // console.log(row.id);
                            // const travelUserAddResults = await new Promise((resolve, reject) => {
                            //     dbCon.query(travelQuery, [data.event_id, row.id, direction, flight_no, flight_name, origin, destination, dep_date, dep_time, arr_date, arr_time, '-', '-', pnr_number, terminal_no, data.user_type, data.added_by, 1, 0 ], (err, results) => {
                            //         if (err) 
                            //             reject(err);
                            //         else resolve(results);
                            //     });
                            // });
                            // console.log('Inserted travel data with ID:', results.insertId);
                        }
                    }
                }
            } else {
                res.json({
                    success: 0,
                    message: "Data Row not found."
                });
            }

            // Respond with success
            res.json({ success: 1, message: 'File uploaded successfully.' });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

const importController = new importFile();
module.exports = importController;