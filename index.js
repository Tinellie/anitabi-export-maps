
// region constants

if (!String.prototype.format) {
    String.prototype.format = function() {
        let args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

const TEMP = `
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
        <name>未命名的地图</name>
        <description/>
        {0}
        {1}
    </Document>
</kml>`;
const TEMP_LAYER = `
        <Folder>
            <name>{0}</name>
            {1}
        </Folder>
`

const TEMP_STYLE = `
        <Style id="s{0}-normal">
            <IconStyle>
                <color>ff{0}</color>
                <scale>1</scale>
                <Icon>
                    <href>https://www.gstatic.com/mapspro/images/stock/503-wht-blank_maps.png</href>
                </Icon>
            </IconStyle>
            <LabelStyle>
                <scale>0</scale>
            </LabelStyle>
            <BalloonStyle>
                <text><![CDATA[<h3>$[name]</h3>]]></text>
            </BalloonStyle>
        </Style>
        <Style id="s{0}-highlight">
            <IconStyle>
                <color>ff{0}</color>
                <scale>1</scale>
                <Icon>
                  <href>https://www.gstatic.com/mapspro/images/stock/503-wht-blank_maps.png</href>
                </Icon>
            </IconStyle>
            <LabelStyle>
                <scale>1</scale>
            </LabelStyle>
            <BalloonStyle>
                <text><![CDATA[<h3>$[name]</h3>]]></text>
            </BalloonStyle>
        </Style>
        
        <StyleMap id="s{0}">
            <Pair>
                <key>normal</key>
                <styleUrl>#s{0}-normal</styleUrl>
            </Pair>
            <Pair>
                <key>highlight</key>
                <styleUrl>#s{0}-highlight</styleUrl>
            </Pair>
        </StyleMap>
`;

const DEFAULT_COLOR = "25a8f9";
const PALETTE_COLOR = [
    "#eb4034", "#ec7a29", "#ebc034", "#3ce345",
    "#2ec0d8", "#5392f4", "#6c5ef4", "#bf3ce3",
    "#708888", "#47475a", "#c4f6ea", "#674a3a",
    "#eb346b", "#f48456", "#f8b755", "#b9e83f",
    "#2ed8b9", "#64dcfb", "#7e9ff4", "#ac5eef",
    "#ef7f78", "#efc9a9", "#efe2a0", "#99ed9e",
    "#c2e2ec", "#a3c1f1", "#afa9f3", "#de98f1",
    "#772112", "#714b12", "#777210", "#137c34",
    "#12618c", "#0d2185", "#4a278f", "#8f1985",
    "#884854", "#8c705f", "#8f7c4d", "#52814b",
    "#4a8886", "#4d6e83", "#485177", "#7a5c8c",
    "#bf4d45", "#ca7a41", "#bc9f43", "#4ab850",
    "#429eae", "#547fbf", "#6158bc", "#9946af",
    "#737293", "#475a4f", "#c1bd97", "#673a3a",
]

const BGM_COLLECTION_OFFSET = 100

const REQ_ID = [
    { id: 24508, name: "潜行吧奈亚子" },
    { id: 74663, name: "苍蓝钢铁的琶音" }
];

let used_color = [];
let palette_count = -1
function getPaletteColor() {
    palette_count += 1
    let color = PALETTE_COLOR[palette_count % PALETTE_COLOR.length]
    if (!used_color.find(x => x === color))
        used_color.push(color);
    return color;
}

// endregion

let a = {
    114: {id: 114, name: "かぐや様は告らせたい～天才たちの恋愛頭脳戦～", raw: ["kgy1-0", "kgy1-1"], count: 1},
    115: {id: 115, name: "かぐや様は告らせたい？～天才たちの恋愛頭脳戦～", raw: ["kgy2-0", "kgy2-1"], count: 1},
    514: {id: 514, name: "小林さんちのメイドラゴンS", raw: ["dragon1"], count: 1},
    314: {id: 314, name: "小林さんちのメイドラゴン", raw: ["dragon2", "dragon3"], count: 1},
    124: {id: 124, name: "かぐや様は告らせたい～天才たちの恋愛頭脳戦!!", raw: ["kgy3-0"], count: 1},
    1919: {id: 125, name: "ジョジョの奇妙な冒険 黄金の風", raw: ["jojo-gw"], count: 1},
    810: {id: 124, name: "ジョジョの奇妙な冒険 スターダストクルセイダース", raw: ["jojo-sc"], count: 1},
    125: {id: 125, name: "かぐや様は告らせたい？～天才たちの恋愛頭脳戦!!??", raw: ["kgy4-0", "kgy4-1"], count: 1},
};

// main().then()

async function main() {
    let collections = await getBangumiCollections('838109')
    let animes = await getAnimeCollectionsPoints(collections);
    animes = animes.map(anime => processingAnimeEntry(anime));

    animes = autoMergingByAnime(animes);
    animes = autoMergingByCount(animes);



    for (let id in animes) {
        let p = animes[id];
        console.log(p.name, ": ", p.points.length, " entries");
    }

    let data = await parseAnimations(animes);

    const fs = require('fs');
    fs.writeFile("test.kml", data, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}


// region utilities

function dict_to_array(dict) {
    let arr = []
    for (let key in dict) { arr.push(dict[key]); }
    return arr
}
function array_to_dict(arr, get_key) {
    let dict = {}
    for (let a of arr) { dict[get_key(a)] = a }
    return dict
}

// endregion


// region processing entries

function processingAnimeEntry(anime) {
    const color = getPaletteColor();
    anime.points = anime.points.map(
        point => ({ ...point, color, anime_name: anime.name }),
    );
    return anime;
}

function merge(a1, a2) {
    a1.name = a1.name + " / " + a2.name;
    a1.count += a2.count;
    a1.points.push(...a2.points);
}
function remove(arr, index) {
    return arr.filter((v, i) => i !== index);
}
function autoMergingByAnime(animes) {
    animes = dict_to_array(animes);
    for (let i = 0; i < animes.length; i++) {
        let a1 = animes[i];

        for (let j = i+1; j < animes.length; j++) {
            let a2 = animes[j];
            if (a1.name.length > 5 && (a1.name.match(/^.{5}/g)?.[0] === a2.name.match(/^.{5}/g)?.[0])) {
                merge(a1, a2);
                animes = remove(animes, j);
                j--;
            }
        }
    }
    return array_to_dict(animes, x => x.id);
}
function autoMergingByCount(animes, limit = 10) {
    animes = dict_to_array(animes).map((x, i) => ({...x, points_count: x.points.length, index: i}));
    animes = animes.sort((a, b) => b.points_count - a.points_count);
    while (animes.length > limit) {
        merge(animes[limit-1], animes[limit]);
        animes = remove(animes, limit);
    }
    animes = animes.sort((a, b) => a.index - b.index);
    return animes;
}

// endregion


// region parsing kml

async function parseAnimePoints(points, anime_name, color = DEFAULT_COLOR) {

    let style = TEMP_STYLE.format(color)
    let location = ""

    for (let point of points) {
        point = {
            cn: null, name: null, id: null,
            ep: null, s: null, geo: [],
            ...point
        }
        let name = point.cn ?? point.name ?? point.id ?? "";
        let description = (`[${anime_name}] ` +
            (point.s ? `时间: ${point.s}` : "") +
            (point.ep ? `集数: ${point.ep} ` : "") +
            ((point.cn && point.name) ? `(原名: ${point.name}) ` : "")
        ).trim();
        location += `
            <Placemark>
                <name><![CDATA[${name}]]></name>
                <description><![CDATA[${description}]]></description>
                <styleUrl>#s${color}</styleUrl>
                <Point>
                    <coordinates>
                        ${point.geo?.[1] ?? 0},${point.geo?.[0] ?? 0},0
                    </coordinates>
                </Point>
            </Placemark>`
    }
    return [style, location, points.length];
}

async function parseAnimations(animes){
    let comb_style = "", comb_points = "";

    for (let id in animes) {
        const { name, points } = animes[id];
        if (!points || points.length < 1) continue;

        let color = getPaletteColor()
        let [style, place, count] = await parseAnimePoints(points, name, color);
        console.log("parasing [", name, "] ", count, " entries")

        if (!used_color.find(c => c === color))
            comb_style += style + '\n';
        comb_points += TEMP_LAYER.format(name, place) + '\n';

        used_color.push(color)
    }
    return TEMP.format(comb_style, comb_points)
}

// endregion


// region fetch data

async function getAnimePoints(id) {
    console.log("Fetch #", id)
    const res = await fetch(`https://api.anitabi.cn/bangumi/${id}/points/detail`)
    return await res.json()
}

async function getAnimeCollectionsPoints(animes_info) {
    let animes = {}
    for (let {id, name} of animes_info) {
        let points = await getAnimePoints(id)
        if (!points || points.length < 1) continue;
        animes[id] = { id, name, points, count: 1 };
    }
    return animes;
}


async function getBangumiCollections(id, subject = 2, type = 2) {
    let offset = 0
    let total = null
    let collections = []
    while (! total || offset < total) {
        const url = `https://api.bgm.tv/v0/users/${id}/collections?${
            subject ? `subject_type=${subject}&` : ""
        }type=${type}&limit=${BGM_COLLECTION_OFFSET}&offset=${offset}`
        console.log(url)
        let res = await (await fetch(url)).json();
        collections.push(...res.data);
        total = res.total;
        offset += BGM_COLLECTION_OFFSET;
    }
    return collections.map(item => ({
        id: item.subject.id,
        name: item.subject.name
    }));
}

// endregion


// region gui

const PANEL_HEIGHT = 400;
const PANEL_HEADER_HEIGHT = 50;
const CSS = `
#export-map-panel {
    --c-dark: #ddda;
    --c-darker: #aaaa;
    --c-primary: #38a6f4;
    --c-primary-dark: #2266bd;

    position: fixed;
    right: 50px; bottom: 30px;
    z-index: 999;
    width: 300px;
    height: ${PANEL_HEIGHT}px;
    
    background-color: white;
    box-shadow: 0 0 0 2px #0000001a;
    border-radius: 10px;
    
    overflow: hidden;
    transition: 0.12s ease-out;
}

#export-map-panel * {
    box-sizing: border-box;
    border: none;
}

#export-map-panel-header {
    box-sizing: border-box;
    height: ${PANEL_HEADER_HEIGHT}px;
    padding: 12px 22px;
    font-size: 16px;
    border-bottom: 1px solid var(--c-darker);
    
    transition: 0.08s ease-out;
    cursor: pointer;
    
    &:hover {
        background-color: var(--c-dark);
    }
}

#export-map-panel-content {
    width: 100%;
    height: 100%;
    padding: 10px 22px;
}

#anime-list {
    height: 100px;
    overflow-y: scroll;
}

#bgm-panel {
    height: 24px;

    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 5px;
    
    & * {
        white-space: nowrap;
    }
    
    & > #bgm-id-input-label {
        width: fit-content;
        height: fit-content;
    }
    
    & > #bgm-id-input {
        flex: 1;
        width: 0;
        
        background-color: var(--c-dark);
        border: none;
        outline: none;
        border-radius: 10px;
        padding: 5px;
        
        text-align: center;
    }
    
    & > #bgm-fetch-button {
        box-sizing: border-box;
        height: 100%;
        
        border: none;
        outline: none;
        padding: 0 10px;
        
        border-radius: 10px;
        background-color: var(--c-primary);
        color: white;
        
        cursor: pointer;
        transition: 0.04s ease-out;
        &:hover {
            background-color: var(--c-primary-dark);
        }
        &:active {
            transform: scale(1.05);
        }
    }
}
#anime-list {
    list-style: none;
    padding: 0;
    
    & input[type=checkbox] {
        accent-color: var(--c-primary);
    }
}
`
function addElement(tag, attr = {}) {
    let element = document.createElement(tag);
    for (const key in attr) {
        element[key] = attr[key];
    }
    return element;
}

const user = {
    collection: [],
    selected_animes: [],
    select(id) {
        this.selected_animes.push(id);
    },
    unselect(id) {
        this.selected_animes.filter(selected => selected !== id);
    },
    is_selected(id) {
        return this.selected_animes.includes(id);
    },
    bgm_id: undefined,
}

function addPanel(parent) {
    let panel_collapsed = false;

    let style = document.createElement('style');
    style.append(document.createTextNode(CSS));


    let panel = addElement("div", {id: "export-map-panel"})

    let panel_header = addElement("div", {
        id: "export-map-panel-header",
        innerText: "导出地图",
        onclick: ev => {
            if (panel_collapsed) {
                panel.style.height = `${PANEL_HEIGHT}px`;
                panel_collapsed = false;
            } else {
                panel.style.height = `${PANEL_HEADER_HEIGHT}px`;
                panel_collapsed = true;
            }
        }
    });

    let panel_content = addElement("div", {id: "export-map-panel-content"});

    let anime_list_wrapper = addElement("div", {id: "anime-list-wrapper"});
    let anime_list = getAnimeListComponent()

    let bgm_panel = addElement("span", {id: "bgm-panel"});
    let bgm_id_input_label = addElement("label", {id: "bgm-id-input-label", innerText: "Bangumi ID"});
    let bgm_id_input = addElement("input", {id: "bgm-id-input", type: "text", onchange: e => {
        user.bgm_id = e.target.value;
    }});
    let bgm_fetch_button = addElement("button", {
        id: "bgm-fetch-button",
        innerText: "获取",
        onclick: ev => {
            getBangumiCollections(user.bgm_id).then((res) => {
                user.collection = res;
                let new_list = getAnimeListComponent();
                panel_content.replaceChild(new_list, anime_list);
                anime_list = new_list;
            })
        }});
    bgm_panel.append(bgm_id_input_label, bgm_id_input, bgm_fetch_button)

    panel_content.append(bgm_panel, anime_list)

    panel.append(panel_header, panel_content);

    parent.append(panel);
    parent.append(style);

    return panel;
}

function getAnimeListComponent() {
    let anime_list = addElement("ul", {id: "anime-list"});
    console.warn(user)
    for (let anime of user.collection) {
        let li = addElement("li", {className: "anime-list-item"});
        li.append(addElement("input", {
            className: "anime-list-checkbox",
            type: "checkbox",
            checked: user.selected_animes.includes(anime.id),
            onclick: () => {
                if (user.is_selected(anime.id))
                    user.unselect(anime.id);
                else
                    user.select(anime.id);
            }
        }));
        li.append(document.createTextNode(anime.name));
        anime_list.append(li);
    }
    return anime_list
}

body = document.querySelector("body");
addPanel(body);
// endregion
