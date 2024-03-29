<script>
  import * as go from 'gojs';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { fetch200 } from '$lib/misc.js';

  export let programid;
  export let height;
  export let formatNodeTextLabel;

  const MINLENGTH = 350;  // this controls the minimum length of any swimlane
  const MINBREADTH = 70;  // this controls the minimum breadth of any non-collapsed swimlane

  let n=0;  // used in addNode to create unique keys FIXME

  const dispatch = createEventDispatcher();
  
  let currentSelection;
  let diagram;
  let diagram_div_id = programid + '-diagram';

  let label_div_id   = programid + '-label';
  let toolbox_div_id = programid + '-toolbox';


  export function clearSelection() {
    if (diagram) {
        diagram.clearSelection();
        clearDiagramCanvasSelection();
    }
  }

  function clearDiagramCanvasSelection() {
      let canvas = document.querySelector(`#${diagram_div_id} > canvas`);
      if (canvas) {
	canvas.blur();
      }
  }

  onMount( async ()=> {
    let request = new Request(`/api/v1/missionprograms/diagram/${programid}`);
    let response = await fetch200(request);
    let program = await response.json();
    initDiagram(program);
  });


  // may be called to force the lanes to be laid out again
  function relayoutLanes() {
    diagram.nodes.each(function(lane) {
      if (!(lane instanceof go.Group)) return;
      if (lane.category === "Pool") return;
      lane.layout.isValidLayout = false;  // force it to be invalid
    });
    diagram.layoutDiagram();
  }


  // this is called after nodes have been moved or lanes resized, to layout all of the Pool Groups again
  function relayoutDiagram() {
    diagram.layout.invalidateLayout();
    diagram.findTopLevelGroups().each(function(g) { if (g.category === "Pool") g.layout.invalidateLayout(); });
    diagram.layoutDiagram();
  }


  function deleteNode() {
    console.log('deleteNode');
    diagram.commit(function(m) {
      if (currentSelection) {
        diagram.remove(currentSelection);
      }
    });
  }


  function addNode(after) {
    console.log('addNode');
    var $ = go.GraphObject.make;
    if (currentSelection) {
      diagram.model.commit(function(m) {
        console.log('m', m);
        m.addNodeData({
          key: `add${++n}`,
          group: currentSelection.data.group,
        });
        // diagram.add(
        //     $(go.Node, "Auto",
        //       $(go.Shape, "RoundedRectangle", { fill: "lightblue" }),
        //       $(go.TextBlock, "Hello!", { margin: 5 })
        //      ));
      });
    }
  }


  // Show the diagram's model in JSON format  // used? FIXME
  function save() {
    document.getElementById("mySavedModel").value = diagram.model.toJson();
    diagram.isModified = false;
  }
  function load() {
    diagram.model = go.Model.fromJson(document.getElementById("mySavedModel").value);
    diagram.delayInitialization(relayoutDiagram);
  }


  function initDiagram(program) {
    var $ = go.GraphObject.make;

    diagram =
      $(go.Diagram, diagram_div_id,
        {
          // use a custom ResizingTool (along with a custom ResizeAdornment on each Group)
          resizingTool: new LaneResizingTool(),
          // use a simple layout that ignores links to stack the top-level Pool Groups next to each other
          layout: $(PoolLayout, { spacing: new go.Size(0, 40) }),
          // don't allow dropping onto the diagram's background unless they are all Groups (lanes or pools)
          mouseDragOver: function(e) {
            if (!e.diagram.selection.all(function(n) { return n instanceof go.Group; })) {
              e.diagram.currentCursor = 'not-allowed';
            }
          },
          mouseDrop: function(e) {
            if (!e.diagram.selection.all(function(n) { return n instanceof go.Group; })) {
              e.diagram.currentTool.doCancel();
            }
          },
          autoScale: go.Diagram.Uniform,
          allowHorizontalScroll: false,
          // a clipboard copied node is pasted into the original node's group (i.e. lane).
          "commandHandler.copiesGroupKey": true,
          // automatically re-layout the swim lanes after dragging the selection
          "SelectionMoved": relayoutDiagram,  // this DiagramEvent listener is
          "SelectionCopied": relayoutDiagram, // defined above
          "animationManager.isEnabled": false,
          // enable undo & redo
          "undoManager.isEnabled": true
        });

    // this is a Part.dragComputation function for limiting where a Node may be dragged
    // use GRIDPT instead of PT if DraggingTool.isGridSnapEnabled and movement should snap to grid
    function stayInGroup(part, pt, gridpt) {
      // don't constrain top-level nodes
      var grp = part.containingGroup;
      if (grp === null) return pt;
      // try to stay within the background Shape of the Group
      var back = grp.resizeObject;
      if (back === null) return pt;
      // allow dragging a Node out of a Group if the Shift key is down
      if (part.diagram.lastInput.shift) return pt;
      var p1 = back.getDocumentPoint(go.Spot.TopLeft);
      var p2 = back.getDocumentPoint(go.Spot.BottomRight);
      var b = part.actualBounds;
      var loc = part.location;
      // find the padding inside the group's placeholder that is around the member parts
      var m = grp.placeholder.padding;
      // now limit the location appropriately
      var x = Math.max(p1.x + m.left, Math.min(pt.x, p2.x - m.right - b.width - 1)) + (loc.x - b.x);
      var y = Math.max(p1.y + m.top, Math.min(pt.y, p2.y - m.bottom - b.height - 1)) + (loc.y - b.y);
      return new go.Point(x, y);
    }

    function groupStyle() {  // common settings for both Lane and Pool Groups
      return [
        {
          layerName: "Background",  // all pools and lanes are always behind all nodes and links
          background: "transparent",  // can grab anywhere in bounds
          movable: true, // allows users to re-order by dragging
          copyable: false,  // can't copy lanes or pools
          avoidable: false,  // don't impede AvoidsNodes routed Links
          minLocation: new go.Point(NaN, -Infinity),  // only allow vertical movement
          maxLocation: new go.Point(NaN, Infinity)
        },
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify)
      ];
    }

    // hide links between lanes when either lane is collapsed
    function updateCrossLaneLinks(group) {
      group.findExternalLinksConnected().each(function(l) {
        l.visible = (l.fromNode.isVisible() && l.toNode.isVisible());
      });
    }

    // each Group is a "swimlane" with a header on the left and a resizable lane on the right
    diagram.groupTemplate =
      $(go.Group, "Horizontal", groupStyle(),
        {
          selectionObjectName: "SHAPE",  // selecting a lane causes the body of the lane to be highlit, not the label
          resizable: true, resizeObjectName: "SHAPE",  // the custom resizeAdornmentTemplate only permits two kinds of resizing
          layout: $(go.LayeredDigraphLayout,  // automatically lay out the lane's subgraph
                    {
                      isInitial: false,  // don't even do initial layout
                      isOngoing: false,  // don't invalidate layout when nodes or links are added or removed
                      direction: 90,
                      columnSpacing: 0.1,
                      layeringOption: go.LayeredDigraphLayout.LayerLongestPathSource
                    }),
          computesBoundsAfterDrag: true,  // needed to prevent recomputing Group.placeholder bounds too soon
          computesBoundsIncludingLinks: false,  // to reduce occurrences of links going briefly outside the lane
          computesBoundsIncludingLocation: true,  // to support empty space at top-left corner of lane
          handlesDragDropForMembers: true,  // don't need to define handlers on member Nodes and Links
          mouseDrop: function(e, grp) {  // dropping a copy of some Nodes and Links onto this Group adds them to this Group
            if (!e.shift) return;  // cannot change groups with an unmodified drag-and-drop
            // don't allow drag-and-dropping a mix of regular Nodes and Groups
            if (!e.diagram.selection.any(function(n) { return n instanceof go.Group; })) {
              var ok = grp.addMembers(grp.diagram.selection, true);
              if (ok) {
                updateCrossLaneLinks(grp);
              } else {
                grp.diagram.currentTool.doCancel();
              }
            } else {
              e.diagram.currentTool.doCancel();
            }
          },
          subGraphExpandedChanged: function(grp) {
            var shp = grp.resizeObject;
            if (grp.diagram.undoManager.isUndoingRedoing) return;
            if (grp.isSubGraphExpanded) {
              shp.height = grp._savedBreadth;
            } else {
              grp._savedBreadth = shp.height;
              shp.height = NaN;
            }
            updateCrossLaneLinks(grp);
          }
        },
        new go.Binding("isSubGraphExpanded", "expanded").makeTwoWay(),
        // the lane header consisting of a Shape and a TextBlock
        $(go.Panel, "Horizontal",
          {
            name: "HEADER",
            angle: 270,  // maybe rotate the header to read sideways going up
            alignment: go.Spot.Center,
          },
          $(go.Panel, "Horizontal",  // this is hidden when the swimlane is collapsed
            new go.Binding("visible", "isSubGraphExpanded").ofObject(),
            //$(go.Shape, "Diamond",
            //  { width: 8, height: 8, fill: "white" },
            //  new go.Binding("fill", "color")),
            // $(go.TextBlock,  // the lane label
            //   { font: "bold 13pt Helvetica,sans-serif", editable: true, margin: new go.Margin(8, 0, 0, 0) },
            //   new go.Binding("text", "text").makeTwoWay())
           ),
          //$("SubGraphExpanderButton", { margin: 5 })  // but this remains always visible!
         ),  // end Horizontal Panel
        $(go.Panel, "Auto",  // the lane consisting of a background Shape and a Placeholder representing the subgraph
          $(go.Shape, "Rectangle",  // this is the resized object
            { name: "SHAPE", fill: "white", strokeWidth: 0 },
            new go.Binding("fill", "color"),
            new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify)),
          $(go.Placeholder,
            { padding: 2, alignment: go.Spot.TopLeft }),
          $(go.TextBlock,  // this TextBlock is only seen when the swimlane is collapsed
            {
              name: "LABEL",
              font: "bold 13pt Helvetica,sans-serif", editable: true,
              angle: 0, alignment: go.Spot.TopLeft, margin: new go.Margin(2, 0, 0, 4)
            },
            new go.Binding("visible", "isSubGraphExpanded", function(e) { return !e; }).ofObject(),
            new go.Binding("text", "text").makeTwoWay())
         )  // end Auto Panel
       );  // end Group

    // define a custom resize adornment that has two resize handles if the group is expanded
    diagram.groupTemplate.resizeAdornmentTemplate =
      $(go.Adornment, "Spot",
        $(go.Placeholder),
        $(go.Shape,  // for changing the length of a lane
          {
            alignment: go.Spot.Right,
            desiredSize: new go.Size(7, 50),
            fill: "lightblue", stroke: "dodgerblue",
            cursor: "col-resize"
          },
          new go.Binding("visible", "", function(ad) {
            if (ad.adornedPart === null) return false;
            return ad.adornedPart.isSubGraphExpanded;
          }).ofObject()),
        $(go.Shape,  // for changing the breadth of a lane
          {
            alignment: go.Spot.Bottom,
            desiredSize: new go.Size(50, 7),
            fill: "lightblue", stroke: "dodgerblue",
            cursor: "row-resize"
          },
          new go.Binding("visible", "", function(ad) {
            if (ad.adornedPart === null) return false;
            return ad.adornedPart.isSubGraphExpanded;
          }).ofObject())
       );

    diagram.groupTemplateMap.add(
      "Pool",
      $(go.Group, "Auto", groupStyle(),
        { // use a simple layout that ignores links to stack the "lane" Groups on top of each other
          layout: $(PoolLayout, { spacing: new go.Size(0, 0) })  // no space between lanes
        },
        $(go.Shape,
          { fill: "rgba(0,0,0,0)", strokeWidth: 0, minSize: new go.Size(530, 10) },
          new go.Binding("fill", "color")),
        $(go.Panel, "Table",
          //{ defaultColumnSeparatorStroke: "#D2E0E3" },
          $(go.Panel, "Horizontal",
            { column: 0, angle: 270 },
            // $(go.TextBlock,
            //   { font: "12pt Helvetica,sans-serif", editable: true, margin: new go.Margin(3, 0, 0, 0) },
            //   new go.Binding("text").makeTwoWay())
           ),
          $(go.Placeholder,
            { column: 1 })
         )
       ));

    diagram.linkTemplate =
      $(go.Link,
        { routing: go.Link.AvoidsNodes, corner: 5 },
        { relinkableFrom: true, relinkableTo: true },
	new go.Binding("fromSpot", "fromSpot", go.Spot.parse),
	new go.Binding("toSpot", "toSpot", go.Spot.parse),
	new go.Binding("fromEndSegmentLength"),
	new go.Binding("toEndSegmentLength"),
        $(go.Shape, { stroke: "#CCCCCC", strokeWidth: 4 }),
        $(go.Shape, { toArrow: "Triangle", stroke: "#CCCCCC", fill: "#CCCCCC", strokeWidth: 4})
       );


    const defaultNodeTemplate = 
      $(go.Node, "Auto",
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape,
          { figure: "Rectangle", //"RoundedRectangle"
            height: 90,
            width: 220,
            strokeWidth: 0,
            fill: "#CCCCCC",  // default Shape.fill value
            portId: "", cursor: "pointer", fromLinkable: true, toLinkable: true,
          },
          new go.Binding("fill", "color")),  // binding to get fill from nodedata.color
        $(go.TextBlock,
          { margin: new go.Margin(8, 0, 0, 0), font: "20px Montserrat,OpenSans,sans-serif" },
          new go.Binding("text", "", formatNodeTextLabel)),  // binding to get TextBlock.text from node.value
        {
          //dragComputation: stayInGroup, // limit dragging of Nodes to stay within the containin
          dragComputation: (e) => { e.diagram.currentTool.doCancel(); },
          selectionChanged: (part) => { console.log('part', part);
					if (part.data.param) {
                                            clearDiagramCanvasSelection();
					  dispatch('selectionchanged', part);
					} else {
					  //part.diagram.currentTool.doCancel();
					  //part.diagram.cancelSelection();
                                            part.isSelected = false;
                                            clearSelection();
					}
				      },


        }
       );

      const labelNodeTemplate =
            $(go.Node, "Auto",
              new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
              $(go.Shape,
                { figure: "Rectangle", //"RoundedRectangle"
                  height: 90,
                  width: 220,
                  strokeWidth: 0,
                  fill: "#7EB2B9",
                  portId: "", cursor: "pointer", fromLinkable: true, toLinkable: true,
                },
                //new go.Binding("fill", "color"),  // binding to get fill from nodedata.color
               ),
              $(go.TextBlock,
                { margin: new go.Margin(8, 0, 0, 0), font: "bold 22px Montserrat,OpenSans,sans-serif", stroke: "white" },
                new go.Binding("text", "", formatNodeTextLabel)),  // binding to get TextBlock.text from node.value
              {
                  //dragComputation: stayInGroup, // limit dragging of Nodes to stay within the containin
                  dragComputation: (e) => { e.diagram.currentTool.doCancel(); },
                  selectionChanged: (part) => { console.log('part', part);
					        if (part.data.param) {
                                                    clearDiagramCanvasSelection();
					            dispatch('selectionchanged', part);
					        } else {
					            //part.diagram.currentTool.doCancel();
					            //part.diagram.cancelSelection();
                                                    part.isSelected = false;
                                                    clearSelection();
					        }
				              },


              }
             );

      const paramNodeTemplate =
      $(go.Node, "Auto",
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape,
          { figure: "Rectangle", //"RoundedRectangle"
            height: 90,
            width: 220,
            strokeWidth: 0,
            fill: "white",
            portId: "", cursor: "pointer", fromLinkable: true, toLinkable: true,
          },
          //new go.Binding("fill", "color"),  // binding to get fill from nodedata.color
         ),
        $(go.TextBlock,
          { margin: new go.Margin(8, 0, 0, 0), font: "20px Montserrat,OpenSans,sans-serif" },
          new go.Binding("text", "", formatNodeTextLabel)),  // binding to get TextBlock.text from node.value
        {
          //dragComputation: stayInGroup, // limit dragging of Nodes to stay within the containin
          dragComputation: (e) => { e.diagram.currentTool.doCancel(); },
          selectionChanged: (part) => { console.log('partp', part);
					if (part.data.param) {
                                            clearDiagramCanvasSelection();
					  dispatch('selectionchanged', part);
					} else {
					  //part.diagram.currentTool.doCancel();
					  //part.diagram.cancelSelection();
                                            part.isSelected = false;
                                            clearSelection();
					}
				      },


        }
       );

      const terminalNodeTemplate =
            $(go.Node, "Auto",
              new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
              $(go.Shape,
                { figure: "Rectangle", //"RoundedRectangle"
                  height: 90,
                  width: 220,
                  strokeWidth: 0,
                  fill: "#177D8B",
                  portId: "", cursor: "pointer", fromLinkable: true, toLinkable: true,
                },
                //new go.Binding("fill", "color"),  // binding to get fill from nodedata.color
               ),
              $(go.TextBlock,
                { margin: new go.Margin(8, 0, 0, 0), font: "bold 22px Montserrat,OpenSans,sans-serif", stroke: "white" },
                new go.Binding("text", "", formatNodeTextLabel)),  // binding to get TextBlock.text from node.value
              {
                  //dragComputation: stayInGroup, // limit dragging of Nodes to stay within the containin
                  dragComputation: (e) => { e.diagram.currentTool.doCancel(); },
                  selectionChanged: (part) => { console.log('partp', part);
					        if (part.data.param) {
                                                    clearDiagramCanvasSelection();
					            dispatch('selectionchanged', part);
					        } else {
					            //part.diagram.currentTool.doCancel();
					            //part.diagram.cancelSelection();
                                                    part.isSelected = false;
                                                    clearSelection();
					        }
				              },


              }
             );

      // https://gojs.net/latest/intro/templateMaps.html
      //diagram.nodeTemplate = defaultNodeTemplate;
      let nodeTemplateMap = new go.Map();
      nodeTemplateMap.add("", defaultNodeTemplate);
      nodeTemplateMap.add("label", labelNodeTemplate);
      nodeTemplateMap.add("param", paramNodeTemplate);
      nodeTemplateMap.add("terminal", terminalNodeTemplate);
      diagram.nodeTemplateMap = nodeTemplateMap;

    diagram.isReadOnly = true;
    diagram.toolManager.panningTool.isEnabled = false;
    diagram.toolManager.dragSelectingTool.isEnabled = false;
    diagram.allowHorizontalScroll = false;
    diagram.allowVerticalScroll = false;
    diagram.allowZoom = false;
    
    // define some sample graphs in some of the lanes
    //diagram.model = new go.GraphLinksModel();
    diagram.model = new go.GraphLinksModel(program[0], program[1]);

    let json = diagram.model.toJson();
    let data = JSON.parse(json);
    json = JSON.stringify(data, 0, 4);
    //console.log(json);
    
    // force all actions' layouts to be performed
    relayoutLanes();

    let tool = diagram.toolManager.clickSelectingTool;
    tool.standardMouseSelect = () => {
      let diagram = tool.diagram;
      let e = diagram.lastInput;
      console.log('over', e);
      go.ClickSelectingTool.prototype.standardMouseSelect.call(tool);
      //diagram.clearSelection();
    }
  }  // end initDiagram


  // define a custom ResizingTool to limit how far one can shrink a lane Group
  class LaneResizingTool extends go.ResizingTool {

    // compute the minimum size of a Pool Group needed to hold all of the Lane Groups
    static computeMinPoolSize(pool) {
      // assert(pool instanceof go.Group && pool.category === "Pool");
      var len = MINLENGTH;
      pool.memberParts.each(function(lane) {
	// pools ought to only contain lanes, not plain Nodes
	if (!(lane instanceof go.Group)) return;
	var holder = lane.placeholder;
	if (holder !== null) {
          var sz = holder.actualBounds;
          len = Math.max(len, sz.width);
	}
      });
      return new go.Size(len, NaN);
    }


    // compute the minimum size for a particular Lane Group
    static computeLaneSize(lane) {
      // assert(lane instanceof go.Group && lane.category !== "Pool");
      var sz = LaneResizingTool.computeMinLaneSize(lane);
      if (lane.isSubGraphExpanded) {
	var holder = lane.placeholder;
	if (holder !== null) {
          var hsz = holder.actualBounds;
          sz.height = Math.ceil(Math.max(sz.height, hsz.height));
	}
      }
      // minimum breadth needs to be big enough to hold the header
      var hdr = lane.findObject("HEADER");
      if (hdr !== null) sz.height = Math.ceil(Math.max(sz.height, hdr.actualBounds.height));
      return sz;
    }


    // determine the minimum size of a Lane Group, even if collapsed
    static computeMinLaneSize(lane) {
      if (!lane.isSubGraphExpanded) return new go.Size(MINLENGTH, 1);
      return new go.Size(MINLENGTH, MINBREADTH);
    }


    isLengthening() {
      return (this.handle.alignment === go.Spot.Right);
    };


    computeMinSize() {
      var lane = this.adornedObject.part;
      // assert(lane instanceof go.Group && lane.category !== "Pool");
      var msz = LaneResizingTool.computeMinLaneSize(lane);  // get the absolute minimum size
      if (this.isLengthening()) {  // compute the minimum length of all lanes
	var sz = LaneResizingTool.computeMinPoolSize(lane.containingGroup);
	msz.width = Math.max(msz.width, sz.width);
      } else {  // find the minimum size of this single lane
	var sz = LaneResizingTool.computeLaneSize(lane);
	msz.width = Math.max(msz.width, sz.width);
	msz.height = Math.max(msz.height, sz.height);
      }
      return msz;
    };


    resize(newr) {
      var lane = this.adornedObject.part;
      if (this.isLengthening()) {  // changing the length of all of the lanes
	lane.containingGroup.memberParts.each(function(lane) {
          if (!(lane instanceof go.Group)) return;
          var shape = lane.resizeObject;
          if (shape !== null) {  // set its desiredSize length, but leave each breadth alone
            shape.width = newr.width;
          }
	});
      } else {  // changing the breadth of a single lane
	super.resize(newr);
      }
      this.relayoutDiagram();  // now that the lane has changed size, layout the pool again  // is this ok now that i've split into classes? FIXME
    };
  }


  // define a custom grid layout that makes sure the length of each lane is the same
  // and that each lane is broad enough to hold its subgraph
  class PoolLayout extends go.GridLayout {
    constructor() {
      super();
      this.cellSize = new go.Size(1, 1);
      this.wrappingColumn = 1;
      this.wrappingWidth = Infinity;
      this.isRealtime = false;  // don't continuously layout while dragging
      this.alignment = go.GridLayout.Position;
      // This sorts based on the location of each Group.
      // This is useful when Groups can be moved up and down in order to change their order.
      // this.comparer = function(a, b) {
      //     var ay = a.location.y;
      //     var by = b.location.y;
      //     if (isNaN(ay) || isNaN(by)) return 0;
      //     if (ay < by) return -1;
      //     if (ay > by) return 1;
      //     return 0;
      // };
      this.boundsComputation = function(part, layout, rect) {
	part.getDocumentBounds(rect);
	rect.inflate(-1, -1);  // negative strokeWidth of the border Shape
	return rect;
      }
    }


    doLayout(coll) {
      if (this.diagram === null) return;
      this.diagram.startTransaction("PoolLayout");
      var pool = this.group;
      if (pool !== null && pool.category === "Pool") {
	// make sure all of the Group Shapes are big enough
	var minsize = LaneResizingTool.computeMinPoolSize(pool);
	pool.memberParts.each(function(lane) {
          if (!(lane instanceof go.Group)) return;
          if (lane.category !== "Pool") {
            var shape = lane.resizeObject;
            if (shape !== null) {  // change the desiredSize to be big enough in both directions
              var sz = LaneResizingTool.computeLaneSize(lane);
              shape.width = (isNaN(shape.width) ? minsize.width : Math.max(shape.width, minsize.width));
              shape.height = (!isNaN(shape.height)) ? Math.max(shape.height, sz.height) : sz.height;
              var cell = lane.resizeCellSize;
              if (!isNaN(shape.width) && !isNaN(cell.width) && cell.width > 0) shape.width = Math.ceil(shape.width / cell.width) * cell.width;
              if (!isNaN(shape.height) && !isNaN(cell.height) && cell.height > 0) shape.height = Math.ceil(shape.height / cell.height) * cell.height;
            }
          }
	});
      }
      // now do all of the usual stuff, according to whatever properties have been set on this GridLayout
      super.doLayout(coll);
      diagram.commitTransaction("PoolLayout");
    };
  }
</script>


<!-- <div id={diagram_div_id} style="width:75%;height:{height};pointer-events:none"></div> -->
<div id={diagram_div_id} style="width:530px;height:{height}"></div>
