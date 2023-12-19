<script setup>
import { reactive, ref, onMounted, watch } from 'vue';
import Modal from '@/components/insertModal.vue'
import Modal2 from '@/components/deleteModal.vue'
const showModal = ref(false)
const showModal2=ref()

let crime_url = ref('');
let dialog_err = ref(false);

let location = ref('');
let neighborhoodMarkers = [];

const view = ref('map'); // Initialize view with 'map'

// ... Other variables and functions

const viewMap = () => {
  view.value = 'map';
};

const viewAbout = () => {
  view.value = 'about';
};

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
      nw: { lat: 45.008206, lng: -93.217977 },
      se: { lat: 44.883658, lng: -92.993787 }
    },
    neighborhood_markers: [
      { location: [44.942068, -93.020521], marker: 1, name: 'Conway/Battlecreek/Highwood' },
      { location: [44.977413, -93.025156], marker: 2, name: 'Greater East Side' },
      { location: [44.931244, -93.079578], marker: 3, name: 'West Side' },
      { location: [44.956192, -93.060189], marker: 4, name: 'Dayton\'s Bluff' },
      { location: [44.978883, -93.068163], marker: 5, name: 'Payne/Phalen' },
      { location: [44.975766, -93.113887], marker: 6, name: 'North End' },
      { location: [44.959639, -93.121271], marker: 7, name: 'Thomas/Dale(Frogtown)' },
      { location: [44.947700, -93.128505], marker: 8, name: 'Summit/University' },
      { location: [44.930276, -93.119911], marker: 9, name: 'West Seventh' },
      { location: [44.982752, -93.147910], marker: 10, name: 'Como' },
      { location: [44.963631, -93.167548], marker: 11, name: 'Hamline/Midway' },
      { location: [44.973971, -93.197965], marker: 12, name: 'St. Anthony' },
      { location: [44.949043, -93.178261], marker: 13, name: 'Union Park' },
      { location: [44.934848, -93.176736], marker: 14, name: 'Macalester-Groveland' },
      { location: [44.913106, -93.170779], marker: 15, name: 'Highland' },
      { location: [44.937705, -93.136997], marker: 16, name: 'Summit Hill' },
      { location: [44.949203, -93.093739], marker: 17, name: 'Capitol River' }
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

const filters = reactive({
  incidentTypes: {
    'Theft': false,
    'Auto Theft': false,
    'Burglary': false,
    'Assault': false,
    'Domestic Assault': false,
    'Sexual Offense': false,
    'Criminal Damage': false,
    'Proactive Visit': false,
    'Narcotics': false,
  },
  neighborhoods: {
    '1': false,
    '2': false,
    '3': false,
    '4': false,
    '5': false,
    '6': false,
    '7': false,
    '8': false,
    '9': false,
    '10': false,
    '11': false,
    '12': false,
    '13': false,
    '14': false,
    '15': false,
    '16': false,
    '17': false,
  },
  startDate: null, // Date or string
  endDate: null, // Date or string
  maxIncidents: 1000, // Default max incidents
});

onMounted(async () => {
  // Create Leaflet map (set bounds and valid zoom levels)
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

  try {
    const response = await fetch('data/StPaulDistrictCouncil.geojson');
    const result = await response.json();

    result.features.forEach((value) => {
      district_boundary.addData(value);
      // Update the value of the location box to the current address
      district_boundary.addTo(map.leaflet);
    });

 
    drawNeighborhoodMarkers(map.neighborhood_markers, crimeTableData.rows);
   
    map.leaflet.on('moveend', moveMap);
    map.leaflet.on('moveend', showCrimeOnMap);
    await fetchCrimeData();

   
  } catch (error) {
    console.log('Error:', error);
  }
});

function moveMap() {
  map.bounds.nw = map.leaflet.getBounds().getNorthWest();
  map.bounds.se = map.leaflet.getBounds().getSouthEast();
  map.center = map.leaflet.getCenter();
  if(map.center>=17){
    fetchCrimeData
  }
}


async function drawNeighborhoodMarkers(neighborhoods, crimes) {
  // Clear existing markers
  neighborhoodMarkers.forEach(marker => marker.remove());
  neighborhoodMarkers = [];

  neighborhoods.forEach((marker) => {
    let marker_name = getNeighborhoodNameById(marker.marker);
    let marker_crimes = calculateCrimes(marker_name, crimes, neighborhoods);

    // Create a marker with a popup
    const newMarker = L.marker(marker.location)
      .addTo(map.leaflet)
      .bindPopup(`${marker_name}: ${marker_crimes} crimes`)
      .on('click', () => {
        // Handle marker click if needed
      });

    neighborhoodMarkers.push(newMarker);
  });
}




/*

//marker for each crime
async function geocodeAddress(passedInAddress) {
    try {
        address = convertAddress(passedInAddress)
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } else {
            throw new Error('No results found');
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        return null; // Or handle the error as per your application's needs
    }
}

async function drawCrimeMarkers() {
    for (let crime of crimeTableData.rows) {
        geocodeAddress(crime.block) // Replace 'address' with the actual key for the address in your data
            .then(location => {
                if (location) {
                    L.marker([location.lat, location.lng]).addTo(map.leaflet).bindPopup(`Crime: ${crime.incident}`);
                }
            })
            .catch(error => {
                console.error('Error in geocoding:', error);
                // Handle any geocoding errors here
            });
    }
}

// Call this function after fetching and updating your crime data
await drawCrimeMarkers();


function convertAddress(address) {
    //finds 'X' chars that are surrounded by digits or word boundaries
    const regex = /(?<=\b|\d)X(?=\d|\b)/g;

    return address.replace(regex, '0');
}


*/


 function calculateCrimes(name, crimes, neighborhoods) {
    let crime_count = 0
    crimes.forEach((crime) => {
        if (getNeighborhoodNameById(crime.neighborhood_number, neighborhoods) === name) {
            crime_count++;
        }
    })
    return crime_count; 
}

async function fetchCrimeData() {
    const incidentsUrl = `http://localhost:8100/incidents`;
    // Get the current bounds of the map
  try {
    const incidentsResponse = await fetchJson(incidentsUrl);
    // Directly update crimeTableData.rows
    crimeTableData.rows = incidentsResponse;

    // Log the rows after setting them
    console.log('Crime table rows after setting:', crimeTableData.rows);
  } catch (error) {
    console.error('Error fetching crime data:', error);
  }
}



//update the table to show only the visaible neighbhoods. 
async function showCrimeOnMap() {
  if (map.leaflet) { // Check if the map instance exists
    const bounds = map.leaflet.getBounds();
    
    const visibleMarkerIds = map.neighborhood_markers
      .filter(marker => {
        const markerLatLng = L.latLng(marker.location);
        return bounds.contains(markerLatLng);
      })
      .map(marker => marker.marker);

    // Update crimeTableData.rows with crimes in visible neighborhoods
    crimeTableData.rows = crimeTableData.rows.filter(crime => visibleMarkerIds.includes(crime.neighborhood_number));
  }
}


async function fetchAndFilterCrimeData() {
  console.log('filter the data')
    let filteredData = [];
    try {
        // Attempt to fetch data and wait for the promise to resolve
        await fetchCrimeData(); // Make sure this function returns an array
        filteredData = crimeTableData.rows
    } catch (error) {
        console.error('Error fetching crime data:', error);
        // Handle error or set filteredData to a default value
    }

    // Ensure filteredData is not undefined before calling filter on it
    if (filteredData && filteredData.length > 0) {
        const bounds = map.leaflet.getBounds(); // Ensure bounds is defined
        const visible = filteredData.filter(crime => {
            const neighborhoodId = crime.neighborhood_number;
            const neighborhoodMarker = map.neighborhood_markers.find(marker => marker.marker === neighborhoodId);

            // Check if the crime's neighborhood is selected in the filters
            const isNeighborhoodSelected = filters.neighborhoods[neighborhoodId];

            if (neighborhoodMarker && isNeighborhoodSelected) {
                const markerLatLng = L.latLng(neighborhoodMarker.location);
                return bounds.contains(markerLatLng);
            }
            return false;
        });
        
        crimeTableData.rows = visible;
    } else {
        // Handle the case where filteredData is empty or undefined
        crimeTableData.rows = [];
    }
}


// Watch for filter changes and fetch data
//watch(filters, fetchAndFilterCrimeData, { deep: true });


async function fetchJson(url) {
  try {
    let response = await fetch(url);
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
  if (loc_input.value !== '') {
    locationTest(loc_input.value);
  }
}

//function for when entering a location it updates to that location on the map
function locationTest(loc) {
  let url = 'https://nominatim.openstreetmap.org/search?q=' + loc + '&format=json&&limit=1';
  fetch(url)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      console.log(data);
      if (data.length > 0) {
        let lat = data[0].lat;
        let lon = data[0].lon;
        if (
          lat >= map.bounds.se.lat &&
          lat <= map.bounds.nw.lat &&
          lon >= map.bounds.nw.lng &&
          lon <= map.bounds.se.lng
        )
          map.leaflet.setView([lat, lon], 17);
        else {
          console.log("Inputed location is outside of St. Paul");
          map.leaflet.setView([map.center.lat, map.center.lng], map.zoom);
        }
      } else {
        console.log("Not found");
      }
    })
    .catch((error) => {
      console.log('Error:', error);
    });
    fetchCrimeData()
    console.log('enter location function')
}

//function for updating the location in the input box when you pan around the map. 
function updateLocationInput() {
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
    fetchCrimeData()
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


//these methods are for deleting a entry in the database. 
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


  /*import { watch } from 'vue';

  watch(() => {
    console.log('watch')
    if (map.leaflet) {
      return map.leaflet.getBounds();
    }
  }, (newBounds, oldBounds) => {
    console.log('new bounds, old bounds')
    if (newBounds !== oldBounds) {
      console.log('watch fetch crime data')
      fetchCrimeData();
    }
  }, { deep: true }); */


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
  <!-- Colorful banner -->
  <div class="colorful-banner">
    <h1 class="banner-title">Saint Paul Crime</h1>
  </div>

  <!-- Navigation buttons -->
  <div class="grid-container">
    <div class="grid-x grid-padding-x">
      <p class="cell small-6 text-left navigation-button"
        :class="{ 'selected': view === 'map', 'unselected': view !== 'map' }" @click="viewMap">Map</p>
      <p class="cell small-6 text-right navigation-button"
        :class="{ 'selected': view === 'about', 'unselected': view !== 'about' }" @click="viewAbout">About</p>
    </div>
  </div>


  <div v-show="view === 'map'">
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
    <button class="modal" @click="showModal = true">Insert Case</button>


    <Teleport to="body">
      <modal :show="showModal" @close="showModal = false">
        <template #header>
          <h3>Insert Crime Form</h3>
        </template>
      </modal>
    </Teleport>


    <!--delete crime button-->
    <button class="modal" id="modal2" @click="showModal2 = true">Delete Case</button>

    <Teleport to="body">
      <modal2 :show2="showModal2" @close="showModal2 = false" @delete-success="handleDeleteSuccess">
        <template #header>
          <h3>Insert Crime Form</h3>
        </template>
      </modal2>
    </Teleport>


      <!-- Filter UI for incident types -->
    <div v-for="(value, key) in filters.incidentTypes" :key="key">
      <input type="checkbox" v-model="filters.incidentTypes[key]" :id="key">
      <label :for="key">{{ key }}</label>
    </div>

    <!-- Filter UI for neighborhoods -->
    <h5 style = "font-size: 1rem">Neighborhoods </h5>
    <div class="checkbox-container">
      <div v-for="(value, key) in filters.neighborhoods" :key="key" class="checkbox-item">
        <input type="checkbox" v-model="filters.neighborhoods[key]" :id="key">
        <label :for="key">{{ getNeighborhoodNameById(parseInt(key,10)) }}</label>
      </div>
    </div>

    <!-- Date range picker -->
    <input type="date" v-model="filters.startDate">
    <input type="date" v-model="filters.endDate">

    <!-- Max incidents input -->
    <input type="number" v-model="filters.maxIncidents">

    <!-- Optional: Update button -->
    <button @click="fetchAndFilterCrimeData">Update</button>

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
  </div>

  <div v-if="view === 'about'">
    <!-- Replace this with your actual about the project content: can be done here or by making a new component -->
    <div class="grid-container">
      <div class="grid-x grid-padding-x">
        <h1 class="cell auto">About the Project</h1>
        <div class="cell small-12 large-12">
          <h2 class="cell auto">About Us</h2>
        </div>
        <div class="cell small-12 medium-12 large-8">
          <h3> Prachi Arons </h3>
        </div>
        <div class="cell small-12 medium-12 large-12">
          <h5>
            Greetings! I am a soon-to-be graduate from the University of Saint Thomas,
            with a major in Computer Science. Passionate about technology and innovation,
            I aspire to venture into the realm of Front-End Development upon graduation,
            aiming to create seamless and engaging user experiences. Alternatively,
            I am also considering a career path as a Project Manager, where I can leverage
            my technical skills to oversee and drive successful projects.
            As I embark on this exciting journey, I look forward to contributing my skills and
            enthusiasm to the ever-evolving world of technology.
          </h5>
        </div>
        <div class="cell small-12 medium-12 large-2"></div>
        <!-- add image -->
        <div class="cell small-12 medium-12 large-4">

        </div>

        <div class="cell small-12 medium-12 large-8">
          <h3> Isaiah Giebel </h3>
        </div>
        <div class="cell small-12 medium-12 large-6">
          <h5>
            Hello! I am a Senior at the University of Saint Thomas where I'm double majoring in Computer Science and Data Science. 
            I am interested in artificial intelligence and look forward to pursuing a career in this field.
            In my free time I love to rock climb, listen to music, and watch anime. 
          </h5>
        </div>
        <div class="cell small-12 medium-12 large-2"></div>
        <div class="cell medium-auto" style="float: right;"><img src="/src/images/homePic_resized.png" alt="Me" style ='max-height: 15rem' /></div>
        <div class="cell small-12 medium-12 large-4">

        </div>


        <div class="cell small-12 large-12">
          <h2 class="cell auto">Tools Used</h2>
        </div>
        <div class="cell small-3 medium-3 large-3">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Vue.js_Logo_2.svg/1184px-Vue.js_Logo_2.svg.png"
            alt="Vue Logo" />
        </div>
        <div class="cell small-3 medium-3 large-3">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Leaflet_logo.svg/800px-Leaflet_logo.svg.png.png"
            alt="Leaflet Logo" />
        </div>
        <div class="cell small-3 medium-3 large-3">
          <img src="https://raw.githubusercontent.com/juancarlospaco/nim-overpass/master/osm.jpg" alt="Nominatim Logo" />
        </div>
        <div class="cell small-3 medium-3 large-3">
          <img
            src="https://www.arcgis.com/sharing/rest/content/items/1e2bdd73bc384d70aea7a337ba0cd3ce/resources/stpaul-logo-horizontal-web-only.png?v=1671424003839"
            alt="St Paul Logo" />
        </div>
        <div class="cell small-6 medium-3 large-3">
          <h3> Vue </h3>
          <p>"Vue is a JavaScript framework for building user interfaces.
            It builds on top of standard HTML, CSS, and JavaScript and provides a declarative and
            component-based programming model that helps you efficiently develop user interfaces,
            be they simple or complex."</p>
          <a href="https://vuejs.org/">Learn more about Vue</a>

        </div>


        <div class="cell small-6 medium-3 large-3">
          <h3> Leaflet </h3>
          <p>"Leaflet is the leading open-source JavaScript library for mobile-friendly interactive maps.
            Weighing just about 42 KB of JS, it has all the mapping features most developers ever need.
            Leaflet is designed with simplicity, performance and usability in mind. It works efficiently across
            all major desktop and mobile platforms, can be extended with lots of plugins, has a beautiful, easy to
            use and well-documented API and a simple, readable source code that is a joy to contribute to."</p>
          <a href="https://leafletjs.com/">Learn more about Leaflet</a>
        </div>


        <div class="cell small-6 medium-3 large-3">
          <h3> Nominatim </h3>
          <p>"Nominatim uses OpenStreetMap data to find locations on Earth by name
            and address (geocoding). It can also do the reverse, find an address
            for any location on the planet."</p>
          <a href="https://nominatim.org/">Learn more about Nominatim</a>
        </div>


        <div class="cell small-6 medium-3 large-3">
          <h3> St. Paul Crime API </h3>
          <p>"Incidents from Aug 14 2014 through the most recent available in the City of Saint Paul.
            The data is released by the Saint Paul Police Department every 2 to 3 weeks and includes the
            following categories: Homicide, Rape, Robbery, Aggravated Assault, Burglary, Theft, Auto Theft,
            Arson, Domestic Assaults, Vandalism, Narcotics, and Firearm Discharges.
            Statistics displayed do not reflect official crime index totals, and may change after full investigation"</p>
          <a href="https://information.stpaul.gov/datasets/stpaul::crime-incident-report/about">Learn more about the St
            Paul Crimed Databse</a>
        </div>


        <div class="cell small-12 large-12">
          <br>
          <br>
          <h2 class="cell auto">6 Interesting Findings</h2>

        </div>

        <div class="cell small-12 large-12">
          <br>
          <br>
          <h2 class="cell auto">Video Demo</h2>
        </div>

      </div>
    </div>
  </div>
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

th,
td {
  border: 1px solid #e6d8d8;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
}

.legend {
  display: flex;
  justify-content: center;
  /* Center horizontally */
  align-items: center;
  /* Center vertically */
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
  background-color: #ffcccc;
  /* Muted red */
}

.property-crime {
  background-color: #fff4cc;
  /* Muted yellow */
}

.other-crime {
  background-color: #ccffcc;
  /* Muted green */
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

#modal2 {
  background-color: #c30101
}

#modal2:hover {
  background-color: #8f0000
}

#delete-button {
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
}

#modal2 {
  background-color: #c30101
}

#modal2:hover {
  background-color: #8f0000
}

#delete-button {
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
}

.colorful-banner {
  background: linear-gradient(to right, #419361, rgb(147, 228, 152));
  /* Gradient with colorful background */
  text-align: center;
  padding: 5px 0;
  /* Add padding for better visibility */
}

.banner-title {
  color: #fff;
  /* Text color for better contrast */
}

.navigation-button {
  background: #032d1c;
  /* Color for the navigation buttons */
  color: #fff;
  /* Text color for better contrast */
  padding: 10px 20px;
  cursor: pointer;
}

.navigation-button.selected {
  background: #5c6c67;
  ;
  /* Color for the selected navigation button */
}

.navigation-button.unselected:hover {
  background: #125e45;
  /* Color for the hover effect on unselected buttons */
}

/* Remove padding from the grid */
.grid-x {
  margin: 0;
}

/* For neighborhood and type checkboxes */
.checkbox-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    max-width: 50%
}

.checkbox-item {
    margin-left: 10px;
}

</style>
