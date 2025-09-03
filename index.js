
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
    for (let idx in arr) { dict[get_key(arr[idx])] = arr[idx] }
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
    console.log(a1, a2);
    if (!a1?.points || !a2?.points) return;
    a1.name = a1.name + " / " + a2.name;
    a1.count += a2.count;
    a1.points.push(...a2.points);
}
function remove(arr, index) {
    return arr.filter((v, i) => i !== index);
}


function mergeAll(animes, ids) {
    animes = dict_to_array(animes);
    if (ids.length < 1) return;

    let a1 = animes.find(a => a.id === ids[0])
    for (let i = 1; i < ids.length; i++) {
        let j = animes.findIndex(a => a.id === ids[i])
        let a2 = animes[j];
        merge(a1, a2);
        animes = remove(animes, j);
    }
    return array_to_dict(animes, x => x.id);
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
        if (!points || points.length < 1) points = [];
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

const PANEL_HEIGHT = 500;
const PANEL_HEADER_HEIGHT = 50;
const CSS = `
#export-map-panel {
    --c-dark: #ddda;
    --c-darker: #aaaa;
    --c-primary: #38a6f4;
    --c-primary-dark: #2266bd;
    --c-error: #f15151;

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
    
    & input[type=text] {
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
    padding: 0px;    
    
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
`
function addElement(tag, attr = {}) {
    let element = document.createElement(tag);
    for (const key in attr) {
        element[key] = attr[key];
    }
    return element;
}

const user = (() => {
    return {
        init () {
            console.warn("init");
            console.warn(this);
            this.on_update_data.push(() => {
                this.clean_selected.call(this);
                localStorage.setItem("collections", JSON.stringify(this.collections));
            });
            return this;
        },

        call (func_array, params = []) {
            console.log(func_array)
            for (let func of func_array) {
                func(...params)
            }
        },
        collections: JSON.parse(localStorage.getItem("collections")) ?? [],
        set_collections(collections) {
            this.collections = dict_to_array(collections);
            let req = []
            for (let collection of collections) {
                if (!Array.isArray(collection.points)) {
                    req.push(collection)
                }
            }
            if (req.length > 0) {
                getAnimeCollectionsPoints(req).then((res) => {
                    user.save_data(res)
                })

            }
            else {
                this.call(this.on_update_data);
            }
        },
        clear_collections () {
            this.set_collections([]);
        },
        clean_selected() {
            this.selected_animes = this.selected_animes.filter(x => this.collections.find(anime => anime.id === x.id));
        },
        on_update_data: [],
        save_data(res) {
            for (let anime of this.collections){
                let data = res[anime.id];
                console.log(data);
                for (let key in data) {
                    anime[key] = data[key];
                }
            }
            this.call(this.on_update_data);
        },

        selected_animes: [],
        all_selected: 0,

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

            this.call(this.on_selected, [this.selected_animes.length, this.get_selected_collection()])
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


    let anime_list_wrapper = addElement("div", {id: "anime-list-wrapper"});
    let anime_list = getAnimeListComponent()
    anime_list_wrapper.appendChild(anime_list);
    let refresh_list = () => {
        let new_list = getAnimeListComponent();
        anime_list_wrapper.replaceChild(new_list, anime_list);
        anime_list = new_list;
    }
    user.on_selected.push(refresh_list);
    user.on_update_data.push(refresh_list);

    let bgm_panel = getBangumiComponent(refresh_list);
    let select_all_component = getSelectAllComponent(refresh_list);
    let list_edit_component = getListEditComponent(refresh_list);
    let get_points_component = getGetPointsComponent(refresh_list);

    panel_content.append(
        bgm_panel,
        anime_list_wrapper,
        select_all_component,
        list_edit_component,
        get_points_component,
    );

    panel.append(panel_header, panel_content);

    parent.append(panel);
    parent.append(style);

    return panel;
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
                user.set_collections(res);
            })
        }});
    bgm_panel.append(bgm_id_input_label, bgm_id_input, bgm_fetch_button)

    return bgm_panel
}


function getSelectAllComponent() {
    let select_all_wrapper = addElement("span", {id: "list-edit-wrapper"});
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
    let filtered_selected = user.selected_animes.filter(id => user.collections.find(anime => anime.id === id));
    console.log()
    let entries_count = filtered_selected.length;
    let points_count = [0, ...filtered_selected]
        .reduce((prev, current) => (current?.points?.length ?? 0) + prev);
    let refresh_button_text = () => {
        list_select_all_button.innerText = button_text + ` (${entries_count}条目, ${points_count}地点)`
    }
    refresh_button_text();
    user.on_update_data.push(refresh_button_text);

    user.on_selected.push((count, selected) => {
        if (user.all_selected > 0) {
            button_text = "取消选择";
        }
        else {
            button_text = "全选";
        }
        refresh_button_text();
    });

    select_all_wrapper.append(list_select_all_button);
    return select_all_wrapper;
}


function getListEditComponent() {
    let list_edit_wrapper = addElement("span", {id: "list-edit-wrapper"})

    let delete_button = addElement("button", {
        id: "delete-button",
        innerText: "删除",
        onclick: ev => {
            user.set_collections(
                user.collections.filter(x => !user.selected_animes.includes(x.id))
            );
        }
    })
    let merge_button = addElement("button", {
        id: "merge-button",
        innerText: "合并",
        onclick: ev => {
            user.set_collections(
                dict_to_array(mergeAll(user.collections, user.selected_animes))
            );
        }
    })
    let auto_merge_button = addElement("button", {
        id: "auto-merge-button",
        innerText: "自动合并",
        onclick: ev => {
            user.set_collections(
                dict_to_array(autoMergingByAnime(user.collections.filter(x => x.points && x.points.length > 0)))
            );
        }
    })

    list_edit_wrapper.append(delete_button, merge_button, auto_merge_button);
    return list_edit_wrapper;
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
                ev.target.style.backgroundColor = null
                console.log(res);
                user.save_data(res)
            })
        }});
    get_points_button_wrapper.appendChild(get_points_button);
    return get_points_button_wrapper;
}

function getAnimeListComponent() {
    let anime_list = addElement("ul", {id: "anime-list"});
    console.warn(user)
    for (let anime of user.collections) {
        let checkbox = addElement("input", {
            className: "anime-list-checkbox",
            type: "checkbox",
            checked: user.selected_animes.includes(anime.id)
        })
        let li = addElement("li", {
            className: "anime-list-item",
            onclick: () => {
                if (user.is_selected(anime.id)){
                    user.unselect(anime.id);
                    checkbox.checked = false;
                }
                else {
                    user.select(anime.id);
                    checkbox.checked = true;
                }
            }
        });
        let count = user?.collections?.find(x => x.id === anime.id)?.points?.length ?? 0;
        let counter = addElement("div", {className: "anime-list-item-count", innerText: `${count}`})
        counter.style.backgroundColor = count === 0 ? `#888` : `hsl(${(1 - Math.log10(count) / 3) * 200}deg 80% 50%)`;
        li.append(
            checkbox,
            counter,
            addElement("p", {innerText: anime.name}));
        anime_list.append(li);
    }
    return anime_list
}

body = document.querySelector("body");
addPanel(body);
// endregion
