// index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const appApi = require('./routes/app_api');
const authenticate = require('./middlewares/authenticate');

const app = express();
// Run Server
// const PORT = process.env.PORT || 8000;
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Apply the authentication middleware to all routes except the login route
// app.use((req, res, next) => {
//     if (req.path === '/api/login') {
//         return next();
//     }
//     authenticate(req, res, next);
// });

// Routes
app.use('/api', appApi);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
