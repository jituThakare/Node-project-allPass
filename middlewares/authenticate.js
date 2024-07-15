const dbCon = require('../config/db');

async function authenticate(req, res, next) {
    const apiKey = req.header('Apikey');
    const userId = req.header('Userid');

    if (!apiKey || !userId) {
        return res.status(400).json({
            success: 0,
            message: "API key or User ID is missing"
        });
    }

    try {
        // Check if the API key exists
        const apiKeyQuery = 'SELECT id FROM tbl_app_users WHERE api_key = ?';
        dbCon.query(apiKeyQuery, [apiKey], (apiKeyErr, apiKeyResults) => {
            if (apiKeyErr) throw apiKeyErr;

            if (apiKeyResults.length === 0) {
                return res.status(403).json({
                    success: 0,
                    message: "Access Denied. Invalid API key"
                });
            }

            // Check if the user exists
            const userIdQuery = 'SELECT id FROM tbl_app_users WHERE id = ?';
            dbCon.query(userIdQuery, [userId], (userIdErr, userIdResults) => {
                if (userIdErr) throw userIdErr;

                if (userIdResults.length === 0) {
                    return res.status(404).json({
                        success: 0,
                        message: "User does not exist"
                    });
                }

                // Check if the API key matches the user ID
                const authQuery = 'SELECT id FROM tbl_app_users WHERE api_key = ? AND id = ?';
                dbCon.query(authQuery, [apiKey, userId], (authErr, authResults) => {
                    if (authErr) throw authErr;

                    if (authResults.length === 0) {
                        return res.status(403).json({
                            success: 0,
                            message: "Access Denied. Invalid user"
                        });
                    }

                    // Proceed to the next middleware or route handler
                    next();
                });
            });
        });
    } catch (error) {
        res.status(500).json({
            success: 0,
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = authenticate;
