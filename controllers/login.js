const { validationResult, check } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dbCon = require('../config/db');

/* generate api key */
function generateApiKey() {
    const randomString = crypto.randomBytes(16).toString('hex');
    return crypto.createHash('md5').update(randomString).digest('hex');
}

class login {
    /* check the app user login credentials */
    async login(req, res) {
        await check('email', 'Email is required').notEmpty().run(req);
        await check('password', 'Password is required').notEmpty().run(req);
        await check('login_type', 'Login Type is required').notEmpty().run(req);

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ success: 0, message: errors.array()[0].msg });
        }

        const { email, password, login_type } = req.body; // Make sure you have login_type in your request body

        try {
            // Check user existence
            const query = 'SELECT id, password FROM tbl_app_users WHERE email = ? AND is_delete = 0';
            dbCon.query(query, [email], async (err, results) => {
                if (err) throw err;

                if (results.length === 0) {
                    return res.status(400).json({
                        success: 0,
                        message: "Hmm! We couldn't find your email address in our database. Please enter the same email address you used to register for the conference and make sure you typed it correctly. If you still have trouble, please contact your conference organizer."
                    });
                }

                const user = results[0];

                // Check if the password is correct
                const match = await bcrypt.compare(password, user.password);

                if (match) {
                  // Generate Auth Key for Future Authentication
                  const apiKey = generateApiKey();

                    // Prepare data to update user details
                    const inputArr = { api_key: apiKey };

                    if (req.body.app_version) inputArr["app_version"] = req.body.app_version;
                    if (req.body.app_platform) inputArr["app_platform"] = req.body.app_platform;
                    if (req.body.token) inputArr["token"] = req.body.token;

                    // Update user details
                    const updateQuery = 'UPDATE tbl_app_users SET ? WHERE id = ?';
                    dbCon.query(updateQuery, [inputArr, user.id], (updateErr, updateResults) => {
                        if (updateErr) throw updateErr;

                        // Get updated user data
                        const userDataQuery = 'SELECT * FROM tbl_app_users WHERE id = ?';
                        dbCon.query(userDataQuery, [user.id], (userDataErr, userDataResults) => {
                            if (userDataErr) throw userDataErr;

                            const userData = userDataResults[0];
                            delete userData.password; // Remove password from user data

                            res.status(200).json({
                                data: userData,
                                success: 1,
                                message: "Login successful."
                            });
                        });
                    });
                } else {
                    res.status(401).json({
                        success: 2,
                        message: "Wrong password. You can tap on 'Forgot Password' to reset."
                    });
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }

    };
}

const loginController = new login();
module.exports = loginController;
