
L.Handler.Trace = L.Handler.extend({
  options: {
    // poly
  },
  /** Tracing Handler
  * @param {Object} options
  * @param {(L.Marker|L.CircleMarker)} [options.tracer = circleMarker] - Options for the tracer marker. See {@link http://leafletjs.com/reference-0.7.7.html#marker-options }
  * @param {L.Polyline} options.poly - The Path to follow
  * @param {number} [options.shownIndex = 0] - Which vertex of the poly should we start at?
  */
  initialize: function(options){
    //L.Handler.prototype.initialize.call(this, map);
    L.Util.setOptions(options);
    var shownIndex = this.options.shownIndex || 0;
    this.shownIndex = shownIndex;

    var initLatLng;
    if (this.options.poly){
/*
      var latlngs = this.options.poly.getLatLngs();
      initLatLng = latlngs[shownIndex];
*/
    }
    else{
      console.warn('no poly to trace.');
    }
    this._tracer = this.options.tracer || L.circleMarker(null, {color:'green', fillOpacity:1});//).setLatLng(initLatLng);

  },
  addHooks: function(){
    // var map = this._poly._map;
    // The polygon could have changed since the trace handler was initialized.
    var latlngs = this._poly.getLatLngs();
    // Index must be within range of 0 to number of latlngs on this path
    this.shownIndex = Math.max(Math.min(this.shownIndex, latlngs.length-1), 0)
    this._tracer.setLatLng(this._poly.getLatLngs()[this.shownIndex]);
    this._tracer.addTo(this._poly._map);
    this.trace(this._poly._map, 1000);
  },
  /** Trace a whole shape at a constant speed. Note: Due to variance in distances caused by map projections the speed of a marker may appear slower at the equator for example.
  * @param {ILayer}
  * @param {number} duration - The duration of the trace in ms
  */
  traceShape: function(poly, duration){
    var latlngs = poly.getLatLngs();
    // TODO, consider projections vs distances over global scales and instructions other than lineto
    // Get total distance
    var distances = latlngs.map(function(latlng, l, latlngs){
      if (l < latlngs.length - (poly instanceof L.Polygon ? 0 : 1)){
        return latlng.distanceTo(latlngs[l]);
      }
    }, this).filter(function(v){return v;});
    var totalDistance = distances.reduce(function(a, b){return a + b}, 0);

    // Get the duration for each step based on the distance between points
    this.durations = distances.map(function(distance, d, distances){
      return duration * (distance / totalDistance);
    }, this);

  }
  /** Moves a marker about the polyline/polygon to illustrate the order of the points that define it
  * @param {L.Map} map
  * @param {number} stepLength - The amount of time in ms to take tracing each segment.
  * Note: this means that the tracer will move faster along long segments, and slower on short segments.
	*/
	trace: function(map, stepLength){
		var latlngs = this._poly.getLatLngs();
    var crs = this._poly._map.options.crs;
		var shownIndex = this.shownIndex || 0;
		var traceStart = performance.now();
		stepLength = stepLength || this.durations[shownIndex] || 1000;
		var animFunc = function(timestamp){
      var timeSinceTraceCalled = timestamp - traceStart;
			//timestamp of first request is at the start of the frame, so will probably be before performance.now() call

      // increases by 1 every variable stepLength ms
      var showIndex = Math.max(0, Math.floor(timeSinceTraceCalled/stepLength));

      // Sync animation if for some reason it is still
			if (showIndex !== this.shownIndex){
				if (showIndex < latlngs.length){
					tracer.setLatLng(latlngs[showIndex]);
				}
				else{
					// destroy marker
					(this._poly._map || map || this._map).removeLayer(tracer);
				}
			}
			else{
				if (showIndex < latlngs.length-1){
					// Percentage from one to the other
          // Gets the number of stepLengths up to this point eg. 4.5 is halfway between the 4th and 5th point,
          // then removes the currently shown index (eg. 4) to get the sub-segment remainder (eg. 0.5)
          var perc = timeSinceTraceCalled/(this.durations[showIndex]||stepLength) - showIndex;

          // Assuming Polyline or Polygon: Straight lines between latlngs TODO fix to work only with points until latlng needed
          var newlatlng = this._getLatLngOnLineTo(crs, latlngs[showIndex], latlngs[showIndex+1], perc);
					tracer.setLatLng(newlatlng);
				}
			}

			this.shownIndex = showIndex;
      // Keep animating until we reach the end of the latlngs
			if (showIndex <= latlngs.length-1){
				L.Util.requestAnimFrame(animFunc, this);
			}
		};
    // Kick off animation
		L.Util.requestAnimFrame(animFunc, this);
	},
  /** Gets the latlng coordinates a given percentage from this latlng to a given one
  * @param {L.LatLng} origin - The origin latlng
  * @param {L.LatLng} dest - The destination latlng
  * @param {number} pc - a number from 0 to 1 representing percentage along the line between latlngs
  * @returns {L.LatLng} LatLng as specified
  */
  _getLatLngOnLineTo: function(crs, origin, dest, pc) {
    var originPt = crs.projection.project(origin);
    var destPt = crs.projection.project(dest);

    // Angles and destination etc not needed. just apply percentage to x and y differences
    var diffPt = destPt.subtract(originPt);

    var resultPt = originPt.add(diffPt.multiplyBy(pc));

    var result = crs.projection.unproject(resultPt);
    return result;
  },
});
