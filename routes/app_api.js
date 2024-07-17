// routes/product_routes.js

const express = require("express");
const multer = require("multer");
const router = express.Router();
const loginController = require("../controllers/login");
const userController = require("../controllers/user");
const eventController = require("../controllers/event");
const sendMailTest = require("../controllers/mail");
const importController = require("../controllers/importFile");
const upload = require("../middlewares/upload");
/* use for authenticate api */
const authenticate = require("../middlewares/authenticate");

const formUpload = multer(); // Initialize multer

router.post("/login", formUpload.none(), loginController.login);

/* below Api with authentication check */
router.post("/getAppUserById", authenticate, formUpload.none(), userController.getAppUserById);
router.post("/pastEventList", authenticate, formUpload.none(), eventController.getPastEvents);
router.post("/dashboardList", authenticate, formUpload.none(), eventController.dashboardList);
router.post("/getScheduleListByEventId", authenticate, formUpload.none(), eventController.getScheduleListByEventId);
router.post("/downloadSessionPdf", authenticate, formUpload.none(), eventController.downloadSessionPdf);
router.post("/dowloadExcelForDayWiseReport", authenticate, formUpload.none(), eventController.dowloadExcelForDayWiseReport);
router.post("/sendMailTest", formUpload.none(), sendMailTest);
router.post("/importTravelData", upload.single('impTravelFile'), importController.importTravelData);

module.exports = router;
