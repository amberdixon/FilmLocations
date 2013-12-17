
$(function(){

  var gMap = null;
  var gMapItemInfoWindow = null;
  var FilmLocation = Backbone.Model.extend({});
  var FilmLocations = Backbone.Collection.extend({
    model: FilmLocation,
    titleToFilter: null,
    url: function() {
      centerLatLng = gMap.getCenter();
      if (centerLatLng) {
        var url = '/filmlocations?centerLatLng=' + centerLatLng.lat() + ',' + centerLatLng.lng();
        if (this.titleToFilter && this.titleToFilter.length > 0) {
          url += '&title=' + this.titleToFilter;
        }
        return url;
      }
      return null;
    },
    parse: function(response) {
      return response.results;
    },
    updateFilter: function(titleToFilter) {
      this.titleToFilter = titleToFilter;
      this.fetch();
    }
  });

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
          scale: 2,
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
        infowindow.open(gMap, self.marker);
        gMapItemInfoWindow = infowindow;
      });

      // To add the marker to the map, call setMap();
      this.marker.setMap(gMap);

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
      gMap = new google.maps.Map($("#map-canvas").get(0),
                                mapOptions);
      google.maps.event.addListener(gMap, 'dragend', function() {
        locations.fetch();
      });
      google.maps.event.addListener(gMap, 'click', this.closeInfoWindow);
      google.maps.event.addListener(gMap, 'dragstart', this.closeInfoWindow);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          initialLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
          gMap.setCenter(initialLocation);
          locations.fetch();
        }, function() {
          locations.fetch();
        });
      } else {
        locations.fetch();
      }
    },

    closeInfoWindow: function() {
      if (gMapItemInfoWindow) {
        gMapItemInfoWindow.close();
        gMapItemInfoWindow = null;
      }
    },

    drawMarkers: function() {
      if (locations.titleToFilter) {
        // if we are filtering by title, then center the map on first search result
        var first = locations.first();
        lat = first.get('lngLat')[1]
        lng = first.get('lngLat')[0]
        gMap.setCenter(new google.maps.LatLng(lat, lng));
      }
      locations.each(function(loc, index) {
        var view = new FilmLocationView({model: loc, useDefaultMarker: (index < 10)});
        view.render();
      }, this);
    }

  });

  var App = new AppView;


	$( "#autocomplete" ).on( "listviewbeforefilter", function ( e, data ) {
		var $ul = $( this ),
			$input = $(data.input),
			value = $input.val(),
			html = "";
		$ul.html( "" );
		if ( value && value.length > 2 ) {
			$ul.html( "<li><div class='ui-loader'><span class='ui-icon ui-icon-loading'></span></div></li>" );
			$ul.listview( "refresh" );
			$.getJSON(
        "/filmsearch",
        {'query': $input.val()},
        function ( response ) {
  				_.each( response.results, function (elem) {
  					html += "<li>" + elem + "</li>";
  				});
  				$ul.html( html );
  				$ul.listview( "refresh" );
  				$ul.trigger( "updatelayout");
  			});
		} else if (value.length == 0){
      locations.updateFilter(null);
		}
	})
	$( "#autocomplete" ).on( "click", function(e) {
	  // check if type if LI
    var title = $(e.target).text();
		var $ul = $( this ),
			$input = $('.ui-listview-filter input');
    $ul.html("");
    $input.val(title);
    locations.updateFilter(title);
	});

});