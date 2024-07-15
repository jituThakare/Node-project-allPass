var nodemailer = require('nodemailer');

const sendMailTest = (req, res) => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'All Pass',
            pass: 'r9y}46D9@6IP'
        }
    });
    var mailOptions = {
        from: 'allpass@piexxi.in',
        to: 'swapnil.thakre3@gmail.com',
        subject: 'Sending Email using Node.js',
        text: 'That was easy!'
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
            res.send('Email sent: ' + info.response);
        }
    });
};

module.exports = sendMailTest;