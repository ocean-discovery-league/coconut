(function() {
    // These parameters need to be set before defining the templates.
    var MINLENGTH = 200;  // this controls the minimum length of any swimlane
    var MINBREADTH = 20;  // this controls the minimum breadth of any non-collapsed swimlane

    let currentSelection;

    // some shared functions

    // this may be called to force the lanes to be laid out again
    function relayoutLanes() {
      missionOneDiagram.nodes.each(function(lane) {
        if (!(lane instanceof go.Group)) return;
        if (lane.category === "Pool") return;
        lane.layout.isValidLayout = false;  // force it to be invalid
      });
      missionOneDiagram.layoutDiagram();
    }

    // this is called after nodes have been moved or lanes resized, to layout all of the Pool Groups again
    function relayoutDiagram() {
      missionOneDiagram.layout.invalidateLayout();
      missionOneDiagram.findTopLevelGroups().each(function(g) { if (g.category === "Pool") g.layout.invalidateLayout(); });
      missionOneDiagram.layoutDiagram();
    }

    // compute the minimum size of a Pool Group needed to hold all of the Lane Groups
    function computeMinPoolSize(pool) {
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
    function computeLaneSize(lane) {
      // assert(lane instanceof go.Group && lane.category !== "Pool");
      var sz = computeMinLaneSize(lane);
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
    function computeMinLaneSize(lane) {
      if (!lane.isSubGraphExpanded) return new go.Size(MINLENGTH, 1);
      return new go.Size(MINLENGTH, MINBREADTH);
    }


    // define a custom ResizingTool to limit how far one can shrink a lane Group
    function LaneResizingTool() {
      go.ResizingTool.call(this);
    }
    go.Diagram.inherit(LaneResizingTool, go.ResizingTool);

    LaneResizingTool.prototype.isLengthening = function() {
      return (this.handle.alignment === go.Spot.Right);
    };

    LaneResizingTool.prototype.computeMinSize = function() {
      var lane = this.adornedObject.part;
      // assert(lane instanceof go.Group && lane.category !== "Pool");
      var msz = computeMinLaneSize(lane);  // get the absolute minimum size
      if (this.isLengthening()) {  // compute the minimum length of all lanes
        var sz = computeMinPoolSize(lane.containingGroup);
        msz.width = Math.max(msz.width, sz.width);
      } else {  // find the minimum size of this single lane
        var sz = computeLaneSize(lane);
        msz.width = Math.max(msz.width, sz.width);
        msz.height = Math.max(msz.height, sz.height);
      }
      return msz;
    };

    LaneResizingTool.prototype.resize = function(newr) {
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
        go.ResizingTool.prototype.resize.call(this, newr);
      }
      relayoutDiagram();  // now that the lane has changed size, layout the pool again
    };
    // end LaneResizingTool class


    // define a custom grid layout that makes sure the length of each lane is the same
    // and that each lane is broad enough to hold its subgraph
    function PoolLayout() {
      go.GridLayout.call(this);
      this.cellSize = new go.Size(1, 1);
      this.wrappingColumn = 1;
      this.wrappingWidth = Infinity;
      this.isRealtime = false;  // don't continuously layout while dragging
      this.alignment = go.GridLayout.Position;
      // This sorts based on the location of each Group.
      // This is useful when Groups can be moved up and down in order to change their order.
      this.comparer = function(a, b) {
        var ay = a.location.y;
        var by = b.location.y;
        if (isNaN(ay) || isNaN(by)) return 0;
        if (ay < by) return -1;
        if (ay > by) return 1;
        return 0;
      };
      this.boundsComputation = function(part, layout, rect) {
        part.getDocumentBounds(rect);
        rect.inflate(-1, -1);  // negative strokeWidth of the border Shape
        return rect;
      }
    }
    go.Diagram.inherit(PoolLayout, go.GridLayout);

    PoolLayout.prototype.doLayout = function(coll) {
      var diagram = this.diagram;
      if (diagram === null) return;
      diagram.startTransaction("PoolLayout");
      var pool = this.group;
      if (pool !== null && pool.category === "Pool") {
        // make sure all of the Group Shapes are big enough
        var minsize = computeMinPoolSize(pool);
        pool.memberParts.each(function(lane) {
          if (!(lane instanceof go.Group)) return;
          if (lane.category !== "Pool") {
            var shape = lane.resizeObject;
            if (shape !== null) {  // change the desiredSize to be big enough in both directions
              var sz = computeLaneSize(lane);
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
      go.GridLayout.prototype.doLayout.call(this, coll);
      diagram.commitTransaction("PoolLayout");
    };
    // end PoolLayout class


    function selectionChangedHandler(part) {
	//console.log('selection', part);
	console.log('part.elt', part.elt);
	let shape = part.elt(0);
	console.log('shape', shape);
	console.log('data', part.data);
        let label_el = document.querySelectorAll('#label')[0];
	if (part) {
	    console.log(label_el.value)
	    console.log(part.data.key);
	    label_el.value=part.data.key;
	    console.log(label_el.value)
	}
	currentSelection = part;
    }


    function onChangeHandler() {
	console.log('onchange', currentSelection);
        let label_el = document.querySelectorAll('#label')[0];
	if (currentSelection) {
	    missionOneDiagram.model.set(currentSelection.data, 'key', label_el.value);
	}
    }


    function deleteNode() {
	console.log('deleteNode');
	missionOneDiagram.commit(function(m) {
	    if (currentSelection) {
		missionOneDiagram.remove(currentSelection);
	    }
	});
    }

    n=0;
    function addNode(after) {
	console.log('addNode');
	var $ = go.GraphObject.make;
	if (currentSelection) {
	    missionOneDiagram.model.commit(function(m) {
		console.log('m', m);
		m.addNodeData({
		    key: `add${++n}`,
		    group: currentSelection.data.group,
		});
		// missionOneDiagram.add(
		//     $(go.Node, "Auto",
		//       $(go.Shape, "RoundedRectangle", { fill: "lightblue" }),
		//       $(go.TextBlock, "Hello!", { margin: 5 })
		//      ));
	    });
	}
    }
	

window.mission1 = {};
window.mission1.onChangeHandler = onChangeHandler;
window.mission1.deleteNode = deleteNode;
window.mission1.addNode = addNode;

window.mission1.init = 
    function() {
      var $ = go.GraphObject.make;

      missionOneDiagram =
        $(go.Diagram, "mission-one-diagram",
          {
            // use a custom ResizingTool (along with a custom ResizeAdornment on each Group)
            resizingTool: new LaneResizingTool(),
            // use a simple layout that ignores links to stack the top-level Pool Groups next to each other
            layout: $(PoolLayout),
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

      missionOneDiagram.nodeTemplate =
        $(go.Node, "Auto",
          new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
          $(go.Shape, "Rectangle",
            { fill: "white", portId: "", cursor: "pointer", fromLinkable: true, toLinkable: true }),
          $(go.TextBlock, { margin: 5 },
            new go.Binding("text", "key")),
          {
	      dragComputation: stayInGroup, // limit dragging of Nodes to stay within the containing Group, defined above
	      selectionChanged: selectionChangedHandler,
	  }
        );

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
      missionOneDiagram.groupTemplate =
        $(go.Group, "Horizontal", groupStyle(),
          {
            selectionObjectName: "SHAPE",  // selecting a lane causes the body of the lane to be highlit, not the label
            resizable: true, resizeObjectName: "SHAPE",  // the custom resizeAdornmentTemplate only permits two kinds of resizing
            layout: $(go.LayeredDigraphLayout,  // automatically lay out the lane's subgraph
              {
                isInitial: false,  // don't even do initial layout
                isOngoing: false,  // don't invalidate layout when nodes or links are added or removed
                direction: 0,
                columnSpacing: 10,
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
              alignment: go.Spot.Center
            },
            $(go.Panel, "Horizontal",  // this is hidden when the swimlane is collapsed
              new go.Binding("visible", "isSubGraphExpanded").ofObject(),
              //$(go.Shape, "Diamond",
              //  { width: 8, height: 8, fill: "white" },
              //  new go.Binding("fill", "color")),
              $(go.TextBlock,  // the lane label
                { font: "bold 13pt sans-serif", editable: true, margin: new go.Margin(2, 0, 0, 0) },
                new go.Binding("text", "text").makeTwoWay())
            ),
            //$("SubGraphExpanderButton", { margin: 5 })  // but this remains always visible!
          ),  // end Horizontal Panel
          $(go.Panel, "Auto",  // the lane consisting of a background Shape and a Placeholder representing the subgraph
            $(go.Shape, "Rectangle",  // this is the resized object
              { name: "SHAPE", fill: "white" },
              new go.Binding("fill", "color"),
              new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify)),
            $(go.Placeholder,
              { padding: 12, alignment: go.Spot.TopLeft }),
            $(go.TextBlock,  // this TextBlock is only seen when the swimlane is collapsed
              {
                name: "LABEL",
                font: "bold 13pt sans-serif", editable: true,
                angle: 0, alignment: go.Spot.TopLeft, margin: new go.Margin(2, 0, 0, 4)
              },
              new go.Binding("visible", "isSubGraphExpanded", function(e) { return !e; }).ofObject(),
              new go.Binding("text", "text").makeTwoWay())
          )  // end Auto Panel
        );  // end Group

      // define a custom resize adornment that has two resize handles if the group is expanded
      missionOneDiagram.groupTemplate.resizeAdornmentTemplate =
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

      missionOneDiagram.groupTemplateMap.add("Pool",
        $(go.Group, "Auto", groupStyle(),
          { // use a simple layout that ignores links to stack the "lane" Groups on top of each other
            layout: $(PoolLayout, { spacing: new go.Size(0, 0) })  // no space between lanes
          },
          $(go.Shape,
            { fill: "white" },
            new go.Binding("fill", "color")),
          $(go.Panel, "Table",
            { defaultColumnSeparatorStroke: "black" },
            $(go.Panel, "Horizontal",
              { column: 0, angle: 270 },
              $(go.TextBlock,
                { font: "bold 16pt sans-serif", editable: true, margin: new go.Margin(2, 0, 0, 0) },
                new go.Binding("text").makeTwoWay())
            ),
            $(go.Placeholder,
              { column: 1 })
          )
        ));

      missionOneDiagram.linkTemplate =
        $(go.Link,
          { routing: go.Link.AvoidsNodes, corner: 5 },
          { relinkableFrom: true, relinkableTo: true },
          $(go.Shape),
          $(go.Shape, { toArrow: "Standard" })
        );

      // define some sample graphs in some of the lanes
      missionOneDiagram.model = new go.GraphLinksModel(
        [ // node data
          { key: "Phase1", text: "Phase1", isGroup: true, category: "Pool" },
          { key: "Phase2", text: "Phase2", isGroup: true, category: "Pool" },
          { key: "Action1", text: "Action1", isGroup: true, group: "Phase1", color: "lightblue" },
          { key: "Action2", text: "Action2", isGroup: true, group: "Phase1", color: "lightgreen" },
          { key: "Action3", text: "Action3", isGroup: true, group: "Phase1", color: "orange" },
          { key: "oneA", group: "Action1" },
          { key: "oneB", group: "Action1" },
          { key: "oneC", group: "Action1" },
          { key: "oneD", group: "Action1" },
          { key: "twoA", group: "Action2" },
          { key: "twoB", group: "Action2" },
          { key: "twoC", group: "Action2" },
          { key: "twoD", group: "Action2" },
          { key: "twoE", group: "Action2" },
          { key: "twoF", group: "Action2" },
          { key: "twoG", group: "Action2" },
          { key: "fourA", group: "Action3" },
          { key: "fourB", group: "Action3" },
          { key: "fourC", group: "Action3" },
          { key: "fourD", group: "Action3" },
          { key: "Action4", text: "Action4", isGroup: true, group: "Phase2", color: "lightyellow" },
          { key: "Action5", text: "Action5", isGroup: true, group: "Phase2", color: "lightgreen" },
          { key: "fiveA", group: "Action4" },
          { key: "fiveB", group: "Action4" },
          { key: "fiveC", group: "Action4" },
          { key: "sixA", group: "Action5" },
          { key: "sixB", group: "Action5" },
        ],
        [ // link data
          { from: "oneA", to: "oneB" },
          { from: "oneA", to: "oneC" },
          { from: "oneB", to: "oneD" },
          { from: "oneC", to: "oneD" },
          { from: "twoA", to: "twoB" },
          { from: "twoA", to: "twoC" },
          { from: "twoA", to: "twoF" },
          { from: "twoB", to: "twoD" },
          { from: "twoC", to: "twoD" },
          { from: "twoD", to: "twoG" },
          { from: "twoE", to: "twoG" },
          { from: "twoF", to: "twoG" },
          { from: "fourA", to: "fourB" },
          { from: "fourB", to: "fourC" },
          { from: "fourC", to: "fourD" },
          { from: "fiveA", to: "fiveB" },
          { from: "fiveA", to: "fiveC" },
          { from: "sixA", to: "sixB" },
        ]);
      // force all actions' layouts to be performed
      relayoutLanes();
    }  // end init

    // Show the diagram's model in JSON format
    function save() {
      document.getElementById("mySavedModel").value = missionOneDiagram.model.toJson();
      missionOneDiagram.isModified = false;
    }
    function load() {
      missionOneDiagram.model = go.Model.fromJson(document.getElementById("mySavedModel").value);
      missionOneDiagram.delayInitialization(relayoutDiagram);
    }
})();
