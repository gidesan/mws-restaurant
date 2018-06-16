import idb from 'idb';
/**
 * Common database helper functions.
 */
export class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get PORT() {
    return 1337;
  }

  static get RESTAURANTS_URL() {
    return `http://localhost:${DBHelper.PORT}/restaurants`;
  }

  static get REVIEWS_URL() {
    return `http://localhost:${DBHelper.PORT}/reviews`;
  }

  static get IDB_NAME() {
    return 'rr-app';
  }

  static get IDB_RESTAURANTS() {
    return 'restaurants';
  }

  static get IDB_REVIEWS() {
    return 'reviews';
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    return fetch(DBHelper.RESTAURANTS_URL)
      .then(response => response.json())
      .then(restaurants => {
        DBHelper.openIDB().then(idb => {
          if (!idb) return;

          const tx = idb.transaction(this.IDB_RESTAURANTS, 'readwrite');
          const store = tx.objectStore(this.IDB_RESTAURANTS);
          restaurants.forEach((restaurant) => {
            store.put(restaurant);
          });
        });
        return restaurants;
      })
      .catch(err => {
        return DBHelper.openIDB().then(idb => {
          if (!idb) return;

          const tx = idb.transaction(this.IDB_RESTAURANTS);
          const store = tx.objectStore(this.IDB_RESTAURANTS);
          return store.getAll();
        });
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    const url = `${DBHelper.RESTAURANTS_URL}/${id}`;
    return fetch(url)
      .then(response => response.json())
      .catch(() => {
        return DBHelper.openIDB().then(idb => {
          if (!idb) return;

          const tx = idb.transaction(this.IDB_RESTAURANTS);
          const store = tx.objectStore(this.IDB_RESTAURANTS);
          return store.get(parseInt(id));
        });
      });
  }

  static updateFavoriteRestaurant(id, isFavorite) {
    return fetch(`${DBHelper.RESTAURANTS_URL}/${id}/?is_favorite=${isFavorite}`, {
      method: 'PUT',
    });
  }

  /**
   * Fetch reviews by restaurant ID.
   */
  static fetchReviewsByRestaurantId(id) {
    const url = `${DBHelper.REVIEWS_URL}?restaurant_id=${id}`;
    return fetch(url)
      .then(response => response.json())
      .catch(() => {
        return DBHelper.openIDB().then(idb => {
          if (!idb) return;

          const tx = idb.transaction(this.IDB_REVIEWS);
          const store = tx.objectStore(this.IDB_REVIEWS);
          return store.get(parseInt(id));
        });
      });        
  }  

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine) {
    const filterRestaurants = (restaurants) => restaurants.filter(r => r.cuisine_type === cuisine);
    return DBHelper
      .fetchRestaurants()
      .then(filterRestaurants);
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood) {
    const filterRestaurants = (restaurants) => restaurants.filter(r => r.neighborhood === neighborhood);
    return DBHelper
      .fetchRestaurants()
      .then(filterRestaurants);
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    const filterRestaurants = (restaurants) => {
      let results = restaurants;
      if (cuisine !== 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type === cuisine);
      }
      if (neighborhood !== 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood === neighborhood);
      }
      return results;
    };

    return DBHelper
      .fetchRestaurants()
      .then(filterRestaurants);
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods() {
    const getNeighborhoods = (restaurants) => {
      // Get all neighborhoods from all restaurants
      const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
      // Remove duplicates from neighborhoods
      const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
      return uniqueNeighborhoods;
    };

    return DBHelper
      .fetchRestaurants()
      .then(getNeighborhoods);
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines() {
    const getCuisines = (restaurants) => {
      // Get all cuisines from all restaurants
      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
      // Remove duplicates from cuisines
      const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) === i);
      return uniqueCuisines;
    };

    return DBHelper
      .fetchRestaurants()
      .then(getCuisines);
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant low resolution image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    const imgFileName = restaurant.photograph || '10'; // WORKAROUND fixes 10th restaurant's image
    return (`/images/${imgFileName}-1x.jpg`);
  }

  /**
   * Restaurant high resolution image URL.
   */
  static hiResImageUrlForRestaurant(restaurant) {
    const imgFileName = restaurant.photograph || '10'; // WORKAROUND fixes 10th restaurant's image
    return (`/images/${imgFileName}-2x.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: null
    });
    return marker;
  }

  static openIDB() {
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }

    return idb.open(this.IDB_NAME, 1, (upgradeDb) => {
      const store = upgradeDb.createObjectStore(this.IDB_RESTAURANTS, {
        keyPath: 'id'
      });
    });
  }


}
