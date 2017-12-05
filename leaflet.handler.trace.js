
L.Handler.Trace = L.Handler.extend({
  options: {
  },
  /** Tracing Handler
  * @param {Object} options
  * @param {Object} options.tracerOptions - Options for the tracer marker. See {@link http://leafletjs.com/reference-0.7.7.html#marker-options }
  * @param {L.Polyline} options.poly - The Path to follow
  */
  initialize: function(options){
    //L.Handler.prototype.initialize.call(this, map);
    L.Util.setOptions(options);
    var shownIndex = this.options.shownIndex || 0;
    this.shownIndex = shownIndex;

    var initLatLng;
    if (this.options.poly){
      var latlngs = this.options.poly.getLatLngs();
      initLatLng = latlngs[shownIndex];
    }
    else{
      console.warn('no poly to trace.');
    }
    this._tracer = (this.options.tracerOptions && L.Marker(initLatLng, this.options.tracerOptions)) || L.circleMarker(initLatLng, {color:'green', fillOpacity:1});

  },
  addHooks: function(){
    // var map = this._poly._map;
    // The polygon could have changed since the trace handler was initialized.
    var latlngs = this._poly.getLatLngs();
    // Index must be within range of 0 to number of latlngs on this path
    this.shownIndex = Math.max(Math.min(this.shownIndex, latlngs.length-1), 0)
    this._tracer.setLatLng(this._poly.getLatLngs()[this.shownIndex]);
    this._tracer.addTo(map);
    this.trace(map, 1000);
  },
  /** Moves a marker about the polyline/polygon to illustrate the order of the points that define it
	*/
	trace: function(map, stepLength){
		var latlngs = this._poly.getLatLngs();
    var crs = this._poly._map.options.crs;
		var shownIndex = this.shownIndex || 0;
		var traceStart = performance.now();
		stepLength = stepLength || 1000;
		var animFunc = function(timestamp){
			//timestamp of first request is at the start of the frame, so will probably be before performance.now() call
			var showIndex = Math.max(0, Math.floor((timestamp - traceStart)/stepLength)); // increases by 1 every stepLength ms
      // Sync animation if for some reason it is still
			if (showIndex !== shownIndex){
				if (showIndex < latlngs.length){
					tracer.setLatLng(latlngs[showIndex]);
				}
				else{
					// destroy marker
					(map||this._map).removeLayer(tracer);
				}
			}
			else{
				if (showIndex < latlngs.length-1){
					// Percentage from one to the other
					var perc = (timestamp - traceStart)/stepLength - showIndex;
          // Assuming Polyline or Polygon: Straight lines between latlngs TODO fix to work only with points until latlng needed
          var newlatlng = this._getLatLngOnLineTo(crs, latlngs[showIndex], latlngs[showIndex+1], perc);
					tracer.setLatLng();
				}
			}

			shownIndex = showIndex;
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
