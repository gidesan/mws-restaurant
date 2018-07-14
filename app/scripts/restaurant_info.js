import { DBHelper } from './dbhelper';
import { LocalDBHelper } from './localdbhelper';
import { SWHelper } from './swhelper';

const MAPS_API_KEY = 'AIzaSyBGLqWXqDetn8Cu0NfpDSloIWSwLupNRYE';
let registeredServiceWorker;

SWHelper
  .register()
  .then(reg => registeredServiceWorker = reg);

self.addReview = (event) => {
  event.preventDefault();
  const now = new Date().getTime();
  const form = event.target;

  const review = {
    restaurant_id: parseInt(form.restaurant_id.value),
    name: form.name.value,
    rating: form.rating.value,
    comments: form.comments.value,
    createdAt: now,
    updatedAt: now,
  };

  const appendReviewMarkup = (review) => {
    const ul = document.getElementById('reviews-list');
    ul.appendChild(createReviewHTML(review));
  }

  return !registeredServiceWorker ? DBHelper.createReview(review).then(_ => appendReviewMarkup(review))
    : LocalDBHelper
      .enqueueReview(review)
      .then((id) => {
        const enqueuedReview = Object.assign({}, review, { id });
        appendReviewMarkup(enqueuedReview);
        return registeredServiceWorker.sync.register(`syncReview_${id}`);
    })
    .catch((err) => {
      console.error(err);
    });
}

self.toggleFavorite = () => {
  const isFavorite = !self.restaurant.is_favorite;
  const id = getParameterByName('id');

  DBHelper
    .updateFavoriteRestaurant(id, isFavorite)
    .then(() => {
      const animate = true;
      refreshFavoriteButton(isFavorite, animate);
      self.restaurant.is_favorite = isFavorite;
    })
  .catch((err) => console.error(err));
};

const refreshFavoriteButton = (favorite, animate) => {
  const favBtnId = 'fav-button';
  const favBtnSelectedClass = 'fav-button-selected';
  const favBtnAnimatedClass = 'fav-button-animated';
  const label = favorite ? 'Remove from favorites' : 'Add to favorites';

  const favButton = document.getElementById(favBtnId);
  favButton.setAttribute('aria-label', label);
  favButton.setAttribute('title', label);

  if (favorite) {
    favButton.classList.add(favBtnSelectedClass);
    if (animate) {
      favButton.classList.add(favBtnAnimatedClass);
    }
  } else {
    favButton.classList.remove(favBtnSelectedClass);
  };
};

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = () => {
  if (self.restaurant) { // restaurant already fetched!
    return Promise.resolve(self.restaurant);
  }

  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    const error = 'No restaurant id in URL'
    return Promise.reject(error);
  }

  return DBHelper
    .fetchRestaurantById(id)
    .then((restaurant) => {
      self.restaurant = restaurant;
      fillRestaurantHTML();
      return restaurant;
    });
}

const fetchReviewsFromURL = () => {
  if (self.reviews) { // restaurant already fetched!
    return Promise.resolve(self.reviews);
  }

  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    const error = 'No restaurant id in URL'
    return Promise.reject(error);
  }

  return DBHelper
    .fetchReviewsByRestaurantId(id)
    .then((reviews) => {
      self.reviews = reviews;
      return reviews;
    });
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.src = DBHelper.hiResImageUrlForRestaurant(restaurant);
  image.alt = `Image of restaurant ${restaurant.name}`;

  const staticMapImage = document.getElementById('static-map');
  staticMapImage.src = `https://maps.googleapis.com/maps/api/staticmap?key=${MAPS_API_KEY}&size=500x400&markers=color:red%7Clabel:S%7C${restaurant.latlng.lat},${restaurant.latlng.lng}`;
  staticMapImage.alt = `Map of restaurant ${restaurant.name}`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.insertBefore(title, container.firstChild);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.insertBefore(title, container.firstChild);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.insertBefore(title, container.firstChild);
}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.setAttribute('role', 'article');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = dateString(review.createdAt);
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

const dateString = (date) => {
  const locale = window.navigator.language;
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('aria-current', 'page');
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

const initReviewsForm = (restaurantId) => {
  const form = document.getElementById('add-review-form');
  form.restaurant_id.setAttribute('value', restaurantId);
}

Promise
  .all([fetchRestaurantFromURL(), fetchReviewsFromURL()])
  .then(([restaurant, reviews]) => {
    fillBreadcrumb(restaurant);
    refreshFavoriteButton(restaurant.is_favorite);
    initReviewsForm(restaurant.id);
    fillReviewsHTML(reviews);
  });
