

// this version features bond changing via clicking on bonds


const init = () => {
    var $ = go.GraphObject.make;

    myDiagram =
      $(go.Diagram, "myDiagramDiv",
        {
          maxSelectionCount: 1,
          allowLink: false,  // no user-drawn links
          allowClipboard: false,
          "undoManager.isEnabled": true,
        });

    // myDiagram.grid.visible = true

    myDiagram.nodeTemplate =
      $(go.Node, "Spot",
        {
          locationObjectName: "SHAPE",
          locationSpot: go.Spot.Center, 
          resizable: false,
          itemTemplate:
            $(go.Panel,
              { fromSpot: go.Spot.Center, toSpot: go.Spot.Center, toMaxLinks: 1, fromMaxLinks: 1 },   // port properties on the node
              new go.Binding("portId", "id"),
              new go.Binding("alignment", "spot", go.Spot.parse),
              $(go.Shape, "Circle",
                { width: 3, height: 3, background: "transparent", fill: null, stroke: null },
              ),
            ),
        },
        new go.Binding("itemArray", "ports"),
        // these Bindings are TwoWay because the DraggingTool modifies the target properties
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.TextBlock,
          {
            margin: 1, 
            textAlign: "center",
            editable: true, 
            isMultiline: false,
            font: "32px Fira Sans, sans-serif",
          },
          // this Binding is TwoWay due to the user editing the text with the TextEditingTool
          new go.Binding("text").makeTwoWay())
      );

    // Node selection adornment
    // Include four large triangular buttons so that the user can easily make a copy
    // of the node, move it to be in that direction relative to the original node,
    // and add a link to the new node.

    const findExistingLinks = (selectedNodeData, direction) => {
      selectedKey = myDiagram.model.getKeyForNodeData(selectedNodeData)
      oppositeDirection = correspondingDirection[direction]
      var existingLink = null;
      var tempLinkDataArray = [ ...myDiagram.model.linkDataArray]
      for(let link of tempLinkDataArray){
        // if there exists a link from selected in the specified direction
        if(link['from'] === selectedKey && link['direction'] === direction){
          existingLink = link
          myDiagram.model.removeLinkData(link)
        } else if(link['to'] === selectedKey && link['direction'] === oppositeDirection) {
          // else if there exists a link to selected in the opposite direction
          existingLink = link
          myDiagram.model.removeLinkData(link)
        }
      }
      return existingLink
    }

    const makeArrowButton = (spot, fig) => {
      var maker = function(e, shape) {
          e.handled = true;
          e.diagram.model.commit(function(m) {
            var selnode = shape.part.adornedPart;

            // create a new node in the direction of the spot
            var p = new go.Point().setRectSpot(selnode.actualBounds, spot);
            
            p.subtract(selnode.location);
            p.scale(2, 2);
            p.x += Math.sign(p.x) * 60;
            p.y += Math.sign(p.y) * 60;
            p.add(selnode.location);
            // p.snapToGridPoint(e.diagram.grid.gridOrigin, e.diagram.grid.gridCellSize);

            // make the new node a copy of the selected node
            var nodedata = m.copyNodeData(selnode.data);
            m.addNodeData(nodedata);  // add to model

            // move the new node
            var newnode = e.diagram.findNodeForData(nodedata);
            newnode.location = p;

            // create a link from the selected node to the new node
            var linkdata = { category: 'single', bondCount: 1, from: selnode.key, to: m.getKeyForNodeData(nodedata) };
            m.addLinkData(linkdata);  // add to model

            // select new node and start to edit it
            e.diagram.select(newnode);
            setTimeout(function() {
            e.diagram.commandHandler.editTextBlock();
            }, 20);

          });
        };
      return $(go.Shape,
        {
          figure: fig,
          alignment: spot, 
          alignmentFocus: spot.opposite(),
          width: (spot.equals(go.Spot.Top) || spot.equals(go.Spot.Bottom)) ? 36 : 18,
          height: (spot.equals(go.Spot.Top) || spot.equals(go.Spot.Bottom)) ? 18 : 36,
          fill: "orange", 
          strokeWidth: 0,
          isActionable: true,  // needed because it's in an Adornment
          click: maker
        },
        );
    }

    myDiagram.nodeTemplate.selectionAdornmentTemplate =
      $(go.Adornment, "Spot",
        $(go.Placeholder, { padding: 5 }),
        makeArrowButton(go.Spot.Top, "TriangleUp", 'up'),
        makeArrowButton(go.Spot.Left, "TriangleLeft", 'left'),
        makeArrowButton(go.Spot.Right, "TriangleRight", 'right'),
        makeArrowButton(go.Spot.Bottom, "TriangleDown", 'down'),
      );

    const changeBond = (e, link) => {
        e.diagram.commit(function(diag) {
            var oldLinkData = link.tb
            var category;
            var bondCount = oldLinkData['bondCount']
            var from = oldLinkData['from']
            var to = oldLinkData['to']

            if(bondCount === 1){
                bondCount++
                category = 'double'
            } else if (bondCount === 2) {
                bondCount++
                category = 'triple'
            } else {
                bondCount = 1
                category = 'single'
            }

            myDiagram.model.removeLinkData(oldLinkData)
            var newLinkData = {category: category, bondCount: bondCount, from: from, to: to}
            myDiagram.model.addLinkData(newLinkData)

        })
    }

    var singleBond = 
        $(go.Link,
            {
                click: changeBond,
            },
        $(go.Shape, { isPanelMain: true, strokeWidth: 2, stroke: "black" }),
    );

    var doubleBond = 
        $(go.Link,
            {
                click: changeBond,
            },
        $(go.Shape, { isPanelMain: true, strokeWidth: 8, stroke: "black" }),
        $(go.Shape, { isPanelMain: true, strokeWidth: 4, stroke: "white" }),
    );

    var tripleBond = 
        $(go.Link,
            {
                click: changeBond,
            },
        $(go.Shape, { isPanelMain: true, strokeWidth: 10, stroke: "black" }),
        $(go.Shape, { isPanelMain: true, strokeWidth: 6, stroke: "white" }),
        $(go.Shape, { isPanelMain: true, strokeWidth: 2, stroke: "black" })
    );
    
    var linkMap = new go.Map()
    linkMap.add('single', singleBond)
    linkMap.add('double', doubleBond)
    linkMap.add('triple', tripleBond)

    myDiagram.linkTemplateMap = linkMap

    myDiagram.model =
    $(go.GraphLinksModel,
      {
        copiesArrays: true,
        copiesArrayObjects: true,
        linkFromPortIdProperty: "fromPort",
        linkToPortIdProperty: "toPort"
      });

    myDiagram.model.nodeDataArray = [
      {
        key: -1,
        loc: "0 0",
        text: "C",
        ports: [
        //   { id: "up2", spot: "0.25 0" },
        //   { id: "up1", spot: "0.5 0" },
        //   { id: "up3", spot: "0.75 0" },
        //   // { id: "up4", spot: "1 0" },
        //   // { id: "up5", spot: "0 0" },

        //   { id: "down2", spot: "0.25 1" },
        //   { id: "down1", spot: "0.5 1" },
        //   { id: "down3", spot: "0.75 1" },
        //   // { id: "down4", spot: "1 1" },
        //   // { id: "down5", spot: "0 1" },
          
        //   { id: "left2", spot: "0 0.35" },
        //   { id: "left1", spot: "0 0.5" },
        //   { id: "left3", spot: "0 0.65" },
        //   // { id: "left4", spot: "0 0.2" },
        //   // { id: "left5", spot: "0 0.8" },

        //   { id: "right2", spot: "1 0.35" },
        //   { id: "right1", spot: "1 0.5" },
        //   { id: "right3", spot: "1 0.65" },
        //   // { id: "right4", spot: "1 0.2" },
        //   // { id: "right5", spot: "1 0.8" }
        ]
      },
    ]
}

const correspondingDirection = {
  'left1': 'right1',
  'left2': 'right2',
  'left3': 'right3',

  'right1': 'left1',
  'right2': 'left2',
  'right3': 'left3',

  'up1': 'down1',
  'up2': 'down2',
  'up3': 'down3',

  'down1': 'up1',
  'down2': 'up2',
  'down3': 'up3',

  'up': 'down',
  'down': 'up',
  'left': 'right',
  'right': 'left',
}

const logData = () => {
  console.log('Data')
  console.log(myDiagram.model.nodeDataArray)
  console.log('Links')
  console.log(myDiagram.model.linkDataArray)
}