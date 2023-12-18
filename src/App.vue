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
            {location: [44.942068, -93.020521], marker: 1, name: 'Conway/Battlecreek/Highwood'},
            {location: [44.977413, -93.025156], marker: 2, name: 'Greater East Side'},
            {location: [44.931244, -93.079578], marker: 3, name: 'West Side'},
            {location: [44.956192, -93.060189], marker: 4, name: 'Dayton\'s Bluff'},
            {location: [44.978883, -93.068163], marker: 5, name: 'Payne/Phalen'},
            {location: [44.975766, -93.113887], marker: 6, name: 'North End'},
            {location: [44.959639, -93.121271], marker: 7, name: 'Thomas/Dale(Frogtown)'},
            {location: [44.947700, -93.128505], marker: 8, name: 'Summit/University'},
            {location: [44.930276, -93.119911], marker: 9, name: 'West Seventh'},
            {location: [44.982752, -93.147910], marker: 10, name: 'Como'},
            {location: [44.963631, -93.167548], marker: 11, name: 'Hamline/Midway'},
            {location: [44.973971, -93.197965], marker: 12, name: 'St. Anthony'},
            {location: [44.949043, -93.178261], marker: 13, name: 'Union Park'},
            {location: [44.934848, -93.176736], marker: 14, name: 'Macalester-Groveland'},
            {location: [44.913106, -93.170779], marker: 15, name: 'Highland'},
            {location: [44.937705, -93.136997], marker: 16, name: 'Summit Hill'},
            {location: [44.949203, -93.093739], marker: 17, name: 'Capitol River'}
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
    map.leaflet.on('moveend', updateLocationInput);

    // Get boundaries for St. Paul neighborhoods
    let district_boundary = new L.geoJson();
    
    fetch('data/StPaulDistrictCouncil.geojson')
    .then((response) => {
        return response.json();
    })
    .then((result) => {
        result.features.forEach((value) => {
            district_boundary.addData(value);
            //update the value of the location box to the current address
            district_boundary.addTo(map.leaflet);
        });
    })
    .catch((error) => {
        console.log('Error:', error);
    });
    map.leaflet.on('moveend', () => {
    updateLocationInput();
    });
    fetchCrimeData();
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
//use the markers to display the neighbhood name in the table. 
function getNeighborhoodNameById(id) {
  const neighborhood = map.neighborhood_markers.find((marker) => marker.marker === id);
  return neighborhood ? neighborhood.name : null;
}

// Function called when user presses 'OK' on dialog box
/*
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
*/

// Function called when user presses 'GO' on dialog box
//44.9431° N, 93.1897° W St. Thomas Coordinates. Paris coordinates: 48.8566° N, 2.3522° E
function closeGo() {
    let loc_input = document.getElementById('dialog-loc');  
    if(loc_input.value !== ''){
        locationTest(loc_input.value);
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

import Modal from './components/insertModal.vue'

const showModal = ref(false)

import Modal2 from './components/deleteModal.vue'

const showModal2 = ref(false)

function deleteRow(caseNumber) {
  if (confirm(`Are you sure you want to delete case number ${caseNumber}?`)) {
    deleteData(caseNumber);
  }
}

async function deleteData(caseNumber) {
  try {
    const response = await fetch(`http://localhost:8100/remove-incident`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ case_number: caseNumber })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    } else {
      console.log("Successfully deleted");
      crimeTableData.rows = crimeTableData.rows.filter(row => row.case_number !== caseNumber);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}


  async function handleDeleteSuccess(deletedCaseNumber) {
    console.log('wopo gangnam style')
    crimeTableData.rows = crimeTableData.rows.filter(row => row.case_number !== deletedCaseNumber);
  }


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
      <button class="button cell" type="button" @click="closeGo()">GO</button>
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

  <!--insert crime button-->
  <button class="modal" @click="showModal = true" >Insert Case</button>

  <Teleport to="body">
    <!-- use the modal component, pass in the prop -->
    <modal :show="showModal" @close="showModal = false">
      <template #header>
        <h3>Insert Crime Form</h3>
      </template>
    </modal>
  </Teleport>

  <!--delete crime button-->
  <button class="modal" id="modal2" @click="showModal2 = true">Delete Case</button>

  <Teleport to="body">
    <!-- use the modal component, pass in the prop -->
    <modal2 :show2="showModal2" @close="showModal2 = false" @delete-success="handleDeleteSuccess">
      <template #header>
        <h3>Insert Crime Form</h3>
      </template>
    </modal2>
  </Teleport>

<!-- Table -->
  <table>
    <thead>
      <tr>
        <th v-for="column in crimeTableData.columns" :key="column.key">{{ column.name }}</th>
      </tr>
    </thead>
    <tbody>
      <template v-if="crimeTableData.rows.length > 0">
        <tr v-for="row in crimeTableData.rows.slice().reverse()" :key="row.case_number" :style="getRowStyle(row.code)">
          <!-- Render table rows -->
          <td>{{ row.case_number }}<button id="delete-button" @click="deleteRow(row.case_number)">x</button></td>
          <td>{{ row.date }}</td>
          <td>{{ row.time }}</td>
          <td>{{ row.code }}</td>
          <td>{{ row.incident }}</td>
          <td>{{ row.police_grid }}</td>
          <td>{{ getNeighborhoodNameById(row.neighborhood_number) }}</td>
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

.modal {
  background-color: #4CAF50;
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 8px;
}

.modal:hover {
  background-color: #2f7432;
}

#modal2{
  background-color: #c30101
}
#modal2:hover{
  background-color: #8f0000
}

#delete-button{
  background-color: #c30101;
  border: none;
  color: white;
  padding: 3px 5px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 5px;
  margin-left: 10px;
  float: right
}

</style>
