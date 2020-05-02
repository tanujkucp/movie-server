const functions = require('firebase-functions');
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const HttpStatus = require('http-status-codes');
//const serviceAccount = require("./../filmistaan-1f6ac-firebase-adminsdk-ynqsc-eec8622d5e.json");
const algoliasearch = require('algoliasearch');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let Templates = require('./templates');
let Configs = require('./Configs');

////////////////////////////// initialize services //////////////////////////////////////

const app = express();
// Automatically allow cross-origin requests
app.use(cors({origin: true}));

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: Configs.databaseURL
// });

admin.initializeApp(functions.config().firebase);
const db = admin.firestore();
let FieldValue = admin.firestore.FieldValue;
let Timestamp = admin.firestore.Timestamp;

// Initialize Algolia
const admin_client = algoliasearch(Configs.ALGOLIA_ID, Configs.ALGOLIA_ADMIN_KEY);
//const search_client = algoliasearch(ALGOLIA_ID, ALGOLIA_SEARCH_KEY);

const saltRounds = 8;

/////////////////////////////// Routes to APIs //////////////////////////////////////////


app.post('/createAdminAccount', (req, res) => {
    var secret_key = req.body.secret_key;
    var username = req.body.username;
    var password = req.body.password;

    //check if secret key is valid
    if (secret_key !== Configs.admin_secret_key) {
        res.status(HttpStatus.UNAUTHORIZED).send(FAIL.INVALID_USER_KEY);
        return;
    }
    //now generate a hash of password and store in database
    bcrypt.hash(password, saltRounds, (err, hash) => {
        // Store hash in your password DB.
        if (!err) {
            db.collection('users').add({
                username: username,
                password: hash
            }).then(ref => {
                console.log('New user created!', username, ref.id);
                res.status(HttpStatus.OK).send({success: true, username: username});
                return;
            }).catch((err) => {
                console.log(err, username);
            });
        } else {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(FAIL.INTERNAL_ERROR);
        }

    });

});

app.post('/verifyJWT', (req, res) => {
    var user_secret = req.body.user_secret;
    if (!user_secret) {
        res.status(HttpStatus.UNAUTHORIZED).send(FAIL.MISSING_USER_KEY);
        return;
    }

    // verify user secret key
    jwt.verify(user_secret, Configs.JWT_PUBLIC_KEY, {algorithms: ['RS256']}, (err, decoded) => {
        if (!err && decoded.username) {
            res.status(HttpStatus.OK).send({success: true});
        } else {
            // console.log(err);
            res.status(HttpStatus.UNAUTHORIZED).send(FAIL.INVALID_USER_KEY);
        }
    });
});

app.post('/login', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    if (!username || !password) {
        res.status(HttpStatus.UNAUTHORIZED).send(FAIL.INVALID_INPUTS);
        return;
    }

    //check in database, if found true generate a secret key
    db.collection('users').where('username', '==', username).limit(1).get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('No matching users for username: ' + username);
                res.status(HttpStatus.UNAUTHORIZED).send(FAIL.INVALID_INPUTS);
                return true;
            } else {
                // generate a secret key and add to database
                snapshot.forEach(doc => {
                    //compare password with stored hash
                    let user = doc.data();
                    // console.log(user);
                    bcrypt.compare(password, user.password, (err, result) => {
                        if (!err) {
                            if (result) {
                                // console.log("password matched");
                                jwt.sign({
                                    username: user.username,
                                    password: user.password
                                }, Configs.JWT_PRIVATE_KEY, {
                                    algorithm: 'RS256',
                                    expiresIn: '15d'
                                }, (err, token) => {
                                    if (!err) {
                                        //  console.log(token);
                                        res.status(HttpStatus.OK).send({success: true, user_secret: token})
                                    } else {
                                        console.log(err);
                                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(FAIL.INTERNAL_ERROR);
                                    }
                                });
                            } else {
                                //wrong password
                                res.status(HttpStatus.UNAUTHORIZED).send(FAIL.INVALID_INPUTS);
                            }
                        } else {
                            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(FAIL.INTERNAL_ERROR);
                        }

                    });

                });
            }
            return true;
        }).catch((err) => {
        console.log(err, username, password);
    });

});

app.post('/saveMedia', (req, res) => {
    var user_secret = req.body.user_secret;
    var data = req.body.data;
    if (!user_secret) {
        res.status(HttpStatus.UNAUTHORIZED).send(FAIL.MISSING_USER_KEY);
        return;
    } else if (!data) {
        res.status(HttpStatus.BAD_REQUEST).send(FAIL.INVALID_INPUTS);
        return;
    }

    // verify user secret key
    jwt.verify(user_secret, Configs.JWT_PUBLIC_KEY, {algorithms: ['RS256']}, (err, decoded) => {
        if (!err) {
            let template = Templates.getMediaTemplate(data, {username: decoded.username});
            if (!template) {
                res.status(HttpStatus.BAD_REQUEST).send(FAIL.INVALID_INPUTS);
                return;
            }
            // add timestamp to template
            template['created_at'] = FieldValue.serverTimestamp();

            db.collection('uploads').add(template).then(ref => {
                console.log('Added document with ID: ', ref.id);
                res.status(HttpStatus.OK).send({success: true, media_id: ref.id});
                return;
            }).catch(error => {
                console.log(error);
                var message = FAIL.INTERNAL_ERROR;
                message.error = error;
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(message);
            });
        } else {
            console.log(err);
            res.status(HttpStatus.UNAUTHORIZED).send(FAIL.INVALID_USER_KEY);
        }
    });

});


app.post('/getMedia', (req, res) => {
    var media_id = req.body.media_id;
    if (!media_id) {
        res.status(HttpStatus.BAD_REQUEST).send(FAIL.MISSING_MEDIA_ID);
        return;
    }
    //return media details from database
    db.collection('uploads').doc(media_id).get()
        .then(doc => {
            if (!doc.exists) {
                res.status(HttpStatus.BAD_REQUEST).send(FAIL.INVALID_INPUTS);
            } else {
                res.status(HttpStatus.OK).send({success: true, data: doc.data()});
            }
            return;
        })
        .catch(err => {
            console.log(err);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(FAIL.INTERNAL_ERROR);
        });
});


app.post('/getLatest', (req, res) => {
    let filters = req.body.filters;

    let query = db.collection('uploads');
    if (filters) {
        if (filters.industry) query = query.where('industry', '==', filters.industry);
        if (filters.media_type) query = query.where('media_type', '==', filters.media_type);

        query = query.orderBy('created_at', 'desc');

        if (filters.timestamp) query = query.startAfter(new Timestamp(filters.timestamp._seconds, filters.timestamp._nanoseconds));

    } else query = query.orderBy('created_at', 'desc');

    query.limit(9).get()
        .then(snapshot => {
            if (snapshot.empty) {
                res.status(HttpStatus.NOT_FOUND).send(FAIL.NOT_FOUND);
            } else {
                let data = [];
                snapshot.forEach(doc => {
                    let content = doc.data();
                    content['media_id'] = doc.id;
                    data.push(content);
                });
               // console.log(data);
                res.status(HttpStatus.OK).send({success: true, data: data});
            }
            return;
        })
        .catch(err => {
            console.log(err);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(FAIL.INTERNAL_ERROR);
        });

});


var FAIL = {
    INVALID_INPUTS: {
        success: false,
        message: "Invalid inputs"
    },
    INVALID_USER_KEY: {
        success: false,
        message: "User secret key is invalid or has expired"
    },
    MISSING_USER_KEY: {
        success: false,
        message: "User secret not found in request"
    },
    INTERNAL_ERROR: {
        success: false,
        message: 'An internal error occurred'
    },
    MISSING_MEDIA_ID: {
        success: false,
        message: 'Media ID is not found in request'
    },
    NOT_FOUND: {
        success: false,
        message: "Data not found"
    }
};

// Update the search index every time a blog post is written.
exports.onTitleCreated = functions.firestore.document('uploads/{media_id}').onCreate((snap, context) => {
    // Get the media document
    const doc = snap.data();

    let entry = {};
    entry.title = doc.title;
    entry.poster_link = doc.poster_link;
    entry.tags = doc.tags;
    entry.media_id = context.params.media_id;

    // Add an 'objectID' field which Algolia requires
    entry.objectID = context.params.media_id;

    // Write to the algolia index
    const index = admin_client.initIndex(Configs.ALGOLIA_INDEX_NAME);
    return index.saveObject(entry);
});


exports.backupDatabase = functions.region('asia-northeast1').https.onRequest((req, res) => {
    var secret_key = req.body.secret_key;

    //check if secret key is valid
    if (secret_key !== Configs.admin_secret_key) {
        res.status(HttpStatus.UNAUTHORIZED).send(FAIL.INVALID_USER_KEY);
        return;
    }

    //prepare a backup of all data and send as JSON file
    return db.collection('uploads').get().then((querySnapshot)=>{
        const orders = [];

        querySnapshot.forEach(doc => {
            const order = doc.data();
            orders.push(order);
        });
        res.setHeader(
            "Content-disposition",
            "attachment; filename=report.json"
        );
        res.set("Content-Type", "application/json");
        res.status(HttpStatus.OK).send(orders);
    }).catch((err) => {
        console.log(err);
    });
});

exports.services = functions.region('asia-northeast1').https.onRequest(app);
