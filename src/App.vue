<script setup>
import { reactive, ref, onMounted } from 'vue';


let crime_url= ref('');
let dialog_err = ref(false);
let location = ref('');

let map = reactive(
    {
        leaflet: null,
        center: {
            lat: 44.955139,
            lng: -93.102222,
            address: ''
        },
        zoom: 12,
        bounds: {
            nw: {lat: 45.008206, lng: -93.217977},
            se: {lat: 44.883658, lng: -92.993787}
        },
        neighborhood_markers: [
            {location: [44.942068, -93.020521], marker: null, name: 'Conway/Battlecreek/Highwood'},
            {location: [44.977413, -93.025156], marker: null, name: 'Greater East Side'},
            {location: [44.931244, -93.079578], marker: null, name: 'West Side'},
            {location: [44.956192, -93.060189], marker: null, name: 'Dayton\'s Bluff'},
            {location: [44.978883, -93.068163], marker: null, name: 'Payne/Phalen'},
            {location: [44.975766, -93.113887], marker: null, name: 'North End'},
            {location: [44.959639, -93.121271], marker: null, name: 'Thomas/Dale(Frogtown)'},
            {location: [44.947700, -93.128505], marker: null, name: 'Summit/University'},
            {location: [44.930276, -93.119911], marker: null, name: 'West Seventh'},
            {location: [44.982752, -93.147910], marker: null, name: 'Como'},
            {location: [44.963631, -93.167548], marker: null, name: 'Hamline/Midway'},
            {location: [44.973971, -93.197965], marker: null, name: 'St. Anthony'},
            {location: [44.949043, -93.178261], marker: null, name: 'Union Park'},
            {location: [44.934848, -93.176736], marker: null, name: 'Macalester-Groveland'},
            {location: [44.913106, -93.170779], marker: null, name: 'Highland'},
            {location: [44.937705, -93.136997], marker: null, name: 'Summit Hill'},
            {location: [44.949203, -93.093739], marker: null, name: 'Capitol River'}
        ]
    }
);
let crimeTableData = reactive({
  columns: [
    { name: 'Case Number', key: 'case_number' },
    { name: 'Date', key: 'date' },
    { name: 'Time', key: 'time' },
    { name: 'Code', key: 'code' },
    { name: 'Incident', key: 'incident' },
    { name: 'Police Grid', key: 'police_grid' },
    { name: 'Neighborhood Name', key: 'neighborhood_number' },
    { name: 'Block', key: 'block' }
  ],
  rows: [],
  
});




// Vue callback for once <template> HTML has been added to web page
onMounted(() => {
    // Create Leaflet map (set bounds and valied zoom levels)
    map.leaflet = L.map('leafletmap').setView([map.center.lat, map.center.lng], map.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 12,
        maxZoom: 18
    }).addTo(map.leaflet);
    map.leaflet.setMaxBounds([[44.883658, -93.217977], [45.008206, -92.993787]]);
    //update the address in the input box while you move around the map. 
    map.leaflet.on('moveend', updateLocationInput); 

    // Get boundaries for St. Paul neighborhoods
    let district_boundary = new L.geoJson();
    
    fetch('data/StPaulDistrictCouncil.geojson')

    
    .then((response) => {
        return response.json();
    })
    .then((result) => {
        result.features.forEach((value) => {
            //Blue box around St. Paul
            district_boundary.addData(value);
            district_boundary.addTo(map.leaflet);
        });

    })
    .catch((error) => {
        console.log('Error:', error);
    });
    map.leaflet.on('moveend', () => {
    updateLocationInput();
    fetchCrimeData();
    });

});


// FUNCTIONS
async function fetchCrimeData() {
    const bounds = map.leaflet.getBounds();
    const startDate = '2023-10-24';
    const endDate = '2023-11-01';
    const codes = '';
    const limit = 1000;
    const incidentsUrl = `http://localhost:8100/incidents?start_date=${startDate}&end_date=${endDate}&code=${codes}&limit=${limit}&min_lat=${bounds.getSouth()}&max_lat=${bounds.getNorth()}&min_lng=${bounds.getWest()}&max_lng=${bounds.getEast()}`;

    try {
        const incidentsResponse = await fetchJson(incidentsUrl);
        console.log('Fetched crime data:', incidentsResponse);
        // Directly update crimeTableData.rows
        crimeTableData.rows = incidentsResponse;
        
    
        // Log the rows after setting them
        console.log('Crime table rows after setting:', crimeTableData.rows);
    } catch (error) {
        console.error('Error fetching crime data:', error);
    }
}
async function fetchJson(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        throw new Error(`Error fetching JSON: ${error.message}`);
    }
}
function getNeighborhoodNameById(id) {
  const neighborhood = neighborhoods.value.find(neighborhood => neighborhood.id === id);
  return neighborhood ? neighborhood.name : null;
}

// Function called when user presses 'OK' on dialog box
function closeDialogOk() {
    let dialog = document.getElementById('rest-dialog');
    let url_input = document.getElementById('dialog-url');
    if (crime_url.value !== '' && url_input.checkValidity()) {
        dialog_err.value = false;
        dialog.close();
    }
    else {
        dialog_err.value = true;
    }
}

// Function called when user presses 'GO' on dialog box
//44.9431° N, 93.1897° W St. Thomas Coordinates. Paris coordinates: 48.8566° N, 2.3522° E
function closeDialogGo() {
    let dialog = document.getElementById('rest-dialog');
    let loc_input = document.getElementById('dialog-loc');  
    if(loc_input.value !== ''){
        locationTest(loc_input.value);
        dialog.close();
    }
}

//function for when entering a location it updates to that location on the map
function locationTest(loc){
    let url = 'https://nominatim.openstreetmap.org/search?q=' + loc + '&format=json&&limit=1';
    fetch(url)
    .then((response)=>{
        return response.json();
    })
    .then((data)=>{
        console.log(data);  
        if(data.length > 0){
            let lat = data[0].lat;
            let lon = data[0].lon;
            if( 
                lat >= map.bounds.se.lat &&
                lat <= map.bounds.nw.lat &&
                lon >= map.bounds.nw.lng &&
                lon <= map.bounds.se.lng
            )
            map.leaflet.setView([lat, lon], 17);
            else{
                console.log("Inputed location is outside of St. Paul");
                map.leaflet.setView([map.center.lat, map.center.lng], map.zoom);
            }
        }else{
            console.log("Not found");
        }   
    })
    .catch((error)=>{
        console.log('Error:', error);
    });
}

//function for updating the location in the input box when you pan around the map. 
function updateLocationInput(){ 
    const center = map.leaflet.getCenter();
    const lat = center.lat.toFixed(6);
    const lng = center.lng.toFixed(6);
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    fetch(url)
        .then((response) => response.json())
        .then((data) => {
            if (data.display_name) {
                map.center.address = data.display_name;
                document.getElementById('dialog-loc').value = data.display_name;
            }
        })
        .catch((error) => {
            console.log('Error:', error);
        });
}

//These two methods change the color of the row in the table based off of the code. 
const isCodeInCategory = (code, range) => {
  const [start, end] = range.split('-').map(Number);
  return code >= start && code <= end;
};
const getRowStyle = (code) => {
  const violentCrimeRanges = ['100-300', '400-500', '800-1000'];
  const propertyCrimeRanges = ['300-400', '500-800'];
  if (violentCrimeRanges.some((range) => isCodeInCategory(code, range))) {
    return { backgroundColor: '#ffcccc' }; // Muted red
  } else if (propertyCrimeRanges.some((range) => isCodeInCategory(code, range))) {
    return { backgroundColor: '#fff4cc' }; // Muted yellow
  } else {
    return { backgroundColor: '#ccffcc' }; // Muted green
  }
};
</script>


<template>
        <!--
     <dialog id="rest-dialog" open>
        <h1 class="dialog-header">St. Paul Crime REST API</h1>
        <label class="dialog-label">URL: </label>
        <input id="dialog-url" class="dialog-input" type="url" v-model="crime_url" placeholder="http://localhost:8100" />
        <p class="dialog-error" v-if="dialog_err">Error: must enter valid URL</p>
        <br/>
        <button class="button" type="button" @click="closeDialogOk">OK</button>
    </dialog>
-->
  <div class="grid-container">
    <div class="grid-x grid-padding-x">
      <label class="dialog-label">Location: </label>
      <input id="dialog-loc" class="dialog-input" v-model="location" placeholder="Enter a location" />
      <button class="button cell" type="button" @click="closeDialogGo">GO</button>
    </div>
    <div id="leafletmap" class="cell auto"></div>
  </div>

  <!-- Legend-->
  <div class="legend">
    <div class="legend-item">
      <div class="legend-color" style="background-color: #ffcccc;"></div>
      <div class="legend-label"> Violent Crimes</div>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background-color: #fff4cc;"></div>
      <div class="legend-label">Property Crimes</div>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background-color: #ccffcc;"></div>
      <div class="legend-label">Other Crimes </div>
    </div>
  </div>

<!-- Table -->
  <table>
    <thead>
      <tr>
        <th v-for="column in crimeTableData.columns" :key="column.key">{{ column.name }}</th>
      </tr>
    </thead>
    <tbody>
      <template v-if="crimeTableData.rows.length > 0">
        <tr v-for="row in crimeTableData.rows" :key="row.case_number" :style="getRowStyle(row.code)">
          <!-- Render table rows -->
          <td>{{ row.case_number }}</td>
          <td>{{ row.date }}</td>
          <td>{{ row.time }}</td>
          <td>{{ row.code }}</td>
          <td>{{ row.incident }}</td>
          <td>{{ row.police_grid }}</td>
          <td>{{ row.neighborhood_number }}</td>
          <td>{{ row.block }}</td>
        </tr>
      </template>
      <template v-else>
        <tr>
          <td colspan="8">No Data Available</td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<style>
#rest-dialog {
    width: 20rem;
    margin-top: 1rem;
    z-index: 1000;
}

#leafletmap {
    height: 500px;
}

.dialog-header {
    font-size: 1.2rem;
    font-weight: bold;
}

.dialog-label {
    font-size: 1rem;
}

.dialog-input {
    font-size: 1rem;
    width: 100%;
}

.dialog-error {
    font-size: 1rem;
    color: #D32323;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th, td {
  border: 1px solid #e6d8d8;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
}
.legend {
  display: flex;
  justify-content: center; /* Center horizontally */
  align-items: center; /* Center vertically */
  margin-top: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-right: 20px;
}

.legend-color {
  width: 20px;
  height: 20px;
  margin-right: 8px;
}

.legend-label {
  font-size: 1rem;
}
.violent-crime {
  background-color: #ffcccc; /* Muted red */
}

.property-crime {
  background-color: #fff4cc; /* Muted yellow */
}

.other-crime {
  background-color: #ccffcc; /* Muted green */
}

</style>
