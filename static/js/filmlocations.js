
$(function(){

  var map = null;
  var FilmLocation = Backbone.Model.extend({});
  var FilmLocations = Backbone.Collection.extend({
    model: FilmLocation,
    url: function() {
      centerLatLng = map.getCenter();
      if (centerLatLng) {
        return '/filmlocations?centerLatLng=' + centerLatLng.lat() + ',' + centerLatLng.lng();
      }
      return null;
    },
    parse: function(response) {
      return response.results;
    }
  });

  var openedInfoWindow = null;
  var locations = new FilmLocations;
  var FilmLocationView = Backbone.View.extend({
    marker: null,
    initialize: function(options) {
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'remove', this.remove);
      this.useDefaultMarker = options.useDefaultMarker || false;
    },

    // Re-render the titles of the todo item.
    render: function() {
      var self = this;
      lat = this.model.get('lngLat')[1]
      lng = this.model.get('lngLat')[0]

      var markerOptions = {
        position: new google.maps.LatLng(lat, lng),
        title: this.model.get('title')
      }
      if (!this.useDefaultMarker) {
        markerOptions['icon'] = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 1.5,
          fillColor: 'red',
          strokeColor: 'red'
        }
      }
      this.marker = new google.maps.Marker(markerOptions);

      var infowindow = new google.maps.InfoWindow({
        content: this.contentForInfoWindow()
      });

      google.maps.event.addListener(this.marker, 'click', function() {
        App.closeInfoWindow();

        infowindow.open(map, self.marker);
        openedInfoWindow = infowindow;
      });

      // To add the marker to the map, call setMap();
      this.marker.setMap(map);

      return this;
    },
    remove: function() {
      if (this.marker) {
        this.marker.setMap(null);
        this.marker = null;
      }
    },

    contentForInfoWindow: function() {
      var self = this;
      var content = '';
      content += '<h1>' + self.model.get('title') + ' (' + self.model.get("release_year") + ')</h1>';
      content += '<p>' + self.model.get('locations') + '</p>';
      if (self.model.get('director').length > 0) {
        content += '<p><b>Directed by:</b>' + self.model.get('director') + '</p>';
      }
      var actorList = [];
      var actor_keys = ['actor_1', 'actor_2', 'actor_3'];
      _.each(actor_keys, function(actorIndex) {
        if (self.model.get(actorIndex)) {
          actorList.push(self.model.get(actorIndex));
        }
      });
      if (actorList.length > 0) {
        content += '<p><b>Starring:</b>' + actorList.join(',') + '</p>';
      }
      if (self.model.get('fun_facts')) {
        content += '<p>' + self.model.get('fun_facts') + '</p>';
      }
      return content;
    }
  });


  var AppView = Backbone.View.extend({


    defaultZoomLevel: 13,
    // Google maps geocoding API indicates SF center is 37.7749295, -122.4194155
    defaultMapCenter: [37.7749295, -122.4194155],

    el: $("#maps-app"),
    initialize: function() {
      var self = this;
      self.listenTo(locations, 'sync', this.drawMarkers);
      var mapOptions = {
        center: new google.maps.LatLng(this.defaultMapCenter[0], this.defaultMapCenter[1]),
        zoom: 13
      };
      map = new google.maps.Map($("#map-canvas").get(0),
                                mapOptions);
      google.maps.event.addListener(map, 'center_changed', function() {
        // if an info window is open, the user is not panning the map themselves, the window may autopan.
        if (!openedInfoWindow) {
          locations.fetch();
        }
      });
      google.maps.event.addListener(map, 'click', this.closeInfoWindow);
      google.maps.event.addListener(map, 'dragstart', this.closeInfoWindow);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          initialLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
          map.setCenter(initialLocation);
          locations.fetch();
        }, function() {
          locations.fetch();
        });
      } else {
        locations.fetch();
      }
    },

    closeInfoWindow: function() {
      if (openedInfoWindow) {
        openedInfoWindow.close();
        openedInfoWindow = null;
      }
    },

    drawMarkers: function() {
      locations.each(function(loc, index) {
        var view = new FilmLocationView({model: loc, useDefaultMarker: (index < 10)});
        view.render();
      }, this);
    }

  });

  // Finally, we kick things off by creating the **App**.
  var App = new AppView;

});