//
// Multi-planar reconstruction
// HaukeBartsch@gmail.com
//
// use: press '0' to reset zoom, brightness and contrast
//      use shift+mouse up/down for contrast
//      use shift+mouse left/right for brightness
//      use Meta+mouse left for pan
//      use '+' and '-' for zoom
//      click to go to location
//      click+drag mouse to move cross-hair location
//      

//
// requires: jQuery
// requires: mousewheel jquery library
// requires: pixastic for brigthness and contrast adjustments
//

if (!document.createElement('mpr').getContext) {

  // constructor with unique positive id
  function mpr(id) {
    if (id < 0)
      id = 0;
    this.id = id; // positive number
    this.dataPath = ""; // path to data
    this.dataIsSet = false;
    this.overlayDataPath = ""; // path to overlay data
    this.overlayDataIsSet = false;
    this.voxelSize = [0,0,0];   // not set
    this.windowArray  = new Object(); // array which contains id and orientation
    this.imageSet001  = new Array(256); // slice orientation axial
    this.imageSet010  = new Array(256); // sagital
    this.imageSet100  = new Array(256); // coronal
    this.overlayImageSet001  = new Array(256); // slice orientation axial
    this.overlayImageSet010  = new Array(256); // sagital
    this.overlayImageSet100  = new Array(256); // coronal
    this.alpha               = 0.5; // overlay transparency value
    this.oldAlpha            = -1;  // used using '1' '2' keypress to remember the old setting
    this.position  = [128,128,128]; // location of the cross-hair
    this.dims      = [256, 256, 256]; // number of images in three space dimensions
    this.overlayDims = [256, 256, 256]; // number of overlay images
    this.crosshairEnabled = true;   // draw the cross-hair
    this.infoOverlayEnabled = true; // enable the display of overlay information
    this.isMouseDown = false;       // for adjusting brightness and contrast
    this.mousePos1   = [];          // mouse position the user pressed down key
    this.startBrightnessContrast = [0, 0]; // initial value on mouse down
    this.brightness = 0;            // do nothing
    this.contrast   = 0;            // do nothing
    this.zoomFactor = 1.0;          // initial zoom is off
    this.bindPositions = [];        // add more mpr objects that should be updated
    this.bindZoom = [];             // add more mpr objects that should be updated
    this.flipSliceDirection = [false, false, false]; // slice order on disk
    // patient information array (name, date, modality, overlaymodality)
    this.patientinformation = { "patientname": "", "scandate": "", "modality": "", "overlaymodality": "" };   
    this.lockPosition = [ false, false, false ];
    this.cacheSize = 5; // number of images cached before and after current slice
    this.translate = [0,0,0,0,0,0];
    this.startTranslate = [0,0,0,0,0,0];
    this.lastCrossHairLocationImageSpace = [0,0,0,0,0,0];
    this.scoutLineColor = "rgb(255,255,0)"; // color of the scout line
    this.enableScoutLines = true; // draw a long line for the slice that is locked
  }

  // query the id
  mpr.prototype.getId = function() {
    return this.id;
  }

  // query the data location
  mpr.prototype.getDataPath = function() {
    if (this.dataIsSet)
      return this.dataPath;
    else 
      return -1;
  }
  
  mpr.prototype.resetImage = function () {
    this.setDims( this.dims );
    this.positions = new Array();
    jQuery(this).trigger("updateImages");
  }
  mpr.prototype.setDims = function( dims ) {
    this.dims = dims;
    // reset the image arrays
    this.imageSet001 = new Array(this.dims[0]);
    this.imageSet010 = new Array(this.dims[1]);
    this.imageSet100 = new Array(this.dims[2]);
  }
  mpr.prototype.getDims = function() {
    return this.dims;
  }
  mpr.prototype.setCacheSize = function ( cache ) {
    this.cacheSize = cache;
  }
  mpr.prototype.getCacheSize = function ( ) {
    return this.cacheSize;
  }
  mpr.prototype.resetOverlay = function () {
    this.setOverlayDims( this.dims );
    this.positions = new Array();
    jQuery(this).trigger("updateImages");
  }
  mpr.prototype.setOverlayDims = function( dims ) {
    this.overlayDims = dims;
    this.overlayImageSet001 = new Array(this.overlayDims[0]);
    this.overlayImageSet010 = new Array(this.overlayDims[1]);
    this.overlayImageSet100 = new Array(this.overlayDims[2]);
  }
  mpr.prototype.getOverlayDims = function() {
    return this.overlayDims;
  }
  mpr.prototype.setPatientInformation = function( name, date, modality, overlaymodality ) {
    this.patientinformation["patientname"] = name;
    this.patientinformation["scandate"] = date;
    this.patientinformation["modality"] = modality;
    this.patientinformation["overlaymodality"] = overlaymodality;
  }
  mpr.prototype.getPatientInformation = function( ) {
    return this.patientinformation;
  }
  mpr.prototype.setOverlayAlpha = function( alpha ) {
    this.alpha = alpha;
    this.update();
  }
  mpr.prototype.getOverlayAlpha = function() {
    return this.alpha;
  }
  mpr.prototype.setFlipSliceDirections = function( direc ) {
    this.flipSliceDirection = direc;
  }
  mpr.prototype.getFlipSliceDirections = function() {
    return this.flipSliceDirection;
  }
  mpr.prototype.setBindZoom = function( other ) {
    this.bindZoom.push(other);
  }
  mpr.prototype.unsetBindZoom = function( other ) {
    var idx = this.bindZoom.indexOf(other);
    if (idx != -1)
	this.bindZoom.splice(idx,1);
  }
  mpr.prototype.setBindPositions = function( other ) {
    this.bindPositions.push(other);
  }
  mpr.prototype.unsetBindPositions = function( other ) {
    var idx = this.bindPositions.indexOf(other);
    if (idx != -1)
	this.bindPositions.splice(idx,1);
  }
  
  mpr.prototype.setZoomFactor = function( z ) {
    if (z == this.getZoomFactor())
	return; // do notthing
    this.zoomFactor = z;
    this.update();
  }
  mpr.prototype.getZoomFactor = function() {
    return this.zoomFactor;
  }
  mpr.prototype.setLockPosition = function( a, b, c ) {
    this.lockPosition[0] = a;
    this.lockPosition[1] = b;
    this.lockPosition[2] = c;
  }
  mpr.prototype.getLockPosition = function() {
    return this.lockPosition;
  }
  mpr.prototype.setPosition = function( x, y, z ) {
    if (x == this.position[0] && y == this.position[1] && z == this.position[2])
	return; // don't update
    if (!this.lockPosition[0])
      this.position[0] = x;
    if (!this.lockPosition[1])
      this.position[1] = y;
    if (!this.lockPosition[2])
      this.position[2] = z;
    this.update();
  }
  mpr.prototype.getPosition = function( ) {
    return this.position;
  }
  mpr.prototype.setTranslation = function( x1, y1, x2, y2, x3, y3 ) {
    this.startTranslate[0] = x1;
    this.startTranslate[1] = y1;
    this.startTranslate[2] = x2;
    this.startTranslate[3] = y2;
    this.startTranslate[4] = x3;
    this.startTranslate[5] = y3;
  }
  mpr.prototype.getTranslation = function( ) {
    return this.startTranslate;
  }
  // value between -150 and 150
  mpr.prototype.setBrightness = function( value ) {
    if (value < -150)
	value = -150;
    if (value > 150)
	value = 150;
    this.brightness = value;
  }
  mpr.prototype.getBrightness = function( ) {
    return this.brightness;
  }
  // value between -1 and infinity
  mpr.prototype.setContrast = function( value ) {
    if (value < -1)
	value = -1;
    if (value > 10)
	value = 10;
    this.contrast = value;
  }
  mpr.prototype.getContrast = function( ) {
    return this.contrast;
  }
  
  mpr.prototype.crosshair = function( yesno ) {
    this.crosshairEnabled = yesno;
  }
  mpr.prototype.isCrosshair = function( ) {
    return this.crosshairEnabled;
  }
  
  // set the voxel size
  mpr.prototype.setVoxelSize = function( voxelSize ) {
    this.voxelSize = voxelSize;
  }
  
  // get the current voxel size
  mpr.prototype.getVoxelSize = function( ) {
    return this.voxelSize;
  }
  
  // bind window id to slice orientation
  // bind also the user interface elements (mouse)
  mpr.prototype.bindWindow = function( id, orientation ) {
    this.windowArray[id] = orientation;
    jQuery(''+id).attr('orientation', orientation);
    
    // make the canvas editable and therfore able to receive keyboard input
    jQuery(id).attr('contentEditable', 'true');
    if ( jQuery(id).get(0) )
      jQuery(id).get(0).contentEditable = true;
    
    // add a custom event to update the display
    jQuery(this).bind("updateImages", function() {
	this.update();
    });
    
    jQuery(id).mousedown( (function(context) { return function(event) { 
	context.isMouseDown = true;
        canvasLocation = findPos(this);
	context.mousePos1 = [event.pageX - canvasLocation[0], 
			     event.pageY - canvasLocation[1]];
	context.startBrightnessContrast = [ context.getBrightness(), context.getContrast() ];
	for (var i = 0; i < 6; i++) {
	  context.translate[i] = 0;
	}
    } })(this) );
    jQuery(id).mouseup( (function(context) { return function(event) {
	context.isMouseDown = false; 
	for (var i = 0; i < 6; i++) {
	  context.startTranslate[i] += context.translate[i];
          context.translate[i] = 0;
	}
    } })(this) );
    jQuery(id).mousemove( (function(context) {
	return function(event) {
          if (!context.isMouseDown)
            return; // ignore this event

          var normalID = jQuery(id).attr('id');         
          var width  = document.getElementById(normalID).width;
          var height = document.getElementById(normalID).height;
          var orientation = jQuery(this).attr('orientation');
          canvasLocation = findPos(this);
	  if (event.shiftKey) {
              var b = (context.mousePos1[0] - (event.pageX - canvasLocation[0] /*this.offsetLeft*/))/width*150.0;
	      var c = (context.mousePos1[1] - (event.pageY - canvasLocation[1] /*this.offsetTop*/))/height*1.0;
	      // adjust brightness and contrast
	      var startB = context.startBrightnessContrast[0];
	      var startC = context.startBrightnessContrast[1];
	      context.setBrightness( startB + b );
	      context.setContrast( startC + c );
	      context.update(); // redraw the images
	      return;
          }
	  var transSet = 0;
	  if (orientation == "0,1,0") {
            transSet = 1;
          }
	  if (orientation == "1,0,0") {
            transSet = 2;
	  }

          if (event.metaKey || event.ctrlKey) { // should be ctrlKey on Windows
            var b = - (context.mousePos1[0] - (event.pageX - canvasLocation[0]));
            var c = - (context.mousePos1[1] - (event.pageY - canvasLocation[1]));
            context.translate[transSet*2+0] = b;
            context.translate[transSet*2+1] = c;
            context.update();
            return;
	  }

          var x = event.pageX - canvasLocation[0] /*this.offsetLeft*/;
          var y = event.pageY - canvasLocation[1] /*this.offsetTop*/;
          // map the location on the canvas to image dimension
	  // this is without zoom yet
	  
          if ( orientation == "0,0,1" ) {
              x = Math.round(x/width *  (context.getDims()[1]-1));
	      y = Math.round(y/height * (context.getDims()[2]-1));
	      if (!context.lockPosition[1])
		context.position[1] = x;
	      if (!context.lockPosition[2])
		context.position[2] = y;
          } else if ( orientation == "0,1,0" ) {
	      x = Math.round(x/width *  (context.getDims()[2]-1));
	      y = Math.round(y/height * (context.getDims()[0]-1));
	      if (!context.lockPosition[0])
		context.position[0] = /*255- */y;
	      if (!context.lockPosition[2])
		context.position[2] = x;
          } else /*if ( orientation == "1,0,0" )*/ {
              x = Math.round(x/width *  (context.getDims()[1]-1));
	      y = Math.round(y/height * (context.getDims()[0]-1));
	      if (!context.lockPosition[0])
		context.position[0] = /*255- */y;
	      if (!context.lockPosition[1])
		context.position[1] = x;
          }
          // normalize the position
          for (var i = 0; i < 3; i++) {
              if (context.position[i] < 0)
                 context.position[i] = 0;
              if (context.position[i] > context.getDims()[i]-1)
                 context.position[i] = context.getDims()[i]-1;
          }
          new importImages( context.dataPath, context.updateDataStore, context, context.position, true );
          if (context.overlayDataIsSet)
            new importImages( context.overlayDataPath, context.updateDataStore, context, context.position, false );
	}
   })(this));

   jQuery(id).click((function(context) {
      return function(event) {
        if (event.shiftKey || event.metaKey || event.ctrlKey) // don't move the point if the user is changing brightness/contrast
	  return;
        var normalID = jQuery(id).attr('id');
        var width  = document.getElementById(normalID).width;
        var height = document.getElementById(normalID).height;
        var orientation = jQuery(this).attr('orientation');
        canvasLocation  = findPos(this);

        var x = event.pageX - canvasLocation[0]; // this.offsetLeft;
        var y = event.pageY - canvasLocation[1]; // this.offsetTop; // in canvas space

	var oldxy  = context.lastCrossHairLocationImageSpace;
        var oldpos = context.position;
        var zoom   = context.zoomFactor;
        var offset = [x-oldxy[0], y-oldxy[1]];

	// map to image space
        if ( orientation == "0,0,1" ) {
         //x -= context.startTranslate[0];
         //y -= context.startTranslate[1];
         //x = Math.round(x/width  * (context.getDims()[1]-1));
         //y = Math.round(y/height * (context.getDims()[2]-1));
             var offset = [x-oldxy[0], y-oldxy[1]];
             offset[0] = offset[0]/width * (context.getDims()[1]-1);
             offset[1] = offset[1]/height * (context.getDims()[2]-1);
	     x = Math.round(oldpos[1]+(offset[0]/zoom));
	     y = Math.round(oldpos[2]+(offset[1]/zoom));
	     if (!context.lockPosition[1])
               context.position[1] = x;
	     if (!context.lockPosition[2])
               context.position[2] = y;
        }
        if ( orientation == "0,1,0" ) {
         //x -= context.startTranslate[2];
         //y -= context.startTranslate[3];
         //x = Math.round(x/width * (context.getDims()[2]-1));
         //y = Math.round(y/height* (context.getDims()[0]-1));
             var offset = [x-oldxy[2], y-oldxy[3]];
             offset[0] = offset[0]/width * (context.getDims()[2]-1);
             offset[1] = offset[1]/height * (context.getDims()[0]-1);
	     x = Math.round(oldpos[2]+(offset[0]/zoom));
	     y = Math.round(oldpos[0]+(offset[1]/zoom));
	     if (!context.lockPosition[0])
	       context.position[0] = y;
	     if (!context.lockPosition[2])
               context.position[2] = x;
         }
         if ( orientation == "1,0,0" ) {
         //x -= context.startTranslate[4];
         //y -= context.startTranslate[5];
         //x = Math.round(x/width * (context.getDims()[1]-1));
         //y = Math.round(y/height* (context.getDims()[0]-1));
             var offset = [x-oldxy[4], y-oldxy[5]];
             offset[0] = offset[0]/width * (context.getDims()[1]-1);
             offset[1] = offset[1]/height * (context.getDims()[0]-1);
         x = Math.round(oldpos[1]+(offset[0]/zoom));
         y = Math.round(oldpos[0]+(offset[1]/zoom));
         if (!context.lockPosition[0])
         context.position[0] = y;
         if (!context.lockPosition[1])
         context.position[1] = x;
         }
         // normalize the position
         for (var i = 0; i < 3; i++) {
         if (context.position[i] < 0)
         context.position[i] = 0;
         if (context.position[i] > context.getDims()[i]-1)
         context.position[i] = context.getDims()[i]-1;
         }

         new importImages( context.dataPath, context.updateDataStore, context, context.position, true );
         if (context.overlayDataIsSet)
           new importImages( context.overlayDataPath, context.updateDataStore, context, context.position, false );
      }
   })(this));
if (typeof jQuery(id).mousewheel == 'function') {  
     jQuery(id).mousewheel((function(context) {
	 return function(event, delta) {
           event.preventDefault();
         var orientation = jQuery(this).attr('orientation');
	 var amount = Math.round(delta/0.3333);
         if ( orientation == "0,0,1" ) {
           if (!context.lockPosition[0])
             context.position[0]+=amount;
           }
         if ( orientation == "0,1,0" ) {
         if (!context.lockPosition[1])
           context.position[1]+=amount;
         }
         if ( orientation == "1,0,0" ) {
           if (!context.lockPosition[2])
             context.position[2]+=amount;
           }
           // normalize the position
           for (var i = 0; i < 3; i++) {
	     if (context.position[i] < 0)
               context.position[i] = 0;
             if (context.position[i] > context.getDims()[i]-1)
               context.position[i] = context.getDims()[i]-1;
             }
             new importImages( context.dataPath, context.updateDataStore, context, context.position, true );
             if (context.overlayDataIsSet)
               new importImages( context.overlayDataPath, context.updateDataStore, context, context.position, false );
	 }
     })(this));
   }
   jQuery(id).keydown((function(context) {
      return function(event) {
         if (event.keyCode == 49) {
            if (context.oldAlpha < 0) // set the old alpha only the first time the key is pressed
               context.oldAlpha = context.getOverlayAlpha();
            context.setOverlayAlpha(0);
         }
         if (event.keyCode == 50) {
            if (context.oldAlpha < 0){
               context.oldAlpha = context.getOverlayAlpha();
               context.setOverlayAlpha(1);
            }
         }
      };
   })(this));
   jQuery(id).keyup((function(context) {
      return function(event) {
         if (event.keyCode == 49) {
           context.setOverlayAlpha(context.oldAlpha);
           context.oldAlpha = -1;  // reset to not set again
         }
         if (event.keyCode == 50) {
           context.setOverlayAlpha(context.oldAlpha);
           context.oldAlpha = -1;
         }
      };
   })(this));
   jQuery(id).keypress((function(context) {
      return function(event) {
        var orientation = jQuery(this).attr('orientation');
        amount = 0;
        if (event.charCode == 48) { // reset zoom
          //context.setBrightness(0);
          //context.setContrast(0);
	  context.startTranslate = [0,0,0,0,0,0];
	  context.translate      = [0,0,0,0,0,0];
          context.zoomFactor     = 1.0;
        }
        if (event.charCode == 43 && !event.metaKey ) { // increase the zoom factor
          context.zoomFactor = context.zoomFactor * 1.1;
        }
        if (event.charCode == 45 && !event.metaKey ) { // decrease the zoom factor (should not become 0)
            context.zoomFactor = context.zoomFactor * 0.9;
        }
	if (event.charCode == 32 || event.keyCode == 32) { // toggle display of overlay information
	    context.infoOverlayEnabled = !context.infoOverlayEnabled;
	}
        if (event.charCode == 104 || event.keyCode == 104) { // 'H'
          // find the windowArray entry and change its orientation
	  for (var id in context.windowArray) {
                     var obj = jQuery(id).attr('id');
                     if ( obj === jQuery(event.currentTarget).attr('id') ) {
                        context.windowArray[id] = [0,0,1];
                        jQuery(this).attr('orientation',[0,0,1]);
                     }
                  }
               }
               if (event.charCode == 99 || event.keyCode == 99) { // 'C'
                 // find the windowArray entry and change its orientation
		 for (var id in context.windowArray) {
                     var obj = jQuery(id).attr('id');
                     if ( obj === jQuery(event.currentTarget).attr('id') ) {
                        context.windowArray[id] = [1,0,0];
                        jQuery(this).attr('orientation',[1,0,0]);
                     }
                  }
               }
               if (event.charCode == 114 || event.keyCode == 114) { // 'R'
                 // find the windowArray entry and change its orientation
		 for (var id in context.windowArray) {
                     var obj = jQuery(id).attr('id');
                     if ( obj === jQuery(event.currentTarget).attr('id') ) {
                        context.windowArray[id] = [0,1,0];
                        jQuery(this).attr('orientation',[0,1,0]);
                     }
                  }
               }
               if (event.keyCode == 38 || event.keyCode == 39)
                  amount = 1;
           if (event.keyCode == 40 || event.keyCode == 37)
          amount = -1;
           
               if ( orientation == "0,0,1" ) {
                  if (!context.lockPosition[0])
                    context.position[0]+=amount;
               }
               if ( orientation == "0,1,0" ) {
                  if (!context.lockPosition[1])
                    context.position[1]+=amount;
               }
               if ( orientation == "1,0,0" ) {
                  if (!context.lockPosition[2])
                    context.position[2]+=amount;
               }
               // normalize the position
               for (var i = 0; i < 3; i++) {
                  if (context.position[i] < 0)
                     context.position[i] = 0;
                  if (context.position[i] > context.getDims()[i]-1)
                     context.position[i] = context.getDims()[i]-1;
               }
               new importImages( context.dataPath, context.updateDataStore, context, context.position, true );
               if (context.overlayDataIsSet)
                 new importImages( context.overlayDataPath, context.updateDataStore, context, context.position, false );
      }
   })(this));
}

function findPos(obj) {
   var curleft = curtop = 0;
   if (obj.offsetParent) {
       do {
           curleft += obj.offsetLeft;
           curtop += obj.offsetTop;
       } while (obj = obj.offsetParent);

       return [curleft, curtop];
   }
}
  

// set data location
mpr.prototype.setDataPath = function(data) {
   this.dataPath = data;
   this.dataIsSet = true;
   // load a couple of images and call update at the end
   new importImages( this.dataPath, this.updateDataStore, this, this.position, true );
}

// set overlay data location
mpr.prototype.setOverlayDataPath = function(data) {
   this.overlayDataPath = data;
   this.overlayDataIsSet = true;
   // load a couple of images and call update at the end
   new importImages( this.overlayDataPath, this.updateDataStore, this, this.position, false );
}

// is called by the importImages function once images have been loaded
mpr.prototype.updateDataStore = function( imageArray, numImages, parent, positions, isPrimary ) {
   // update the loaded images in the imageSet arrays
   for ( var i = 0; i < positions.length; i++) {
     var entry = positions[i];
     if (entry[0] == 0) { // axial
        if (isPrimary)
          parent.imageSet001[entry[1]] = imageArray[i];
        else
          parent.overlayImageSet001[entry[1]] = imageArray[i];
     }
     if (entry[0] == 1) { // sagital
        if (isPrimary)
          parent.imageSet010[entry[1]] = imageArray[i];
        else
          parent.overlayImageSet010[entry[1]] = imageArray[i];
     }
     if (entry[0] == 2) { // coronal
    if (isPrimary)
          parent.imageSet100[entry[1]] = imageArray[i];
        else
          parent.overlayImageSet100[entry[1]] = imageArray[i];  
     }
   }

   if (isPrimary)
       jQuery(parent).trigger("updateImages");
}



// redraw images based on slice location
mpr.prototype.update = function() {
    //console.log(this.position);
   for(var id in this.windowArray) {
     orientation = this.windowArray[id]; // this is not correct yet
     var pos = 0;
     var V1 = orientation;
     var V2 = [0,0,1];
     var V3 = [0,1,0];
     var V4 = [1,0,0];
     var d1 = V1[0]*V2[0]+V1[1]*V2[1]+V1[2]*V2[2];
     var d2 = V1[0]*V3[0]+V1[1]*V3[1]+V1[2]*V3[2];
     var d3 = V1[0]*V4[0]+V1[1]*V4[1]+V1[2]*V4[2];
     var imset = 0;
     var locCrossHairX = 0; // location of the crosshair in this image
     var locCrossHairY = 0;
     var normalID = jQuery(id).attr('id');
     var canvas = document.getElementById(normalID);
     var scoutline1 = false;
     var scoutline2 = false;
     if (d1 > d2 && d1 > d3) {
	if (this.enableScoutLines && this.getLockPosition()[2])
  	  scoutline1 = true;
        pos = this.position[0];
        imset = 0;
        locCrossHairX = this.position[1]  /(this.getDims()[1]-1)*canvas.width;
        locCrossHairY = this.position[2]  /(this.getDims()[2]-1)*canvas.height;
     } else if (d2 > d1 && d2 > d3) {
	if (this.enableScoutLines && this.getLockPosition()[2])
  	  scoutline2 = true;
        pos = this.position[1];
        imset = 1;
        locCrossHairX = this.position[2]        /(this.getDims()[2]-1)*canvas.width;
        locCrossHairY = (/*255- */this.position[0])  /(this.getDims()[0]-1)*canvas.height; 
     } else if (d3 > d1 && d3 > d2) {
        pos = this.position[2];
        imset = 2;
        locCrossHairX = this.position[1]  /(this.getDims()[1]-1)*canvas.width;
        locCrossHairY = (/*255- */this.position[0])  /(this.getDims()[0]-1)*canvas.height; 
     } else {
        pos = this.position[2];
     }
     var can = canvas.getContext('2d');
     //can.fillStyle = "rgba(0,0,0,1)";
     //can.fillRect(0, 0, can.canvas.width, can.canvas.height);

     var transx = this.startTranslate[imset*2+0] + this.translate[imset*2+0];
     var transy = this.startTranslate[imset*2+1] + this.translate[imset*2+1];

     // if only setPosition is called we need to load images now
     if (imset == 0 && typeof this.imageSet001[pos] == "undefined") {
       new importImages( this.dataPath, this.updateDataStore, this, this.position, true );
     }
     if (imset == 0 && this.overlayDataIsSet && typeof this.overlayImageSet001[pos] == "undefined") {
       new importImages( this.overlayDataPath, this.updateDataStore, this, this.position, false );
     }
     if (imset == 1 && typeof this.imageSet010[pos] == "undefined") {
       new importImages( this.dataPath, this.updateDataStore, this, this.position, true );
     }
     if (imset == 1 && this.overlayDataIsSet && typeof this.overlayImageSet010[pos] == "undefined") {
       new importImages( this.overlayDataPath, this.updateDataStore, this, this.position, false );
     }
     if (imset == 2 && typeof this.imageSet100[pos] == "undefined") {
       new importImages( this.dataPath, this.updateDataStore, this, this.position, true );
     }
     if (imset == 2 && this.overlayDataIsSet && typeof this.overlayImageSet100[pos] == "undefined") {
       new importImages( this.overlayDataPath, this.updateDataStore, this, this.position, false );
     }
     
     // for the given zoom factor we need to change something
     if (imset == 0 && typeof this.imageSet001[pos] != "undefined") {
       can.save();
       can.translate(locCrossHairX - locCrossHairX*this.zoomFactor + transx,
                 locCrossHairY - locCrossHairY*this.zoomFactor + transy);
       can.scale(this.zoomFactor, this.zoomFactor);
       var img = this.imageSet001[pos];
       if (img != undefined && img.width > 0 && img.height > 0 && can.canvas.width > 0 && can.canvas.height > 0)
          can.drawImage(img,0,0,img.width,img.height,0,0,can.canvas.width,can.canvas.height);
       if (this.overlayDataIsSet && this.alpha > 0 && typeof this.overlayImageSet001[pos] != "undefined") {
          var alphaBefore = can.globalAlpha;
          can.globalAlpha = this.alpha;
          var img = this.overlayImageSet001[pos];
          can.drawImage(img,0,0,img.width,img.height,0,0,can.canvas.width,can.canvas.height);
          can.globalAlpha = alphaBefore;
       }
       can.restore();
     } else if (imset == 1 && typeof this.imageSet010[pos] != "undefined") {
       can.save();
       can.translate(locCrossHairX - locCrossHairX*this.zoomFactor + transx, 
                 locCrossHairY - locCrossHairY*this.zoomFactor + transy);
       can.scale(this.zoomFactor, this.zoomFactor);
       var img = this.imageSet010[pos];
       if (img != undefined && img.width > 0 && img.height > 0 && can.canvas.width > 0 && can.canvas.height > 0)
         can.drawImage(img,0,0,img.width,img.height,0,0,can.canvas.width,can.canvas.height);
       if (this.overlayDataIsSet && this.alpha > 0 && typeof this.overlayImageSet010[pos] != "undefined") {
          var alphaBefore = can.globalAlpha;
          can.globalAlpha = this.alpha;
      var img = this.overlayImageSet010[pos];
          can.drawImage(img,0,0,img.width,img.height,0,0,can.canvas.width,can.canvas.height);
          can.globalAlpha = alphaBefore;
       }
       can.restore();
     } else if (imset == 2 && typeof this.imageSet100[pos] != "undefined") {
       can.save();
       can.translate(locCrossHairX - locCrossHairX*this.zoomFactor + transx, 
                 locCrossHairY - locCrossHairY*this.zoomFactor + transy);
       can.scale(this.zoomFactor, this.zoomFactor);
       var img = this.imageSet100[pos];
       if (img != undefined && img.width > 0 && img.height > 0 && can.canvas.width > 0 && can.canvas.height > 0)
         can.drawImage(img,0,0,img.width,img.height,0,0,can.canvas.width,can.canvas.height);
       if (this.overlayDataIsSet && this.alpha > 0 && typeof this.overlayImageSet100[pos] != "undefined") {
          var alphaBefore = can.globalAlpha;
          can.globalAlpha = this.alpha;
          var img = this.overlayImageSet100[pos];
          can.drawImage(img,0,0,img.width,img.height,0,0,can.canvas.width,can.canvas.height);
          can.globalAlpha = alphaBefore;
       }
       can.restore();
     } else {
     //can.fillStyle = "rgba(255,255,255,1)";
       can.fillText("downloading...",canvas.width/2-40,15);
       return;
     }
     if (this.brightness != 0 || this.contrast != 0) {
      Pixastic.process( canvas,
         "brightness",
        { "brightness": this.getBrightness(), "contrast" : this.getContrast(), 'leaveDOM': true },
        ((function(context) { return function(img) {
                        can.drawImage(img,0,0,can.canvas.width,can.canvas.height,
                          0,0,can.canvas.width,can.canvas.height);
          }; })(this)) );
     } 

     var aWidth  = 20;
     var aHeight = 20;
     var aX = 0;
     var aY = 0;
     if (d1 > d2 && d1 > d3) {
     aX = this.position[1]  /(this.getDims()[1]-1)*canvas.width;
     aY = this.position[2]  /(this.getDims()[2]-1)*canvas.height;
     aX += this.startTranslate[imset*2+0] + this.translate[imset*2+0];
     aY += this.startTranslate[imset*2+1] + this.translate[imset*2+1];
     this.lastCrossHairLocationImageSpace[0] = aX;
     this.lastCrossHairLocationImageSpace[1] = aY;
     } else if (d2 > d1 && d2 > d3) {
     aX = this.position[2]  /(this.getDims()[2]-1)*canvas.width;
     aY = this.position[0]  /(this.getDims()[0])*canvas.height; 
     aX += this.startTranslate[imset*2+0] + this.translate[imset*2+0];
     aY += this.startTranslate[imset*2+1] + this.translate[imset*2+1];
     this.lastCrossHairLocationImageSpace[2] = aX;
     this.lastCrossHairLocationImageSpace[3] = aY;
     } else {
     aX = this.position[1]  /(this.getDims()[1]-1)*canvas.width;
     aY = this.position[0]  /(this.getDims()[0]-1)*canvas.height; 
     aX += this.startTranslate[imset*2+0] + this.translate[imset*2+0];
     aY += this.startTranslate[imset*2+1] + this.translate[imset*2+1];
     this.lastCrossHairLocationImageSpace[4] = aX;
     this.lastCrossHairLocationImageSpace[5] = aY;
     }

     //
     // draw the overlays
     //
     if (this.crosshairEnabled) {
    can.fillStyle = "rgba(160,160,20,0.4)";
    can.strokeStyle = "rgb(255,255,0)";

    can.beginPath();
	var w = aWidth;
	if (scoutline1) {
	  can.strokeStyle = this.scoutLineColor;
	  w = aWidth*50;
        } else {
          can.strokeStyle = "rgb(255,255,0)";
	}
        can.moveTo(aX-aWidth/2, aY);
        can.lineTo(aX-w/2-20, aY);
        can.stroke();

        can.moveTo(aX+aWidth/2, aY);
        can.lineTo(aX+w/2+20, aY);
        can.stroke();
    can.closePath();
    can.beginPath();
        var h = aHeight;
	if (scoutline2) {
 	  can.strokeStyle = this.scoutLineColor;
	  h = aHeight*50;
        } else {
	  can.strokeStyle = "rgb(255,255,0)";
        }
 
        can.moveTo(aX, aY-aHeight/2);
        can.lineTo(aX, aY-h/2-20);
        can.stroke();

        can.moveTo(aX, aY+aHeight/2);
        can.lineTo(aX, aY+h/2+20);
        can.stroke();
        can.closePath();
     }

     if (this.infoOverlayEnabled) {
       //can.shadowBlur = 0;

       can.fillStyle = "rgba(128,128,128,0.5)";
       can.fillRect(canvas.width-70, canvas.height-20, 65, 15);
       can.fillStyle = "rgba(255,255,255,1)";
       can.fillText("b/c:"+parseInt(this.getBrightness()) + "/" + 
            parseFloat(this.getContrast()).toFixed(2), canvas.width-65, canvas.height-8);
       can.fillStyle = "rgba(128,128,128,0.5)";
       can.fillRect(5, canvas.height-20, 85, 15);
       can.fillStyle = "rgba(255,255,255,1)";
       var str = "slice: " + pos;
       var lock = this.getLockPosition();
       if (lock[imset])
          str = str + " [locked]";
       can.fillText(str, 8, canvas.height-8);

       can.fillStyle = "rgba(128,128,128,0.5)";
       can.fillRect(5, 20, 85, 15);
       can.fillStyle = "rgba(255,255,255,1)";
       var str = this.patientinformation["modality"];
       if (this.overlayDataIsSet)
          str = str + "/" + this.patientinformation["overlaymodality"] + " " + this.alpha;
       can.fillText("" + str, 8, 32);

       can.fillStyle = "rgba(128,128,128,0.5)";
       can.fillRect(5, 2, 120, 15);
       can.fillStyle = "rgba(255,255,255,1)";
       var str = this.patientinformation["patientname"];
       if (str.length > 0)
         str = str + ", " + this.patientinformation["scandate"];
       can.fillText("" + str, 8, 14);


       //
       // draw load control at the bottom
       //
       if (imset == 0) {
         var l = canvas.width/(this.imageSet001.length - 1); // todo: exchange imageSet.length with getDims()
         for (var i = 0; i < this.imageSet001.length; i++) {
           if (typeof this.imageSet001[i] != "undefined") {
              if (i == pos)
                can.fillStyle = "rgba(255,0,0,0.5)";
              else
                can.fillStyle = "rgba(200,200,100,0.5)";
           } else {
              can.fillStyle = "rgba(128,128,128,0.5)";
           }
           can.fillRect(i*l, canvas.height - 2, l, canvas.height);
         }
         if (this.overlayDataIsSet) {
           var l = canvas.width/(this.overlayImageSet001.length - 1);
           for (var i = 0; i < this.overlayImageSet001.length; i++) {
             if (typeof this.imageSet001[i] != "undefined") {
              if (i == pos)
                can.fillStyle = "rgba(255,0,0,0.5)";
              else
                can.fillStyle = "rgba(200,200,100,0.5)";
             } else {
                can.fillStyle = "rgba(128,128,128,0.5)";
             }
             can.fillRect(i*l, canvas.height - 4, l, canvas.height-2);
           }
         }
       } else if (imset == 1) {
         var l = canvas.width/(this.imageSet010.length - 1);
         for (var i = 0; i < this.imageSet010.length; i++) {
           if (typeof this.imageSet010[i] != "undefined") {
              if (i == pos)
                can.fillStyle = "rgba(255,0,0,0.5)";
              else
                can.fillStyle = "rgba(200,200,100,0.5)";
           } else {
              can.fillStyle = "rgba(128,128,128,0.5)";
           }
           can.fillRect(i*l, canvas.height - 2, l, canvas.height);
         }
         if (this.overlayDataIsSet) {
           var l = canvas.width/(this.overlayImageSet010.length - 1);
           for (var i = 0; i < this.overlayImageSet010.length; i++) {
             if (typeof this.imageSet010[i] != "undefined") {
              if (i == pos)
                can.fillStyle = "rgba(255,0,0,0.5)";
              else
                can.fillStyle = "rgba(200,200,100,0.5)";
             } else {
                can.fillStyle = "rgba(128,128,128,0.5)";
             }
             can.fillRect(i*l, canvas.height - 4, l, canvas.height-2);
           }
         }
       } else if (imset == 2) {
         var l = canvas.width/(this.imageSet100.length - 1);
         for (var i = 0; i < this.imageSet100.length; i++) {
           if (typeof this.imageSet100[i] != "undefined") {
              if (i == pos)
                can.fillStyle = "rgba(255,0,0,0.5)";
              else
                can.fillStyle = "rgba(200,200,100,0.5)";
           } else {
              can.fillStyle = "rgba(128,128,128,0.5)";
           }
           can.fillRect(i*l, canvas.height - 2, l, canvas.height);
         }
         if (this.overlayDataIsSet) {
           var l = canvas.width/(this.overlayImageSet100.length - 1);
           for (var i = 0; i < this.overlayImageSet100.length; i++) {
             if (typeof this.imageSet100[i] != "undefined") {
                if (i == pos)
                  can.fillStyle = "rgba(255,0,0,0.5)";
                else
                  can.fillStyle = "rgba(200,200,100,0.5)";
             } else {
                can.fillStyle = "rgba(128,128,128,0.5)";
             }
             can.fillRect(i*l, canvas.height - 4, l, canvas.height-2);
           }
         }
       }
     }
   }
   var msg = document.getElementById("loading");
   if (msg) 
      msg.innerHTML = this.position;
   
   me = this;
   setTimeout("updateBinded()", 100);
}

var me = null;
function updateBinded() {
   // update all binded mprs
   var p = me.getPosition();
   var t = me.getTranslation();
   for(var i = 0; i < me.bindPositions.length; i++) {
      var obj = me.bindPositions[i];
      obj.setTranslation(t[0],t[1],t[2],t[3],t[4],t[5]); // setTranslation is not calling update on its own
      obj.setPosition(p[0],p[1],p[2]);
   }
   var z = me.getZoomFactor();
   for(var i = 0; i < me.bindZoom.length; i++) {
      var obj = me.bindZoom[i];
      obj.setZoomFactor(z);
   }
}

//
// read images into the cache of the browser, returns them for the interface
//
function importImages( dataPath, caller, parent, position, isPrimary ) {
   var images = new Array;
   var positions = new Array;
   var present001 = false;
   var present010 = false;
   var present100 = false;

   // translate position into image name on disk
   var pos = [];
   pos[0] = position[0];
   pos[1] = position[1];
   pos[2] = position[2];
   var flip = parent.flipSliceDirection;

   // only add images if there is a viewer for them
   for ( var i in parent.windowArray ) {
      if (parent.windowArray[i][0] == 0 && parent.windowArray[i][1] == 0 && parent.windowArray[i][2] == 1)
        present001 = true;
      if (parent.windowArray[i][0] == 0 && parent.windowArray[i][1] == 1 && parent.windowArray[i][2] == 0)
        present010 = true;
      if (parent.windowArray[i][0] == 1 && parent.windowArray[i][1] == 0 && parent.windowArray[i][2] == 0)
        present100 = true;
   }
   cache = parent.cacheSize;
   if (present001) {
     for (var i = -cache; i <= +cache; i++) { // [0,0,1]
        var locMem  = position[0]+i; // location in memory
    var si = parent.getDims()[0]-1;
        if (locMem > si)
      continue;
        if (locMem < 0)
          continue;
        var locDisk = pos[0]+i;     // location on disk
        if (flip[0])
       locDisk = si-locDisk;
        if (locMem > 0 && locMem <= si+1 && typeof parent.imageSet001[locMem] == "undefined") {
          images.push( dataPath + '/HOR_' + zeroPad(locDisk,3) + '.jpg' );
          positions.push([0, locMem]);
        }
     }
   }
   if (present010) {
     for (var i = -cache; i <= +cache; i++) { // [0,0,1]
        var locMem  = position[1]+i; // location in memory
    var si = parent.getDims()[1]-1;
        if (locMem > si)
      continue;
        if (locMem < 0)
          continue;
        var locDisk = pos[1]+i;     // location on disk
        if (flip[1])
       locDisk = si-locDisk;
        if (locMem > 0 && locMem <= si+1 && typeof parent.imageSet010[locMem] == "undefined") {
          images.push( dataPath + '/SAG_' + zeroPad(locDisk,3) + '.jpg' );
          positions.push([1, locMem]);
        }
     }
   }
   if (present100) {
     for (var i = -cache; i <= +cache; i++) { // [0,0,1]
        var locMem  = position[2]+i; // location in memory
    var si = parent.getDims()[2]-1;
        if (locMem > si)
      continue;
        if (locMem < 0)
          continue;
        var locDisk = pos[2]+i;     // location on disk
        if (flip[2])
       locDisk = si-locDisk;
        if (locMem > 0 && locMem <= si+1 && typeof parent.imageSet100[locMem] == "undefined") {
          images.push( dataPath + '/COR_' + zeroPad(locDisk,3) + '.jpg' );
          positions.push([2, locMem]);
        }
     }
   }
   // calls update() at the end of the loading
   this.callback   = caller;
   this.isPrimary  = isPrimary;
   this.positions  = positions;
   this.parent     = parent;
   this.nLoaded    = 0;
   this.nProcessed = 0;
   this.aImages    = new Array;
   this.nImages    = images.length;
   if (images.length > 0) {
     for (var i = 0; i < images.length; i++) {
        this.preload(images[i]);
     }
   } else { // still call the callback because we are done
     this.callback(this.aImages, this.nLoaded, this.parent, this.positions, this.isPrimary);
   }
}
importImages.prototype.preload = function(image) {
   var oImage = new Image();
   this.aImages.push(oImage);
   oImage.onload = importImages.prototype.onload;
   oImage.onerror = importImages.prototype.onerror;
   oImage.onabort = importImages.prototype.onabort;
   oImage.oImagePreloader = this;
   oImage.bLoaded = false;
   oImage.src = image;
}
importImages.prototype.onComplete = function() {
   this.nProcessed++;
   if (this.nProcessed == this.nImages) {
        this.callback(this.aImages, this.nLoaded, this.parent, this.positions, this.isPrimary);
   } 
}
importImages.prototype.onload = function() {
   this.bLoaded = true;
   this.oImagePreloader.nLoaded++;
   this.oImagePreloader.onComplete();
}
importImages.prototype.onerror = function() {
   this.bError = true;
   this.oImagePreloader.onComplete();
}
importImages.prototype.onabort = function() {
   this.bAbort = true;
   this.oImagePreloader.onComplete();
}

  function zeroPad(num,count) {
    var numZeropad = num + '';
    while(numZeropad.length < count) {
	numZeropad = "0" + numZeropad;  
    }
    return numZeropad;
  }

} // end mpr
