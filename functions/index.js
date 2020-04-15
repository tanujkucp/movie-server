const functions = require('firebase-functions');
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
var HttpStatus = require('http-status-codes');
var serviceAccount = require("./../movies-9eb90-firebase-adminsdk-8xp8n-33f3f8a665.json");
const algoliasearch = require('algoliasearch');

let Templates = require('./templates');

////////////////////////////// initialize services //////////////////////////////////////

const app = express();
// Automatically allow cross-origin requests
app.use(cors({origin: true}));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://movies-9eb90.firebaseio.com"
});
const db = admin.firestore();

let FieldValue = require('firebase-admin').firestore.FieldValue;

// Initialize Algolia
const ALGOLIA_ID = 'ELRRSHQHGD';
const ALGOLIA_ADMIN_KEY = '6c843a93ee1af8a0b03034fa81edd647';
const ALGOLIA_SEARCH_KEY = '680a915d8b1ce3c430b1412f34f89ec3';

const ALGOLIA_INDEX_NAME = 'titles';
const admin_client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
const search_client = algoliasearch(ALGOLIA_ID, ALGOLIA_SEARCH_KEY);

/////////////////////////////// Routes to APIs //////////////////////////////////////////

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
    db.collection('users').where('secret', '==', user_secret).limit(1).get()
        .then(snapshot => {
                if (snapshot.empty) {
                    console.log('No matching users for secret: ' + user_secret);
                    res.status(HttpStatus.UNAUTHORIZED).send(FAIL.INVALID_USER_KEY);
                    return true;
                } else {
                    //save the data to database
                    snapshot.forEach(doc => {
                        let user = doc.data();
                        let template = Templates.getMediaTemplate(data, {username: user.username});
                        if (!template) {
                            res.status(HttpStatus.BAD_REQUEST).send(FAIL.INVALID_INPUTS);
                            return;
                        }
                        // add timestamp to template
                        template['created_at'] = FieldValue.serverTimestamp();

                        db.collection('uploads').add(template).then(ref => {
                            console.log('Added document with ID: ', ref.id);
                            res.status(HttpStatus.OK).send({success: true, upload_id: ref.id});
                            return;
                        }).catch(error => {
                            console.log(error);
                            var message = FAIL.INTERNAL_ERROR;
                            message.error = error;
                            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(message);
                        });
                    });
                }
                return;
            }
        )
        .catch(err => {
            console.log(err);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(FAIL.INTERNAL_ERROR);
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
    if (!filters) {
        //get normal latest data
        db.collection('uploads').orderBy('created_at', 'desc').limit(9).get()
            .then(snapshot => {
                if (snapshot.empty) {
                    res.status(HttpStatus.NOT_FOUND).send(FAIL.NOT_FOUND);
                } else {
                    let data = [];
                    snapshot.forEach(doc => {
                        data.push(doc.data());
                    });
                    res.status(HttpStatus.OK).send({success: true, data: data});
                }
                return;
            })
            .catch(err => {
                console.log(err);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(FAIL.INTERNAL_ERROR);
            });
    } else {
        if (filters.industry) {
            //get latest data with industry filter given
            db.collection('uploads').where('industry', '==', filters.industry).orderBy('created_at', 'desc').limit(9).get()
                .then(snapshot => {
                    if (snapshot.empty) {
                        res.status(HttpStatus.NOT_FOUND).send(FAIL.NOT_FOUND);
                    } else {
                        let data = [];
                        snapshot.forEach(doc => {
                            data.push(doc.data());
                        });
                        res.status(HttpStatus.OK).send({success: true, data: data});
                    }
                    return;
                })
                .catch(err => {
                    console.log(err);
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(FAIL.INTERNAL_ERROR);
                });
        }
        else if (filters.media_type) {
            //get latest data with industry filter given
            db.collection('uploads').where('media_type', '==', filters.media_type).orderBy('created_at', 'desc').limit(9).get()
                .then(snapshot => {
                    if (snapshot.empty) {
                        res.status(HttpStatus.NOT_FOUND).send(FAIL.NOT_FOUND);
                    } else {
                        let data = [];
                        snapshot.forEach(doc => {
                            data.push(doc.data());
                        });
                        res.status(HttpStatus.OK).send({success: true, data: data});
                    }
                    return;
                })
                .catch(err => {
                    console.log(err);
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(FAIL.INTERNAL_ERROR);
                });
        }
    }
});


app.post('/search', (req, res) => {
    var title = req.body.title;
    if (!title) {
        res.status(HttpStatus.BAD_REQUEST).send(FAIL.INVALID_INPUTS);
        return;
    }

    //search in algolia index
    var index = search_client.initIndex('titles');
    index.search(title).then(result => {
        console.log(result.hits);
        if (result.hits.length > 0) res.status(HttpStatus.OK).send({success: true, data: result.hits});
        else res.status(HttpStatus.NOT_FOUND).send(FAIL.NOT_FOUND);
        return;
    }).catch(err => {
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
        message: "User secret key is invalid"
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
    const index = admin_client.initIndex(ALGOLIA_INDEX_NAME);
    return index.saveObject(entry);
});

exports.services = functions.region('asia-northeast1').https.onRequest(app);
