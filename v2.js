

// this version features bond changing via clicking on bonds


const init = () => {
    var $ = go.GraphObject.make;

    myDiagram =
      $(go.Diagram, "myDiagramDiv",
        {
          initialScale: 1.5,
          maxSelectionCount: 1,
          allowLink: false,  // no user-drawn links
          'dragSelectingTool.isEnabled': false,
          allowClipboard: false,
        });

    const changeCharge = (e, node) => {
      e.diagram.commit(function(diag) {
        var nodeData = node.tb
        myDiagram.model.removeNodeData(nodeData)
        var charge = nodeData['charge']

        if(charge === 0){
          charge = 1
        } else if (charge === 1) {
          charge = -1
        } else {
          charge = 0
        }

        var newNodeData = {...nodeData, charge: charge}
        myDiagram.model.addNodeData(newNodeData)
      })
    }

    var nodeMap = new go.Map();
    // Generic node template for both cations and anions to be inherited/copied
    var elementTemplate =
      $(go.Node, "Spot",
        {
          locationObjectName: "SHAPE",
          locationSpot: go.Spot.Center, 
          resizable: false,
          doubleClick: changeCharge
        },
        // these Bindings are TwoWay because the DraggingTool modifies the target properties
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.TextBlock,
          {
            margin: 2, 
            textAlign: "center",
            editable: true, 
            isMultiline: false,
            font: "32px Fira Sans, sans-serif",
          },
          // this Binding is TwoWay due to the user editing the text with the TextEditingTool
          new go.Binding("text").makeTwoWay()),
          $(go.Shape,
            {
              height: 10,
              width: 10,
              alignment: go.Spot.TopRight,
              figure: 'PlusLine',
              stroke: 'black',
            },
            new go.Binding('figure', 'charge', function(c){
              if(c === 1){
                return 'PlusLine'
              } else {
                return 'MinusLine'
              }
            }),
            new go.Binding("stroke", "charge", function(c) { return c === 0 ? 'white' : 'black'; })
            )
      );

    elementTemplate.data = {};
    elementTemplate.data = null;

    var cationTemplate = elementTemplate.copy()
    nodeMap.add('cation', cationTemplate);

    var anionTemplate = elementTemplate.copy()
    nodeMap.add('anion', anionTemplate);
    
    myDiagram.nodeTemplateMap = nodeMap

    // Node selection adornment for anion template ONLY
    // Include four large triangular buttons so that the user can easily make a copy
    // of the node, move it to be in that direction relative to the original node,
    // and add a link to the new node.
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
            nodedata['charge'] = 0
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

    anionTemplate.selectionAdornmentTemplate =
      $(go.Adornment, "Spot",
        $(go.Placeholder, { padding: 5 }),
        makeArrowButton(go.Spot.Top, "TriangleUp", 'up'),
        makeArrowButton(go.Spot.Left, "TriangleLeft", 'left'),
        makeArrowButton(go.Spot.Right, "TriangleRight", 'right'),
        makeArrowButton(go.Spot.Bottom, "TriangleDown", 'down'),
      );

    // Mapping different link templates for different types of bonds
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

    // Diagram Model
    myDiagram.model =
    $(go.GraphLinksModel,
      {
        copiesArrays: true,
        copiesArrayObjects: true,
      });

    // Initial C
    myDiagram.model.nodeDataArray = [
      {
        category: 'anion',
        key: -1,
        loc: "0 0",
        text: "C",
        charge: 0,
      },
    ]
}

// Ends TextEditingTool when clicking out of myDiagram
document.addEventListener("mousedown", function() {
  if(myDiagram.currentTool instanceof go.TextEditingTool){
    myDiagram.currentTool.acceptText(go.TextEditingTool.LostFocus);

    // Checking whether text is accepted
    // console.log(myDiagram.currentTool.state.va)
  }
});

const logData = () => {
  console.log('Data')
  console.log(myDiagram.model.nodeDataArray)
  console.log('Links')
  console.log(myDiagram.model.linkDataArray)
}

const addCation = () => {
  myDiagram.startTransaction()
  const cation = { category: 'cation', charge: 1, text: "Cation" }
  myDiagram.model.addNodeData(cation)
  myDiagram.commitTransaction('added cation')
}

const deleteElement = () => {
  
}

const checkTotalNumElements = (compound, nodeDataArray) => {
  const correctNum = answers[compound]['totalNumElements']
  const currNum = nodeDataArray.length
  return correctNum === currNum
}

const check = () => {
  const nodeDataArray = myDiagram.model.nodeDataArray
  const linkDataArray = myDiagram.model.linkDataArray
  console.log(checkTotalNumElements(compound, nodeDataArray))
}

var compound = 'CH3CH3'

const answers = {
  'CH3CH3': {
    totalNumElements: 8,
  }
}