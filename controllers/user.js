const { validationResult, check } = require('express-validator');
const dbCon = require('../config/db');

class user {
    async getAppUserById(req, res) {
        try {
            const query = 'SELECT * FROM tbl_app_users WHERE id = ? AND is_delete = 0';
            dbCon.query(query, [req.header('Userid')], async (err, results) => {
                if (err) throw err;

                if (results.length === 0) {
                    return res.status(400).json({
                        success: 0,
                        message: "User not found."
                    });
                }

                const user = results[0];
                const imagePath = user.user_image ? `${req.protocol}://${req.get('host')}/${user.user_image}` : "";

                const appUser = {
                    id: user.id,
                    title: user.title,
                    f_name: user.f_name,
                    l_name: user.l_name,
                    country_code: user.country_code,
                    phone: user.phone,
                    email: user.email,
                    dob: user.dob,
                    user_image: user.user_image,
                    user_image_url: imagePath,
                    profession: user.profession,
                    country: user.country,
                    workplace_name: user.workplace_name,
                    is_medical_field: user.is_medical_field,
                    mci_number: user.mci_number,
                    mci_state: user.mci_state,
                    subscribe_newsletter: user.subscribe_newsletter,
                    terms_n_condition: user.terms_n_condition,
                    added_by_type: user.added_by_type,
                    added_by: user.added_by,
                    api_key: user.api_key,
                    app_version: user.app_version,
                    app_platform: user.app_platform,
                    token: user.token,
                    login_type: user.login_type,
                    social_media_id: user.social_media_id,
                    status: user.status,
                    created_at: user.created_at,
                    updated_at: user.updated_at
                };

                res.status(200).json({
                    success: 1,
                    message: "User retrieved successfully.",
                    data: appUser,
                });
            });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

const userController = new user();
module.exports = userController;