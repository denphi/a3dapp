from ipywidgets import DOMWidget, ValueWidget, register
from traitlets import Unicode, Bool, validate, TraitError, Integer, List
from IPython.display import HTML, Javascript, display
import os

@register
class A3DWidget(DOMWidget):
    _model_name = Unicode('A3DWidgetModel').tag(sync=True)
    _model_module = Unicode('A3DWidget').tag(sync=True)
    _model_module_version = Unicode('0.1.0').tag(sync=True)

    _view_name = Unicode('A3DWidgetView').tag(sync=True)
    _view_module = Unicode('A3DWidget').tag(sync=True)
    _view_module_version = Unicode('0.1.0').tag(sync=True)

    filenames = List([]).tag(sync=True)
    variable = Unicode('').tag(sync=True)
    plane = Unicode('').tag(sync=True)
    path = Unicode('').tag(sync=True)
    samples = Integer(10).tag(sync=True)
    
    def __init__(self, **kwargs):
        path = os.path.dirname(os.path.abspath(__file__))
        js = ""
        text_file = open(path + "/ColorMaps.json", "r")
        js += text_file.read()
        text_file.close()
        text_file = open(path + "/Util.js", "r")
        js += text_file.read()
        text_file.close()
        text_file = open(path + "/VTKComponent.js", "r")
        js += text_file.read()
        text_file.close()
        display(Javascript(js))
        text_file = open(path + "/vtk.html", "r")
        css = text_file.read()
        text_file.close()
        display(HTML(css))
        DOMWidget.__init__(self, **kwargs)

        
@register
class TraceWidget(DOMWidget):
    _model_name = Unicode('TraceWidgetModel').tag(sync=True)
    _model_module = Unicode('TraceWidget').tag(sync=True)
    _model_module_version = Unicode('0.1.0').tag(sync=True)

    _view_name = Unicode('TraceWidgetView').tag(sync=True)
    _view_module = Unicode('TraceWidget').tag(sync=True)
    _view_module_version = Unicode('0.1.0').tag(sync=True)

    position = List([]).tag(sync=True)
    viewup = List([]).tag(sync=True)
    clippingrange = List([]).tag(sync=True)
    focalpoint = List([]).tag(sync=True)
    lines = List([]).tag(sync=True)
    field = Integer(0).tag(sync=True)
    colormap = Unicode('blackbody').tag(sync=True)

    
    def __init__(self, **kwargs):
        path = os.path.dirname(os.path.abspath(__file__))
        js = ""
        #text_file = open("js/ColorMaps.json", "r")
        #js += text_file.read()
        #text_file.close()
        text_file = open(path + "/Util.js", "r")
        js += text_file.read()
        text_file.close()
        text_file = open(path + "/trace.js", "r")
        js += text_file.read()
        text_file.close()
        display(Javascript(js))
        text_file = open(path + "/vtk.html", "r")
        css = text_file.read()
        text_file.close()
        display(HTML(css))
        DOMWidget.__init__(self, **kwargs)
