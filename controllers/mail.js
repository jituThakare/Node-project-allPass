var nodemailer = require('nodemailer');

const sendMailTest = (req, res) => {
    var transporter = nodemailer.createTransport({
        host: 'mail.piexxi.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: 'swapnil@piexxi.com',
            pass: 'F}l%UUjEi8wF'
        }
    });
    var mailOptions = {
        from: 'swapnil@piexxi.com',
        to: 'swapnil.thakre3@gmail.com',
        subject: 'Sending Email using Node.js',
        text: 'Testing the node project all pass mail'
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log('Error occurred: ' + error.message);
            if (error.code === 'ECONNRESET') {
                // console.log('Connection was reset by the server.');
            }
            res.status(500).send('Error sending email: ' + error.message);
        } else {
            // console.log('Email sent: ' + info.response);
            res.send('Email sent: ' + info.response);
        }
    });
};

module.exports = sendMailTest;