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
            case 'tags':
            case 'description':
            case 'youtube_trailer_video_id':
            case 'screenshots':
            case 'downloads':
            case 'poster_link':


                template[key] = parameters[key];
                break;
        }
    }

    //the user who uploaded this media
    template.username = extras.username;

    return template;
};


module.exports = {
    getMediaTemplate: getMediaTemplate,
};
