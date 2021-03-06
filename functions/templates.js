let getMediaTemplate = function (parameters, extras) {
    if ((!parameters.title || !parameters.downloads || !parameters.poster_link)) {
        return null;
    }
    let template = {};
    for (let key in parameters) {
        switch (key) {
            case 'title':
            case 'language':
            case 'IMDb_link':
            case 'release_year':
            case 'genre':
            case 'IMDb_rating':
            case 'industry':
            case 'media_type':
            case 'description':
            case 'youtube_trailer_video_id':
            case 'poster_link':
            case 'username':
                template[key] = (parameters[key]).trim();
                break;

            case 'tags':
            case 'screenshots':
            case 'downloads':
            case 'created_at':
                template[key] = parameters[key];
                break;
        }
    }

    if (extras !== null && !template.hasOwnProperty('username')) {
        //the user who uploaded this media
        template.username = extras.username;
    }

    return template;
};


module.exports = {
    getMediaTemplate: getMediaTemplate,
};
