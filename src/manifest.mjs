export const manifest = {
    id: "org.bilu.bakashi",
    version: "1.0.0",

    name: "Bakashi",
    description: "Bakashi Anime Addon",
    logo: "https://boatarde.dev.br/biludoramas.png",
    icon: "https://boatarde.dev.br/biludoramas.png",

    //"icon": "URL to 256x256 monochrome png icon",
    //"background": "URL to 1024x786 png/jpg background",

    types: ["series"], // your add-on will be preferred for those content types

    // set what type of resources we will return
    resources: [
        "stream",
        "catalog",
        "meta"
    ],

    // set catalogs, we'll be making 2 catalogs in this case, 1 for movies and 1 for series
    catalogs: [
        {
            type: "series",
            id: "bakashi_popular",
            name: "Bakashi - Popular"
        },
        {
            type: "series",
            id: "bakashi_latest",
            name: "Bakashi - Latest"
        },
        {
            type: "series",
            id: "bakashi_search",
            name: "Bakashi",
            extra: [
                {name: "search", isRequired: true}
            ]
        }
    ],


    // prefix of item IDs (ie: "tt0032138")
    idPrefixes: ["bakashi:"]
};