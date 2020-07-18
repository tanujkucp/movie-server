const server_addr = "https://asia-northeast1-filmistaan-1f6ac.cloudfunctions.net";
const local_server = "http://localhost:5001/filmistaan-1f6ac/asia-northeast1";
const Industry = {
    BOLLYWOOD: 'Bollywood',
    HOLLYWOOD: 'Hollywood',
    SOUTH : 'South Indian',
    PLUS18: '18+',
    OTHER: 'Other'
};

const MediaType = {
    MOVIE: 'Movie',
    WEBSERIES: 'Web Series',
    DOCUMENTARY: 'Documentary',
    VIDEO: 'Video'
};

const VideoResolution = {
    SD : '480p',
    HD: '720p',
    HDplus: '1080p',
    QHD: '1440p',
    UHD: '4K'
};

module.exports = {
    Industry: Industry,
    MediaType: MediaType,
    VideoResolution: VideoResolution
};