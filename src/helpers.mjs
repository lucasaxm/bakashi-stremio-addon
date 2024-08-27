import axios from "axios";
import * as cheerio from "cheerio";

const testUrl = async (url) => {
    const response = await axios.head(url, {
        maxRedirects: 0,
        timeout: 2000,
    });
    const statusCode = response.status;
    if (statusCode >= 200 && statusCode < 300) {
        console.log(`Success: ${statusCode}`);
    } else {
        throw (`Test failed: ${statusCode}`);
    }
}

const fetchHtmlSelector = async (url, timeout, retries) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, {timeout});
            return cheerio.load(response.data);
        } catch (error) {
            if (i === retries - 1) throw new Error(`Failed to fetch URL after ${retries} attempts: ${error.message}`);
        }
    }
};

const equalsIgnoringCase = (a, b) => {
    return typeof a === 'string' && typeof b === 'string'
        ? a.localeCompare(b, undefined, {sensitivity: 'accent'}) === 0
        : a === b;
}

const expressSetHeaders = function (res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');
};

export {testUrl, fetchHtmlSelector, equalsIgnoringCase, expressSetHeaders};
