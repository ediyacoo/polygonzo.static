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
				{{name}}: {{count}}{{{size}}} chars\
			</div>\
			{{{map}}}\
		</div>',
	loud: '<span style="color:red; font-weight:bold;">{{text}}</span>',
	pathCount: '{{count}} paths, ',
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


states.index('abbr').index('fips').index('name');


// Startup code, called from the GeoJSONP file
function loadGeoJSON( geo ) {
	_.each( geo.state.features, loadFeature );
}


function loadFeature( feature ) {
	var state = featureState( feature );
	var minChars = state.minChars || 40;
	var encodeds = encodeFeature( feature );
	encodeds = _.filter( encodeds, function( encoded ) {
		return encoded.points.length >= minChars;
	});
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
		size: size <= 2048 ? size :
			template.loud({ text: size }),
		count: paths.length <= 1 ? '' :
			template.pathCount({ count: paths.length })
	});
	$('#output').append( state );
}


function pathFromEncoded( encoded ) {
	return template.staticPath( encoded );
}


function encodeFeature( feature ) {
	var state = featureState( feature );
	encoder = new PolylineEncoder( 1, 1, ( state.detail || 1 ) * .05 );
	var geometry = feature.geometry,
		type = geometry.type,
		coords = geometry.coordinates,
		polys =
			type == 'Polygon' ? [ coords ] :
			type == 'MultiPolygon' ? coords :
			[];
	return _.map( polys, function( poly ) {
		var ring = poly[0];  // outer ring only
		var points = _.map( ring, function( point ) {
			var lngLat = PolyGonzo.Mercator.coordToLngLat( point );
			return new PolylineEncoder.latLng( lngLat[1], lngLat[0] );
		});
		var encoded = encoder.dpEncodeToJSON( points );
		encoded.color = '0x000000C0';
		encoded.fillColor = '0x00000010';
		return encoded;
	});
}


function featureState( feature ) {
	var fips = feature.id.split('US')[1];
	return states.by.fips[fips];
}
