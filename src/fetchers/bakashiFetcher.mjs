import axios from 'axios';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';
import {format, parse} from 'date-fns';

const BASE_URL = 'https://bakashi.tv';
const TIMEOUT = 10000;
const PAGE_SIZE = 20;

const myCache = new NodeCache({stdTTL: 3600, checkperiod: 120});

const fetchPopularAnime = async (skip = 0) => {
    const cacheKey = `popularAnime:${skip}`;
    const cacheValue = myCache.get(cacheKey);

    if (cacheValue !== undefined) {
        console.log(`${cacheKey}: Returning cached value`);
        return cacheValue;
    }

    try {
        const response = await axios.get(`${BASE_URL}/animes/`, {
            timeout: TIMEOUT,
            headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        });

        const $ = cheerio.load(response.data);

        const animeElements = $('div.items.featured article div.poster');
        let catalog = animeElements.slice(skip, skip + PAGE_SIZE).map((_, element) => {
            const $element = $(element);
            return {
                id: `bakashi:${$element.find('a').attr('href').replace(/\/$/, '').split('/').pop()}`,
                type: 'series',
                name: $element.find('img').attr('alt'),
                poster: $element.find('img').attr('src'),
            };
        }).get();

        myCache.set(cacheKey, catalog);
        return catalog;
    } catch (error) {
        console.error(`Failed to fetch popular anime: ${error.message}`);
        throw error;
    }
};

const searchAnime = async (query) => {
    try {
        const response = await axios.get(`${BASE_URL}/`, {
            params: {s: query},
            timeout: TIMEOUT,
            headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        });

        const $ = cheerio.load(response.data);
        const animeElements = $('div.result-item article');

        return animeElements.map((_, element) => {
            const $element = $(element);
            return {
                id: `bakashi:${$element.find("div.title a").attr('href').replace(/\/$/, '').split('/').pop()}`,
                type: 'series',
                name: $element.find("div.title a").text(),
                poster: $element.find('img').attr('src'),
                description: $element.find(".contenido").text().trim()
            };
        }).get();
    } catch (error) {
        console.error(`Failed to search anime: ${error.message}`);
        throw error;
    }
};

export const fetchAnimeMetaFromAnimeUrl = async (animeUrl, withStreams = false) => {
    console.log(`Fetching anime meta for ${animeUrl}`);
    try {
        const animeResponse = await axios.get(animeUrl, {
            timeout: 10000,
            headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        });

        const $anime = cheerio.load(animeResponse.data);

        let liJqueryElements = $anime("ul.episodios > li");

        return {
            id: "bakashi:" + animeUrl.split("/animes/")[1].replace("/", ""),
            type: "series",
            name: $anime("div.sheader > div.data > h1").first().text().trim(),
            poster: $anime(".poster").find("img").attr("src"),
            description: $anime(".wp-content").first().text().trim(),
            videos: await getVideos(liJqueryElements, withStreams)
        };
    } catch (e) {
        console.error(e);
        console.error(`ERROR fetching anime meta for ${animeUrl}`);
        return null;
    }
};

const getVideos = async (liJqueryElements, withStreams) => {
    let promises = [];
    for (let i = 0; i < liJqueryElements.length; i++) {
        promises.push(episodeJqueryElementToStremioVideo(i, liJqueryElements.eq(i), withStreams));
    }
    return Promise.all(promises);
}

const episodeJqueryElementToStremioVideo = async (index, li, withStreams) => {
    const inputDate = li.find(".episodiotitle > .date").text()
    const parsedDate = parse(inputDate, 'dd/MM/yy', new Date());
    const formattedDate = format(parsedDate, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

    let episodiotitleATag = li.find(".episodiotitle > a");

    return {
        name: episodiotitleATag.text(),
        season: 1,
        episode: index + 1,
        thumbnail: li.find("img").attr("src"),
        id: "bakashi:" + episodiotitleATag.attr("href").split("/episodio/")[1].replace("/", ""),
        released: formattedDate,
        streams: withStreams ? await getStreams(episodiotitleATag.attr("href")) : null,
        available: true
    }
}

export const getStreams = async (episodeUrl) => {
    const episodeSources = await fetchVideoSources(episodeUrl);

    return episodeSources.map(source => {
        let stream = {
            cacheMaxAge: 3600,
            staleError: 604800,
            staleRevalidate: 14400,
            name: "Bakashi",
            title: source.quality,
            url: source.url
        }
        if (source.headers) {
            stream["behaviorHints"] = {
                notWebReady: true,
                proxyHeaders: {
                    request: source.headers
                }
            }
        } else if (source.url.includes(".m3u8")) {
            stream["behaviorHints"] = {
                notWebReady: true
            }
        }
        return stream
    });
}

const fetchAnimeDetails = async (animeId) => {
    const cacheKey = `animeDetails:${animeId}`;
    const cacheValue = myCache.get(cacheKey);

    if (cacheValue !== undefined) {
        console.log(`${cacheKey}: Returning cached value`);
        return cacheValue;
    }

    try {
        const response = await axios.get(`${BASE_URL}/${animeId}`, {
            timeout: TIMEOUT,
            headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        });

        const $ = cheerio.load(response.data);

        const animeDetails = {
            id: `bakashi:${animeId}`,
            type: 'series',
            name: $('h1.entry-title').text(),
            poster: $('.poster > img').attr('src'),
            description: $('.description').text(),
            genres: $('.genres > a').map((_, el) => $(el).text()).get(),
        };

        myCache.set(cacheKey, animeDetails);
        return animeDetails;
    } catch (error) {
        console.error(`Failed to fetch anime details: ${error.message}`);
        throw error;
    }
};

const fetchEpisodes = async (animeId) => {
    try {
        const response = await axios.get(`${BASE_URL}/${animeId}`, {
            timeout: TIMEOUT,
            headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        });

        const $ = cheerio.load(response.data);

        return $('ul.episodios > li > div.episodiotitle > a').map((_, element) => {
            const $element = $(element);
            const episodeText = $element.text().trim();
            const episodeNumber = episodeText.split(' ').pop();
            const dateUpload = $element.parent().find('.date').text().trim();
            return {
                id: `bakashi:${$element.attr('href').split('/').pop()}`,
                title: episodeText,
                episode: parseFloat(episodeNumber) || 1,
                season: 1,
                released: dateUpload ? new Date(dateUpload).toISOString() : new Date().toISOString(),
            };
        }).get();
    } catch (error) {
        console.error(`Failed to fetch episodes: ${error.message}`);
        throw error;
    }
};

const fetchVideoSources = async (episodeUrl) => {
    try {
        const response = await axios.get(episodeUrl, {
            timeout: TIMEOUT,
            headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        });

        const $ = cheerio.load(response.data);
        const players = $('ul#playeroptionsul li');

        let sourcesPromises = [];

        for (let player of players) {
            const $player = $(player);
            const name = $player.find('span.title').text().toLowerCase();
            const playerId = $player.attr('data-nume');
            const iframe = $(`div#source-player-${playerId} iframe`);
            let playerUrl = iframe.attr('src');

            if (playerUrl && playerUrl.includes('/aviso/')) {
                playerUrl = decodeURIComponent(playerUrl.split('/aviso/')[1].split('=')[1]);
            }
            if (playerUrl) {
                if (name.includes('ruplay')) {
                    sourcesPromises.push(extractRuplayVideos(playerUrl));
                }
                if (name.includes('streamwish')) {
                    sourcesPromises.push(extractStreamWishVideos(playerUrl));
                }
                if (name.includes('filemoon')) {
                    sourcesPromises.push(extractFilemoonVideos(playerUrl));
                }
                if (name.includes('mixdrop')) {
                    sourcesPromises.push(extractMixDropVideos(playerUrl));
                }
                if (name.includes('streamtape')) {
                    sourcesPromises.push(extractStreamTapeVideos(playerUrl));
                }
                if (playerUrl.includes('/noance/') || playerUrl.includes('/noa')) {
                    sourcesPromises.push(extractNoaVideos(playerUrl));
                }
                if (playerUrl.includes('/player/')) {
                    sourcesPromises.push(extractBloggerVideos(playerUrl));
                }
            }
        }
        return (await Promise.all(sourcesPromises)).flat();
    } catch (error) {
        console.error(`Failed to fetch video sources: ${error.message}`);
        return [];
    }
};

// Implement the extractor functions (you'll need to adapt these based on the specific requirements of each source)
const extractRuplayVideos = async (url) => {
    try {
        const response = await axios.get(url);
        const content = response.data;
        const fileContent = content.split('Playerjs({')[1].split('file:"')[1].split('"')[0];
        const videoUrls = fileContent.split(',');

        return videoUrls.map(item => {
            const [quality, videoUrl] = item.split(']');
            return {
                url: videoUrl,
                quality: `Ruplay - ${quality.substring(1)}`,
                headers: {Referer: videoUrl}
            };
        });
    } catch (error) {
        console.error('Error extracting Ruplay videos:', error);
        return [];
    }
};

const extractStreamWishVideos = async (url) => {
    return [];
    // try {
    //     const embedUrl = url.includes('/f/') ? `https://streamwish.com/${url.split('/f/')[1]}` : url;
    //     const response = await axios.get(embedUrl);
    //     const content = response.data;
    //
    //     let scriptBody = content.match(/<script>((?:.|\n)*?)<\/script>/)[1];
    //     if (scriptBody.includes('eval(function(p,a,c')) {
    //         scriptBody = unpackAndCombine(scriptBody);
    //     }
    //
    //     const masterUrl = scriptBody.match(/file:"(.+?)"/)[1];
    //
    //     // You'll need to implement or use a library for HLS playlist parsing
    //     // For simplicity, we'll just return the master URL
    //     return [{
    //         url: masterUrl,
    //         quality: 'StreamWish - Auto',
    //         headers: {
    //             'Referer': url,
    //         }
    //     }];
    // } catch (error) {
    //     console.error('Error extracting StreamWish videos:', error);
    //     return [];
    // }
};

const extractFilemoonVideos = async (url) => {
    return [];
    // try {
    //     const response = await axios.get(url, {
    //         headers: {
    //             'Referer': url,
    //             'Origin': `https://${new URL(url).host}`
    //         }
    //     });
    //     const content = response.data;
    //     const jsEval = content.match(/<script>(eval.+?)<\/script>/)[1];
    //     const unpacked = unpackAndCombine(jsEval);
    //     const masterUrl = unpacked.match(/\{file:"(.+?)"/)[1];
    //
    //     // You'll need to implement or use a library for HLS playlist parsing
    //     // For simplicity, we'll just return the master URL
    //     return [{
    //         url: masterUrl,
    //         quality: 'Filemoon - Auto',
    //         headers: {
    //             'Referer': `https://${new URL(url).host}/`,
    //         }
    //     }];
    // } catch (error) {
    //     console.error('Error extracting Filemoon videos:', error);
    //     return [];
    // }
};

export async function extractMixDropVideos(url, lang = '', prefix = '', referer = 'https://mixdrop.co/') {
    return [];
    // try {
    //     const response = await axios.get(url, {
    //         headers: { 'Referer': referer }
    //     });
    //     const content = response.data;
    //
    //     const scriptContent = content.match(/<script>(eval.+?)<\/script>/)[1];
    //     const unpacked = unpack(scriptContent);
    //
    //     const videoUrl = 'https:' + unpacked.match(/Core\.wurl="(.+?)"/)[1];
    //     const subsUrl = unpacked.match(/Core\.remotesub="(.+?)"/)?.[1];
    //
    //     const quality = `${prefix}MixDrop${lang ? `(${lang})` : ''}`;
    //
    //     const video = {
    //         url: videoUrl,
    //         quality: quality,
    //         headers: { 'Referer': referer }
    //     };
    //
    //     if (subsUrl) {
    //         video.subtitles = [{
    //             url: decodeURIComponent(subsUrl),
    //             lang: 'Unknown'
    //         }];
    //     }
    //
    //     return [video];
    // } catch (error) {
    //     console.error('Error extracting MixDrop videos:', error);
    //     return [];
    // }
}

const extractStreamTapeVideos = async (url) => {
    try {
        const baseUrl = 'https://streamtape.com/e/';
        const newUrl = url.startsWith(baseUrl) ? url : `${baseUrl}${url.split('/')[4]}`;

        const response = await axios.get(newUrl);
        const $ = cheerio.load(response.data);

        let videoUrl;

        $('script').each((index, element) => {
            const content = $(element).html();
            if (content.includes("document.getElementById('robotlink')")) {
                const part1 = content.split("innerHTML = '")[1].split("'")[0];
                const part2 = content.split("+ ('xcd")[1].split("'")[0];
                videoUrl = 'https:' + part1 + part2;
                return false; // Break the loop
            }
        });

        if (videoUrl) {
            return [{
                url: videoUrl,
                quality: 'StreamTape',
                headers: {}
            }];
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error extracting StreamTape videos:', error);
        return [];
    }
};

const extractNoaVideos = async (url) => {
    try {
        const response = await axios.get(url);
        const content = response.data;
        const sourceItems = JSON.parse(content.match(/sources:\s*(\[\{.+\}\])/)[1])

        return sourceItems.map(item => {
            return {
                url: item.file,
                quality: `Noa - ${item.label}`,
                headers: {} // Add any necessary headers here
            };
        });
    } catch (error) {
        console.error('Error extracting Noa videos:', error);
        return [];
    }
};

const extractBloggerVideos = async (url) => {
    try {
        const response = await axios.get(url, {headers});
        const content = response.data;

        if (content.includes('errorContainer')) {
            return [];
        }

        const streamsContent = content.split('"streams":[')[1].split(']')[0];
        const streamItems = streamsContent.split('},');

        return streamItems.map(item => {
            const videoUrl = item.split('"play_url":"')[1].split('"')[0];
            const format = item.split('"format_id":')[1].split('}')[0];
            let quality;
            switch (format) {
                case '7':
                    quality = '240p';
                    break;
                case '18':
                    quality = '360p';
                    break;
                case '22':
                    quality = '720p';
                    break;
                case '37':
                    quality = '1080p';
                    break;
                default:
                    quality = 'Unknown';
            }
            return {
                url: videoUrl,
                quality: `Blogger - ${quality}`
            };
        }).filter(video => video.url);
    } catch (error) {
        console.error('Error extracting Blogger videos:', error);
        return [];
    }
};

export {
    fetchPopularAnime,
    searchAnime,
    fetchAnimeDetails,
    fetchEpisodes,
    fetchVideoSources,
};