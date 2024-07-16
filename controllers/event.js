const { validationResult, check } = require('express-validator');
const dbCon = require('../config/db');
const { promise } = require('bcrypt/promises');
// const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pdf = require('html-pdf');
const Handlebars = require('handlebars');
const _ = require('lodash');
const Excel = require('exceljs');
const moment = require('moment');
require('dotenv').config(); // To load environment variables from .env file

/* format the date time */
function formatDateToDMYWithTime(dateString) {
    // Create a Date object from the date string
    const date = new Date(dateString);

    // Extract the date components
    const day = date.getDate();
    const month = date.getMonth() + 1; // Months are zero-based, so add 1
    const year = date.getFullYear();

    // Extract the time components
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    // Pad day, month, hours, and minutes with leading zeros if necessary
    const formattedDay = day < 10 ? '0' + day : day;
    const formattedMonth = month < 10 ? '0' + month : month;
    const formattedHours = hours < 10 ? '0' + hours : hours;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;

    // Combine the components into a string in d-m-Y h:i A format
    return `${formattedDay}-${formattedMonth}-${year} ${formattedHours}:${formattedMinutes} ${ampm}`;
}

/* format the date */
function formatDateToDMY(dateString) {
    // Create a Date object from the date string
    const date = new Date(dateString);

    // Extract the date components
    const day = date.getDate();
    const month = date.getMonth() + 1; // Months are zero-based, so add 1
    const year = date.getFullYear();

    // Pad day, month, hours, and minutes with leading zeros if necessary
    const formattedDay = day < 10 ? '0' + day : day;
    const formattedMonth = month < 10 ? '0' + month : month;

    // Combine the components into a string in d-m-Y h:i A format
    return `${formattedDay}-${formattedMonth}-${year}`;
}

/* format the time */
function formatTime(timeString) {
    // Split the time string into hours and minutes
    let [hours, minutes] = timeString.split(':').map(Number);
    // console.log(hours);
    // console.log(minutes);

    // Determine AM or PM
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert 24-hour format to 12-hour format
    hours = hours % 12;
    // console.log(hours);
    hours = hours ? hours : 12; // the hour '0' should be '12'
    // console.log(hours);

    // Pad hours and minutes with leading zeros if necessary
    const formattedHours = hours < 10 ? '0' + hours : hours;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    // console.log(formattedHours, formattedMinutes);

    // Combine the components into a string in H:i AM/PM format
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

/* get scientific program overview data */
async function getScientificProgramForAllProgramOverviewPdf(event_id, date, hall_id) {
    const programQuery = `
        SELECT * FROM tbl_scientific_program 
        WHERE event_id = ? 
        AND date = ?
        AND hall_id = ?
        AND is_delete = 0 
        ORDER BY from_time ASC`;

    const eventResults = await new Promise((resolve, reject) => {
        dbCon.query(programQuery, [event_id, date, hall_id], (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });

    const scientificProgramArray = [];
    for (const row of eventResults) {
        const data = {
            scientific_program_id: row.id,
            event_id: row.event_id,
            hall_id: row.hall_id,
            from_time: formatTime(row.from_time),
            to_time: formatTime(row.to_time),
            session_type: row.session_type,
            session_name: row.session_name,
            faculty_data: await getAllFacultyData(row.id, row.event_id, row.hall_id, row.date),
            topic_data: await getAllTopicDataPdf(row.id, row.event_id, row.hall_id, row.date),
        };
        scientificProgramArray.push(data);
    }

    return scientificProgramArray;
}

/* get Faculty Data */
async function getAllFacultyData(id, event_id, hall_id, date) {
    try {
        const facultyQuery = `
                        SELECT 
                            tbl_scientific_program_faculty_roles.event_role_name,
                            tbl_scientific_program_faculty_roles.role_by_event_id,
                            tbl_faculty_vault.id as faculty_id,
                            tbl_faculty_vault.f_name,
                            tbl_faculty_vault.l_name
                        FROM 
                            tbl_scientific_program_faculty_roles
                        JOIN 
                            tbl_faculty_vault 
                        ON 
                            tbl_faculty_vault.id = tbl_scientific_program_faculty_roles.faculty_id
                        WHERE 
                            tbl_scientific_program_faculty_roles.scientific_program_id = ? 
                            AND tbl_scientific_program_faculty_roles.event_id = ? 
                            AND tbl_scientific_program_faculty_roles.hall_id = ? 
                            AND tbl_scientific_program_faculty_roles.date = ? 
                            AND tbl_scientific_program_faculty_roles.is_delete = 0 
                            AND tbl_faculty_vault.is_delete = 0
                        ORDER BY 
                            tbl_scientific_program_faculty_roles.role_by_event_id ASC
                    `;
        // console.log(date);

        // const formattedDate = date.split('T')[0];

        const facultyResults = await new Promise((resolve, reject) => {
            dbCon.query(facultyQuery, [id, event_id, hall_id, date], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        const facultyArr = {};
        facultyResults.forEach(value => {
            const fullName = `${value.f_name} ${value.l_name}`;
            if (!facultyArr[value.event_role_name]) {
                facultyArr[value.event_role_name] = [];
            }
            facultyArr[value.event_role_name].push(fullName);
        });

        return facultyArr;
    } catch (error) {
        console.error("Error fetching faculty data:", error);
        throw error;
    }
}

/* get Faculty Data */
async function getAllTopicDataPdf(id, event_id, hall_id, date) {
    const topicQuery = `
                        SELECT tbl_scientific_program_topic.*,
                                MINUTE(TIMEDIFF(tbl_scientific_program_topic.to_time, tbl_scientific_program_topic.from_time)) as topic_duration 
                        FROM                          
                            tbl_scientific_program_topic
                        WHERE 
                            tbl_scientific_program_topic.scientific_program_id = ? 
                            AND tbl_scientific_program_topic.event_id = ? 
                            AND tbl_scientific_program_topic.hall_id = ? 
                            AND tbl_scientific_program_topic.date = ? 
                            AND tbl_scientific_program_topic.is_delete = 0 
                        ORDER BY tbl_scientific_program_topic.from_time ASC
                    `;
    try {
        // Properly format the date
        // const formattedDate = new Date(date).toISOString().split('T')[0];

        const topicResults = await new Promise((resolve, reject) => {
            dbCon.query(topicQuery, [id, event_id, hall_id, date], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        // console.log(topicResults);
        const topicArray = [];
        for (const key of topicResults) {
            const dataList = {
                topic_id: key.id,
                topic_name: key.topic_name,
                topic_from_time: new Date(`1970-01-01T${key.from_time}Z`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                topic_to_time: new Date(`1970-01-01T${key.to_time}Z`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                topic_duration: `${key.topic_duration} min`,
                topic_speaker_data: await getTopicSpeakerData(key.id, key.event_id, key.hall_id)
            };
            topicArray.push(dataList);
        }
        return topicArray;
    } catch (error) {
        console.error("Error fetching faculty data:", error);
        throw error;
    }
}

// Function to get topic speaker data
async function getTopicSpeakerData(topic_id, event_id, hall_id) {
    const topicSpeakerQuery = `
                SELECT 
                    tbl_faculty_vault.f_name, tbl_faculty_vault.l_name, tbl_faculty_vault.id, tbl_scientific_program_speakers.faculty_id as speaker_id
                FROM 
                    tbl_scientific_program_speakers
                JOIN 
                    tbl_faculty_vault 
                ON 
                    tbl_faculty_vault.id = tbl_scientific_program_speakers.faculty_id
                WHERE 
                    tbl_scientific_program_speakers.scientific_program_topic_id = ? 
                    AND tbl_scientific_program_speakers.event_id = ? 
                    AND tbl_scientific_program_speakers.hall_id = ?
                    AND tbl_scientific_program_speakers.is_delete = 0 
                    AND tbl_faculty_vault.is_delete = 0
            `;

    try {
        const topicSpeakerResults = await new Promise((resolve, reject) => {
            dbCon.query(topicSpeakerQuery, [topic_id, event_id, hall_id], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        return topicSpeakerResults;
    } catch (error) {
        console.error("Error fetching faculty data:", error);
        throw error;
    }
}

// Function to generate the PDF
function generatePDF(data, headerImage, footerImage, filePath) {
    const doc = new PDFDocument({ margin: 50 });

    // Pipe the document to a blob
    doc.pipe(fs.createWriteStream(filePath));

    // // Add header
    // if (headerImage) {
    //     doc.image(headerImage, 0, 0, { width: doc.page.width });
    //     doc.moveDown();
    // }

    // Add content
    data.forEach(item => {
        doc.addPage();
        
        // Day Info
        doc.fillColor('#fff')
           .rect(doc.x, doc.y, doc.page.width - 100, 30)
           .fill('#475ffb')
           .fontSize(18)
           .text(`Day ${item.day} : ${item.date}`, { align: 'left' })
           .moveDown();

        doc.text(`${item.hall_name}`, { align: 'right' });
        
        const sessionArr = item.scientific_program_data;
        if (sessionArr && sessionArr.length) {
            sessionArr.forEach(session => {
                // Session Background
                doc.fillColor('#000')
                   .rect(doc.x, doc.y, doc.page.width - 100, 25)
                   .fill('#cbd5ff')
                   .fontSize(15)
                   .text(`${session.from_time} - ${session.to_time} : ${session.session_name}`, { align: 'left' })
                   .moveDown();

                const facultyArr = session.faculty_data;
                if (facultyArr && facultyArr.length) {
                    facultyArr.forEach((fac_data, key) => {
                        doc.fillColor('#201515')
                           .rect(doc.x, doc.y, doc.page.width - 100, 20)
                           .fill('#f5f0ea')
                           .text(`${key} : ${fac_data.join(', ')}`, { align: 'left' })
                           .moveDown();
                    });
                }

                const topicData = session.topic_data;
                if (topicData && topicData.length) {
                    doc.fillColor('#ff6500')
                       .text('Topic Details', { align: 'left' })
                       .moveDown();

                    topicData.forEach(topic => {
                        doc.fillColor('#000')
                           .fontSize(14)
                           .text(`${topic.topic_from_time} - ${topic.topic_to_time}`, { align: 'left' })
                           .text(topic.topic_name, { align: 'left' })
                           .text(`${topic.topic_speaker_data.map(s => `${s.f_name} ${s.l_name}`).join(', ') || 'TBD'}`, { align: 'left' })
                           .text(topic.topic_duration, { align: 'left' })
                           .moveDown();
                    });
                }
            });
        }
    });

    // // Add footer
    // if (footerImage) {
    //     doc.image(footerImage, 0, doc.page.height - 100, { width: doc.page.width });
    // }

    // Finalize the PDF and end the stream
    doc.end();
}

// Function to generate the PDF
function generateHtmlPDF(data, headerImage, footerImage, outputFilePath, callback) {
    // Read the HTML template
    const htmlTemplate = fs.readFileSync(path.join(__dirname, '../views/template.html'), 'utf8');

    // Compile the Handlebars template
    const template = Handlebars.compile(htmlTemplate);

    const html = template({ outDataArray: data, header: headerImage, footer: footerImage });

    const options = {
        format: 'Letter',
        border: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
        }
    };

    pdf.create(html, options).toFile(outputFilePath, (err, res) => {
        if (err) return console.log(err);
        // console.log(res);
        callback(null, res);
    });
}

class event {
    /* get past events */
    async getPastEvents(req, res) {
        const pageNo = req.page_no || 1;
        // console.log(pageNo);
        const limit = parseInt(req.limit) || 10;
        const offset = (pageNo - 1) * limit;
        const userId = req.header('Userid');

        try {
            const eventQuery = `
                SELECT * FROM tbl_event_details 
                WHERE to_date < CURDATE() 
                AND is_delete = 0 
                AND show_in_app = 1 
                ORDER BY from_date DESC 
                LIMIT ? OFFSET ?
            `;

            const eventResults = await new Promise((resolve, reject) => {
                dbCon.query(eventQuery, [limit, offset], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            if (eventResults.length === 0) {
                return res.status(404).json({
                    success: 0,
                    message: "No Past Events found."
                });
            }

            const eventArr = [];

            for (const row of eventResults) {
                const checkRegistrationQuery = `
                    SELECT id FROM tbl_events_transactions 
                    WHERE event_id = ?
                    AND user_id = ? 
                    AND is_delete = 0
                `;

                const regResults = await new Promise((resolve, reject) => {
                    dbCon.query(checkRegistrationQuery, [row.event_id, userId], (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    });
                });

                const is_registered = regResults.length > 0 ? 1 : 0;
                const event = {
                    id: row.id,
                    event_id: row.event_id,
                    conference_name: row.conference_name,
                    from_date: row.from_date,
                    to_date: row.to_date,
                    venue: row.venue,
                    address: row.address,
                    location_link: row.location_link,
                    event_logo: row.event_logo,
                    event_banner: row.event_banner,
                    main_banner: row.main_banner,
                    theme_color: row.theme_color,
                    event_email_header: row.event_email_header,
                    event_email_footer: row.event_email_footer,
                    email_display_name: row.email_display_name,
                    send_mail_email: row.send_mail_email,
                    reply_to_email: row.reply_to_email,
                    cc_to_email: row.cc_to_email,
                    added_by_type: row.added_by_type,
                    added_by: row.added_by,
                    status: row.status,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    is_registered,
                    video_link: row.video_link,
                    cust_button_text: row.cust_button_text,
                    cust_button_link: row.cust_button_link,
                    cust_button_colour: row.cust_button_colour
                };
                eventArr.push(event);
            }

            res.status(200).json({
                data: eventArr,
                success: 1,
                message: "List retrieved successfully."
            });
        } catch (error) {
            res.status(500).json({
                success: 0,
                message: "Internal server error",
                error: error.message
            });
        }
    }

    /* get dashboard list */
    async dashboardList(req, res) {
        let eventArr = [];
        let onGoingArr = [];
        let upComingArr = [];

        const userId = req.header('Userid');
        if (!userId) {
            return res.status(400).json({
                success: 0,
                message: "User ID is missing"
            });
        }

        try {
            // Getting On Going List
            const onGoingQuery = `
                SELECT * FROM tbl_event_details 
                WHERE from_date <= CURDATE() 
                AND to_date >= CURDATE() 
                AND is_delete = 0 
                AND show_in_app = 1 
                ORDER BY from_date ASC
            `;

            const onGoingResults = await new Promise((resolve, reject) => {
                dbCon.query(onGoingQuery, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            for (const row of onGoingResults) {
                let facultyId = 0;
                const facultyQuery = `
                    SELECT tbl_faculty_vault.id as faculty_id FROM tbl_app_users 
                    JOIN tbl_faculty_vault ON tbl_faculty_vault.email = tbl_app_users.email 
                    WHERE tbl_app_users.id = ? 
                    AND tbl_app_users.is_delete = 0 
                    AND tbl_faculty_vault.is_delete = 0 
                    AND tbl_faculty_vault.event_id = ?
                `;

                const facultyResult = await new Promise((resolve, reject) => {
                    dbCon.query(facultyQuery, [userId, row.event_id], (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    });
                });

                if (facultyResult.length > 0) {
                    facultyId = facultyResult[0].faculty_id;
                }

                const checkRegistrationQuery = `
                    SELECT id FROM tbl_event_transactions 
                    WHERE event_id = ? 
                    AND user_id = ? 
                    AND status = 'Paid' 
                    AND is_delete = 0
                `;

                const regResults = await new Promise((resolve, reject) => {
                    dbCon.query(checkRegistrationQuery, [row.event_id, userId], (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    });
                });

                const is_registered = regResults.length > 0 ? 1 : 0;
                const event = {
                    id: row.id,
                    event_id: row.event_id,
                    conference_name: row.conference_name,
                    from_date: formatDateToDMY(row.from_date),
                    to_date: formatDateToDMY(row.to_date),
                    venue: row.venue,
                    address: row.address,
                    location_link: row.location_link,
                    event_logo: row.event_logo,
                    event_banner: row.event_banner,
                    main_banner: row.main_banner,
                    theme_color: row.theme_color,
                    event_email_header: row.event_email_header,
                    event_email_footer: row.event_email_footer,
                    email_display_name: row.email_display_name,
                    send_mail_email: row.send_mail_email,
                    reply_to_email: row.reply_to_email,
                    cc_to_email: row.cc_to_email,
                    added_by_type: row.added_by_type,
                    added_by: row.added_by,
                    status: row.status,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    is_registered,
                    flag: 'LIVE',
                    faculty_id: facultyId,
                    video_link: row.video_link,
                    cust_button_text: row.cust_button_text,
                    cust_button_link: row.cust_button_link,
                    cust_button_colour: row.cust_button_colour
                };
                onGoingArr.push(event);
            }

            // Getting Up Coming List
            const upComingQuery = `
                SELECT * FROM tbl_event_details 
                WHERE from_date > CURDATE() 
                AND is_delete = 0 
                AND show_in_app = 1 
                ORDER BY from_date ASC
            `;

            const upComingResults = await new Promise((resolve, reject) => {
                dbCon.query(upComingQuery, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            for (const row of upComingResults) {
                let facultyId = 0;
                const facultyQuery = `
                    SELECT tbl_faculty_vault.id as faculty_id FROM tbl_app_users 
                    JOIN tbl_faculty_vault ON tbl_faculty_vault.email = tbl_app_users.email 
                    WHERE tbl_app_users.id = ? 
                    AND tbl_app_users.is_delete = 0 
                    AND tbl_faculty_vault.is_delete = 0 
                    AND tbl_faculty_vault.event_id = ?
                `;

                const facultyResult = await new Promise((resolve, reject) => {
                    dbCon.query(facultyQuery, [userId, row.event_id], (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    });
                });

                if (facultyResult.length > 0) {
                    facultyId = facultyResult[0].faculty_id;
                }

                const checkRegistrationQuery = `
                    SELECT id FROM tbl_event_transactions 
                    WHERE event_id = ? 
                    AND user_id = ? 
                    AND status = 'Paid' 
                    AND is_delete = 0
                `;

                const regResults = await new Promise((resolve, reject) => {
                    dbCon.query(checkRegistrationQuery, [row.event_id, userId], (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    });
                });

                const is_registered = regResults.length > 0 ? 1 : 0;
                const event = {
                    id: row.id,
                    event_id: row.event_id,
                    conference_name: row.conference_name,
                    from_date: formatDateToDMY(row.from_date),
                    to_date: formatDateToDMY(row.to_date),
                    venue: row.venue,
                    address: row.address,
                    location_link: row.location_link,
                    event_logo: row.event_logo,
                    event_banner: row.event_banner,
                    main_banner: row.main_banner,
                    theme_color: row.theme_color,
                    event_email_header: row.event_email_header,
                    event_email_footer: row.event_email_footer,
                    email_display_name: row.email_display_name,
                    send_mail_email: row.send_mail_email,
                    reply_to_email: row.reply_to_email,
                    cc_to_email: row.cc_to_email,
                    added_by_type: row.added_by_type,
                    added_by: row.added_by,
                    status: row.status,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    is_registered,
                    flag: 'upcoming',
                    faculty_id: facultyId,
                    video_link: row.video_link,
                    cust_button_text: row.cust_button_text,
                    cust_button_link: row.cust_button_link,
                    cust_button_colour: row.cust_button_colour
                };
                upComingArr.push(event);
            }

            // Merging Array
            eventArr = onGoingArr.concat(upComingArr);

            if (eventArr.length > 0) {
                res.status(200).json({
                    data: eventArr,
                    success: 1,
                    message: "List retrieved successfully."
                });
            } else {
                res.status(404).json({
                    success: 0,
                    message: "Upcoming Events will be added soon."
                });
            }
        } catch (error) {
            res.status(500).json({
                success: 0,
                message: "Internal server error",
                error: error.message
            });
        }
    }

    /* get dashboard list */
    async getScheduleListByEventId(req, res) {
        await check('event_id', 'Event Id required').notEmpty().run(req);
        await check('date', 'Date is required').notEmpty().run(req);
        await check('hall_id', 'Hall Id is required').notEmpty().run(req);

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ success: 0, message: errors.array()[0].msg });
        }

        try {
            const { event_id, date, hall_id } = req.body;

            const scheduleQuery = `
                SELECT * FROM tbl_scientific_program 
                WHERE event_id = ? 
                AND date = ? 
                AND hall_id = ? 
                AND is_delete = 0 
                ORDER BY from_time ASC
            `;

            const scheduleResults = await new Promise((resolve, reject) => {
                dbCon.query(scheduleQuery, [event_id, date, hall_id], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            if (scheduleResults.length > 0) {
                const scheduleListArr = await Promise.all(scheduleResults.map(async (row) => {
                    // Fetch hall name
                    const hallQuery = 'SELECT hall_name FROM tbl_hall_master WHERE id = ? AND is_delete = 0';
                    const hallResult = await new Promise((resolve, reject) => {
                        dbCon.query(hallQuery, [row.hall_id], (err, results) => {
                            if (err) reject(err);
                            else resolve(results);
                        });
                    });
                    const hall_name = hallResult[0] ? hallResult[0].hall_name : '';

                    // Fetch topics list
                    const topicsQuery = `
                        SELECT id, topic_name 
                        FROM tbl_scientific_program_topic 
                        WHERE event_id = ? 
                        AND scientific_program_id = ? 
                        AND is_delete = 0 
                        ORDER BY from_time ASC
                    `;
                    const topicsResults = await new Promise((resolve, reject) => {
                        dbCon.query(topicsQuery, [event_id, row.id], (err, results) => {
                            if (err) reject(err);
                            else resolve(results);
                        });
                    });

                    // Check if program is in the user's diary
                    const diaryQuery = `
                        SELECT COUNT(*) as count 
                        FROM tbl_my_diary 
                        WHERE event_id = ? 
                        AND user_id = ? 
                        AND scientific_program_id = ? 
                        AND is_delete = 0
                    `;
                    const diaryResult = await new Promise((resolve, reject) => {
                        dbCon.query(diaryQuery, [event_id, req.headers.Userid, row.id], (err, results) => {
                            if (err) reject(err);
                            else resolve(results);
                        });
                    });
                    const isFav = diaryResult[0].count > 0;

                    return {
                        id: row.id,
                        event_id: row.event_id,
                        hall_id: row.hall_id,
                        hall_name: hall_name,
                        date: formatDateToDMY(row.date),
                        from_time: formatTime(row.from_time),
                        to_time: formatTime(row.to_time),
                        session_type: row.session_type,
                        session_name: row.session_name,
                        session_condition: row.session_condition,
                        delayed_by: row.delayed_by,
                        added_by_type: row.added_by_type,
                        added_by: row.added_by,
                        status: row.status,
                        created_at: formatDateToDMYWithTime(row.created_at),
                        updated_at: formatDateToDMYWithTime(row.updated_at),
                        topics_list: topicsResults,
                        is_fav: isFav
                    };
                }));

                res.json({
                    data: scheduleListArr,
                    success: 1,
                    message: "Schedule list retrieved successfully."
                });
            } else {
                res.json({
                    success: 0,
                    message: "Scientific Program will be updated soon."
                });
            }
        } catch (error) {
            res.status(500).json({
                success: 0,
                message: "Internal server error",
                error: error.message
            });
        }

    }

    /* Download session pdf */
    async downloadSessionPdf(req, res) {
        await check('event_id', 'Event Id required').notEmpty().run(req);

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ success: 0, message: errors.array()[0].msg });
        }

        try {
            const { event_id } = req.body;

            const eventDetailQuery = `SELECT tbl_hall_master.hall_date, tbl_hall_master.hall_name, tbl_hall_master.id AS hall_id, tbl_event_details.from_date, 
                                        tbl_event_details.to_date, tbl_event_details.event_id, tbl_event_details.event_email_header, tbl_event_details.event_email_footer, tbl_event_details.conference_name 
                                        FROM tbl_event_details LEFT JOIN tbl_hall_master ON tbl_hall_master.event_id = tbl_event_details.event_id AND 
                                        tbl_hall_master.is_delete = 0 WHERE tbl_event_details.event_id = ? AND tbl_event_details.is_delete = 0 ORDER BY 
                                        tbl_hall_master.hall_date, tbl_hall_master.id`;

            const eventDetailResults = await new Promise((resolve, reject) => {
                dbCon.query(eventDetailQuery, [event_id], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });
            // console.log(eventDetailResults);

            if (eventDetailResults.length > 0) {
                const eventArr = [];
                let i = 0;

                for (const row of eventDetailResults) {
                    if (row.hall_name) {
                        const fromDate = new Date(row.from_date);
                        const toDate = new Date(row.hall_date);
                        // console.log(fromDate);
                        // console.log(toDate);
                        // Calculate the difference in milliseconds
                        const differenceMs = Math.abs(toDate - fromDate);
                        // console.log(differenceMs);
                        // Convert milliseconds to days
                        let dayCount = Math.floor(differenceMs / (1000 * 60 * 60 * 24));
                        // console.log(dayCount);

                        const event = {
                            index: ++i,
                            day: ++dayCount,
                            date: formatDateToDMY(row.hall_date),
                            hall_id: row.hall_id,
                            hall_name: row.hall_name,
                            scientific_program_data: await getScientificProgramForAllProgramOverviewPdf(row.event_id, row.hall_date, row.hall_id),
                        };
                        eventArr.push(event);
                    }
                }

                if (eventArr.length > 0) { 
                    const eventDetailsQuery = `
                        SELECT 
                            event_email_header, event_email_footer, conference_name
                        FROM 
                            tbl_event_details
                        WHERE 
                            event_id = ? AND is_delete = 0
                    `;
                  
                    const eventDetailsResults = await new Promise((resolve, reject) => {
                        dbCon.query(eventDetailsQuery, [event_id], (err, results) => {
                            if (err) reject(err);
                            else resolve(results);
                        });
                    });

                    // const filePath = `public/pdf/session_schedule_1.pdf`;
                    const fileName = `session_schedule_1.pdf`;
                    const filePath = path.join(__dirname, '../public/pdf', fileName);
                    const fileUrl = `${process.env.BASE_URL}/public/pdf/${fileName}`;

                    generateHtmlPDF(eventArr, eventDetailsResults.event_email_header, eventDetailsResults.event_email_footer, filePath , (err, result) => {
                        if (err) {
                            res.status(500).json({ error: 'Error generating PDF' });
                        } else {
                            // res.status(200).json({ fileName: path.basename(outputFilePath) });
                            res.json({
                                success: 1,
                                message: "Pdf create successfully.",
                                // data: path.basename(filePath),
                                // data: result.filename,
                                data: fileUrl,
                            });
                        }
                    });

                }
                else {
                    res.json({
                        success: 0,
                        message: "Data not found."
                    });
                }
            } else {
                res.json({
                    success: 0,
                    message: "Event details not found."
                });
            }
        } catch (error) {
            res.status(500).json({
                success: 0,
                message: "Internal server error",
                error: error.message
            });
        }
    }

    /* download excel for day wise report */
    async dowloadExcelForDayWiseReport(req, res) {
        await check('event_id', 'Event Id required').notEmpty().run(req);
        await check('date', 'Event Id required').notEmpty().run(req);

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ success: 0, message: errors.array()[0].msg });
        }
        try {             
            const { event_id, date } = req.body;
    
            const facultyQuery = `SELECT tbl_scientific_program.id, tbl_scientific_program.event_id, tbl_scientific_program.date, tbl_scientific_program.from_time, tbl_scientific_program.to_time, tbl_scientific_program.session_type, 
                            tbl_scientific_program.session_name, tbl_scientific_program.hall_id, tbl_hall_master.hall_name, tbl_faculty_vault.f_name, tbl_faculty_vault.l_name, tbl_faculty_vault.id as faculty_vault_id, 
                            tbl_scientific_program_faculty_roles.event_role_name, tbl_scientific_program_faculty_roles.faculty_id, tbl_scientific_program_faculty_roles.role_by_event_id, tbl_event_details.from_date as session_start_date
                            FROM tbl_scientific_program JOIN tbl_scientific_program_faculty_roles ON tbl_scientific_program_faculty_roles.scientific_program_id = tbl_scientific_program.id AND 
                            tbl_scientific_program_faculty_roles.is_delete = 0 JOIN tbl_faculty_vault ON tbl_faculty_vault.id = tbl_scientific_program_faculty_roles.faculty_id AND 
                            tbl_faculty_vault.is_delete = 0 JOIN tbl_event_details ON tbl_event_details.event_id = tbl_scientific_program.event_id AND tbl_event_details.is_delete = 0
                            JOIN tbl_hall_master ON tbl_hall_master.id = tbl_scientific_program.hall_id AND tbl_hall_master.is_delete = 0
                            WHERE tbl_scientific_program.event_id = ? AND tbl_scientific_program.date = ? AND tbl_scientific_program.is_delete = 0`;
    
            const speakerQuery = `SELECT tbl_scientific_program.id, tbl_scientific_program.event_id, tbl_scientific_program.date, tbl_scientific_program.from_time,tbl_scientific_program.to_time, tbl_scientific_program.session_type, tbl_scientific_program.session_name, tbl_scientific_program.hall_id,tbl_hall_master.hall_name, tbl_faculty_vault.f_name,tbl_faculty_vault.l_name,tbl_faculty_vault.id as faculty_vault_id,tbl_scientific_program_topic.topic_name,tbl_scientific_program_topic.id as topic_id,tbl_scientific_program_topic.from_time as topic_f_time,tbl_scientific_program_topic.to_time as topic_t_time,tbl_event_details.from_date as session_start_date
                            FROM tbl_scientific_program JOIN tbl_scientific_program_speakers ON tbl_scientific_program_speakers.scientific_program_id = tbl_scientific_program.id AND tbl_scientific_program_speakers.is_delete = 0 
                            JOIN tbl_scientific_program_topic ON tbl_scientific_program_topic.id = tbl_scientific_program_speakers.scientific_program_topic_id AND tbl_scientific_program_topic.is_delete = 0
                            JOIN tbl_faculty_vault ON tbl_faculty_vault.id = tbl_scientific_program_speakers.faculty_id AND tbl_faculty_vault.is_delete = 0 
                            JOIN tbl_event_details ON tbl_event_details.event_id = tbl_scientific_program.event_id AND tbl_event_details.is_delete = 0
                            JOIN tbl_hall_master ON tbl_hall_master.id = tbl_scientific_program.hall_id AND tbl_hall_master.is_delete = 0
                            WHERE tbl_scientific_program.event_id = ? AND tbl_scientific_program.date = ? AND tbl_scientific_program.is_delete = 0`;
    
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
                for (const row of facultyResults) { 
                    const fromDate = new Date(row.session_start_date);
                    const toDate = new Date(row.date);
                    const differenceMs = Math.abs(toDate - fromDate);
                    let dayCount = Math.floor(differenceMs / (1000 * 60 * 60 * 24)) + 1;
    
                    const data = {
                        event_id: row.event_id,
                        hall_id: row.hall_id,
                        faculty_name: `${row.f_name} ${row.l_name}`,
                        day_hall_time:  `Day ${dayCount} - ${row.hall_name} - ${row.from_time} - ${row.to_time}`,
                        session_type: row.session_type,
                        session_name: row.session_name,
                        faculty_id: row.faculty_vault_id,
                        topic: '',
                        role: row.event_role_name,
                        from_time: row.from_time,
                        topic_sort_time: `${row.date} ${row.from_time}`,
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
                        event_id: row.event_id,
                        hall_id: row.hall_id,
                        faculty_name: `${row.f_name} ${row.l_name}`,
                        day_hall_time:  `Day ${dayCount} - ${row.hall_name} - ${row.from_time} - ${row.to_time}`,
                        session_type: row.session_type,
                        session_name: row.session_name,
                        faculty_id: row.faculty_vault_id,
                        topic: row.topic_name,
                        role: 'Speaker',
                        from_time: row.from_time,
                        topic_sort_time: `${row.date} ${row.from_time}`,
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
                
                sortArray.forEach(value1 => {
                    if (value1.facultyData && value1.facultyData.length > 0) {
                            value1.facultyData.forEach((value, key) => {
                                let dataList1;
                                if (key === 0) {
                                    dataList1 = {
                                        sr_no: i,
                                        speaker_name: value1.name,
                                        day_hall_time: value.day_hall_time,
                                        session_type: value.session_type,
                                        session_name: value.session_name,
                                        topic: value.topic || '-',
                                        role: value.role
                                    };
                                    i++;
                                } else {
                                    dataList1 = {
                                        sr_no: '',
                                        speaker_name: '',
                                        day_hall_time: value.day_hall_time,
                                        session_type: value.session_type,
                                        session_name: value.session_name,
                                        topic: value.topic || '-',
                                        role: value.role
                                    };
                                }
                                dataList.push(dataList1);
                            });
                    }
                });

                // res.json({
                //     success: 1,
                //     message: "Data fetched successfully.",
                //     dataList: dataList
                // });
            
                if (dataList.length > 0) {
                    const date = moment().format('YYYYMMDDHHmmss');
                    // const fileName = `public/excel/day-wise-report-${date}.xlsx`;
                    const fileName = `day-wise-report-${date}.xlsx`;
                    const filePath = path.join(__dirname, '../public/excel', fileName);
                    const fileUrl = `${process.env.BASE_URL}/public/excel/${fileName}`;
                    // console.log('filePath- ', filePath);
                    // console.log('fileurl- ', fileUrl);
            
                    // Create a new Excel workbook and worksheet
                    let workbook = new Excel.Workbook();
                    let worksheet = workbook.addWorksheet('Day Wise Report');
            
                    // Add columns
                    worksheet.columns = [
                        { header: 'Sr. No', key: 'sr_no', width: 10 },
                        { header: 'Speaker Name', key: 'speaker_name', width: 30 },
                        { header: 'Day Hall Time', key: 'day_hall_time', width: 30 },
                        { header: 'Session Type', key: 'session_type', width: 20 },
                        { header: 'Session Name', key: 'session_name', width: 30 },
                        { header: 'Topic', key: 'topic', width: 30 },
                        { header: 'Role', key: 'role', width: 20 }
                    ];
            
                    // Add data to worksheet
                    worksheet.addRows(dataList);
            
                    await workbook.xlsx.writeFile(filePath);
                    // const filePath = `http://localhost:4000/public/excel/day-wise-report-${date}.xlsx`;
                    res.json({
                        data: fileUrl,
                        success: 1,
                        message: "Data fetched Successfully"
                    });
                 
                } else {
                    res.json({
                        success: 0,
                        message: "Data not found, Nothing to show"
                    });
                }
    
            } else {
                res.json({
                    success: 0,
                    message: "Event details not found."
                });            
            }
        } catch (error) {
            res.status(500).json({
                success: 0,
                message: "Internal server error",
                error: error.message
            });
        }

    }
}

const eventController = new event();
module.exports = eventController;
