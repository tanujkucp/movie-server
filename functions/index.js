const functions = require('firebase-functions');
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');


const app = express();
// Automatically allow cross-origin requests
app.use(cors({origin: true}));

admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

/////////////////////////////// Routes to APIs //////////////////////////////////////////

app.post('/saveMedia', (req, res) => {
    // var user_secret_key = req.body.user_secret_key
    //verify user secret key

    //save the data to database

    res.status(200).send({success: true});
});



var FAIL = {
    INVALID_INPUTS: {
        success: false,
        message: "Invalid inputs"
    },
    INVALID_USER_KEY: {
        success: false,
        message: "User secret key is invalid"
    },
    MISSING_USER_KEY: {
        success: false,
        message: "User secret not found in request"
    },
    INTERNAL_ERROR: {
        success: false,
        message: 'An internal error occurred'
    }
};

exports.services = functions.region('asia-northeast1').https.onRequest(app);
