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

  static get IDB_REVIEWS_QUEUE() {
    return 'reviewsQueue';
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    return fetch(DBHelper.RESTAURANTS_URL)
      .then(response => response.json())
      .then(restaurants => DBHelper.fixFavoriteType(restaurants))
      .then(restaurants => {
        DBHelper.openIDB().then(idb => {
          if (!idb) return;

          const tx = idb.transaction(DBHelper.IDB_RESTAURANTS, 'readwrite');
          const store = tx.objectStore(DBHelper.IDB_RESTAURANTS);
          restaurants.forEach((restaurant) => {
            store.put(restaurant);
          });
        });
        return restaurants;
      })
      .catch(_ => {
        return DBHelper.openIDB().then(idb => {
          if (!idb) return;

          const tx = idb.transaction(DBHelper.IDB_RESTAURANTS);
          const store = tx.objectStore(DBHelper.IDB_RESTAURANTS);
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
      .then(restaurant => DBHelper.fixFavoriteType(restaurant))
      .catch(() => {
        return DBHelper.openIDB().then(idb => {
          if (!idb) return;

          const tx = idb.transaction(DBHelper.IDB_RESTAURANTS);
          const store = tx.objectStore(DBHelper.IDB_RESTAURANTS);
          return store.get(parseInt(id));
        });
      });
  }

  /**
   * Set / Unset a restaurant as favorite.
   */
  static updateFavoriteRestaurant(id, isFavorite) {
    return fetch(`${DBHelper.RESTAURANTS_URL}/${id}/?is_favorite=${isFavorite}`, {
      method: 'PUT',
    });
  }

  /**
   * Create a review
   */
  static createReview(review) {
    return fetch(DBHelper.REVIEWS_URL, {
      method: 'POST',
      body: JSON.stringify(review)
    });
  }

  /**
   * Fetch reviews by restaurant ID.
   */
  static fetchReviewsByRestaurantId(id) {
    const url = `${DBHelper.REVIEWS_URL}?restaurant_id=${id}`;
    return fetch(url)
      .then(response => response.json())
      .then(reviews => {
        DBHelper.openIDB().then(idb => {
          if (!idb) return;

          const tx = idb.transaction(DBHelper.IDB_REVIEWS, 'readwrite');
          const store = tx.objectStore(DBHelper.IDB_REVIEWS);
          reviews.forEach((review) => {
            store.put(review);
          });
        });
        return reviews;
      })
      .catch(() => {
        return DBHelper.openIDB().then(idb => {
          if (!idb) return;

          const tx = idb.transaction(DBHelper.IDB_REVIEWS);
          const store = tx.objectStore(DBHelper.IDB_REVIEWS);
          const idx = store.index('restaurant_id');
          return idx.getAll(parseInt(id));
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

  static getIDBReviewsQueue() {
    return DBHelper
      .openIDB()
      .then(idb => {
        if (!idb) return Promise.resolve();

        const tx = idb.transaction(DBHelper.IDB_REVIEWS, 'readonly');
        const store = tx.objectStore(DBHelper.IDB_REVIEWS);
        return store.getAll();
      });
  }

  static getIDBReview(id) {
    return DBHelper
      .openIDB()
      .then(idb => {
        if (!idb) return Promise.resolve();

        const tx = idb.transaction(DBHelper.IDB_REVIEWS, 'readonly');
        const store = tx.objectStore(DBHelper.IDB_REVIEWS);
        return store.get(id);
      });
  }

  static saveIDBReview(review) {
    return DBHelper
      .openIDB()
      .then(idb => {
        if (!idb) return Promise.resolve();

        const tx = idb.transaction(DBHelper.IDB_REVIEWS, 'readwrite');
        const store = tx.objectStore(DBHelper.IDB_REVIEWS);
        return store.put(review);
      });
  }

  static enqueueIDBReview(review) {
    return DBHelper
      .openIDB()
      .then(idb => {
        if (!idb) return Promise.resolve();

        const tx = idb.transaction(DBHelper.IDB_REVIEWS_QUEUE, 'readwrite');
        const store = tx.objectStore(DBHelper.IDB_REVIEWS_QUEUE);
        return store.put(review);
      });
  }

  static dequeueIDBReview(review) {
    return DBHelper
      .openIDB()
      .then(idb => {
        if (!idb) return Promise.resolve();

        const tx = idb.transaction(DBHelper.IDB_REVIEWS_QUEUE, 'readwrite');
        const store = tx.objectStore(DBHelper.IDB_REVIEWS_QUEUE);
        return store.delete(review.id);
      });
  }

  static saveIDBRestaurant(restaurant) {
    return DBHelper
      .openIDB()
      .then(idb => {
        if (!idb) return Promise.resolve();

        const tx = idb.transaction(DBHelper.IDB_RESTAURANTS, 'readwrite');
        const store = tx.objectStore(DBHelper.IDB_RESTAURANTS);
        return store.put(restaurant);
      });
  }

  static openIDB() {
    return idb.open(DBHelper.IDB_NAME, 1, (upgradeDb) => {
      upgradeDb.createObjectStore(DBHelper.IDB_RESTAURANTS, {
        keyPath: 'id'
      });
      upgradeDb.createObjectStore(DBHelper.IDB_REVIEWS, {
        keyPath: 'id',
        autoIncrement: true
      }).createIndex('restaurant_id', 'restaurant_id');
      upgradeDb.createObjectStore(DBHelper.IDB_REVIEWS_QUEUE, {
        keyPath: 'id'
      });
    });
  }

  /**
   * WARNING: Doing a PUT to change favorite status of a restaurant changes is_favorite field from boolean to string
   * the following method fixes this issue
   */
  static fixFavoriteType(data) {
    const booleanOf = (val) => typeof(val) === 'boolean' ? val : val === 'true';
    const doFix = (restaurant) => {
      return Object.assign({}, restaurant, {is_favorite : booleanOf(restaurant.is_favorite)});
    };
    return Array.isArray(data) ? data.map(doFix) : doFix(data);
  }
}
