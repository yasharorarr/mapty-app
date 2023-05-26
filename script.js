'use strict';

// prettier-ignore

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks=0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; //in km
    this.duration = duration; //in min
    //this. _setDescription(); cant be called here bcoz here no type variable
  }

  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
  }

  click(){
    this.clicks++;
  }
}

class Running extends Workout {
  type = `running`;
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration); //above first 3 parameters will be called as soon as this class obj is created.
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();//Its here in child and not in parent because type is calculated here not in parent.
  }
  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = `cycling`; //or this.type=`cycling`; like this in down constructor

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration); //above first 3 parameters will be called as soon as this class obj is created.
    this.elevationGain = elevationGain;
    // this.type=`cycling`
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);
////////////////////////////////
//Applcation Architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel =13;
  #mapEvent;
  #workouts = [];
  //Constructor is called immediately as soon as object is created.
  constructor() {
    //Get Users Position
    this._getPosition();


    //Get data from Local Storage
    this._getLocalStorage();

    //Attach Event Handlers
    form.addEventListener(`submit`, this._newWorkout.bind(this)); //not calling just passing here coz its a call back function , automatically called.
    inputType.addEventListener(`change`, this._toggleElevationField);
    containerWorkouts.addEventListener(`click`, this._moveToPopup.bind(this))
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Could not get your position`);
        }
      );
    }
  }
  //And so in JavaScript, we'll then call this callback function here and pass in the position argument, as soon as the current position of the user is determined.

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(
      `https://www.google.com/maps/@${latitude},${longitude}?authuser=0`
    );
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map); //coz we are using bing method above, this property is not undefined.

    //Handling clicks on map
    this.#map.on(`click`, this._showForm.bind(this));

    this.#workouts.forEach(work=>{
      this._renderWorkoutMarker(work); //wont work bcoz map has not yet loaded but local stoarge is featched as soon as page lodes. this is the drawaback of asyn JS
      
    })
  }

  //bind used so bcz without bing, its working like a regular fns call. so this is not kn by the code
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove(`hidden`); //removes the hide property of the form when clicked on map area.
    inputDistance.focus(); //Brings focus immediately to this field.
  }

  _hideForm() {
    //Empty the inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
      '';

    form.style.display = 'none';
    form.classList.add(`hidden`);
    setTimeout(() => form.style.display = `grid`, 1000)
  }
  _toggleElevationField() {
    inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
    inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
  }

  _newWorkout(e) {
    e.preventDefault();
    //Helper Functions
    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    // Get data from the form
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    const { lat, lng } = this.#mapEvent.latlng;
    let workout
    //If workout Running create running obj 
    if (type === "running") {
      const cadence = +inputCadence.value;
      //Check if data is valid Guard Clause
      if (
        // !Number.isFinite(distance)
        // || !Number.isFinite(duration)
        // || !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) { return alert(`Inputs have to be positive numbers!`); }
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If workout Cycling create Cycling obj
    if (type === "cycling") {
      //Check if data is valid
      const elevation = +inputElevation.value;
      if (
        // !Number.isFinite(distance)
        // || !Number.isFinite(duration)
        // || !Number.isFinite(cadence)
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert(`Inputs have to be positive numbers!`);
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);

    }

    //Add new obj to workout array
    this.#workouts.push(workout);
    console.log(workout)
    //Render Workout on map as marker
    this._renderWorkoutMarker(workout)
    // console.log(this.#mapEvent);
    //Render workout on list
    this._renderWorkout(workout);
    //Hide form + clear input fields
    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();
  }
  //Display Marker
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`} ${workout.description}`)
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `

    if (workout.type === `running`) {
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>
  `;
    }
    if (workout.type === `cycling`) {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEL = e.target.closest(`.workout`);

    if (!workoutEL) {
      return
    };
    const workout=this.#workouts.find(
      work=>work.id === workoutEL.dataset.id
    );
    console.log(workout);

    this.#map.setView(workout.coords,this.#mapZoomLevel,{
      animate:true,
      pan:{
        duration:1,
      }
    })

    //using the public interface.
    //workout.click(); // in local storage we lost the prototype chain while converting string to parse : major issue will lose prototypal inheritancd chain
    

  }

  _setLocalStorage(){
    localStorage.setItem('workouts',JSON.stringify(this.#workouts)); //hold small amounts of data. blocking
    //stringfy to convert to string
  }
  _getLocalStorage(){
    const data=JSON.parse(localStorage.getItem(`workouts`)); //json . parse to convert back to object
    console.log(data);

    if(!data) return;

    this.#workouts = data; //if there is any data in local storage , then it will restored back to the workouts array.
    this.#workouts.forEach(work=>{
      this._renderWorkout(work);
      // this._renderWorkoutMarker(); wont work bcoz map has not yet loaded but local stoarge is featched as soon as page lodes. this is the drawaback of asyn JS

    })
  }
  reset(){
    localStorage.removeItem(`workouts`);
    location.reload();
  }
}
const app = new App();
// app._getPosition(); //Not needed coz constructor is already their
