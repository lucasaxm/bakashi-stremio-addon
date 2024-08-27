import {manifest} from "./manifest.mjs";
import {
    fetchAnimeMetaFromAnimeUrl,
    fetchPopularAnime, getStreams,
    searchAnime
} from "./fetchers/bakashiFetcher.mjs";

export const netlifyResponse = (responseBody) => {
    const headers = new Headers();

    headers.append('Access-Control-Allow-Origin', '*');
    headers.append('Access-Control-Allow-Headers', '*');
    headers.append('Netlify-CDN-Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    headers.append('Netlify-Vary', 'query');

    return new Response(responseBody, {headers});
};

export async function getCatalog(id, skip) {
    console.log(`Catalog request received for ${id}, skip=${skip}`);
    try {
        if (id === 'bilu_animes_popular') {
            return JSON.stringify({metas: await fetchPopularAnime(Number(skip))});
        }
        // if (id === 'bilu_animes_latest') {
        //     return JSON.stringify({metas: await fetchLatestAnime(Number(skip))});
        // }
    } catch (e) {
        console.error(e);
        console.log("Returning no results.")
    }
    return JSON.stringify({metas: []});
}

export async function getSearch(query) {
    console.log(`Search request received for query ${query}`);
    try {
        return JSON.stringify({metas: await searchAnime(query)});
    } catch (e) {
        console.error(e);
        console.log("Returning no results.")
    }
    return JSON.stringify({metas: []});
}

export async function getMeta(id) {
    console.log(`Meta request received for ${id}`);
    let seriesId = decodeURIComponent(id).split(":")[1];
    try {
        const url = `https://bakashi.tv/animes/${seriesId}`
        const meta = await fetchAnimeMetaFromAnimeUrl(url, true);

        let responseBody = JSON.stringify({meta: meta});

        console.log(`Response: ${responseBody}`);
        return responseBody;
    } catch (e) {
        console.error(e);
        console.log("Returning no results.")
    }
    return JSON.stringify({meta: []});
}

export async function getStream(id) {
    console.log(`Stream request received for ${id}`);
    let episodeId = decodeURIComponent(id).split(":")[1];
    try {
        const url = `https://bakashi.tv/episodio/${episodeId}`

        const streams = await getStreams(url);

        let responseBody = JSON.stringify({streams: streams});

        console.log(`Response: ${responseBody}`);
        return responseBody;
    } catch (e) {
        console.error(e);
        console.log("Returning no results.")
    }
    return JSON.stringify({streams: []});
}

export async function getManifest() {
    return JSON.stringify(manifest);
}