import {expressSetHeaders} from "./helpers.mjs";
import * as bakashiService from "./bakashiService.mjs";
import express from "express";

const router = express.Router();

router.get('/manifest.json', async function (req, res) {
    expressSetHeaders(res);
    res.send(await bakashiService.getManifest());
});

router.param('type', async function (req, res, next, val) {
    const manifest = await bakashiService.getManifest();
    if (JSON.parse(manifest).types.includes(val)) {
        next();
    } else {
        next("Unsupported type " + val);
    }
});

router.get('/stream/:type/:id.json', async function (req, res) {
    expressSetHeaders(res);
    res.send(await bakashiService.getStream(req.params.id));
});

router.get('/meta/:type/:id.json', async function (req, res) {
    expressSetHeaders(res);
    res.send(await bakashiService.getMeta(req.params.id));
});

router.get('/catalog/:type/:id.json', async function (req, res) {
    expressSetHeaders(res);
    res.send(await bakashiService.getCatalog(req.params.id, 0));
});

router.get('/catalog/:type/:id/skip=:skip.json', async function (req, res) {
    expressSetHeaders(res);
    res.send(await bakashiService.getCatalog(req.params.id, req.params.skip));
});

router.get('/catalog/:type/bilu_animes_search/search=:search.json', async function (req, res) {
    expressSetHeaders(res);
    res.send(await bakashiService.getSearch(req.params.search));
});

export default router;