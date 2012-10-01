// make-static-maps.js by Michael Geary
// See LICENSE for copyright and license

var staticMapWidth = 300, staticMapHeight = 300;


// Templates for HTML code and other strings
// Leading/trailing whitespace and all tab characters will be removed
// (this file uses tabs for indentation)
// Note that the \-escaped newlines do not insert a newline in the string;
// end a line with \n\ if you want an actual newline, or use \n elsewhere
var template = {
	state: '\
		<div class="state">\
			<div class="header">\
				{{name}}: {{{size}}}\
			</div>\
			{{{map}}}\
		</div>',
	loud: '<span style="color:red; font-weight:bold;">{{text}}</span>',
	staticMap: '\
		<div class="staticmap">\
			<img src="{{{url}}}" \
				 style="border:none; width:{{width}}px; height:{{height}}px;" \
			>\
		</div>',
	staticMapURL: 'http://maps.googleapis.com/maps/api/staticmap?sensor=false&key={{key}}&size={{width}}x{{height}}&{{{paths}}}',
	//staticPath: 'path=color:{{color}}%7Cweight:{{weight}}%7Cfillcolor:{{fillColor}}%7Cenc:{{points}}'
	staticPath: 'path=color:{{color}}|weight:{{weight}}|fillcolor:{{fillColor}}|enc:{{points}}'
};


// Compile all the templates, trimming whitespace, removing tab characters,
// and converting Mustache-style syntax to Underscore:
// {{escapedValue}}
// {{{unescapedValue}}}
// {{@JavaScriptCode}}
for( var t in template ) {
	var text = $.trim( template[t].replace( /\t/g, '' ) )
		.replace( /\{\{\{/g, '<%=' )
		.replace( /\{\{@/g, '<%' )
		.replace( /\{\{/g, '<%-' )
		.replace( /\}\}\}/g, '%>' )
		.replace( /\}\}/g, '%>' )
	template[t] = _.template( text );
}


var encoder;


// Startup code, called from the GeoJSONP file
function loadGeoJSON( geo ) {
	encoder = new PolylineEncoder();
	_.each( geo.state.features, loadFeature );
}


function loadFeature( feature ) {
	var encodeds = encodeFeature( feature );
	var paths = _.map( encodeds, pathFromEncoded );
	var vars = {
		key: settings.apiKey,
		width: staticMapWidth,
		height: staticMapHeight,
		paths: paths.join('&')
	};
	vars.url = template.staticMapURL( vars );
	var staticMap = template.staticMap( vars );
	var size = vars.url.length;
	var state = template.state({
		map: staticMap,
		name: feature.name,
		size: size <= 2048 ? size : template.loud({ text:size })
	});
	$('#output').append( state );
}


function pathFromEncoded( encoded ) {
	return template.staticPath( encoded );
}


function encodeFeature( feature ) {
	var geometry = feature.geometry,
		type = geometry.type,
		coords = geometry.coordinates,
		polys =
			type == 'Polygon' ? [ coords ] :
			type == 'MultiPolygon' ? coords :
			[];
	return _.map( polys, encodePoly );
}


function encodePoly( poly ) {
	var ring = poly[0];  // outer ring only
	var points = _.map( ring, function( point ) {
		var lngLat = PolyGonzo.Mercator.coordToLngLat( point );
		return new PolylineEncoder.latLng( lngLat[1], lngLat[0] );
	});
	var encoded = encoder.dpEncodeToJSON( points );
	encoded.color = '0x000000C0';
	encoded.fillColor = '0x00000010';
	return encoded;
}
