'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleted__btn = document.getElementsByClassName('del');
const deleteAll = document.querySelector('.deleteAll');

/////////////////////////////////////////////
// Workout
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in Km
    this.duration = duration; // in
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}
    `;
  }
}

//
class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min /km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

//

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this._setDescription();

    this.calcSpeed();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWordOut.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPoupup.bind(this));
    deleteAll.addEventListener('click', this._reset);
    this._checkToDelete();
  }
  _checkToDelete() {
    if (this.#workouts.length !== 0) {
      deleteAll.classList.remove('hidden');
    } else {
      deleteAll.classList.add('hidden');
    }
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }
  _loadMap(position) {
    // console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(latitude, longitude);
    //   const templateGoogleMaps = `https://www.google.com/maps/@${latitude},${longitude}`;
    //   console.log(templateGoogleMaps);
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coords).addTo(this.#map).bindPopup('Your Location').openPopup();

    // Handling Clicks on Map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;

    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputElevation.value =
      inputDuration.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWordOut(e) {
    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp) && inp > 0);

    // Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // Check if data is valid

    // If activity rinning, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (!validInputs(distance, duration, cadence))
        return alert('Inputs have to be positive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If activity cycling, create cycling object
    if (type == 'cycling') {
      const elevation = +inputElevation.value;
      if (!validInputs(distance, duration, elevation))
        return alert('Inputs have to be positive number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array

    this.#workouts.push(workout);

    // Rendr workout on map
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + Clear Input fields

    this._hideForm();

    //
    this._checkToDelete();
    // set local storage to all workout
    this._setLocalStorage();
  }

  _deleteWorkout(e) {
    const container = e.target.closest('.workout');

    const workk = this.#workouts.find(work => work.id == container.dataset.id);

    this.#workouts.splice(this.#workouts.indexOf(workk), 1);
    this._setLocalStorage(this.#workouts);

    location.reload();

    // this.#workouts.forEach(work => {
    //   this._renderWorkoutMarker(work);
    //   this._renderWorkoutMarker(work);
    // });
  }

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
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
   <h2 class="workout__title">${workout.description}</h2>
   <div class="workout__details">
     <span class="workout__icon">${
       workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
     }</span>
     <span class="workout__value">${workout.distance}</span>
     <span class="workout__unit">km</span>
   </div>
   <div class="workout__details">
     <span class="workout__icon">⏱</span>
     <span class="workout__value">${workout.duration}</span>
     <span class="workout__unit">min</span>
   </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</</span>
      <span class="workout__unit">spm</span>
    </div>
    <div class="deleted__btn"><button class="del">delete</button></div>

    </li> `;
    }

    if (workout.type === 'cycling') {
      html += `          <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div> 
    <div class="deleted__btn"><button class="del">delete</button></div>

    </li> `;
    }

    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPoupup(e) {
    if (e.target.classList.contains('del')) {
      console.log('del');

      this._deleteWorkout(e);

      // this._checkToDelete();
      return;
    }
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const w = this.#workouts;
    const workk = w.find(wo => wo.id == workoutEl.dataset.id);

    this.#map.setView(workk.coords, this.#mapZoomLevel, {
      animate: true,
      Pan: {
        duration: 1,
      },
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => this._renderWorkout(work));
    if (containerWorkouts.querySelector('li')) {
      deleteAll.classList.remove('hidden');
    } else {
      deleteAll.classList.add('hidden');
    }
  }
  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();
