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
require.undef('A3DWidget')
  define('A3DWidget', [
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
    const A3DWidgetModel = widgets.WidgetModel.extend({}, {
        serializers: _.extend({
        }, widgets.DOMWidgetModel.serializers)
    });
    const A3DWidgetView = widgets.DOMWidgetView.extend({
        initialize() {
            const backbone = this;
            widgets.DOMWidgetView.prototype.initialize.call(this, arguments);
            backbone.options = {};
            
            

            
            
            
            
            
            
            
            
            
            
            
            /** @class Class representing the VTKComponent component. */
            
            class VTKComponent extends React.Component {
                /**
                * Creates an instance of VTKComponent that includes all the main options to be displayed on the side menu.
                *
                * @constructor
                * @author: denphi, denphi@denphi.com, Purdue University
                * @param {props} a dict with the properties required by the SideMenu.
                *         props.filename string with the filename 
                *         props.variable string with the component dimension on the vtk file
                */	
                constructor(props) {
                    super(props)
                    this.readers = new Array (this.props.samples)
                    this.volumes = new Array (this.props.samples)
                    this.path =  props.path  
                    this.filename = props.filename
                    this.dim_name = this.props.variable
                    this.plane = this.props.plane
                    this.cont = React.createRef();         
                    this.loader = React.createRef();  
                    this.message = React.createRef();         
                    this.time = React.createRef();         
                    this.slice = React.createRef();         
                    this.color = React.createRef();         
                    this.state = {"sim_step" : "Simulation Step (DepositionProcess - " + ((9)*100/9).toFixed(1) + "%)" , "step" : 9};
                    this.cameras = React.createRef();  
                    let self = this;
                    this.plugin = new VTKPlugin(1000, 500, this.path, [], function(a,b) { self.createReport(a,b) })
                    this.uuids = Array.apply(null, Array(8)).map(function() { return Util.create_UUID() });
                }
                /**
                * Function that display a message in the message
                *
                * @param {message} string, message of the current status of the Component
                */
                setMessage(message){
                    if (this.message.current)
                        this.message.current.innerHTML = message        
                }

                createReport(image1, image2){

                    let self = this;
                    fetch(self.path + "../sim_data_card.json", [])
                    .then(response => response.json())
                    .then(function (json) {
                        let data = json
                        data.event_series = "..."
                        fetch(self.path + "job_card.json", [])
                            .then(response2 => response2.json())
                            .then(function (json2) {
                            let job = json2
                            var openPrint = window.open('printReport.html');
                            openPrint.onload = function() {
                                var img1 = new Image();

                                img1.src = image1;
                                var img2 = new Image();
                                img2.src = image2;
                                var doc = openPrint.document;

                                var title = doc.createElement("h1")
                                title.innerHTML = self.dim_name
                                doc.body.appendChild(title);	

                                var title1 = doc.createElement("h2")
                                title1.innerHTML = "Simulation Data Card"
                                doc.body.appendChild(title1);	
                                var paramsd = doc.createElement("pre")
                                paramsd.innerHTML = JSON.stringify(data, null, '  ')
                                doc.body.appendChild(paramsd);	

                                var title2 = doc.createElement("h2")
                                title2.innerHTML = "Simulation Job Card"
                                doc.body.appendChild(title2);	
                                var paramsj = doc.createElement("pre")
                                paramsj.innerHTML = JSON.stringify(job, null, '  ')
                                doc.body.appendChild(paramsj);	

                                var title3 = doc.createElement("h2")
                                title3.innerHTML = self.state.sim_step
                                doc.body.appendChild(title3);	

                                var div1 = doc.createElement("div")
                                div1.innerHTML = img1.outerHTML
                                doc.body.appendChild(div1);	

                                var title4 = doc.createElement("h2")
                                title4.innerHTML = "Slice (" + String(self.plugin.current_slice) + ") on plane " + self.plane 
                                doc.body.appendChild(title4);	

                                var div3 = doc.createElement("div")
                                div3.innerHTML = img2.outerHTML
                                doc.body.appendChild(div3);				
                            };
                        })		
                    })		
                }

                /**
                * Internal function that loads a slice from the filename, it calls recursivelly until all slices are loaded
                *
                * @param {slice} int, index of the slice to be loaded
                */
                ReadSlice( slice ){
                    let self = this
                    if (self.loader.current)
                        self.loader.current.style.width = (slice/self.props.samples)*100 + "%"
                    if (slice == self.props.samples){
                        self.RenderSlices()
                    } else {
                        self.setMessage('Loading ' + self.path + self.filename + '_' + slice + '.vtp ...')
                        self.readers[slice].setUrl(self.path + self.filename + '_' + slice + '.vtp').then( function(value){
                            self.setMessage('Loading ' + self.path + self.filename + '_' + slice + '_' + self.plane + '_' + self.dim_name + '.vti ...')
                            self.volumes[slice].setUrl(self.path + self.filename + '_' + slice + '_' + self.plane + '_' + self.dim_name + '.vti').then( function(value){
                                self.ReadSlice(slice+1)
                            }).catch(function(value){
                                self.volumes[slice] = null;
                                self.ReadSlice(slice+1)
                            })
                        })
                    }
                }  
                /**
                * Final function that setup up children components to be rendered
                *
                */
                RenderSlices(){
                    this.setMessage('Rendering ...')
                    if (this.plugin.setData(this.readers, this.volumes, this.dim_name, this.plane)){
                        this.plugin.container.style.display='block'
                        this.selectTimeLegend(this.state.step)        
                        this.selectSlice(this.plugin.current_slice)        
                        this.selectLut(this.plugin.current_lut)        
                        this.setMessage('')
                    } else {
                        this.plugin.container.style.display='none'
                        this.setMessage('There was a problem with the dataset / variable')
                    }
                 }

                /**
                * This method configure all children components to a new time 
                *
                * @param {time} int, represent the time event to display 
                */    
                selectTimeLegend(time){
                    if (this.time.current){    
                        this.setState({"sim_step" :"Simulation Step" })       
                        this.time.current.setState({total:this.plugin.n_samples, current:this.plugin.current_time})
                    }
                    if (time>=10 && time<12)
                        { this.setState({"sim_step" :"Simulation Step (CoolingProcessOnBed - " + ((time-10)*100/1).toFixed(1) + "%)", "step":time }) }
                    else if (time>=12 && time<14)
                        { this.setState({"sim_step" :"Simulation Step (CoolingProcessOffBed - " + ((time-12)*100/1).toFixed(1) + "%)", "step":time  }) }
                    else 
                        { this.setState({"sim_step" :"Simulation Step (DepositionProcess - " +  ((time)*100/9).toFixed(1) + "%)", "step":time  }) }
                    this.plugin.selectTimeLegend(time)
                }
                /**
                * This method configure all children components to a new slice 
                *
                * @param {slice} int, represent the slice to display 
                */   

                saveImage (){
                    this.plugin.saveImage()
                }

                selectSlice(slice){
                    if (this.slice.current){            
                        this.slice.current.setState({total:this.plugin.n_slices, current:this.plugin.current_slice})
                    }
                    this.plugin.selectSlice(slice)
                }
                /**
                * This method configure all children components to a color set (LUT transfer function) 
                *
                * @param {color} int, represent the slice to display 
                */ 
                selectLut(color){
                    if (this.color.current){            
                        this.plugin.selectLut(color);
                        this.color.current.setState({colormap:this.plugin.vtkColorMaps, selected:this.plugin.current_lut, range:this.plugin.range})
                    }
                }

                /**
                * This method configure all children components to a color set (LUT transfer function) 
                *
                * @param {u} int, U component of the texture coordinates
                * @param {v} int, V component of the texture coordinates 
                */ 
                rotateXYZ(u,v){
                    this.plugin.rotateXYZ(u,v)
                }

                /**
                * This method handles the change of range values on the component
                *
                * @param {min} float, min value in the range
                * @param {min} float, max value in the range
                */ 
                onChangeRange(min, max){
                    this.plugin.setRange(min, max)
                }

                onDisplacement(disp){
                    this.plugin.setScaleFactor(disp)
                }	
                /**
                * Renders the VTKComponent component and children.
                *
                * @return {div} Return a React Component instance
                */    
                render() { 
                    var children = Array()    
                    let self = this
                    children.push(React.createElement("div", {key:this.uuids[0], className:"JobsComponentJobPercentage"}, 
                        React.createElement("div", {style:{width:"0%"}, ref:this.loader}) 
                    ));

                    children.push(React.createElement("div", {key:this.uuids[1], className:"VTKComponentLabel", ref:this.message}, "Loading..."));
                    children.push(React.createElement(VtkComponentColors, {key:this.uuids[2], ref:this.color, deformation:32, variable:self.dim_name, onDisplacement:function(disp){self.onDisplacement(disp)}, onSelected:function(sel){ self.selectLut(sel)}, onChange:function(min,max){self.onChangeRange(min,max)}}))
                    children.push(React.createElement(VtkComponentCamera, {key:this.uuids[3], ref:this.cameras, onClick:function(u,v){ self.rotateXYZ(u,v)}, onScreenShot:function(e){ self.saveImage()}}));
                    //children.push(React.createElement(VTKComponentStep, {key:this.uuids[4], name:"Simulation Step", ref:this.time, onSelected:function(s){self.selectTimeLegend(s)}}));
                    children.push(React.createElement("div", {key:Util.create_UUID(), className:"VTKComponentLabel"}, self.state.sim_step));
                    children.push(React.createElement(Material.Slider, {key:this.uuids[4], marks:true, value:this.state.step, min:0, max:12, step:1, onChange:function(e,s){self.selectTimeLegend(s)}}));
                    children.push(React.createElement("div", {key:this.uuids[5], className:"VTKComponentModel", ref:this.cont}));
                    //children.push(React.createElement(VTKComponentStep, {key:this.uuids[6], name:"Slice", ref:this.slice, onSelected:function(s){self.selectSlice(s)}}));
                    children.push(React.createElement("div", {key:Util.create_UUID(), className:"VTKComponentLabel"}, "Plane for view cut"));
                    children.push(React.createElement(Material.Slider, {key:Util.create_UUID(), marks:true, defaultValue:5, min:0, max:9, step:1, onChange:function(e,s){self.selectSlice(s)}}));
                    var div = React.createElement("div", {key:this.uuids[7], className:"VTKComponent", style:{width:"auto"}}, children )
                    return div;     
                }    

                /**
                * Method called when the component is loaded, creating the proper VTK objects
                *
                */ 
                componentDidMount() {
                    this.cont.current.appendChild(this.plugin.container);
                    this.plugin.setupWindows()
                    for (var i=0; i < this.props.samples; i++){
                        this.readers[i] = vtk.IO.XML.vtkXMLPolyDataReader.newInstance();
                        this.volumes[i] = vtk.IO.XML.vtkXMLImageDataReader.newInstance();
                    }
                    if (self.path != ""){
                        this.ReadSlice(0);
                    }
                }    


            }

            /** @class Class representing VTKComponentStep component. */
            class VTKComponentStep extends React.Component {
                /**
                * Creates an instance of VTKComponent that includes all the main options to be displayed on the side menu.
                *
                * @constructor
                * @author: denphi, denphi@denphi.com, Purdue University
                * @param {props} a dict with the properties required by the SideMenu.
                *         props.name string with the name of the step
                *         props.onSelected callback function triggered when a new step is selected
                */	
                constructor(props) {
                    super(props)
                    this.state = {total:0, current:0}
                    this.name = this.props.name
                }
                /**
                * Renders the VTKComponentStep component and children.
                *
                * @return {div} Return a React Component instance
                */    
                render() { 
                    var children = Array()    
                    let self = this
                    for (var i = 0;i<this.state.total;i++){
                        let sel = i
                        var className = "VTKComponentStepNode"
                        if (sel == this.state.current)
                            className = "VTKComponentStepNodeSelected"
                        children.push(React.createElement("div", {key:Util.create_UUID(), className:className, onClick:function(){self.props.onSelected(sel)}}, sel))
                    }
                    var div = React.createElement("div", {key:Util.create_UUID(), className:""}, [
                        React.createElement("div", {key:Util.create_UUID(), className:"VTKComponentLabel"}, this.name ),        
                        React.createElement("div", {key:Util.create_UUID(), className:"VTKComponentStepLine"} ),        
                        React.createElement("div", {key:Util.create_UUID(), className:"VTKComponentStep"}, children)
                    ])
                    return div
                }
            }

            /** @class Class representing VtkComponentColors component. */
            class VtkComponentColors extends React.Component {
                /**
                * Creates an instance of VTKComponent that includes all the main options to be displayed on the side menu.
                *
                * @constructor
                * @author: denphi, denphi@denphi.com, Purdue University
                * @param {props} a dict with the properties required by the SideMenu.
                *         props.onSelected callback function triggered when a new color is selected
                *         props.onChange callback function triggered when the value range is changed
                */	
                constructor(props) {
                    super(props)
                    this.state = {colormap:{}, selected:undefined}
                    this.spot1 = React.createRef();         
                    this.spot2 = React.createRef();  
                    this.base = React.createRef();  
                    this.cont = React.createRef();  
                    this.colors = React.createRef();  
                    this.preset = React.createRef();  
                    this.spot = undefined;
                    this.defase = 0;
                    this.state.min = 0;
                    this.state.max = 100;
                    this.state.range = [0,1]
                    this.state.deformation = this.props.deformation
                    this.state.variable = this.props.variable
                    this.state.show_settings = false
                }    
                /**
                * Method that handles the Javascript event that enable dragging
                *
                * @param {event} javascript event with information of mouse user interaction
                * @param {spot} string left / right 
                */    
                dragStart(event, spot) {
                    this.spot = spot
                    var bounds
                    if (this.spot == "right"){
                        bounds = this.spot2.current.getBoundingClientRect();            
                    } else if (this.spot == "left"){
                        bounds = this.spot1.current.getBoundingClientRect();
                    }
                    this.defase = 0//(event.clientX - bounds.left)
                }
                /**
                * Method that handles the Javascript event that enable dragging
                *
                * @param {event} javascript event with information of mouse user interaction
                */
                allowDrop(event) {
                    if (this.spot != undefined){
                        var spot = undefined
                        var bounds = this.cont.current.getBoundingClientRect();
                        if (event.clientX > bounds.right || event.clientX < bounds.left || event.clientY > bounds.bottom || event.clientY < bounds.top){
                            this.drop(undefined)            
                        } 
                        bounds = this.base.current.getBoundingClientRect();
                        var x = (event.clientX - bounds.left) / (bounds.right - bounds.left);
                        if (x >= 0 && x <=1){
                            var old2 = this.spot2.current.style.right
                            var old1 = this.spot1.current.style.left
                            if (this.spot == "right"){
                                this.spot2.current.style.right = ((1-x)*100) + "%"
                            } else if (this.spot == "left"){

                                this.spot1.current.style.left = (x*100) + "%"
                            }
                            var bounds1 = this.spot1.current.getBoundingClientRect();
                            var bounds2 = this.spot2.current.getBoundingClientRect();
                            if (bounds1.right > bounds2.left){
                                this.spot2.current.style.right = old2
                                this.spot1.current.style.left = old1
                            }
                        }
                        else{
                            this.drop({})
                        }
                    }      
                }
                /**
                * Method that handles the Javascript drop event and gets the position of the mouse
                *
                * @param {event} javascript event with information of mouse user interaction
                */    
                drop(event) {
                  if (this.spot != undefined){        
                    var boundsmin = this.spot1.current.getBoundingClientRect();
                    var boundsmax = this.spot2.current.getBoundingClientRect();
                    var bounds = this.base.current.getBoundingClientRect();
                    this.state.min = (((boundsmin.right+boundsmin.left)/2) - bounds.left)*100 / (bounds.right - bounds.left);        
                    this.state.max = (((boundsmax.right+boundsmax.left)/2) - bounds.left)*100 / (bounds.right - bounds.left);        
                    var val_min = (this.state.range[1]-this.state.range[0])*(this.state.min/100) + this.state.range[0];
                    var val_max = (this.state.range[1]-this.state.range[0])*(this.state.max/100) + this.state.range[0];
                    if (this.props.onChange){
                        this.props.onChange(val_min, val_max)
                    }        
                    this.spot1.current.innerHTML = Util.fixedVal(val_min, this.state.variable) + " " + Util.getUnit(this.state.variable);
                    this.spot2.current.innerHTML = Util.fixedVal(val_max, this.state.variable) + " " + Util.getUnit(this.state.variable);
                    this.setRulerBG()
                    this.spot = undefined
                  }
                }    
                /**
                * This method defines the colors of the backgroud color ruler based on the palette selected by the user
                *
                */    
                setRulerBG(){
                    var point_min_rgb;
                    var point_max_rgb;                  
                    var color_instance = this.state.colormap[this.state.selected]
                    if (color_instance){
                        if (color_instance.RGBPoints && color_instance.RGBPoints.length < 40){
                            var total_colors = Math.ceil(color_instance.RGBPoints.length/4)
                            var point_min = color_instance.RGBPoints[0]
                            var point_max = color_instance.RGBPoints[0]
                            for (var il=0;il<total_colors;il++){
                                var point = color_instance.RGBPoints[il*4]
                                if (point_min >= point){
                                    point_min = point
                                    let r = color_instance.RGBPoints[il*4+1]*255
                                    let g = color_instance.RGBPoints[il*4+2]*255
                                    let b = color_instance.RGBPoints[il*4+3]*255                        
                                    point_min_rgb = "rgb("+r+","+g+","+b+")"
                                }
                                if (point_max <= point){
                                    point_max = point
                                    let r = color_instance.RGBPoints[il*4+1]*255
                                    let g = color_instance.RGBPoints[il*4+2]*255
                                    let b = color_instance.RGBPoints[il*4+3]*255                        
                                    point_max_rgb = "rgb("+r+","+g+","+b+")"
                                }
                            }
                            var text = ""
                            for (var il=0;il<total_colors;il++){
                                var r, g, b, point
                                point = (color_instance.RGBPoints[il*4]-point_min)/(point_max-point_min)
                                var r = color_instance.RGBPoints[il*4+1]*255
                                var g = color_instance.RGBPoints[il*4+2]*255
                                var b = color_instance.RGBPoints[il*4+3]*255
                                text += ", rgb("+r+","+g+","+b+")" + (point*(this.state.max-this.state.min) + this.state.min) + "%"
                            }        
                            text = "linear-gradient( 90deg" + text + ")"
                            this.base.current.style.background = text
                        }
                        this.spot2.current.style.background = point_max_rgb
                        this.spot1.current.style.background = point_min_rgb
                    }
                }

                /**
                * This method shows/hides the list of palletes/colorsets availables
                *
                */ 
                showColors(){
                    var display = this.colors.current.style.display;
                    if (display == "none"){
                        this.colors.current.style.display = "flex"
                    } else {
                        this.colors.current.style.display = "none"            
                    }
                }
                showModes(){
                    this.setState({'show_settings':!this.state.show_settings})
                    //var display = this.preset.current.style.display;
                    //if (display == "none"){
                    //    this.preset.current.style.display = "flex"
                    //} else {
                    //    this.preset.current.style.display = "none"            
                    //}
                }
                showMode( mode ){
                    if (mode == "up"){
                        this.state.min = 85      
                        this.state.max = 100   
                    } else if (mode == "down"){
                        this.state.min = 0      
                        this.state.max = 15   
                    } else {
                        this.state.min = 0      
                        this.state.max = 100  
                    }
                    var val_min = (this.state.range[1]-this.state.range[0])*(this.state.min/100) + this.state.range[0];
                    var val_max = (this.state.range[1]-this.state.range[0])*(this.state.max/100) + this.state.range[0];
                    if (this.props.onChange){
                        this.props.onChange(val_min, val_max)
                    }        
                    this.setRulerBG()
                    this.updateSpots()
                    //this.showModes()
                }    

                upDeformation(){
                    if (this.state.deformation <= 128){
                        if (this.props.onDisplacement){
                            this.props.onDisplacement(Math.floor(this.state.deformation*2))
                        }
                        this.setState ({'deformation':Math.floor(this.state.deformation*2)})
                    }
                }	
                downDeformation(){
                    if (this.state.deformation > 0){
                        if (this.props.onDisplacement){
                            this.props.onDisplacement(Math.ceil(this.state.deformation/2))
                        }
                        this.setState ({'deformation':Math.ceil(this.state.deformation/2)})
                    }
                }

                /**
                * Method that update the position of the Spot containers based on dragging / user interaction
                *
                */ 
                updateSpots(){
                    var bounds = this.base.current.getBoundingClientRect();
                    var x = this.state.max /100;
                    this.spot2.current.style.right = ((1-x)*100) + "%"
                    x = this.state.min /100;
                    this.spot1.current.style.left = (x*100) + "%"        
                    var val_min = (this.state.range[1]-this.state.range[0])*(this.state.min/100) + this.state.range[0];
                    var val_max = (this.state.range[1]-this.state.range[0])*(this.state.max/100) + this.state.range[0];
                    this.spot1.current.innerHTML = Util.fixedVal(val_min, this.state.variable) + " " + Util.getUnit(this.state.variable);
                    this.spot2.current.innerHTML = Util.fixedVal(val_max, this.state.variable) + " " + Util.getUnit(this.state.variable);
                }
                /**
                * Renders the VtkComponentColors component and children.
                *
                * @return {div} Return a React Component instance
                */    
                render(){
                    var children = Array()    
                    var vtkcomp = Array()    
                    let self = this
                    var colors = false
                    var circ0, circ3, circ4, circ5;
                    for (var color in this.state.colormap) {
                        var color_instance = this.state.colormap[color]
                        let cur_color = color
                        if (color_instance.RGBPoints && color_instance.RGBPoints.length < 40){
                            var total_colors = Math.ceil(color_instance.RGBPoints.length/4)
                            var point_min = color_instance.RGBPoints[0]
                            var point_max = color_instance.RGBPoints[0]
                            for (var il=0;il<total_colors;il++){
                                var point = color_instance.RGBPoints[il*4]
                                if (point_min >= point){
                                    point_min = point
                                    let r = color_instance.RGBPoints[il*4+1]*255
                                    let g = color_instance.RGBPoints[il*4+2]*255
                                    let b = color_instance.RGBPoints[il*4+3]*255                        
                                }
                                if (point_max <= point){
                                    point_max = point
                                    let r = color_instance.RGBPoints[il*4+1]*255
                                    let g = color_instance.RGBPoints[il*4+2]*255
                                    let b = color_instance.RGBPoints[il*4+3]*255                        
                                }
                            }
                            var text = ""
                            var mincolor = "white"
                            var maxcolor = "white"
                            for (var il=0;il<total_colors;il++){
                                var r, g, b, point
                                point = (color_instance.RGBPoints[il*4]-point_min)/(point_max-point_min)
                                var r = color_instance.RGBPoints[il*4+1]*255
                                var g = color_instance.RGBPoints[il*4+2]*255
                                var b = color_instance.RGBPoints[il*4+3]*255
                                text += ", rgb("+r+","+g+","+b+")" + (point*100) + "%"
                                if (point == 0)
                                    mincolor = "rgb("+r+","+g+","+b+")"
                                if (point == 1)
                                    maxcolor = "rgb("+r+","+g+","+b+")"
                            }        
                            if (color != this.state.selected){                    
                                text = "linear-gradient( 1turn" + text + ")"
                                children.push(React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColor", style:{background: text}, onClick:function(){self.props.onSelected(cur_color)}}))
                            } else {
                                text = "linear-gradient( 1turn" + text + ")"
                                circ0 = React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColor", style:{background: text}, onClick:function(){self.showColors()}})
                                point = (color_instance.RGBPoints[il*4]-point_min)/(point_max-point_min)
                                let show_settings = "none"
                                if (this.state.show_settings)
                                    show_settings = "flex"
                                circ3 = React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColors", style:{display:show_settings}, ref:this.preset}, [
                                    React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColor", style:{background: maxcolor}, onClick:function(){self.showMode("down")}}, [
                                        React.createElement("i", {key:Util.create_UUID(), className:"fa fa-long-arrow-left", style:{padding: "10px 10px", fontSize: "20px"}})
                                    ]),
                                    React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColor", style:{background: mincolor}, onClick:function(){self.showMode("up")}}, [
                                        React.createElement("i", {key:Util.create_UUID(), className:"fa fa-long-arrow-right", style:{padding: "10px 10px", fontSize: "20px"}})
                                    ]),
                                    React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColor", style:{background: text}, onClick:function(){self.showMode("reset")}}, [
                                        React.createElement("i", {key:Util.create_UUID(), className:"fa fa-arrows-h", style:{padding: "10px 10px", fontSize: "20px", color: "black"}})
                                    ]),
                                    React.createElement("div", {key:Util.create_UUID(), style:{width: "20px"}}),
                                    React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColor", style:{background: "white"}, onClick:function(){self.downDeformation()}}, [
                                        React.createElement("i", {key:Util.create_UUID(), className:"fa fa-search-minus", style:{padding: "10px 10px", fontSize: "20px", color: "black"}})
                                    ]),
                                    React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColor", style:{background: "white"}, onClick:function(){self.upDeformation()}}, [
                                        React.createElement("i", {key:Util.create_UUID(), className:"fa fa-search-plus", style:{padding: "10px 10px", fontSize: "20px", color: "black"}})
                                    ]),
                                ])
                                circ4 = React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColor", style:{background: "white"}, onClick:function(){self.showModes()}}, [
                                    React.createElement("i", {key:Util.create_UUID(), className:"fa fa-cog", style:{padding: "10px 10px", fontSize: "20px", color: "black"}})
                                ])

                            }                
                        }
                    }      

                    var min_val = Util.fixedVal(this.state.range[0], this.state.variable);
                    var max_val = Util.fixedVal(this.state.range[1], this.state.variable);
                    var circ2  = React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColorSliderSpot", style:{right:'0px'}, ref:self.spot2, onMouseDown:function(e){self.dragStart(e, "right")} }, max_val);
                    var circ1  = React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColorSliderSpot", style:{left:'0px'}, ref:self.spot1, onMouseDown:function(e){self.dragStart(e, "left")} }, min_val);
                    var ruler_values = Array();
                    for (var i=0;i<10;i++){
                        var val = (this.state.range[1]-this.state.range[0])*(i/9) + this.state.range[0];
                        val = Util.fixedVal(val, this.state.variable);
                        ruler_values.push(React.createElement("div", {key:Util.create_UUID(), style:{padding:"0px 10px 0px 10px"}}, val ));
                    }
                    var base  = React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColorSliderLine", ref:this.base},ruler_values);
                    var line  = React.createElement("div", {key:Util.create_UUID(), style:{display:"flex",flexDirection:"row", width:"100%", padding:"0px 20px 0px 20px"}}, base);

                    var colorslider = React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColorSlider", ref:self.cont, onMouseUp:function(e){self.drop(e)}, onMouseMove:function(e){self.allowDrop(e)}, onMouseOut:function(e){self.allowDrop(e)}},
                        [line, circ1, circ2]
                    );

                    vtkcomp.push(React.createElement("div",{key:Util.create_UUID(), style:{display:"flex", flexDirection:"row"}},[circ0, colorslider, circ4]))
                    vtkcomp.push(circ3)
                    vtkcomp.push(React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentColors", style:{display:"none"}, ref:this.colors, onChange:function(min,max){self.onChangeRange(min, max)}}, children))
                    var div = React.createElement("div", {key:Util.create_UUID(), className:""}, vtkcomp)
                    this.setRulerBG()
                    return div
                }
                /**
                * Method called after the component is loaded, this update the colors and the spots
                *
                */    
                componentDidUpdate() {
                    this.setRulerBG()
                    this.updateSpots()
                }

            }

            /** @class Class representing VtkComponentCamera component. */

            class VtkComponentCamera extends React.Component {
                /**
                * Creates an instance of VTKComponent that includes all the main options to be displayed on the side menu.
                *
                * @constructor
                * @author: denphi, denphi@denphi.com, Purdue University
                * @param {props} a dict with the properties required by the VtkComponentCamera.
                *         props.onClick callback function triggered when a new camera is selected (u,v vectors)

                */	
                constructor(props) {
                    super(props)
                }    
                /**
                * Renders the VtkComponentCamera component and children.
                *
                * @return {div} Return a React Component instance
                */    
                render(){
                    let self = this
                    var children = Array()    
                    children.push(React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentCamera", onClick:function(){self.props.onClick([0,0,-1], [1,0,0])}},
                        ["1",React.createElement("div", {key:Util.create_UUID(), style:{top: "20px", left: "14px", position: "absolute", fontSize:"15px"}, className:"fa fa-cube"})]
                    ))
                    children.push(React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentCamera", onClick:function(){self.props.onClick([-1,0,0], [0,0,1])}},
                        ["2",React.createElement("div", {key:Util.create_UUID(), style:{top: "20px", left: "14px", position: "absolute", fontSize:"15px"}, className:"fa fa-cube"})]
                    ))
                    children.push(React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentCamera", onClick:function(){self.props.onClick([0,-1,0], [0,0,1])}},
                        ["3",React.createElement("div", {key:Util.create_UUID(), style:{top: "20px", left: "14px", position: "absolute", fontSize:"15px"}, className:"fa fa-cube"})]
                    ))
                    children.push(React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentCamera", onClick:function(){self.props.onClick([1,0,0], [0,0,1])}},
                        ["4",React.createElement("div", {key:Util.create_UUID(), style:{top: "20px", left: "14px", position: "absolute", fontSize:"15px"}, className:"fa fa-cube"})]
                    ))
                    children.push(React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentCamera", onClick:function(){self.props.onClick([0,1,0], [0,0,1])}},
                        ["5",React.createElement("div", {key:Util.create_UUID(), style:{top: "20px", left: "14px", position: "absolute", fontSize:"15px"}, className:"fa fa-cube"})]
                    ))
                    children.push(React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentCamera", onClick:function(){self.props.onClick([0,0,1], [1,0,0])}},
                        ["6",React.createElement("div", {key:Util.create_UUID(), style:{top: "20px", left: "14px", position: "absolute", fontSize:"15px"}, className:"fa fa-cube"})]
                    ))
                    children.push(React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentCamera", onClick:function(){self.props.onScreenShot()}}, 
                        [React.createElement("i", {key:Util.create_UUID(), className:"fa fa-camera", style:{padding: "10px 10px", fontSize: "20px"}})]
                    ))
                    var div = React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentCameras"}, children)
                    return div
                }


            }





            function VTKPlugin( width, height, path, plugins, onScreenShoot ) {

                this.buildContainer = function( ){
                    if (plugins == undefined)
                        plugins = ["lut", "time", "view", "slicer", "color"]
                    var cw_size = 50
                    if (plugins.indexOf("color") < 0)
                        cw_size = 0
                    var ch_size = 40
                    var w_size = Math.floor((this.w_size - cw_size)/2)
                    var h_size = this.h_size
                    this.mainContainer = this.createContainer(w_size, h_size, 'div', '#fffff')
                    this.sliceContainer = this.createContainer(w_size, h_size, 'div', '#fffff')
                    this.lutContainer = this.createContainer(this.w_size-300, ch_size, 'canvas', "#ffffff");
                    this.timeContainer = this.createContainer(300, ch_size, 'canvas', "#ffffff");
                    this.slicerContainer = this.createContainer(250, ch_size, 'canvas', "#ffffff");
                    this.colorContainer = this.createContainer(50, h_size, 'canvas', "#ffffff");
                    this.viewContainer =  this.createContainer(this.w_size-250, ch_size, 'canvas', "#ffffff");
                    this.container = document.createElement('div')
                    if (plugins.length == 0){
                        this.container.style.width = (this.w_size) + 'px';
                        this.mainContainer.style.width = '50%';
                        //this.mainContainer.style.height = '50%';
                        this.sliceContainer.style.width = '50%';
                        //this.sliceContainer.style.height = '50%';
                    }
                    this.container.style.width = 'auto';
                    if (plugins.indexOf("lut") >=0)
                        this.container.appendChild(this.lutContainer);
                    if (plugins.indexOf("time") >=0)
                        this.container.appendChild(this.timeContainer);
                    if (plugins.indexOf("view") >=0)
                        this.container.appendChild(this.viewContainer);
                    if (plugins.indexOf("slicer") >=0)
                        this.container.appendChild(this.slicerContainer);
                    this.container.appendChild(this.mainContainer);
                    if (plugins.indexOf("color") >=0)
                        this.container.appendChild(this.colorContainer);
                    this.container.appendChild(this.sliceContainer);
                    this.path = path
                }

                this.setupWindows = function(){
                    var self = this; 
                    this.setupRenderWindow(this.mainWindow, this.mainContainer, "left", true)
                    this.setupRenderWindow(this.sliceWindow, this.sliceContainer, "right", true) 
                    this.mainWindow.getInteractor().onEndAnimation( function(){ self.syncViews(self.mainWindow, self.sliceWindow) } )
                    this.sliceWindow.getInteractor().onEndAnimation( function(){ 
                         self.syncViews(self.sliceWindow, self.mainWindow);
                         self.orientationWidget.updateMarkerOrientation(); 
                         self.mainWindow.getRenderWindow().render(); 
                    } )
                } 

                this.createContainer = function( width, height, type, background){
                    var container = document.createElement(type);
                    container.style.position = 'relative';
                    container.width = width;
                    container.height = height;        
                    container.style.width = width + 'px';
                    container.style.height = height + 'px';
                    container.style.float = 'left';
                    container.style.background = background
                    return container;
                }

                this.setupRenderWindow = function (renderWindow, container, position, interactive){
                    renderWindow.setContainer(container);  
                    if (interactive){
                    } else {
                        renderWindow.getInteractor().setInteractorStyle(null);
                    }
                }

                this.setupSlider = function (renderWindow, value){
                   var sliderContainer = renderWindow.getControlContainer().querySelector('.js-slider');
                   sliderContainer.style.flex = '1';
                   sliderContainer.style.position = 'relative';
                   sliderContainer.style.minWidth = '25px';
                   sliderContainer.style.minHeight = '25px';
                   var slider = vtk.Interaction.UI.vtkSlider.newInstance();
                   slider.generateValues(0, samples-1, samples);
                   slider.setValue(value);
                   slider.setContainer(sliderContainer);
                   return slider;
                }

                this.setupAxes = function (bounds){
                    var radius = (Math.max(bounds[1]-bounds[0], bounds[3]-bounds[2]))
                    var center = [(bounds[1]+bounds[0])/2, (bounds[3]+bounds[2])/2, -5]

                    this.baseSource.addRadius(radius)
                    this.baseSource.setCenter(center)
                    this.baseSource.setResolution(40)
                    this.baseSource.setHeight(0.5)


                    this.baseLut.addRGBPoint(0, .9, .9, .9)
                    this.baseMapper.setLookupTable(this.baseLut)
                    this.baseMapper.setInputConnection(this.baseSource.getOutputPort());
                    this.baseActor.setMapper(this.baseMapper);        
                    this.baseActor.getProperty().setOpacity(0.3)
                    var self = this

                    this.axesReader.setUrl('data/axes.vtp').then( function(value){
                        self.axesLut.addRGBPoint(0, 0, 0, 0)
                        self.axesLut.addRGBPoint(1, 1, 0, 0)
                        self.axesLut.addRGBPoint(2, 0, 1, 0)
                        self.axesLut.addRGBPoint(3, 0, 0, 1)
                        self.axesMapper.setInputConnection(self.axesReader.getOutputPort());
                        self.axesActor.setMapper(self.axesMapper);        
                        self.axesMapper.setLookupTable(self.axesLut);
                        self.axesMapper.setScalarRange([0,3]);

                        self.orientationWidget = vtk.Interaction.Widgets.vtkOrientationMarkerWidget.newInstance({
                          actor: self.axesActor,
                          interactor: self.mainWindow.getInteractor(),
                        });
                        self.orientationWidget.setEnabled(true);
                        self.orientationWidget.setViewportCorner( vtk.Interaction.Widgets.vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT );
                        self.orientationWidget.setViewportSize(0.15);
                        self.orientationWidget.setMinPixelSize(50);
                        self.orientationWidget.setMaxPixelSize(200);      
                    });
                }
                this.createNormals = function(  ){
                    this.normals = true
                    for (let t=0; t<this.readers.length;t++){
                        if (true){
                            let numPts = this.readers[t].getOutputData(0).getNumberOfPoints();
                            let normalsData = new Float32Array(numPts * 3);
                            let magnitudeData = new Float32Array(numPts);
                            try {
                                let u = this.readers[t].getOutputData(0).getPointData().getArrayByName("U1").getData()
                                let v = this.readers[t].getOutputData(0).getPointData().getArrayByName("U2").getData()
                                let w = this.readers[t].getOutputData(0).getPointData().getArrayByName("U3").getData()
                                for (let i=0;i<numPts;i++){
                                        magnitudeData[i] = Math.sqrt((u[i]*u[i])+(v[i]*v[i])+(w[i]*w[i]));
                                        normalsData[i*3] = u[i]/magnitudeData[i]
                                        normalsData[i*3+1] = v[i]/magnitudeData[i]
                                        normalsData[i*3+2] = w[i]/magnitudeData[i]
                                        if (magnitudeData[i] < 0.000001)
                                            magnitudeData[i] = 0
                                }

                                let normals = vtk.Common.Core.vtkDataArray.newInstance({
                                        numberOfComponents: 3,
                                        values: normalsData,
                                        name: 'Normals',
                                });
                                let magnitude = vtk.Common.Core.vtkDataArray.newInstance({
                                        numberOfComponents: 1,
                                        values: magnitudeData,
                                        name: 'Magnitude',
                                });
                                this.readers[t].getOutputData(0).getPointData().setNormals(normals)
                                this.readers[t].getOutputData(0).getPointData().setScalars(magnitude);
                            } catch(err) {
                                this.normals = false;
                            }
                        } else {
                            this.normals = false;
                        }
                    }
                }

                this.updatePolydata = function( scale ){
                    this.polydata = Array(this.readers.length)
                    for (let t=0; t<this.readers.length;t++){
                        if (this.normals){
                            try {
                                let filter = vtk.Filters.General.vtkWarpScalar.newInstance()
                                filter.setInputData(this.readers[t].getOutputData(0));
                                filter.setScaleFactor( scale );
                                filter.setInputArrayToProcess(0, 'Magnitude', 'PointData', 'Scalars');
                                filter.setXyPlane(false);
                                filter.update();
                                filter.getOutputData(0).getPointData().setNormals(null)
                                this.polydata[t] = filter

                            } catch(err) {
                                this.polydata[t] = this.readers[t]
                            }
                        } else {
                            this.polydata[t] = this.readers[t]
                        }
                    }
                }


                this.setScaleFactor = function(scalefactor){
                    if (this.scalefactor == scalefactor)
                        return;
                    this.scalefactor = scalefactor
                    this.updatePolydata(this.scalefactor)
                    this.surfaceMapper.setInputData(this.polydata[this.current_time].getOutputData(0));
                    this.mainMapper.setInputData(this.polydata[this.current_time].getOutputData(0));
                    //this.sliceMapper.setInputData(this.volumes[this.current_time].getOutputData(0));
                    this.mainWindow.getRenderWindow().render();
                    this.sliceWindow.getRenderWindow().render();
                }

                this.setData = function (readers, volumes, label, slice){
                    this.readers = readers
                    this.slice = slice
                    this.scalefactor = 32
                    this.createNormals()
                    this.updatePolydata(this.scalefactor);
                    this.n_samples = readers.length
                    this.volumes = new Array(volumes.length)
                    this.label = label
                    this.current_time = this.n_samples-1
                    this.current_slice = Math.floor(this.n_samples/2)
                    var ranges_l = new Array (this.n_samples)
                    var ranges_h = new Array (this.n_samples)
                    var bounds = null;
                    for (var i=this.n_samples-1; i>=0; i--){
                        var arraybyname = this.polydata[i].getOutputData(0).getPointData().getArrayByName(label);
                        if (arraybyname != null){
                            if (bounds == null && readers[i].getOutputData(0).getBounds() != null){
                                bounds = readers[i].getOutputData(0).getBounds()
                                this.setupAxes(bounds)
                            }	
                            var range = arraybyname.getRange()
                            ranges_l[i]=range[0]
                            ranges_h[i]=range[1]
                        } else {
                            ranges_l[i]=null;
                            ranges_h[i]=null;
                        }
                    }
                    var min_range = Math.min(...ranges_l.filter(i => i !== null))
                    var max_range = Math.max(...ranges_h.filter(i => i !== null))		
                    this.range = [min_range, max_range]
                    this.n_slices = null;
                    for (var i=0; i < this.n_samples; i++){
                        if (volumes[i] != null){
                            this.volumes[i]=vtk.Filters.General.vtkCalculator.newInstance()
                            this.volumes[i].setFormula({
                                getArrays: function(inputDataSets){
                                    return {
                                        input: [{ location: vtk.Common.DataModel.vtkDataSet.FieldDataTypes.POINT, name:label }], 
                                        output: [{ location: vtk.Common.DataModel.vtkDataSet.FieldDataTypes.UNIFORM, name: 'DUMMY' }]
                                    }
                                },
                                evaluate: (arraysIn, arraysOut) => { }
                            });
                            this.volumes[i].setInputData(volumes[i].getOutputData(0));
                            this.volumes[i].update()
                            var data = this.volumes[i].getOutputData(0)
                            var extend = data.getExtent();
                            if (this.slice == "I"){
                                if(this.n_slices == null)
                                    this.n_slices = extend[1]-extend[0] + 1
                                else
                                    this.n_slices = Math.min(this.n_slices, extend[1]-extend[0] + 1)
                            }
                            if (this.slice == "J"){
                                if(this.n_slices == null)
                                    this.n_slices = extend[3]-extend[2] + 1
                                else
                                    this.n_slices = Math.min(this.n_slices, extend[3]-extend[2] + 1)
                            }
                            if (this.slice == "K"){
                                if(this.n_slices == null)
                                    this.n_slices = extend[5]-extend[4] + 1
                                else
                                    this.n_slices = Math.min(this.n_slices, extend[5]-extend[4] + 1)
                            }
                            var tmp = data.getPointData().getArray(label)
                            this.volumes[i].getOutputData(0).getPointData().setScalars(tmp)
                        } else {
                            this.volumes[i] = null;
                        }
                    }

                    var ofun = vtk.Common.DataModel.vtkPiecewiseFunction.newInstance()
                    //ofun.addPoint(min_range, 1);
                    ofun.addPoint(-0.01, 1);
                    ofun.addPoint(0.0, 0);
                    ofun.addPoint(0.01, 1);
                    //ofun.addPoint(max_range, 1);



                    this.mainMapper.setLookupTable(this.lut);
                    this.mainMapper.setScalarModeToUsePointFieldData();
                    this.mainMapper.setArrayAccessMode(this.mainMapper.BY_NAME);
                    this.mainMapper.setColorByArrayName(label);
                    this.mainMapper.setScalarVisibility(true);
                    this.mainMapper.setScalarRange(this.range);
                    this.mainMapper.setInputData(this.polydata[this.current_time].getOutputData(0));
                    //this.mainMapper.setInputData(this.polydata[this.current_time].getOutputData(0));
                    this.mainWindow.getRenderer().setBackground(1, 1, 1)
                    this.mainWindow.getRenderer().addActor(this.mainActor);
                    this.mainWindow.getRenderer().addActor(this.baseActor);
                    this.mainWindow.getRenderer().resetCamera();
                    this.mainWindow.getRenderWindow().render(); 

                    this.surfaceActor.getProperty().setColor(0,0,0)
                    this.surfaceActor.getProperty().setOpacity(0.01)
                    this.surfaceMapper.setInputData(this.polydata[this.current_time].getOutputData(0));
                    this.sliceActor.getProperty().setRGBTransferFunction(this.lut);
                    this.sliceActor.getProperty().setScalarOpacity(ofun);
                    if (this.volumes[this.current_time] != null){
                        this.sliceMapper.setInputData(this.volumes[this.current_time].getOutputData(0))
                    }
                    if (this.slice == "I")
                        this.sliceMapper.setISlice(this.current_slice);
                    if (this.slice == "J")
                        this.sliceMapper.setJSlice(this.current_slice);
                    if (this.slice == "K")
                        this.sliceMapper.setKSlice(this.current_slice);
                    this.sliceWindow.getRenderer().setBackground(1, 1, 1)
                    this.sliceWindow.getRenderer().addActor(this.surfaceActor);
                    this.sliceWindow.getRenderer().addActor(this.sliceActor);
                    this.sliceWindow.getRenderer().addActor(this.baseActor);        
                    this.sliceWindow.getRenderer().resetCamera();
                    this.sliceWindow.getRenderWindow().render(); 

                    this.createTimeLegend();
                    this.createLutLegend();        
                    this.createSliceLegend();
                    this.createViewLegend();
                    this.drawColorList();
                    this.selectLut("rainbow") // Default Color
                    this.mainWindow.resize() //Forcing resize to get dimensions of the final container
                    this.sliceWindow.resize() //Forcing resize to get dimensions of the final container
                    return true;
                }


                this.createLutLegend = function(){
                    var self = this
                    var container = this.lutContainer
                    var range = this.range
                    container.addEventListener('click', function(event) {
                        var elemLeft = container.offsetLeft;
                        var elemTop = container.offsetTop;
                        var width = container.width;
                        var height = container.height;
                        var x = event.pageX - elemLeft;
                        var delta = (x-50)/(width-60)
                        if (delta < 0)
                            delta = 0
                        if (delta > 1)
                            delta = 1
                        var value = (range[1]-range[0])*delta + range[0];
                        var lut_range = self.mainMapper.getScalarRange();
                        var selector = 0
                        if (value > lut_range[1])
                            selector = 1
                        else if (value > lut_range[0])
                            if ((lut_range[1]-value) < (value-lut_range[0]))
                                selector = 1
                        if (selector == 0){
                            self.setRange(value, lut_range[1]);
                        } else {
                            self.setRange(lut_range[0], value);
                        }
                    }, false);        
                    container.addEventListener('dblclick', function(event) {
                       var lselector = prompt("Please enter lower range", self.range[0]);
                       if (lselector){
                           lselector = lselector*1
                           if( isNaN(lselector))
                               lselector = 0
                           var uselector = prompt("Please enter upper range", self.range[1]);
                           if (uselector){
                               uselector = uselector*1
                               if( isNaN(uselector))
                                   uselector = 0
                           self.setRange(lselector, uselector);
                           }
                       }
                    }, false);
                    this.drawLutLegend()
                }

                this.setRange = function(lower, upper){
                    if (lower > upper){
                        var tlower = lower
                        lower = upper
                        upper = tlower
                    }

                    if (lower<this.range[0])
                        lower = this.range[0]
                    if (upper > this.range[1])
                        upper = this.range[1]
                    var range = this.mainMapper.getScalarRange();
                    if (range[0] == lower && range[1]==upper)
                        return;
                    this.mainMapper.setScalarRange([lower, upper]);
                    this.drawLutLegend()
                    this.onChangeRange()
                }

                this.selectTimeLegend = function( value ){
                    if (this.current_time == value)
                        return;
                    this.current_time = value;
                    this.surfaceMapper.setInputData(this.polydata[this.current_time].getOutputData(0));
                    this.mainMapper.setInputData(this.polydata[this.current_time].getOutputData(0));
                    if(this.volumes[this.current_time] != null){
                        this.sliceMapper.setInputData(this.volumes[this.current_time].getOutputData(0));
                    }
                    this.mainWindow.getRenderWindow().render();
                    this.sliceWindow.getRenderWindow().render();
                    this.drawTimeLegend()
                    this.onChangeTime()
                }    

                this.createTimeLegend = function(){
                    var self = this;
                    this.timeContainer.addEventListener('click', function(event) {
                        var elemLeft = self.timeContainer.offsetLeft;
                        var elemTop = self.timeContainer.offsetTop;
                        var width = self.timeContainer.width;
                        var height = self.timeContainer.height;
                        var x = event.pageX - elemLeft;
                        var delta = (x-50)/(width-65)
                        if (delta < 0)
                            delta = 0
                        if (delta > 1)
                            delta = 1
                        delta = 1-delta
                        var selector = Math.round((1-delta)*(self.n_samples-1))
                        self.selectTimeLegend(selector)
                    }, false);        
                    this.timeContainer.addEventListener('dblclick', function(event) {
                       var selector = prompt("Please enter time", "0");
                       if (selector){
                           selector = selector*1
                           if( isNaN(selector))
                               selector = 0
                           if(selector < 0)
                               selector = 0
                           if (selector > self.n_samples-1)
                               selector = self.n_samples-1
                           self.selectTimeLegend(selector)
                       }
                    }, false);
                    this.drawTimeLegend(this.current_time)
                }


                this.createSliceLegend = function(){
                    var self = this;
                    var container = this.slicerContainer
                    container.addEventListener('click', function(event) {
                        var elemLeft = container.offsetLeft;
                        var elemTop = container.offsetTop;
                        var width = container.width;
                        var height = container.height;
                        var x = event.pageX - elemLeft;
                        var delta = (x-50)/(width-60)
                        if (delta < 0)
                            delta = 0
                        if (delta > 1)
                            delta = 1
                        delta = delta
                        var selector = Math.round((1-delta)*(self.n_samples-1))
                        self.selectSlice(selector)
                    }, false);        
                    container.addEventListener('dblclick', function(event) {
                       var selector = prompt("Please enter slice", "0");
                       if (selector){
                           selector = selector*1
                           if( isNaN(selector))
                               selector = 0
                           if(selector < 0)
                               selector = 0
                           if (selector > self.n_slices-1)
                               selector = self.n_slices-1
                           self.selectSlice(selector)
                       }
                    }, false);

                    this.drawSliceLegend()

                }


                this.drawSliceLegend = function(){
                    var container = this.slicerContainer
                    var n_slices = this.n_slices
                    var label = "SLICE"
                    var value = this.current_slice
                    var width = container.width
                    var height = container.height
                    var top_padding = Math.ceil((height - 20)/2)
                    var range = [0,n_slices-1]
                    var ctx = container.getContext("2d");
                    var delta = 1/(n_slices-1)
                    ctx.clearRect(0, 0, width, height);
                    ctx.fillStyle = "black";
                    ctx.font = "12px Arial";
                    ctx.fillText(label,5, top_padding + 10);
                    ctx.fillStyle = "black";
                    ctx.font = "12px Arial";
                    var delta = 1/(n_slices-1)
                    var range_delta = (range[1]-range[0])/(n_slices-1)
                    var t_available_width = width -60

                    for (var il=0;il<n_slices;il++){
                        var c = Math.ceil((t_available_width)*delta*il + 50)            
                        var r = range_delta*(il) + range[0]
                        ctx.beginPath();                
                        ctx.arc(c, top_padding+3, 4, 0, 2 * Math.PI);
                        ctx.closePath();
                        ctx.stroke(); 
                        ctx.fillText(r.toFixed(0) , c-2, top_padding+18); 
                    }

                    var lr = (range[1]-value)/(range[1]-range[0]);
                    var c = Math.ceil((t_available_width)*lr + 50)            
                    ctx.beginPath();                
                    ctx.arc(c, top_padding+3, 4, 0, 2 * Math.PI);
                    ctx.closePath();
                    ctx.fill();            
                }

                this.drawTimeLegend = function(){
                    var container = this.timeContainer
                    var n_samples = this.n_samples
                    var label = "TIME"
                    var value = n_samples -1 - this.current_time
                    var width = container.width
                    var height = container.height
                    var range = [0,n_samples-1]
                    var top_padding = Math.ceil((height - 20)/2)
                    var ctx = container.getContext("2d");
                    var delta = 1/(n_samples-1)
                    ctx.clearRect(0, 0, width, height);
                    ctx.fillStyle = "black";
                    ctx.font = "12px Arial";
                    ctx.fillText(label,5, top_padding + 10);
                    ctx.fillStyle = "black";
                    ctx.font = "12px Arial";
                    var delta = 1/(n_samples-1)
                    var range_delta = (range[1]-range[0])/(n_samples-1)
                    var t_available_width = width -65
                    ctx.beginPath();                
                    ctx.moveTo(50 , top_padding);
                    ctx.lineTo(t_available_width + 50, top_padding);  
                    ctx.closePath();        
                    ctx.stroke(); 

                   for (var il=0;il<n_samples;il++){
                        var c = Math.ceil((t_available_width)*delta*il + 50)            
                        var r = range_delta*(il) + range[0]
                        ctx.beginPath();                
                        ctx.moveTo(c, top_padding-3);
                        ctx.lineTo(c, top_padding+3);  
                        ctx.closePath();
                        ctx.stroke(); 
                        ctx.fillText(r.toFixed(1) + "s" , c - 10, top_padding+18);
                    }
                    var lr = (range[1]-value)/(range[1]-range[0]);
                    var c = Math.ceil((t_available_width)*lr + 50)            
                    ctx.beginPath();                
                    ctx.moveTo(c, 0);
                    ctx.lineTo(c, Math.ceil(height/2));  
                    ctx.closePath();
                    ctx.stroke(); 
                    ctx.beginPath();
                    ctx.moveTo(c-4, top_padding-3);
                    ctx.lineTo(c+4, top_padding-3);  
                    ctx.lineTo(c, top_padding+5);  
                    ctx.lineTo(c-4, top_padding-3);  
                    ctx.fill();            
                }

                this.createViewLegend = function(){
                    var self = this;
                    var container = this.viewContainer
                    container.addEventListener('click', function(event) {
                        var elemLeft = container.offsetLeft;
                        var elemTop = container.offsetTop;
                        var width = container.width;
                        var height = container.height;
                        var x = event.pageX - elemLeft;
                        var delta = (x-50)/(width-100)
                        if (delta < 0)
                            delta = 0
                        if (delta > 1)
                            delta = 1
                        delta = delta
                        var selector = Math.floor((delta)*(6))
                        if( selector == 0)
                            self.rotateXYZ([0,0,-1], [1,0,0])
                        if( selector == 1)
                            self.rotateXYZ([-1,0,0], [0,0,1])
                        if( selector == 2)
                            self.rotateXYZ([0,-1,0], [0,0,1])
                        if( selector == 3)
                            self.rotateXYZ([1,0,0], [0,0,1])
                        if( selector == 4)
                            self.rotateXYZ([0,1,0], [0,0,1])
                        if( selector == 5)
                            self.rotateXYZ([0,0,1], [1,0,0])
                    }, false);
                    this.drawViewLegend()
                }

                this.drawViewLegend = function(){
                   var container = this.viewContainer
                   var width = container.width
                   var height = container.height
                   var ctx = container.getContext("2d");
                   var t_available = width - 100
                   var delta = Math.floor(t_available/6)
                   var wx=(height-10)/2, wy=wx, h=Math.ceil((height-10)/2), color = "rgba(200,0,0,0.2)"
                   for (var c=0; c<6; c++){
                       var x = Math.floor((delta*c)+delta/2 + 50)
                       var y=height-5

                       ctx.beginPath();
                       if(c==0){
                           ctx.moveTo(x, y);
                           ctx.lineTo(x - wx, y - wx * 0.5);
                           ctx.lineTo(x - wx + wy, y - (wx * 0.5 + wy * 0.5));
                           ctx.lineTo(x + wy, y - wy * 0.5);
                       } else if (c==1){
                           ctx.moveTo(x + wx, y - wx * 0.5);
                           ctx.lineTo(x + wx - wx, y - wx);
                           ctx.lineTo(x + wx- wx, y - h - wx);
                           ctx.lineTo(x + wx, y - h - wx * 0.5);
                       } else if (c==2){
                           ctx.moveTo(x - wx, y - wx * 0.5);
                           ctx.lineTo(x + wy - wx , y - wy * 0.5- wx * 0.5);
                           ctx.lineTo(x + wy - wx, y - h - wy * 0.5- wx * 0.5);
                           ctx.lineTo(x - wx, y - h * 1- wx * 0.5);
                       } else if (c==3){
                           ctx.moveTo(x, y);
                           ctx.lineTo(x - wx, y - wx * 0.5);
                           ctx.lineTo(x - wx, y - h - wx * 0.5);
                           ctx.lineTo(x, y - h * 1);
                       } else if (c==4){
                           ctx.moveTo(x, y);
                           ctx.lineTo(x + wy, y - wy * 0.5);
                           ctx.lineTo(x + wy, y - h - wy * 0.5);
                           ctx.lineTo(x, y - h * 1);
                       } else if (c==5){
                           ctx.moveTo(x, y - h);
                           ctx.lineTo(x - wx, y - h - wx * 0.5);
                           ctx.lineTo(x - wx + wy, y - h - (wx * 0.5 + wy * 0.5));
                           ctx.lineTo(x + wy, y - h - wy * 0.5);
                       } 
                       ctx.closePath();
                       ctx.fillStyle = color
                       ctx.fill();

                       ctx.beginPath();
                       ctx.moveTo(x, y);
                       ctx.lineTo(x - wx, y - wx * 0.5);
                       ctx.lineTo(x - wx, y - h - wx * 0.5);
                       ctx.lineTo(x, y - h * 1);
                       ctx.closePath();
                       ctx.strokeStyle = color;
                       ctx.stroke();

                       ctx.beginPath();
                       ctx.moveTo(x, y);
                       ctx.lineTo(x + wy, y - wy * 0.5);
                       ctx.lineTo(x + wy, y - h - wy * 0.5);
                       ctx.lineTo(x, y - h * 1);
                       ctx.closePath();
                       ctx.strokeStyle = color
                       ctx.stroke();

                       ctx.beginPath();
                       ctx.moveTo(x, y - h);
                       ctx.lineTo(x - wx, y - h - wx * 0.5);
                       ctx.lineTo(x - wx + wy, y - h - (wx * 0.5 + wy * 0.5));
                       ctx.lineTo(x + wy, y - h - wy * 0.5);
                       ctx.closePath();
                       ctx.strokeStyle = color
                       ctx.stroke();

                   }
                }

                this.drawLutLegend = function(){
                    var container = this.lutContainer
                    var vtklut = this.lut
                    var n_samples = this.n_samples
                    var label = this.label
                    var range = this.range
                    var mapper = this.mainMapper
                    var width = container.width
                    var height = container.height        
                    var ctx = container.getContext("2d");
                    var grd = ctx.createLinearGradient(50, 0, width-60, 0);
                    var delta = 1/(n_samples-1)
                    ctx.clearRect(0, 0, width, height);
                    ctx.fillStyle = grd;
                    ctx.fillRect(50, 0, width-60, Math.ceil(height/2));
                    this.mainWindow.getRenderWindow().render()
                    this.sliceWindow.getRenderWindow().render()
                    for (var il=0;il<n_samples;il++){
                        var value = (range[1]-range[0])*delta*il + range[0];        
                        var c = vtklut.mapValue(value);
                        grd.addColorStop(delta*il, "rgba("+c[0]+","+c[1]+","+c[2]+","+c[3]+")");
                    } 
                    ctx.fillRect(50, 0, width-60, Math.ceil(height/2));
                    ctx.fillStyle = "black";
                    ctx.font = "12px Arial";
                    ctx.fillText(label,5, Math.ceil(height/3));
                    ctx.fillStyle = "black";
                    ctx.font = "12px Arial";
                    var delta = 1/(n_samples-1)
                        var range_delta = (range[1]-range[0])/(n_samples-1)
                        for (var il=0;il<n_samples;il++){
                            var c = Math.ceil((width-60)*delta*il + 50)            
                            var r = range_delta*il + range[0]
                            ctx.beginPath();                
                            ctx.moveTo(c, Math.ceil(height/2)+3);
                            ctx.lineTo(c, Math.ceil(height/2)-3);  
                            ctx.closePath();
                            ctx.stroke(); 
                            ctx.fillText(r.toFixed(2) , c - 20, Math.ceil(height/2)+18);                  
                        }
                        var lut_range = mapper.getScalarRange();
                        ctx.fillStyle = "black"
                        for (var il=0;il<2;il++){
                            var lr = (lut_range[il]-range[0])/(range[1]-range[0]);
                            var c = Math.ceil((width-60)*lr + 50)            
                            ctx.beginPath();                
                            ctx.moveTo(c, 0);
                            ctx.lineTo(c, Math.ceil(height/2));  
                            ctx.closePath();
                            ctx.stroke(); 
                            ctx.beginPath();
                            ctx.moveTo(c, Math.ceil(height/2)-4);
                            ctx.lineTo(c-4, Math.ceil(height/2)+4);  
                            ctx.lineTo(c+4, Math.ceil(height/2)+4);  
                            ctx.lineTo(c, Math.ceil(height/2)-4);  
                            ctx.fill();
                        }
                }

                this.drawColorList = function(){
                    var container = this.colorContainer
                    var width = container.width
                    var height = container.height        
                    var ctx = container.getContext("2d");
                    var colorcounter = 0;
                    var colorsets = []
                    var sizebar = 20
                var self = this;
                    for (var color in this.vtkColorMaps) {
                        var color_instance = this.vtkColorMaps[color]
                        if (color_instance.RGBPoints && color_instance.RGBPoints.length < 40){
                            var total_colors = Math.ceil(color_instance.RGBPoints.length/4)
                            var grd = ctx.createLinearGradient(0, 0, width, 0);
                            var point_min = color_instance.RGBPoints[0]
                            var point_max = color_instance.RGBPoints[0]
                            for (var il=0;il<total_colors;il++){
                                var point = color_instance.RGBPoints[il*4]
                                if (point_min > point)
                                    point_min = point
                                else if (point_max < point)
                                    point_max = point
                            }
                            for (var il=0;il<total_colors;il++){
                                var r, g, b, point
                                point = (color_instance.RGBPoints[il*4]-point_min)/(point_max-point_min)
                                var r = color_instance.RGBPoints[il*4+1]*255
                                var g = color_instance.RGBPoints[il*4+2]*255
                                var b = color_instance.RGBPoints[il*4+3]*255
                                grd.addColorStop(point, "rgb("+r+","+g+","+b+")");
                            }         
                            ctx.fillStyle = grd;
                            ctx.fillRect(0, (sizebar*colorcounter), width, sizebar*(colorcounter+1));
                            colorcounter ++;
                            colorsets.push(color)
                        }
                    }
                    container.addEventListener('click', function(event) {
                        var elemTop = container.offsetTop;
                        var y = event.pageY - elemTop;
                        var delta = Math.floor(y/sizebar)
                        self.selectLut(colorsets[delta])
                    }, false);               
                }

                this.selectLut = function( lut_name ){
                   this.current_lut = lut_name
                   this.lut.applyColorMap(this.vtkColorMaps[lut_name]);
                   this.drawLutLegend()     
                }

                this.syncViews = function( fromRenderWindow, toRenderWindow ){
                    var currentCamera = fromRenderWindow.getRenderer().getActiveCamera();
                    if (currentCamera) {
                       var position = currentCamera.getReferenceByName('position');
                       var focalPoint = currentCamera.getReferenceByName('focalPoint');
                       var viewUp = currentCamera.getReferenceByName('viewUp');
                       var clippingRange = currentCamera.getReferenceByName('clippingRange');
                       var activeCamera = toRenderWindow.getRenderer().getActiveCamera();
                       activeCamera.setPosition(position[0], position[1], position[2]);
                       activeCamera.setFocalPoint(focalPoint[0], focalPoint[1], focalPoint[2]);
                       activeCamera.setViewUp(viewUp[0], viewUp[1], viewUp[2]);
                       activeCamera.setClippingRange(clippingRange[0], clippingRange[1]);
                       activeCamera.modified()

                       toRenderWindow.getRenderWindow().render(); 
                    }
                }

                this.rotateXYZ = function(u, v){
                    var activeCamera = this.mainWindow.getRenderer().getActiveCamera();
                    var boundsToUse = this.mainWindow.getRenderer().computeVisiblePropBounds();
                    var center = [(boundsToUse[0] + boundsToUse[1]) / 2.0,(boundsToUse[2] + boundsToUse[3]) / 2.0,(boundsToUse[4] + boundsToUse[5]) / 2.0]
                    var radius = Math.sqrt(Math.pow(boundsToUse[1] - boundsToUse[0], 2) + Math.pow(boundsToUse[3] - boundsToUse[2], 2) + Math.pow(boundsToUse[5] - boundsToUse[4], 2));
                    activeCamera.setPosition(center[0] + radius*u[0], center[1] + radius*u[1], center[2] + radius*u[2])
                    activeCamera.setViewUp(v[0], v[1], v[2]);        
                    activeCamera.orthogonalizeViewUp()
                    activeCamera.modified()
                    this.mainWindow.getRenderer().resetCameraClippingRange()
                    this.syncViews(this.mainWindow, this.sliceWindow)
                    this.orientationWidget.updateMarkerOrientation()
                    this.mainWindow.getRenderWindow().render();
                }

                this.selectSlice = function(value){
                    if (this.current_slice == value)
                        return;
                    this.current_slice = value
                    if (this.slice == "I")
                        this.sliceMapper.setISlice(this.current_slice);
                    if (this.slice == "J")
                        this.sliceMapper.setJSlice(this.current_slice);
                    if (this.slice == "K")
                        this.sliceMapper.setKSlice(this.current_slice);
                    this.sliceWindow.getRenderWindow().render();
                    this.drawSliceLegend()
                    this.onChangeSlice()
                }

                this.saveImage = function(){
                    this.mainWindow.getOpenGLRenderWindow().captureNextImage().then((image_raw1) => {
                        this.sliceWindow.getOpenGLRenderWindow().captureNextImage().then((image_raw2) => {
                            onScreenShoot(image_raw1, image_raw2);
                        });
                        this.sliceWindow.getRenderWindow().render();
                    });
                    this.mainWindow.getRenderWindow().render();
                }
                this.onChangeSlice = function(){}
                this.onChangeTime = function(){}
                this.onChangeRange = function(){}

                this.w_size = width
                this.h_size = height
                //this.mainWindow = vtk.Rendering.Misc.vtkRenderWindowWithControlBar.newInstance( {controlSize:25 } );
                this.mainWindow = vtk.Rendering.Misc.vtkGenericRenderWindow.newInstance( {controlSize:25 } );
                this.mainActor = vtk.Rendering.Core.vtkActor.newInstance();
                this.mainMapper = vtk.Rendering.Core.vtkMapper.newInstance();
                this.mainMapper.setScalarModeToUsePointFieldData()
                this.mainMapper.setInterpolateScalarsBeforeMapping(false)
                this.mainActor.setMapper(this.mainMapper);                

                //this.sliceWindow = vtk.Rendering.Misc.vtkRenderWindowWithControlBar.newInstance( {controlSize:25 } );
                this.sliceWindow = vtk.Rendering.Misc.vtkGenericRenderWindow.newInstance( {controlSize:25 } );
                this.surfaceActor = vtk.Rendering.Core.vtkActor.newInstance();
                this.surfaceMapper = vtk.Rendering.Core.vtkMapper.newInstance();
                this.surfaceMapper.setScalarModeToUsePointFieldData()
                this.surfaceMapper.setInterpolateScalarsBeforeMapping(false)
                this.surfaceActor.setMapper(this.surfaceMapper);                


                this.sliceActor   = vtk.Rendering.Core.vtkImageSlice.newInstance();
                this.sliceMapper  = vtk.Rendering.Core.vtkImageMapper.newInstance();
                this.sliceActor.setMapper(this.sliceMapper);

                this.axesReader = vtk.IO.XML.vtkXMLPolyDataReader.newInstance();
                this.axesActor = vtk.Rendering.Core.vtkActor.newInstance();           
                this.axesMapper = vtk.Rendering.Core.vtkMapper.newInstance(); 
                this.axesLut = vtk.Rendering.Core.vtkColorTransferFunction.newInstance();      

                this.baseSource = vtk.Filters.Sources.vtkConcentricCylinderSource.newInstance();
                this.baseActor = vtk.Rendering.Core.vtkActor.newInstance();           
                this.baseMapper = vtk.Rendering.Core.vtkMapper.newInstance(); 
                this.baseLut = vtk.Rendering.Core.vtkColorTransferFunction.newInstance();      


                this.vtkColorMaps = {}
                for (var ic=0; ic<vtkColorSpaces.length; ic++){
                    this.vtkColorMaps[vtkColorSpaces[ic]["Name"]] = vtkColorSpaces[ic]
                }

                this.lut = vtk.Rendering.Core.vtkColorTransferFunction.newInstance();
                this.lut.setVectorComponent(1);
                this.lut.setVectorModeToComponent();

                this.polydata = new Array ()
                this.volumes = new Array ()

                this.buildContainer();
            }




            /** @class Class representing VtkComponentLoader component. */
            
            class A3DWidget extends React.Component {
                constructor(props) {
                    super(props);
                    let self=this;
                    this.state = {
                        'filename' : backbone.model.get('filename'), 
                        'variable' : backbone.model.get('variable'), 
                        'plane' : backbone.model.get('plane'),
                        'samples' : backbone.model.get('samples'),
                        'path' : backbone.model.get('path')
                    };
                }; 
                render(){
                    let self = this;
                    var children = Array()
                    if (this.state.filename != undefined && this.state.filename != ""){
                        if (this.state.variable != undefined && this.state.variable != "")
                            children.push(React.createElement(VTKComponent, {
                                key:Util.create_UUID(), 
                                filename:this.state.filename, 
                                variable:this.state.variable, 
                                plane:this.state.plane, 
                                samples:this.state.samples, 
                                path : this.state.path
                            }));
                    } 
                    var div = React.createElement("div", {key:Util.create_UUID(), className:"VtkComponentLoader"}, children)
                    return div
                }
            }
            A3DWidget.defaultProps = {
            }
            const orig = A3DWidget.prototype.setState;
            A3DWidget.prototype.onChange = function (model){
                orig.apply(this, [Object.assign({},model.changed)]);
            }
            A3DWidget.prototype.componentDidUpdate = function(){}
            A3DWidget.getDerivedStateFromProps = function(props, state){
                return state;
            }
            A3DWidget.prototype.componentDidMount = function(){
                backbone.listenTo(backbone.model, 'change', this.onChange.bind(this));
            }
            A3DWidget.prototype.setState = function(state, callback){
                if('filename' in state){
                    state['filename'] = String(state['filename']);
                } else if('variable' in state){
                    state['variable'] = String(state['variable']);
                } else if('plane' in state){
                    state['plane'] = String(state['plane']);
                }
                for (let [key, value] of Object.entries(state)) {
                    backbone.model.set(key, value);
                }
                backbone.model.save_changes();
                orig.apply(this, [state, callback]);
            }
            backbone.app = document.createElement('div');
            backbone.app.style.padding = '10px';
            const App = React.createElement(A3DWidget);
            ReactDOM.render(App, backbone.app);
            backbone.el.append(backbone.app);
        },
        add_child_model: function(model) {
            return this.create_child_view(model).then((view) => {
                view.setLayout(view.model.get('layout'));
                let lview=view;
                lview.listenTo(lview.model,'change:layout',(m, v) => {
                    this.update_children()
                });
                return view;
            });
        }, 
        update_children: function () {
            this.children_views.update(this.model.get('children')).then(function (views) {
                views.forEach(function (view) {
                    messaging_1.MessageLoop.postMessage(view.pWidget, widgets_1.Widget.ResizeMessage.UnknownSize);
                });
            });
        }, 
    });
    return {
      A3DWidgetView,
      A3DWidgetModel
    };
});