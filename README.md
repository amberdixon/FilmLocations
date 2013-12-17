FilmLocations
=============

This project displays a set of SF movie filming locations on a map. The application can be accessed at www.fitrabbitapp.com.

It relies on data provided by the following API: https://data.sfgov.org/Arts-Culture-and-Recreation-/Film-Locations-in-San-Francisco/yitu-d5am. This data source provides addresses, however, it does not latitude and longitude coordinates. For that reason, I've created a python script called populate_filmlocations.py that hits Google's geocoding API to retrieve this data and persist it in mongo. Furthermore, the necessary indices are created in the mongo table. I used the region biasing feature provided by Google's geocoding API to put the search results from San Francisco addresses at the top of my results. When crawling the API, I sometimes ran into ratelimiting errors. In this case, I backed off by sleeping for a few seconds and then resumed searching.

I used Flask as the web server framework to serve up film location data. It returns data in JSON. The frontend is written in backbone.js and relies on JQuery Mobile for the search bar at the top of the page, which also provides autocompletion of film titles. When you search for a film and hit one of the autocompleted suggestions, the map markers reload to only the film locations for that film. I used the Google Maps JS API to layout film locations on the map.

When the user lands on the site, we attempt to use geolocation to center the map. If the user does not permit location detection, then we center the map in Downtown SF.

When the user moves the map and also when the map is first loaded, a request is made to the server to obtain the film locations that are nearest to the center point of the map. I created a mongodb index on the 2d latitude and longitude coordinates that are stored with each film location to allow for efficient querying and sorting of location data by distance. There are almost 900 locations in the database. The server returns the nearest 200 results. These results are contained in a backbone model class, each of which is stored in a collection. A Backbone view corresponds to each model; the view creates a Google Maps marker and places it on the map. The nearest 10 search results use a large marker icon and the subsequent results are represented as small red dots on the map. (I noticed that this is how maps.google.com represents markers when you search for something, so I emulated that experience.)

Note that if there are multiple markers at the exact same lat-long coordinate, then only one marker will be displayed. There is a plugin available called "spiderfier" or something along those lines to distinguish markers, but I did not have time to implement it.

Finally, I deployed these components to an EC2 server which runs Mongo. It also runs Flask in conjunction with Nginx and uWsgi. I provided uWsgi with a YAML config file (app.yaml).

I enjoyed learning Flask and Backbone.js. I had never used Flask before and was pleasantly surprised at how simple it was to set up and develop in and how useful the documentation was. For example, the jsonify module was especially useful. I had some limited experience with Backbone.js prior to doing this project, it was a nice refresher.


