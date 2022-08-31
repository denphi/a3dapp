require.config({
  paths: {
    'react': 'https://unpkg.com/react@16.8.6/umd/react.development',
    'react-dom': 'https://unpkg.com/react-dom@16.8.6/umd/react-dom.development',
    'material-ui': 'https://unpkg.com/@material-ui/core@latest/umd/material-ui.development',
    'plotlycomponent': 'https://unpkg.com/react-plotly.js@2.3/dist/create-plotly-component',
    'plotly': 'https://cdn.plot.ly/plotly-1.52.0.min',
    'math': 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/6.6.1/math.min',
    'axios': 'https://unpkg.com/axios/dist/axios.min',
    'localforage' : 'https://www.unpkg.com/localforage@1.7.3/dist/localforage.min',
    'number-format': 'https://unpkg.com/react-number-format@4.3.1/dist/react-number-format',
    'prop-types': 'https://unpkg.com/prop-types@15.6/prop-types.min',
    'vtk':'https://unpkg.com/vtk.js@14.15.8/dist/vtk'
  }
});
require.undef('TraceWidget')
  define('TraceWidget', [
    '@jupyter-widgets/base',
    'underscore', 
    'react', 
    'react-dom',
    'material-ui',
    'number-format',
    'axios',
    'localforage',
    'prop-types',
    'plotlycomponent',
    'plotly',
    'math',
    'vtk'
  ], function(
    widgets, 
    _, 
    React, 
    ReactDOM,
    Material,
    Format,
    Axios,
    LocalForage,
    PropTypes,
    PlotlyComponent,
    Plotly,
    math,
    vtk_module
  ) {
    const TraceWidgetModel = widgets.WidgetModel.extend({}, {
        serializers: _.extend({
        }, widgets.DOMWidgetModel.serializers)
    });
    const TraceWidgetView = widgets.DOMWidgetView.extend({
        initialize() {
            widgets.DOMWidgetView.prototype.initialize.call(this, arguments);
            this.options = {};
            this.rendering = true;
            this.app = document.createElement('div');
            this.colormapc = document.createElement('div');
            this.colormapc.style.position = "relative"
            this.colormapc.style.height = "30px"
            
            this.colormapd = document.createElement('div');
            this.colormapd.style.overflow = "auto"
            this.colormapd.style.height = "60px"
            
            this.colormap = document.createElement('canvas');
            this.colormap.style.position = "absolute"
            this.colormap.style.top = "0"
            
            this.colormapr = document.createElement('div');
            this.colormapr.style.position = "absolute"
            this.colormapr.style.right = "0px"
            this.colormapr.style.top = "5px"
            
            this.colormapl = document.createElement('div');
            this.colormapl.style.position = "absolute"
            this.colormapl.style.left = "0px"
            this.colormapl.style.top = "5px"

            this.colormapc.append(this.colormap);
            this.colormapc.append(this.colormapl);
            this.colormapc.append(this.colormapr);
            this.el.append(this.app);
            this.el.append(this.colormapc);
            this.el.append(this.colormapd);
            this.window = undefined;
            this.colormap.style.width = "100%"
            this.colormap.style.height = "100%"
            this.listenTo(this.model, 'change:lines', this.buildModel, this);
            this.listenTo(this.model, 'change:lines', this.resetCamera, this);
            this.listenTo(this.model, 'change:field', this.buildModel, this);
            this.listenTo(this.model, 'change:colormap', this.buildModel, this);
            this.buildModel();
        },
        saveCamera(renderer){
            var activeCamera = renderer.getActiveCamera();
            this.model.set("position", activeCamera.getPosition());
            this.model.set("viewup", activeCamera.getViewUp());
            this.model.set("focalpoint", activeCamera.getFocalPoint());
            this.model.set("clippingrange", activeCamera.getClippingRange());
            this.model.save_changes();
        },
        resetCamera(){
            this.window.getRenderer().resetCamera();
            var activeCamera = this.window.getRenderer().getActiveCamera();
            this.model.set("position", activeCamera.getPosition());
            this.model.set("viewup", activeCamera.getViewUp());
            this.model.set("focalpoint", activeCamera.getFocalPoint());
            this.model.set("clippingrange", activeCamera.getClippingRange());
            this.model.save_changes();
        },
        buildModel(){
            let lines = this.model.get('lines');
            let field = this.model.get('field');
            let palette = this.model.get('colormap');
            if (this.app.firstChild)
                this.app.removeChild(this.app.firstChild)
            this.colormapl.innerHTML = ""; 
            this.colormapr.innerHTML = "";
            this.colormapd.innerHTML = "";
            if (lines.length > 0){
                let cpalette = {};
                cpalette["blackbody"] = [
                    [1.0, 0, 0,0],
                    [0.8, 0.901960784314,0, 0],
                    [0.4, 0.901960784314, 0.901960784314, 0],
                    [0.0, 1, 1, 1],
                ];
                cpalette["blues"] = [
                    [1.0, 0.031, 0.188, 0.419],
                    [0.8, 0.129, 0.443, 0.709, 0],
                    [0.4, 0.619, 0.792, 0.882],
                    [0.0, 0.968, 0.984, 1],
                ];
                cpalette["greys"] = [
                    [1.0, 0, 0,0],
                    [0.8, 0.321, 0.321, 0.321],
                    [0.4, 0.741, 0.741, 0.741],
                    [0.0, 1, 1, 1],
                ];

                if (palette == undefined)
                    palette = "blackbody"
                if (field == undefined)
                    field = 3
                var min = [0,0,0,0,0];
                var max = [0,0,0,0,0];
                var threshold = 0.0;
                var points = Array();
                var points_flat = Array();
                var verts = Array();
                var prev_point = Array(0,1000,1000,1000)
                var prev_layer;
                var p_layer = 0;
                for (let [i, line] of lines.entries()){
                    var vals = line.split(",");
                    var point = [0,0,0,0];
                    for (var j=0;j<4;j++){
                        point[j] = parseFloat(vals[j]);
                        if (i==0 || point[j]>max[j])
                            max[j] = point[j];
                        if (i==0 || point[j]<min[j])
                            min[j] = point[j];
                    }
                    if (i==0){
                        prev_layer = point
                    }
                    if (vals[4] > 0){
                        var dist = Math.pow(prev_point[1]-point[1],2) + Math.pow(prev_point[2]-point[2],2) + Math.pow(prev_point[3]-point[3],2)
                        dist = Math.sqrt(dist);

                        if (dist > threshold){
                            point.push(p_layer);
                            points.push(point);
                            if (point[3] > prev_layer[3] && (point[3]- prev_layer[3]) > 1){
                                let diff = point[0]-prev_layer[0];
                                p_layer = diff
                                if (diff > max[4]){
                                    max[4] = diff;
                                }
                                prev_layer = point
                            }
                            prev_point = point
                        }
                    }
                }

                var pointType = vtk.Common.Core.vtkDataArray.VtkDataTypes.DOUBLE;
                var numSegments = points.length-1;
                var polyData = vtk.Common.DataModel.vtkPolyData.newInstance();
                var pointsvtk = vtk.Common.Core.vtkPoints.newInstance({dataType:pointType});
                pointsvtk.setNumberOfPoints(numSegments);
                var pointData = new Float32Array(3*(numSegments+1));
                var verts = new Uint32Array(2*(numSegments+1));
                var liness = new Uint32Array(numSegments + 2);
                liness[0] = numSegments+1;
                var scalarsData = new Float32Array(numSegments + 1);
                for (let i=0; i<numSegments + 1;i++){
                    for (let j = 0; j < 3; ++j) {
                        pointData[3 * i + j] = points[i][j+1];
                    }
                    scalarsData[i] = points[i][field];    
                    verts[i] = 1;
                    verts[1+1] = i;
                    liness[i+1] = i;
                }
                var scalars = vtk.Common.Core.vtkDataArray.newInstance({
                    name: 'Scalars',
                    values: scalarsData,
                });

                pointsvtk.setData(pointData);
                polyData.setPoints(pointsvtk);
                polyData.getVerts().setData(verts);
                polyData.getLines().setData(liness);
                polyData.getPointData().setScalars(scalars);

                this.window = vtk.Rendering.Misc.vtkGenericRenderWindow.newInstance();
                const renderer = this.window.getRenderer();
                let self = this;
                this.window.getInteractor().onEndAnimation( function(){ self.saveCamera( renderer ) } )
                               
                var renderWindow = this.window.getRenderWindow();
                this.window.setContainer(this.app);
                this.window.getRenderer().setBackground(1, 1, 1);

                var actorplane = vtk.Rendering.Core.vtkActor.newInstance(); 
                actorplane.getProperty().setRepresentation(vtk.Rendering.Core.vtkProperty.Representation.WIREFRAME);
                actorplane.getProperty().setColor([0,0,0]);
                var tilesx = Math.ceil((max[1])/50)
                var tilesy = Math.ceil((max[2])/50)
                actorplane.setScale([tilesx*50,tilesy*50,1]);
                actorplane.setPosition([0,0,-10]);
                var actor = vtk.Rendering.Core.vtkActor.newInstance(); 

                renderer.addActor(actor);
                renderer.addActor(actorplane);

                var mapper = vtk.Rendering.Core.vtkMapper.newInstance();       
                var mapperplane = vtk.Rendering.Core.vtkMapper.newInstance();  

                actor.setMapper(mapper);
                actorplane.setMapper(mapperplane);

                var planeSource = vtk.Filters.Sources.vtkPlaneSource.newInstance();
                planeSource.setXResolution(tilesx);
                planeSource.setYResolution(tilesy);


                planeSource.update()
                mapperplane.setInputData(planeSource.getOutputData(0));

                var ctfun = vtk.Rendering.Core.vtkColorTransferFunction.newInstance();
                var color = [
                  cpalette[palette][0],
                  cpalette[palette][1],
                  cpalette[palette][2],
                  cpalette[palette][3]
                ];

                ctfun.addRGBPoint(color[0][0], color[0][1], color[0][2],color[0][3]);
                ctfun.addRGBPoint(color[1][0], color[1][1], color[1][2],color[1][3]);
                ctfun.addRGBPoint(color[2][0], color[2][1], color[2][2],color[2][3]);
                ctfun.addRGBPoint(color[3][0], color[3][1], color[3][2],color[3][3]);

                mapper.setLookupTable(ctfun);
                mapper.setScalarModeToUsePointFieldData();
                mapper.setArrayAccessMode(mapper.BY_NAME);
                mapper.setColorByArrayName("Scalars");
                mapper.setScalarVisibility(true);
                mapper.setScalarRange([min[field],max[field]]);
                mapper.setInputData(polyData);
                let activeCamera = renderer.getActiveCamera();
                let position = this.model.get('position');
                let viewup = this.model.get('viewup');
                let focalpoint = this.model.get('focalpoint');
                let clippingrange = this.model.get('clippingrange');
                console.log(this.model);
                if (position.length != 3 ||viewup.length != 3 || focalpoint.length != 3 || clippingrange.length != 2){
                    renderer.resetCamera();
                    this.saveCamera(renderer)
                } else {
                    activeCamera.setPosition(position[0],position[1],position[2]);
                    activeCamera.setViewUp(viewup[0],viewup[1],viewup[2]);
                    activeCamera.setFocalPoint(focalpoint[0],focalpoint[1],focalpoint[2]);
                    activeCamera.setClippingRange(clippingrange[0],clippingrange[1]);
                    activeCamera.modified()
                    this.started = true;
                }
                renderWindow.render();

                var ctx = this.colormap.getContext("2d");
                var grd = ctx.createLinearGradient(40, 0, this.colormap.width-40, 0);
                ctx.clearRect(0, 0, this.colormap.width, this.colormap.height);
                ctx.fillStyle = grd;
                for (var i = 0; i < 4; i++) {
                  let c = color[i]
                  grd.addColorStop(c[0], "rgba(" + c[1]*255 + "," + c[2]*255 + "," + c[3]*255 + ",1.0)");
                }
                ctx.fillRect(40, 0, this.colormap.width-80, Math.ceil(this.colormap.height));
                ctx.fillStyle = "black";
                ctx.font = "12px Arial";
                let unitv = "time";
                if (field == 0){
                    unitv = "time";
                } else if (field <= 3){
                    unitv = "displacement";
                }
                this.colormapl.innerHTML = Util.tU(min[field], unitv).toFixed(1) + " " + Util.getUnit(unitv); 
                this.colormapr.innerHTML = Util.tU(max[field], unitv).toFixed(1) + " " + Util.getUnit(unitv); 
                this.colormapd.innerHTML = ""
                this.colormapd.innerHTML += "time ("+Util.getUnit("time")+"): " + Util.tU(min[0], "time").toFixed(1) + " - " + Util.tU(max[0], "time").toFixed(1) + ", "; 
                this.colormapd.innerHTML += "pos x("+Util.getUnit("displacement")+"): " + Util.tU(min[1], "displacement").toFixed(1) + " - " + Util.tU(max[0], "displacement").toFixed(1) + ", "; 
                this.colormapd.innerHTML += "pos y("+Util.getUnit("displacement")+"): " + Util.tU(min[2], "displacement").toFixed(1) + " - " + Util.tU(max[0], "displacement").toFixed(1) + ", "; 
                this.colormapd.innerHTML += "pos z("+Util.getUnit("displacement")+"): " + Util.tU(min[3], "displacement").toFixed(1) + " - " + Util.tU(max[0], "displacement").toFixed(1) + ", "; 
                this.colormapd.innerHTML += "layer: " + Util.tU(min[4], "").toFixed(1) + " - " + Util.tU(max[0], "").toFixed(1) + ""; 
            }
        }
    });
    return {
      TraceWidgetView,
      TraceWidgetModel
    };
});



