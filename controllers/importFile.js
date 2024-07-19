const { validationResult, check } = require('express-validator');
const dbCon = require('../config/db');
const xlsx = require('xlsx');

/* get the faculty wise program */
async function searchFacultyWiseProgram(event_id, faculty_id, column_name) {
    const facultyQuery = `SELECT tbl_scientific_program_faculty_roles.faculty_id,tbl_scientific_program_faculty_roles.event_role_name, tbl_faculty_vault.f_name,tbl_faculty_vault.l_name,tbl_scientific_program.id as scientific_program_id,'tbl_scientific_program.session_type,tbl_scientific_program.session_name,tbl_scientific_program.from_time,tbl_scientific_program.to_time,tbl_scientific_program.event_id,tbl_scientific_program.hall_id,tbl_scientific_program.date,tbl_hall_master.hall_name,tbl_event_details.from_date as session_start_date,tbl_event_role_master.role_image as role_image
            FROM tbl_scientific_program_faculty_roles 
            JOIN tbl_scientific_program ON tbl_scientific_program_faculty_roles.scientific_program_id = tbl_scientific_program.id AND tbl_scientific_program.is_delete = 0 
            JOIN tbl_faculty_vault ON tbl_faculty_vault.id = tbl_scientific_program_faculty_roles.faculty_id AND tbl_faculty_vault.is_delete = 0 
            JOIN tbl_roles_by_event ON tbl_roles_by_event.event_id = tbl_scientific_program_faculty_roles.role_by_event_id AND role_by_event_id.is_delete = 0 
            JOIN tbl_event_role_master ON tbl_event_role_master.id = tbl_roles_by_event.event_role_id AND tbl_event_details.is_delete = 0
            JOIN tbl_hall_master ON tbl_hall_master.id = tbl_scientific_program.hall_id AND tbl_hall_master.is_delete = 0
            JOIN tbl_event_details ON tbl_event_details.event_id = tbl_scientific_program.event_id AND tbl_event_details.is_delete = 0
            WHERE tbl_scientific_program_faculty_roles.event_id = ? AND tbl_scientific_program_faculty_roles.faculty_id = ? AND faculty_id.is_delete = 0
        `;

        const speakerQuery = `SELECT 
                tbl_scientific_program_speakers.faculty_id as speaker_id,
                tbl_faculty_vault.f_name,
                tbl_faculty_vault.l_name,
                tbl_scientific_program.id as scientific_program_id,
                tbl_scientific_program.session_type,
                tbl_scientific_program.session_name,
                tbl_scientific_program.from_time,
                tbl_scientific_program.to_time,
                tbl_scientific_program.event_id,
                tbl_scientific_program.hall_id,
                tbl_scientific_program.date,
                tbl_hall_master.hall_name,
                tbl_scientific_program_topic.from_time as topic_from_time,
                tbl_scientific_program_topic.to_time as topic_to_time,
                tbl_scientific_program_topic.topic_name,
                tbl_event_details.from_date as session_start_date,
                MINUTE(TIMEDIFF(tbl_scientific_program_topic.to_time, tbl_scientific_program_topic.from_time)) as topic_duration
            FROM 
                tbl_scientific_program_speakers
            JOIN 
                tbl_scientific_program_topic ON tbl_scientific_program_topic.id = tbl_scientific_program_speakers.scientific_program_topic_id
                AND tbl_scientific_program_topic.is_delete = 0
            JOIN 
                tbl_scientific_program ON tbl_scientific_program.id = tbl_scientific_program_topic.scientific_program_id
                AND tbl_scientific_program.is_delete = 0
            JOIN 
                tbl_faculty_vault ON tbl_faculty_vault.id = tbl_scientific_program_speakers.faculty_id
                AND tbl_faculty_vault.is_delete = 0
            JOIN 
                tbl_hall_master ON tbl_hall_master.id = tbl_scientific_program.hall_id
                AND tbl_hall_master.is_delete = 0
            JOIN 
                tbl_event_details ON tbl_event_details.event_id = tbl_scientific_program.event_id
                AND tbl_event_details.is_delete = 0
            WHERE 
                tbl_scientific_program_speakers.faculty_id = ?
                AND tbl_scientific_program_speakers.event_id = ?
                AND tbl_scientific_program_speakers.is_delete = 0;
        `;

        const facultyResults = await new Promise((resolve, reject) => {
            dbCon.query(facultyQuery, [event_id, date], (err, results) => {
            if (err) reject(err);
            else resolve(results);
            });
        });

        const speakerResults = await new Promise((resolve, reject) => {
            dbCon.query(speakerQuery, [event_id, date], (err, results) => {
            if (err) reject(err);
            else resolve(results);
            });
        });

        if (facultyResults.length > 0 || speakerResults.length > 0) {
            let facultyArray = {};
            for (const value of facultyResults) {
                // let role_image_url = '';
                // if (value.role_image)
                //     role_image_url = asset(value.role_image);
                // else
                //     role_image_url = asset('Speaker.png');

                let dataList = {
                    // index: i++,
                    // event_id: value.event_id,
                    Date: value.date, // format: dd-mm-yyyy
                    Hall: value.hall_name,
                    hall_id: value.hall_id,
                    Time: new Date(`1970-01-01T${value.from_time}Z`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' to ' + new Date(`1970-01-01T${value.to_time}Z`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    Session: value.session_type + ' - ' + value.session_name,
                    session_type: value.session_type,
                    speaker_time: "",
                    Role: value.event_role_name,
                    Topic: '',
                    faculty_id: value.faculty_id,
                    from_time: new Date(`1970-01-01T${value.from_time}Z`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    hall_sort_time: new Date(value.date).toISOString().split('T')[0] + " " + new Date(`1970-01-01T${value.from_time}Z`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    topic_sort_time: new Date(value.date).toISOString().split('T')[0] + " " + new Date(`1970-01-01T${value.from_time}Z`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    session_start_date: value.session_start_date,
                    // RoleImage: value.role_image,
                    // RoleImageUrl: role_image_url
                };
                if (!facultyArray[row.faculty_id]) {
                    facultyArray[row.faculty_id] = [];
                }
                facultyArray[row.faculty_id].push(data);
            }
            
            let speakerArray = {};
            for (const row of speakerResults) {
                const fromDate = new Date(row.session_start_date);
                const toDate = new Date(row.date);
                const differenceMs = Math.abs(toDate - fromDate);
                let dayCount = Math.floor(differenceMs / (1000 * 60 * 60 * 24)) + 1;

                const data1 = {
                    // index: i++,
                    // event_id: value.event_id,
                    Date: value.date, // format: dd-mm-yyyy
                    Hall: value.hall_name,
                    hall_id: value.hall_id,
                    Time: new Date(`1970-01-01T${value.topic_from_time}Z`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' to ' + new Date(`1970-01-01T${value.topic_to_time}Z`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    Session: value.session_type + ' - ' + value.session_name,
                    session_type: value.session_type,
                    speaker_time: value.topic_duration,
                    Role: 'Speaker',
                    Topic: value.topic_name,
                    faculty_id: value.speaker_id,
                    from_time: new Date(`1970-01-01T${value.from_time}Z`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    hall_sort_time: new Date(value.date).toISOString().split('T')[0] + " " + new Date(`1970-01-01T${value.from_time}Z`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    topic_sort_time: new Date(value.date).toISOString().split('T')[0] + " " + new Date(`1970-01-01T${value.topic_from_time}Z`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    session_start_date: value.session_start_date,
                    // RoleImage: 'Speaker.png',
                    // RoleImageUrl: asset('Speaker.png')
                };
                if (!speakerArray[row.faculty_id]) {
                    speakerArray[row.faculty_id] = [];
                }
                speakerArray[row.faculty_id].push(data1);
            }
            
            /* merge speaker-faculty array */
            let speakerFacultyCombine = _.merge({}, facultyArray, speakerArray);
            
            let sortArray = [];
            for (const key in speakerFacultyCombine) {   
                if (speakerFacultyCombine.hasOwnProperty(key)) {
                    const value = speakerFacultyCombine[key];
                    value.sort((a, b) => {
                        const hallComparison = a.hall_id - b.hall_id;
                        const timeComparison = new Date(a.topic_sort_time) - new Date(b.topic_sort_time);
                        return hallComparison || timeComparison;
                    });
                    
                    sortArray.push({ name: value[0].faculty_name, faculty_id: value[0].faculty_id, facultyData: value });
                }
            }

            let dataList = [];
            let i = 1;
        } else {
            res.json({
                success: 0,
                message: "Event details not found."
            });            
        }

}
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

            if (excelData) {
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

            let validationArray = [];
            if (excelData) {
                for (const row of excelData) {
                    if(!row.flight_no || !row.flight_name || !row.origin || !row.destination || !row.id) {
                        validationArray.push(row);
                    } else {
                        const appUserQuery = `SELECT id FROM tbl_app_users where id = ? AND is_delete = 0`;
    
                        const appUserResults = await new Promise((resolve, reject) => {
                            dbCon.query(appUserQuery, [row.id], (err, results) => {
                                if (err) reject(err);
                                else resolve(results);
                            });
                        });
    
                        if (appUserResults.length > 0) {
                            const appUserId = appUserResults[0].id; // Access the id correctly
                            const travelUserQuery = `SELECT id FROM tbl_travel_details where event_id = ? AND user_id = ? AND is_delete = 0`;
    
                            const travelUserResults = await new Promise((resolve, reject) => {
                                dbCon.query(travelUserQuery, [data.event_id, appUserId], (err, results) => {
                                    if (err) reject(err);
                                    else resolve(results);
                                });
                            });
    
                            if (travelUserResults.length === 0) {
                                // console.log('travelUserResults.length === 0');
                                // Change From, To to 1 or 0
                                let direction = 0;
                                if (row.to_from && row.to_from.trim()) {
                                    if (row.to_from.trim().toLowerCase() === 'from') {
                                        direction = 1;
                                    }
                                }
    
                                // Error Handle for Blank
                                const flight_no = row.flight_no ? row.flight_no.trim() : '';
                                const flight_name = row.flight_name ? row.flight_name.trim() : '';
                                const origin = row.origin ? row.origin.trim() : '';
                                const destination = row.destination ? row.destination.trim() : '';
                                const dep_date = row.dep_date ? row.dep_date : '';
                                const dep_time = row.dep_time ? row.dep_time : '';
                                const arr_date = row.arr_date ? row.arr_date.trim() : '';
                                const arr_time = row.arr_time ? row.arr_time : '';
                                const pnr_number = row.pnr_number ? row.pnr_number.trim() : '';
    
                                let terminal_no = '';
                                if (row.terminal_no && row.terminal_no.trim()) {
                                    terminal_no = row.terminal_no.trim();
                                }
    
                                const travelQuery = `
                                    INSERT INTO tbl_travel_details
                                    (event_id, user_id, direction, flight_no, flight_name, pnr_number, terminal_no, origin, destination, 
                                    arrival_date, arrival_time, departure_date, departure_time,  flight_ticket_path, 
                                    boarding_pass_path, added_by_type, added_by, status, is_delete) 
                                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);
                                `;
                                // console.log(travelQuery);
    
                                const values = [data.event_id, appUserId, direction, flight_no, flight_name, pnr_number, terminal_no, origin, destination, arr_date, arr_time, dep_date, dep_time, '-', '-', data.user_type, data.added_by, 1, 0];
                                // console.log(values);
    
                                const travelUserAddResults = await new Promise((resolve, reject) => {
                                    dbCon.query(travelQuery, values, (err, results) => {
                                        if (err) {
                                            // throw err;
                                            console.error('Error adding:', err);
                                            return res.status(500).json({ error: 'Error adding' });
                                        }
    
                                        else resolve(results);
                                    });
                                });
    
                                console.log('Inserted travel data with ID:', travelUserAddResults.insertId);
                            }
                            // Respond with success
                        }
                    }

                }
                if (validationArray && validationArray.length > 0) {
                    const resData = { data: validationArray };
                    res.json({ success: 1, message: 'File uploaded successfully.', ...resData });
                } else {
                    res.json({ success: 1, message: 'File uploaded successfully.' });
                }
                
            } else {
                res.json({
                    success: 0,
                    message: "Data Row not found."
                });
            }
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async sentRoleEmailToSingleUser(req, res) {
        await check['faculty_id', 'Faculty Id is required'].notEmpty.run(req);
        await check['event_id', 'Event Id is required'].notEmpty.run(req);
        await check['subject', 'Subject is required'].notEmpty.run(req);
        await check['salutation', 'Salutation is required'].notEmpty.run(req);
        await check['body', 'Body is required'].notEmpty.run(req);
        await check['footer', 'Footer is required'].notEmpty.run(req);
        await check['name', 'Name is required'].notEmpty.run(req);
        await check['email', 'Email is required'].notEmpty.run(req);
        await check['is_confirmation_sent', 'Is Confirmation Sent is required'].notEmpty.run(req);
        await check['user_type', 'User Type is required'].notEmpty.run(req);
        await check['added_by', 'Added by is required'].notEmpty.run(req);
        await check['column_name', 'column name is required'].notEmpty.run(req);

        const errors = validationResult(req);
        if(!errors.isEmpty()) {
            return res.status(200).json({ success: 0, message: errors.array()[0].msg });
        }

        try {
            const {faculty_id, event_id,subject,salutation,body,footer,name,email,is_confirmation_sent,user_type,added_by,column_name } = req.body;

            const eventQuery = `SELECT email_display_name,reply_to_email,event_email_header,event_email_footer,cc_to_email FROM tbl_event_details where event_id = ? AND is_delete = 0`;
    
            const eventResults = await new Promise((resolve, reject) => {
                dbCon.query(eventQuery, [event_id], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            const facultyQuery = `SELECT * FROM tbl_faculty_vault where event_id = ? AND ID = ? AND is_delete = 0`;
    
            const facultyResults = await new Promise((resolve, reject) => {
                dbCon.query(eventQuery, [event_id,faculty_id], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            if (facultyResults.length > 0) {
                const facultyRoleData = await searchFacultyWiseProgram(event_id,faculty_id,column_name);
                
                let pdf = '';
                if(column_name) {
                    if (condition) {
                        
                    }
                }
            } else {
                res.json({
                    success: 0,
                    message: "Data Row not found."
                });
            }
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }


    }
}

const importController = new importFile();
module.exports = importController;