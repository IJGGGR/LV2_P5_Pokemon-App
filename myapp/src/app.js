

// Variables =======================================================================================


const API_URL = "https://pokeapi.co/api/v2";
const LANG = "en";

let CUR;

const btnRNG = document.getElementById("btn-rng");
const btnFAV = document.getElementById("btn-fav");
const txtSearch = document.getElementById("btn-search");
// const btnImage = document.getElementById("btn-image");

const entFav = document.getElementById("ent-fav");
const entIdAndName = document.getElementById("ent-id-and-name");
const entImage = document.getElementById("ent-image");
const entTypes = document.getElementById("ent-types");
const entAbilities = document.getElementById("ent-abilities");
const entMoves = document.getElementById("ent-moves");
const entLocations = document.getElementById("ent-locations");
const entEvolutions = document.getElementById("ent-evolutions");


// Main ============================================================================================


const LS = (() => {
  return {
    /**
     * Get the item count from Local Storage.
     * @returns {number}
     */
    cnt() { return localStorage.length; },
    /**
     * Get the nth item key from Local Storage.
     * @param {number} idx An index.
     * @returns {string | null}
     */
    key(idx) { return localStorage.key(idx); },
    /**
     * Get an item value from Local Storage.
     * @param {string} key An item key.
     * @returns {any}
     */
    get(key) {
      try { return JSON.parse(localStorage.getItem(key)); }
      catch (err) { console.error(err); return null; }
    },
    /**
     * Set an item value into Local Storage. Returning a success or failure.
     * @param {string} key An item key.
     * @param {any} val An item value.
     * @returns {boolean}
     */
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); return true; }
      catch (err) { console.error(err); return false; }
    },
    /**
     * Delete an item from Local Storage.
     * @param {string} key An item key.
     * @returns {void}
     */
    del(key) { localStorage.removeItem(key); },
    /**
     * Delete all items from Local Storage.
     * @returns {void}
     */
    clr() { localStorage.clear(); },
  };
})();


(async () => {

  let tmp = getPokemon("pikachu");


  txtSearch.addEventListener("keydown", async (e) => {
    if (e.key != "Enter") return;
    let tmp = txtSearch.value.trim();
    if (!tmp) return;
    txtSearch.value = "";

    CUR = await getPokemon(tmp);
    await showInformation();
    showFavorites();
  });

  btnRNG.addEventListener("click", async (e) => {
    let rng = Math.floor(Math.random() * 1025) + 1
    CUR = await getPokemon(`${rng}`);
    await showInformation();
    showFavorites();
  });

  btnFAV.addEventListener("click", () => {
    let arr = LS.get("arr_fav_pokemon") ?? [];

    if (arr.some(({ num_id }) => num_id == CUR.num_id_pokemon)) {
      arr = arr.filter(({ num_id }) => num_id != CUR.num_id_pokemon);
    } else {
      arr.push({ num_id: CUR.num_id_pokemon, str_id: CUR.str_id_pokemon, str_name: CUR.str_name_pokemon });
    }

    LS.set("arr_fav_pokemon", arr);

    showFavorites();
  });

  entImage.addEventListener("click", () => {
    let idx = entImage.querySelector("img").id == "0" ? 1 : 0;
    entImage.innerHTML = `<img class="size-96" src="${CUR.arr_sprites[idx]}" id="${idx}" alt="${ idx ? "Shiny" : "Default" } ${CUR.str_name_pokemon}">`;
  });


  CUR = await tmp;
  await showInformation();
  showFavorites();

})();


// Functions =======================================================================================

const cbNormalize = ({ name = "", url = "" }) => ({ num_id: +(url.split("/").at(-2)), str_id: `${name}` });
const cbFindName = ({ language: { name = "" } }) => (name === LANG);

const cbFlattenChain = (arr, { evolves_to, species }) => {
  arr.push(cbNormalize(species));
  evolves_to.map((chain) => (cbFlattenChain(arr, chain)));
  return arr;
};

async function get(str) {
  try
  {
    const res = await fetch(`${API_URL}/${str}`);
    if (!res.ok) throw new Error(`Bad response status: ${res.status}`);

    return await res.json(); // * fallible
  }
  catch (err)
  {
    console.error(err);

    return null;
  }
}

async function getPokemon(arg) {
  try
  {
    const API = {};
    const obj = {};
    let tmp;

    // * normalize user arg
    arg = arg.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
    tmp = await get(`pokemon/${arg}/`);
    if (tmp == null) throw new Error(`Unable to get pokemon: ${arg}`);
    API.pokemon = tmp;

    obj.num_id_pokemon = +(API.pokemon.id);
    obj.str_id_pokemon = `${API.pokemon.name}`;
    obj.num_id_species = +(API.pokemon.species.url.split("/").at(-2));
    obj.str_id_species = `${API.pokemon.species.name}`;

    obj.arr_sprites = [
      API.pokemon["sprites"]["other"]["official-artwork"]["front_default"],
      API.pokemon["sprites"]["other"]["official-artwork"]["front_shiny"],
    ];

    obj.arr_types = API.pokemon.types.map(({ type }) => (cbNormalize(type)));
    obj.arr_abilities = API.pokemon.abilities.map(({ ability }) => (cbNormalize(ability)));
    obj.arr_moves = API.pokemon.moves.map(({ move }) => (cbNormalize(move)));

    // todo: localize types, abilities, moves
    // get(`type/${ID}/`)
    // get(`ability/${ID}/`)
    // get(`moves/${ID}/`)
    // name = .names[#].name

    arg = obj.str_id_species;
    tmp = await get(`pokemon-species/${arg}/`);
    if (tmp == null) throw new Error(`Unable to get pokemon species: ${arg}`);
    API.species = tmp;

    obj.str_name_pokemon = `${API.species.names.find(cbFindName).name || obj.str_id_pokemon}`;

    arg = API.species.evolution_chain.url.split("/").at(-2);
    tmp = await get(`evolution-chain/${arg}/`);
    if (tmp == null) throw new Error(`Unable to get evolution chain: ${arg}`);
    API.evolution_chain = tmp;

    obj.arr_evolution_chain = cbFlattenChain([], API.evolution_chain.chain);

    // todo: maybe only show evolution chain if its not a variant?
    // todo: "n/a" fallback
    // todo: localize evolution chain

    API.form = null;
    if (obj.str_id_pokemon !== obj.str_id_species) {
      arg = obj.str_id_pokemon;
      tmp = await get(`pokemon-form/${arg}/`);
      if (tmp == null) throw new Error(`Unable to get pokemon form: ${arg}`);
      API.form = tmp;

      obj.str_name_pokemon = `${API.form.names.find(cbFindName).name || obj.str_id_pokemon}`;
    }

    arg = obj.str_id_pokemon;
    tmp = await get(`pokemon/${arg}/encounters`);
    if (tmp == null) throw new Error(`Unable to get pokemon encounters: ${arg}`);
    API.encounters = tmp;

    obj.arr_locations = API.encounters.map(({ location_area }) => (cbNormalize(location_area)));

    // todo: "n/a" fallback
    // todo: localize encounters

    // console.log(API);
    // console.log(obj);

    return obj;
  }
  catch (err)
  {
    console.error(err);

    return null;
  }
}

async function getPokemonLite(arg) {
  try
  {
    const API = {};
    const obj = {};
    let tmp;

    // * normalize user arg
    arg = arg.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
    tmp = await get(`pokemon/${arg}/`);
    if (tmp == null) throw new Error(`Unable to get pokemon: ${arg}`);
    API.pokemon = tmp;

    obj.num_id_pokemon = +(API.pokemon.id);
    obj.str_id_pokemon = `${API.pokemon.name}`;
    obj.num_id_species = +(API.pokemon.species.url.split("/").at(-2));
    obj.str_id_species = `${API.pokemon.species.name}`;

    obj.arr_sprites = [
      API.pokemon["sprites"]["other"]["official-artwork"]["front_default"],
      API.pokemon["sprites"]["other"]["official-artwork"]["front_shiny"],
    ];

    arg = obj.str_id_species;
    tmp = await get(`pokemon-species/${arg}/`);
    if (tmp == null) throw new Error(`Unable to get pokemon species: ${arg}`);
    API.species = tmp;

    obj.str_name_pokemon = `${API.species.names.find(cbFindName).name || obj.str_id_pokemon}`;

    API.form = null;
    if (obj.str_id_pokemon !== obj.str_id_species) {
      arg = obj.str_id_pokemon;
      tmp = await get(`pokemon-form/${arg}/`);
      if (tmp == null) throw new Error(`Unable to get pokemon form: ${arg}`);
      API.form = tmp;

      obj.str_name_pokemon = `${API.form.names.find(cbFindName).name || obj.str_id_pokemon}`;
    }

    return obj;
  }
  catch (err)
  {
    console.error(err);

    return null;
  }
}

function showFavorites() {
  let arr = LS.get("arr_fav_pokemon") ?? [];
  let isFav = arr.some(({ num_id }) => num_id == CUR.num_id_pokemon);
  btnFAV.innerHTML = `<img class="size-6 md:size-8" src="/img/save${ isFav ? "-fill" : "" }.png" alt="Favorite">`;
  entFav.innerHTML = "";
  for (const e of arr) {
    let p = document.createElement("p");
    p.innerText = e.str_name;
    p.addEventListener("click", async () => {
      if (e.num_id == CUR.num_id_pokemon) return;
      CUR = await getPokemon(e.str_id);
      await showInformation();
      showFavorites();
    });
    entFav.appendChild(p);
  }
}

async function showInformation() {
  entIdAndName.innerText = `#${CUR.num_id_pokemon.toString().padStart(4, "0")} - ${CUR.str_name_pokemon}`;
  entImage.innerHTML = `<img class="size-96" src="${CUR.arr_sprites[0]}" id="0" alt="Default ${CUR.str_name_pokemon}">`;

  entTypes.innerText = strList(CUR.arr_types);
  entAbilities.innerText = strList(CUR.arr_abilities);
  entMoves.innerText = strList(CUR.arr_moves);
  entLocations.innerText = strList(CUR.arr_locations);
  await showEvolutions(CUR.arr_evolution_chain);
}

function strList(arr) {
  if (arr.length == 0) return "n/a";
  return arr.map(({ str_id }) => str_id).join(", ");
}

async function showEvolutions(arr) {
  if (arr.length < 2) {
    entEvolutions.innerHTML = "n/a";
    return;
  }
  entEvolutions.innerHTML = "";
  arr = await Promise.all(arr.map(async ({ str_id }) => await getPokemonLite(str_id)));
  // console.log(arr);
  for (const e of arr) {
    let d = document.createElement("div");
    d.innerHTML = `<img class="max-h-64" src="${e.arr_sprites[0]}" alt="Default ${e.str_name_pokemon}"><p>#${e.num_id_pokemon.toString().padStart(4, "0")}</p><p>${e.str_name_pokemon}</p>`;
    d.addEventListener("click", async () => {
      if (e.num_id_pokemon == CUR.num_id_pokemon) return;
      CUR = await getPokemon(e.str_id_pokemon);
      await showInformation();
      showFavorites();
    });
    entEvolutions.appendChild(d);
  }
}

