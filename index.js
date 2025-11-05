
// region constants
// noinspection CssUnresolvedCustomProperty

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
        <Style id="{0}-normal">
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
        <Style id="{0}-highlight">
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
        
        <StyleMap id="{0}">
            <Pair>
                <key>normal</key>
                <styleUrl>#{0}-normal</styleUrl>
            </Pair>
            <Pair>
                <key>highlight</key>
                <styleUrl>#{0}-highlight</styleUrl>
            </Pair>
        </StyleMap>
`;

const DEFAULT_COLOR = "25a8f9";
const PALETTE_COLOR = [
    "#eb4034", "#5392f4", "#ffd033", "#3ce345",
    "#bf3ce3", "#ec7a29", "#6c5ef4", "#2ec0d8",
    "#f63e84", "#64e9fb", "#ffac4e", "#d1e83f",
    "#985eef", "#ff6f5c", "#7daaff", "#35edcc",
    "#aaaaaa", "#535373", "#d3fff4", "#c68f6f",
    "#ef7f78", "#99bfff", "#fff19b", "#99ed9e",
    "#f1a3eb", "#ffd4af", "#c18ff1", "#a7e8fd",
    "#ff7bac", "#a0e7f1", "#ffc380", "#efff86",
    "#c8a3ff", "#ff9d87", "#abc9ff", "#9cefe0",
    "#df193e", "#2b4aef", "#e8ab13", "#2eca15",
    "#c311b5", "#d55d15", "#5b10f1", "#1796dc",
    "#dc1d7d", "#0fb7cd", "#e6821d", "#bcd60f",
    "#7e20d5", "#e33618", "#308bd5", "#10c3a3",
    "#d36f80", "#6babd5", "#d5b66b", "#71c565",
    "#b06cd8", "#d1916a", "#6f83dc", "#6bdad6",
    "#bf4d45", "#547fbf", "#bc9f43", "#4ab850",
    "#9946af", "#ca7a41", "#6158bc", "#429eae",
    "#737293", "#475a4f", "#c1bd97", "#673a3a",
]

const BGM_COLLECTION_OFFSET = 100


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


// main().then()
//
// async function main() {
//     let collections = await getBangumiCollections('838109')
//     let [animes, points] = await getAnimeCollectionsPoints(collections);
//
//     animes = autoMergingByAnime(animes);
//     animes = autoMergingByCount(animes);
//
//
//
//     for (let id in animes) {
//         let p = animes[id];
//         console.log(p.name, ": ", p.points.length, " entries");
//     }
//
//     let data = await parseAnimations(animes);
//
//     const fs = require('fs');
//     fs.writeFile("test.kml", data, function(err) {
//         if(err) {
//             return console.log(err);
//         }
//         console.log("The file was saved!");
//     });
// }


// region utilities

function dict_to_array(dict) {
    let arr = []
    for (let key in dict) { arr.push(dict[key]); }
    return arr
}
function array_to_dict(arr, get_key) {
    let dict = {}
    for (let idx in arr) { dict[get_key(arr[idx])] = arr[idx] }
    return dict
}

// endregion


// region processing entries

function merge(a1, a2, is_same_series = false) {
    if (!a1?.points || !a2?.points) return;
    console.log(a1.name, a2.name)
    console.log(a1, a2)
    if (!Array.isArray(a1.name)) {
        a1.name = [a1.name];
    }
    a1.name = a1.name.concat(a2.name);
    a1.count += a2.count;
    a1.points.push(...a2.points);
    if (is_same_series) {
        let series = a1.points.find(x => x.series)?.series ?? a1.points.find(x => !x.anime.unique).anime;
        console.error("series", series);
        for (const point of a1.points) {
            if (point.anime.unique) continue
            point.series = series;
        }
    }
    return a1;
}

Array.prototype.remove = function (index) {
    return this.filter((v, i) => i !== (index < 0 ? this.length + index : index));
}
Array.prototype.insert = function (item, index) {
    return this.slice(0, index).concat(item, this.slice(index));
}

/** @param {Array} collections
 *  @param {number[]} ids
 *  */
function mergeAll(collections, ids) {
    if (ids.length < 1) return;

    let a1 = collections.find(a => a.id === ids[0])
    for (let i = 1; i < ids.length; i++) {
        let j = collections.findIndex(a => a.id === ids[i])
        let a2 = collections[j];
        merge(a1, a2);
        collections = collections.remove(j);
    }
    return collections;
}
/** @param {Array} collections*/
function autoMergingByAnime(collections) {
    for (let i = 0; i < collections.length; i++) {
        let a1 = collections[i];

        for (let j = i+1; j < collections.length; j++) {
            let a2 = collections[j];
            let n1 = Array.isArray(a1.name) ? a1.name[0] : a1.name;
            let n2 = Array.isArray(a2.name) ? a2.name[0] : a2.name;
            if (n1.length > 5 && n1.match(/^.{5}/g)?.[0] === n2.match(/^.{5}/g)?.[0]) {
                merge(a1, a2, true);
                collections = collections.remove(j);
                j--;
            }
        }
    }
    return collections;
}
/** @param {Array} collections
 *  @param {number} limit*/
function autoMergingByCount(collections, limit = 10) {
    collections = dict_to_array(collections).map((x, i) => ({...x, points_count: x.points.length, index: i}));
    collections = collections.sort((a, b) => b.points_count - a.points_count);
    while (collections.length > limit) {
        merge(collections[limit-1], collections[limit]);
        collections = collections.remove(limit);
    }
    collections = collections.sort((a, b) => a.index - b.index);
    return collections;
}
/** @param {Array} collections
 *  @param {number} count*/
function mergeReduceTo(collections, count) {
    console.error("reduce")
    collections = collections.sort((a, b) => b.points.length - a.points.length);

    while (collections.length > count) {
        let val = merge(collections[collections.length - 1], collections[collections.length - 2]);
        collections = collections.remove(collections.length - 1);
        collections = collections.remove(collections.length - 1);
        let min = 0, max = collections.length - 1, i = Math.ceil((min+max)/2)
        while (min <= max) {
            if (val.points.length <= collections[i].points.length) {
                min = i+1
            }
            else if (val.points.length > collections[i].points.length) {
                max = i-1
            }
            i = Math.ceil((min+max)/2)
        }
        collections = collections.insert(val, i);
    }
    console.error(collections.map(x=>Array.isArray(x.name) ? `[${x.name.join(",")}]` : x.name));
    return collections;
}

// endregion


// region parsing kml

let parsed_anime_color = {}
let parsed_color = []
async function parseAnimePoints(points) {

    let style = ""
    let location = ""


    for (let point of points) {
        point = {
            cn: null, name: null, id: null,
            ep: null, s: null, geo: [],
            ...point
        }

        let { name: anime_name, id: anime_id } = point.anime

        let color = point.series?.id ?? anime_id
        if (! (color in parsed_anime_color)) {
            parsed_anime_color[color] = getPaletteColor().replace(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, "$3$2$1");
            console.warn(anime_name, ": ", parsed_anime_color[color]);
            if (parsed_color.indexOf(parsed_anime_color[color]) === -1) {
                style += TEMP_STYLE.format(parsed_anime_color[color]);
            }
        }

        let name = point.cn ?? point.name ?? point.id ?? "";
        point.originLink ??= point.originUrl
        let description = [
            `[${anime_name}]` +
            (point.s ? ` 时间: ${point.s}` : "") + (point.ep ? ` 集数: ${point.ep} ` : ""),
            (point.cn && point.name) ? ` (原名: ${point.name})` : "",
            point.mark,
            (point.origin || point.originLink) ? `(origin - ${point.origin ?? point.originLink}${
                point.origin && point.originLink ? ` | ${point.originLink}` : ""
            })`: ""
        ].map(s => (s??"")?.trim()).filter(s => s && s.length > 0).join('\n');
        location += `
            <Placemark>
                <name><![CDATA[${name}]]></name>
                <description><![CDATA[${description}]]></description>
                <styleUrl>#${parsed_anime_color[color]}</styleUrl>
                <Point>
                    <coordinates>
                        ${point.geo?.[1] ?? 0},${point.geo?.[0] ?? 0},0
                    </coordinates>
                </Point>
            </Placemark>`
    }
    return [style, location, points.length];
}

async function parseAnimations(collections){
    let comb_style = "", comb_points = "";

    for (let item of collections) {
        const { name, points } = item;
        if (!points || points.length < 1) continue;

        let [style, place, count] = await parseAnimePoints(points);
        console.log("parsing [", Array.isArray(name) ? name.join(",") : name, "] ", count, " entries")

        comb_style += style + '\n';
        comb_points += TEMP_LAYER.format(name, place) + '\n';

    }
    return TEMP.format(comb_style, comb_points)
}

function download(data) {
    const file = new File(data, "file.txt", {type: 'application/octet-stream'});
    let url = URL.createObjectURL(file);
    window.open(url);
    URL.revokeObjectURL(url); // This seems to work here.
}


// endregion


// region fetch data

async function getAnimePoints(id) {
    console.warn("Fetching #", id)
    const res = await fetch(`https://api.anitabi.cn/bangumi/${id}/points/detail`)
    const data = await res.json()
    console.log("Finished Fetching #", id)
    console.log("data:", data)
    return data
}

/** @param {Array} collections
 *  @return {Promise<[{[$Keys: number]: Object}, Array]>}*/
async function getAnimeCollectionsPoints(collections) {
    let animes = {}
    let points = []
    let count = 0
    let promises = []
    for (let {id, name} of collections) {
        promises.push(getAnimePoints(id).then(res => {
            if (!res || res.length < 1) res = [];
            animes[id] = { id, name, unique: res.length > 150 }
            points.push({ id, name, points: res.map(p => ({ ...p, anime: animes[id] })), count: 1 });
        }));
        count++;

        if (count >= 5) {
            await Promise.all(promises);
            promises = [];
        }
    }
    await Promise.all(promises);
    return [animes, points];
}


async function getBangumiCollections(id, subject = 2, type = 2) {
    let offset = 0
    let total = null
    let collections = []
    while (! total || offset < total) {
        const url = `https://api.bgm.tv/v0/users/${id}/collections?${
            subject ? `subject_type=${subject}&` : ""
        }type=${type}&limit=${BGM_COLLECTION_OFFSET}&offset=${offset}`
        console.log("FETCH: ", url)
        let res = await (await fetch(url)).json();
        console.log(res)
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

const PANEL_HEIGHT = 500;
const PANEL_HEADER_HEIGHT = 50;

// language=CSS noinspection
const CSS = `
    :root {
        --c-dark: #ddda;
        --c-darker: #aaaa;
        --c-primary: #38a6f4;
        --c-primary-dark: #2266bd;
        --c-error: #f15151;

        --c-secondary: #28ca93;
        --c-secondary-dark: #1c9e73;
    }

    #info-hint {
        user-select: none;
        pointer-events: none;

        position: absolute;
        padding: 2px 10px;
        width: fit-content;
        height: fit-content;
        z-index: 99999;
        background-color: #eee;
        box-shadow: 1px 1px 2px #1118;
        border-radius: 5px;
    }

    #add-item-to-export-button {
        position: absolute;
        bottom: 27px;
        right: 0;
        font-size: small;
        padding: 4px 6px;
        /*border: 2px solid #fff;*/
        border: 1px solid #ccc;
        border-right: 0;

        border-radius: 5px 0 0 5px;
        background: #fff;/*color-mix(in srgb, var(--bangumi-color) 50%, white 50%);*/

        transition: 0.07s;

        &:hover {
            background-color: var(--bangumi-color);
        }
    }

    #export-map-panel {

        position: fixed;
        right: 50px;
        bottom: 30px;
        z-index: 999;
        width: 350px;
        height: ${PANEL_HEIGHT}px;

        background-color: white;
        box-shadow: 0 0 0 2px #0000001a;
        border-radius: 10px;

        overflow: hidden;
        transition: 0.12s ease-out;

        & span {
            display: flex;
            flex-direction: row;
            justify-content: center;
            gap: 5px;
            height: fit-content;
        }

        & list {
            list-style: none;
        }

        & button {
            flex: 1;
            height: 30px;

            border: none;
            outline: none;
            padding: 0 10px;

            border-radius: 8px;
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

        & input[type=number]::-webkit-inner-spin-button,
        & input[type=number]::-webkit-outer-spin-button {
            -webkit-appearance: none;
        }

        & input[type=text], input[type=number] {

            background-color: var(--c-dark);
            border: none;
            outline: none;
            border-radius: 8px;
            padding: 5px;

            text-align: center;

            &:focus {
                background-color: var(--c-darker);
            }
        }


        & .checkbox {
            user-select: none;

            background-color: var(--c-dark);
            border: 2px solid var(--c-darker);
            outline: none;
            border-radius: 8px;
            padding: 0;

            aspect-ratio: 1;

            text-align: center;

            position: relative;

            transition: 0.07s ease-out;

            &:hover {
                background-color: var(--c-darker);
            }

            &:has(input[type=checkbox]:checked) {
                background-color: var(--c-secondary);
                border-color: var(--c-secondary);
            }

            /*& :has(input[type=checkbox]:not(:checked)) {    */
            /*    background-color: var(--c-dark);*/
            /*    border-color: var(--c-darker);*/
            /*}*/

            &:has(input[type=checkbox]:checked):hover {
                background-color: var(--c-secondary-dark);
                border-color: var(--c-secondary-dark);
            }

            /*& not(:has(input[type=checkbox]:checked))::before {*/
            /*    content: '';*/
            /*    appearance: none;*/
            /*}*/

            &:has(input[type=checkbox]:checked)::before {
                pointer-events: none;
                position: absolute;
                appearance: auto;
                content: "✓";
                font-weight: bold;
                color: #fff;
                top: 2px;
                left: 0;
                width: 100%;
                height: 100%;
            }

            & input[type=checkbox] {
                appearance: none;
                margin: 0;
                width: 100%;
                height: 100%;
                z-index: 999;
            }
        }

        & * {
            box-sizing: border-box;
            border: none;
        }
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
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow: hidden;
    }

    #anime-list-wrapper {
        border-radius: 3px;
        border: 1px solid var(--c-darker);
        padding: 0;

        height: 200px;
    }

    #anime-list {
        height: 200px;
        overflow-y: scroll;


        list-style: none;
        padding: 0;
        margin: 0;

        & .anime-list-item {
            padding: 3px;

            display: flex;
            flex-direction: row;
            align-items: baseline;
            gap: 3px;

            border-radius: 2px;

            transition: background-color 0.07s ease-out;

            &:hover {
                background-color: var(--c-dark);
            }

            &:active {
                background-color: var(--c-darker);
            }

            & input[type=checkbox] {
                margin: 0;
                accent-color: var(--c-primary);
            }

            & .anime-list-item-count {
                height: 100%;
                width: 30px;
                font-size: 12px;
                line-height: 15px;
                text-align: center;
                color: white;
                border-radius: 99px;
            }

            & p {
                font-size: 14px;
                line-height: 15px;

                flex: 1;
                width: 0;
            }
        }

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
        }

        & > #bgm-fetch-button {
            height: 100%;
            flex: none;
        }
    }

    #list-edit-wrapper {
        & #delete-button {
            background-color: var(--c-error);
        }
    }

    #reduce-merge-count {
        flex: 1;
        width: 0;
    }
`

let mouse_location = [0, 0];
let mouse_label = null;
let mouse_info_hint = addElement("div", { id: "info-hint" });
document.getElementsByTagName("body")[0].append(mouse_info_hint);
document.onmousemove = (e) => {
    mouse_location = [e.clientX, e.clientY];
    if (mouse_label){
        mouse_info_hint.style.right = window.innerWidth - mouse_location[0] + 'px';
        mouse_info_hint.style.bottom = window.innerHeight - mouse_location[1] + 'px';
        mouse_info_hint.innerHTML = mouse_label;
        mouse_info_hint.style.opacity = "1";
    }
    else {
        mouse_info_hint.style.opacity = "0";
    }
}
function addElement(tag, attr = {}) {
    let element = document.createElement(tag);
    for (const key in attr) {
        if (key.match(/^.{5}/g)?.[0] === "data-") {

            if (key === "data-info") {
                element.onmouseenter = e => { mouse_label = attr[key] };
                element.onmouseleave = e => { mouse_label = null };
            }

            element.setAttribute(key, attr[key]);
            continue;
        }
        element[key] = attr[key];
    }
    return element;
}

const user = (() => {
    return {
        init () {
            console.warn("init");
            console.warn(this);
            this.on_update_data.push([() => {
                this.clean_selected.call(this);
                localStorage.setItem("collections", JSON.stringify(this.collections));
            }, 2000]);
            return this;
        },

        call (func_array, params = []) {
            if (Array.isArray(func_array[0]))
                func_array = func_array.sort((a, b) => a[1] - b[1]).map(x => x[0]);
            for (let func of func_array) {
                func(...params)
            }
        },

        /** @type {{Object}} */
        animes: JSON.parse(localStorage.getItem("animes")) ?? {},
        /** @type {{}[]} */
        collections: JSON.parse(localStorage.getItem("collections")) ?? [],

        /** set this.collections, <br/>
         *  auto fetch points data and call on_update_data while set
         *  @param { Object[] | ((c: Object[]) =>  Object[]) } collections */
        async set_collections(collections) {
            console.warn("set_collections");
            console.log(collections);

            this.collections = typeof collections === "function" ? collections(this.collections) : collections;
            // let collections2 = typeof collections === "function" ? collections(this.collections) : collections;
            // if (collections2.length === this.collections.length &&
            //     collections2.filter(x => !this.collections.find(x2 => x2.id === x.id)).length > 0) {
            //     this.collections = collections2;
            // }
            // else return false


            let req = []
            for (let collection of this.collections) {
                if (!Array.isArray(collection?.points)) {
                    req.push(collection)
                }
            }

            if (req.length > 0) {
                getAnimeCollectionsPoints(req).then((res) => {
                    let [anime, collections] = res
                    user.save_data(collections)
                })
            }
            else {
                this.call(this.on_update_data);
            }
            return true;
        },
        clear_collections () {
            this.set_collections([]);
        },
        clean_selected() {
            this.selected_animes = this.selected_animes.filter(x => this.collections.find(anime => anime.id === x.id));
        },
        /** @type {[function, number][]}
         *  call when points data updated */
        on_update_data: [],

        /** @type {(param: {[key: number]: Object}) => void}
         *  save points data to this.collections, <br/>
         *  data structure should be like: <br/>
         *  { id: { key: value }, id2: ... }*/
        save_data(res) {
            console.warn("save_data");
            console.log(res)
            for (let anime of this.collections){
                let data = res.find(x => x.id === anime.id);
                console.log(data);
                for (let key in data) {
                    anime[key] = data[key];
                }
            }
            this.call(this.on_update_data);
        },

        save_anime(animes) {
            for (let id in animes) {
                this.animes[id] = animes[id];
            }
        },


        /** @type {number[]}
         *  selected_animes id */
        selected_animes: [],
        all_selected: 0,

        /** @type {Function[]}
         *  call when selected updated */
        on_selected: [],

        update_selected_state() {
            if (this.selected_animes.length >= this.collections.length && this.collections.every(x => this.selected_animes.includes(x.id))) {
                this.all_selected = 2;
            }
            else if (this.selected_animes.length > 0) {
                this.all_selected = 1;
            }
            else {
                this.all_selected = 0;
            }

            this.call(this.on_selected)
        },

        select(id) {
            this.select_all([id])
        },
        select_all(ids = this.collections.map(item => item.id)) {
            this.selected_animes.push(...ids);
            this.update_selected_state()
        },
        unselect(id) {
            this.unselect_all([id])
        },
        unselect_all(ids = this.selected_animes) {
            this.selected_animes = this.selected_animes.filter(selected => !ids.includes(selected));
            this.update_selected_state()
        },
        is_selected(id) {
            return this.selected_animes.includes(id);
        },
        get_selected_collection() {
            return this.collections.filter(x => this.selected_animes.includes(x.id));
        },
        bgm_id: localStorage.getItem("bgm_id"),
    }.init()
})()





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



// region add select_all_button
    let select_all_component = addElement("span", {id: "list-edit-wrapper"});
    let list_select_all_button = addElement("button", {
        id: "list-select-all-button",
    })
    list_select_all_button.onclick = ev => {
        if (user.all_selected > 0)
            user.unselect_all();
        else
            user.select_all();
    }
    let button_text = "全选";

    let refresh_button_text = () => {
        let filtered_selected = user.selected_animes.filter(id => user.collections.find(anime => anime.id === id));
        let entries_count = filtered_selected.length;
        let points_count = [0, ...filtered_selected.map(id => user.collections.find(anime => anime.id === id)?.points?.length ?? 0)]
            .reduce((prev, current) => current + prev);
        list_select_all_button.innerText = button_text + ` (${entries_count}条目, ${points_count}地点)`
    }
    refresh_button_text();
    user.on_update_data.push([refresh_button_text, 890]);

    user.on_selected.push(() => {
        if (user.all_selected > 0) {
            button_text = "取消选择";
        }
        else {
            button_text = "全选";
        }
        refresh_button_text();
    });

    select_all_component.append(list_select_all_button);
// endregion


// region add_anime_list

    let anime_list_wrapper = addElement("div", {id: "anime-list-wrapper"});

    let anime_list_header = addElement("div", {id: "anime-list-header"});


    let anime_list = addElement("ul", {id: "anime-list"});

    let component_list = [];
    function add_list_row() {
        let li = addElement("li", {
            className: "anime-list-item"
        });

        let checkbox = addElement("input", {
            className: "anime-list-checkbox",
            type: "checkbox",
            onclick: (e) => {
                const parent = e.target.parentNode;
                const i = [...parent.parentNode.children].indexOf(parent);
                console.warn(i)
                let a = user.collections[i];
                console.log(a)
                if (!a) return;
                if (user.is_selected(a.id)){
                    user.unselect(a.id);
                    checkbox.checked = false;
                }
                else {
                    user.select(a.id);
                    checkbox.checked = true;
                }
            }
        })

        const counter = addElement("div", {className: "anime-list-item-count", innerText: `1`})
        const label = addElement("p")

        li.append(
            checkbox,
            counter,
            label
        );
        anime_list.append(li);
        component_list.push({
            checkbox, counter, label, li
        });
    }
    for (let anime of user.collections) {
        add_list_row();
    }
    function refresh_list() {
        for (let i = 0 ; i < user.collections.length; i++) {
            const anime = user.collections[i];
            if (component_list.length <= i) add_list_row();
            const {checkbox, counter, label} = component_list[i];

            checkbox.checked = user.selected_animes.includes(anime.id);

            let count = user?.collections?.find(x => x.id === anime.id)?.points?.length ?? 0;
            counter.innerText = count
            counter.style.backgroundColor = count === 0 ? `#888` : `hsl(${(1 - Math.log10(count) / 3) * 200}deg 80% 50%)`;

            label.innerText = Array.isArray(anime.name) ? anime.name.join(" / ") : anime.name;
        }
        while (component_list.length > user.collections.length) {
            let {li} = component_list.pop();
            li.remove()
        }
    }
    refresh_list();
    anime_list_wrapper.appendChild(anime_list);
    // let refresh_list = () => {
    //     let new_list = getAnimeListComponent();
    //     anime_list_wrapper.replaceChild(new_list, anime_list);
    //     anime_list = new_list;
    // }
    user.on_selected.push(refresh_list);
    user.on_update_data.push([refresh_list, 900]);

//endregion


// region add bangumi_panel
    let bgm_panel = getBangumiComponent(refresh_list);
// endregion



// region add merge_edit_panel
    function auto_merge() {
        console.warn("Auto Merge")
        console.log("FILTERED: ", user.collections.filter(x => !(x.points && x.points.length > 0)).map(x => x.name));
        let c = autoMergingByAnime(user.collections.filter(x => x.points && x.points.length > 0))
        if (c.length < user.collections.length) user.set_collections(c);
    }

    let list_edit_component = getButtonRowComponent({
        name: "list-edit",
        buttons: [
            [ "delete-button", "删除", ev => {
                console.error(user.collections)
                console.error(user.collections.filter(x => !user.selected_animes.includes(x.id)))
                console.error(user.selected_animes)
                user.set_collections(c => c.filter(x => !user.selected_animes.includes(x.id)));
                console.error(user.collections)
            }],
            [ "merge-button", "合并", ev => {
                user.set_collections(c => mergeAll(c, user.selected_animes));
            }],
            [ "auto-merge-button", "自动合并", ev => {
                auto_merge()
            }, { "data-info": "合并可能的同系列条目，删除无点位条目" }]
        ]
    });

    let auto_merge_func = [auto_merge, 10]
    let auto_merge_checkbox = addCheckbox("reduce-merge-checkbox", {
        type: "checkbox", className: "with-info", "data-info": "自动执行「自动合并」",
        onchange: e => {
            console.log("auto merge " + e.target.checked ? "enabled" : "disabled")
            if (e.target.checked) user.on_update_data.push(auto_merge_func);
            else user.on_update_data = user.on_update_data.filter(x => x !== auto_merge_func);
        }
    }, true);
    user.on_update_data.push(auto_merge_func);
    list_edit_component.append(auto_merge_checkbox);
// endregion


// region add list_edit_panel
    let reduce_merge_count = 10
    function reduce_merge() {
        if (user.collections.length <= reduce_merge_count) return;
        user.set_collections(c => mergeReduceTo(c, reduce_merge_count));
    }
    let list_edit_component2 = getButtonRowComponent({
        name: "list-edit-2",
        buttons: [
            [ "reduce-merge", "合并至n条目", ev => {
                reduce_merge();
            }, { style: "flex: 2" }],
        ]
    });
    let reduce_merge_count_input = addElement("input", {id: "reduce-merge-count", type: "number",
        onchange: e => {
            console.warn("change")
            reduce_merge_count = e.target.value
        }
    })
    let reduce_merge_func = [reduce_merge, 20];
    let reduce_merge_checkbox = addCheckbox("reduce-merge-checkbox", {
        type: "checkbox", className: "with-info", "data-info": "自动执行「合并至n条目」",
        onchange: e => {
            console.log("reduce merge active")
            if (e.target.checked) user.on_update_data.push(reduce_merge_func);
            else user.on_update_data = user.on_update_data.filter(x => x !== reduce_merge_func);
        }
    });
    list_edit_component2.append(reduce_merge_count_input, reduce_merge_checkbox);
// endregion


// region remain
    let export_component = getButtonRowComponent({
        name: "export-button",
        buttons: [
            [ "export-button", "导出选择", async ev => {
                const data = await parseAnimations(user.collections.filter(x => user.selected_animes.includes(x.id)))
                console.log(data);
                download([data]);
            }, { "data-info": "注意: google My Maps 一次只能导入10个项目和2000个点位" }]
        ]
    })

    // let get_points_component = getGetPointsComponent(refresh_list);

    panel_content.append(
        bgm_panel,
        anime_list_wrapper,
        select_all_component,
        list_edit_component,
        list_edit_component2,
        // get_points_component,
        export_component,
    );

    panel.append(panel_header, panel_content);

    parent.append(panel);
    parent.append(style);

    // endregion

    return panel;
}

function addCheckbox(id, attr = {}, checked = false) {
    let wrapper = addElement("div", {...attr, id, className: "checkbox " + attr.className})
    let input = addElement("input", {name: id, className: "checkbox-input", type: "checkbox", checked: checked});
    wrapper.append(input);
    return wrapper
}

function getBangumiComponent(refresh_list) {

    let bgm_panel = addElement("span", {id: "bgm-panel"});
    let bgm_id_input_label = addElement("label", {id: "bgm-id-input-label", innerText: "Bangumi ID"});
    let bgm_id_input = addElement("input", {id: "bgm-id-input", type: "text", value: user.bgm_id, onchange: e => {
            user.bgm_id = e.target.value;
            localStorage.setItem("bgm_id", user.bgm_id);
        }});
    let bgm_fetch_button = addElement("button", {
        id: "bgm-fetch-button",
        innerText: "获取",
        onclick: ev => {
            getBangumiCollections(user.bgm_id).then((res) => {
                console.log("BGM Collection: ", res)
                user.set_collections(res);
            })
        }});
    bgm_panel.append(bgm_id_input_label, bgm_id_input, bgm_fetch_button)

    return bgm_panel
}




function getButtonRowComponent(row) {
    let wrapper = addElement("span", {id: row.name + "-wrapper"});
    let buttons = []

    for (const b of row.buttons) {
        let button = addElement("button", {
            id: b[0],
            className: "row-button",
            innerText: b[1],
            onclick: b[2],
            ...b[3]
        })
        buttons.push(button);
    }
    wrapper.append(...buttons);
    return wrapper;
}


function getGetPointsComponent() {
    let get_points_button_wrapper = addElement("span", {id: "get-points-button-wrapper"});
    let get_points_button = addElement("button", {
        id: "get-points-button",
        className: "expm-button",
        innerText: "获取巡礼点",
        onclick: ev => {
            ev.target.style.backgroundColor = "var(--c-darker)"
            getAnimeCollectionsPoints(user.get_selected_collection()).then((res) => {
                console.log(res)
                ev.target.style.backgroundColor = null;
                user.save_data(res);
            })
        }});
    get_points_button_wrapper.appendChild(get_points_button);
    return get_points_button_wrapper;
}

function getAnimeListComponent() {

}

body = document.querySelector("body");
addPanel(body);
// endregion


// region addon gui

function addSidebarUI(parent) {
    const add_item_to_export_button = addElement("p", {
        id: "add-item-to-export-button",
        innerText: "添加到[导出地图]",
        onclick: async () => {
            const current_id = parseInt(window.location.href.match(/bangumiId=([0-9]*)/)?.[1]);
            if (current_id){
                await getSingleEntry(current_id)
            }
        }});
    parent.append(add_item_to_export_button);

    async function getSingleEntry(entry_id) {
        if (user.collections.find(x => x.id === entry_id)) return;
        let {name, id} = await (await fetch(`https://api.bgm.tv/v0/subjects/${entry_id}`)).json();

        user.set_collections([...user.collections, {name, id}])
    }
}


const targetSelector = '.feature-item';

const callback = function(mutationsList) {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {

            for (let node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                node = node?.querySelector(targetSelector) ?? node;

                if (node.matches && node.matches(targetSelector)) {
                    console.log('目标元素已添加到页面');
                    addSidebarUI(node);
                    return;
                }
            }
        }
    }
};

const observer = new MutationObserver(callback);

observer.observe(document.body, { childList: true, subtree: true });

const existing = document.querySelector(targetSelector);
if (existing) {
    addSidebarUI(existing);
}


// endregion