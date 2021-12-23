

// this version features bond changing via clicking on bonds


const init = () => {
    var $ = go.GraphObject.make;

    // Shape to indicate a connected cation
    go.Shape.defineFigureGenerator("ConnectedCation", function(shape, w, h) {
      var param1 = shape ? shape.parameter1 : NaN;
      if (isNaN(param1) || param1 < 0) param1 = 8;
    
      var quarterCircle = w/4
      var rad = quarterCircle*2
      var geo = new go.Geometry();

      var circle = new go.PathFigure(rad*2, h/2, false);
      circle.add(new go.PathSegment(go.PathSegment.Arc, 0, 360, rad, rad, rad, rad));
      geo.add(circle);

      var plusVerticalLine = new go.PathFigure(rad, 2)
      plusVerticalLine.add(new go.PathSegment(go.PathSegment.Line, rad, 2*rad-2))
      geo.add(plusVerticalLine)

      var plusHorizontalLine = new go.PathFigure(2, rad)
      plusHorizontalLine.add(new go.PathSegment(go.PathSegment.Line, 2*rad-2, rad))
      geo.add(plusHorizontalLine)

      return geo;
    });

    // Shape to indicate a connected anion
    go.Shape.defineFigureGenerator("ConnectedAnion", function(shape, w, h) {
      var param1 = shape ? shape.parameter1 : NaN;
      if (isNaN(param1) || param1 < 0) param1 = 8;
    
      var quarterCircle = w/4
      var rad = quarterCircle*2
      var geo = new go.Geometry();

      var circle = new go.PathFigure(rad*2, h/2, false);
      circle.add(new go.PathSegment(go.PathSegment.Arc, 0, 360, rad, rad, rad, rad));
      geo.add(circle);

      var minusHorizontalLine = new go.PathFigure(2, rad)
      minusHorizontalLine.add(new go.PathSegment(go.PathSegment.Line, 2*rad-2, rad))
      geo.add(minusHorizontalLine)

      return geo;
    });

    // Edited string should only contain string of <=2 letters
    const validElement = (textblock, oldstr, newstr) => {
      const lettersOnly = /^[a-zA-Z]+$/.test(newstr);
      return newstr.length <= 2 && lettersOnly
    }

    myDiagram =
      $(go.Diagram, "myDiagramDiv",
        {
          initialScale: 1,
          maxSelectionCount: 1,
          allowLink: false,  // no user-drawn links
          'dragSelectingTool.isEnabled': false,
          "draggingTool.isCopyEnabled": false,
          'contextMenuTool.isEnabled': false,
          allowClipboard: false,
          // allowVerticalScroll: false,
          // allowHorizontalScroll: false,
          draggingTool: new SnappingTool(),
        });

    // const changeCharge = (e, node) => {
    //   e.diagram.commit(function(diag) {
    //     var nodeData = node.tb
    //     myDiagram.model.removeNodeData(nodeData)
    //     var charge = nodeData['charge']
    //     var elementType;

    //     if(charge === 0){
    //       charge = 1
    //       elementType = 'ion'
    //     } else if (charge === 1) {
    //       charge = -1
    //       elementType = 'ion'
    //     } else {
    //       charge = 0
    //       elementType = 'element'
    //     }

    //     var newNodeData = {...nodeData, charge: charge, elementType: elementType}
    //     myDiagram.model.addNodeData(newNodeData)
    //   })
    // }

    var nodeMap = new go.Map();
    // Generic node template for both cations and organic structure to be inherited/copied
    var elementTemplate =
      $(go.Node, "Spot",
        {
          locationObjectName: "SHAPE",
          locationSpot: go.Spot.Center,
          minSize: new go.Size(60, 60),
          itemTemplate:
          // each port is a Circle whose alignment spot and port ID are given by the item data
            $(go.Panel,
              new go.Binding("portId", "id"),
              new go.Binding("alignment", "spot", go.Spot.parse),
              $(go.Shape, "Circle",
                { width: 3, height: 3, fill: 'transparent', stroke: null },
                new go.Binding('fill', 'fill')
                ),
            ),
          linkConnected: function(node, link, port) {
            var ports = node.ports

            if (link.category === "ionic"){
              myDiagram.startTransaction();
              while(ports.next()){
                var curr = ports.value.data
                myDiagram.model.set(curr, 'nodeLinked', true)
              }
              myDiagram.model.set(node.data, 'ionicBonded', true)
              myDiagram.commitTransaction()
            }
          },
          linkDisconnected: function(node, link, port) {
            var ports = node.ports

            if (link.category === "ionic"){
              myDiagram.startTransaction();
              while(ports.next()){
                var curr = ports.value.data
                myDiagram.model.set(curr, 'nodeLinked', false)
              }
              myDiagram.model.set(node.data, 'ionicBonded', false)
              myDiagram.commitTransaction()
            }
          },
        },
        new go.Binding("itemArray", "ports"),
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Panel, 'Spot',
          $(go.TextBlock,
            {
              textAlign: "center",
              editable: true, 
              isMultiline: false,
              verticalAlignment: go.Spot.Center,
              font: "50px Fira Sans, sans-serif",
              textValidation: validElement,
            },
            // this Binding is TwoWay due to the user editing the text with the TextEditingTool
            new go.Binding("text").makeTwoWay()),
          $(go.Shape,
            {
              height: 12,
              width: 12,
              alignment: new go.Spot(0.9, 0),
              figure: 'PlusLine',
              stroke: 'black',
              strokeWidth: 1.5,
            },
            // new go.Binding("background", "isSelected", function(s) { return s ? "#00FFFF" : "transparent"; }).ofObject(),
            new go.Binding('figure', '', function(node){
              if(node.charge === 1){
                return node.ionicBonded === true ? 'ConnectedCation' : 'PlusLine'
              } else {
                return node.ionicBonded === true ? 'ConnectedAnion' : 'MinusLine'
              }
              }).makeTwoWay(),
            new go.Binding("stroke", "charge", function(c) { return c === 0 ? 'transparent' : 'black'; })
        )
        )
      );

    // Allowing for copying
    elementTemplate.data = {};
    elementTemplate.data = null;

    var cationTemplate = elementTemplate.copy()
    nodeMap.add('cation', cationTemplate);

    var organicTemplate = elementTemplate.copy()
    nodeMap.add('organic', organicTemplate);
    
    myDiagram.nodeTemplateMap = nodeMap

    // Node selection adornment for organic element template ONLY
    // Include four large triangular buttons so that the user can easily make a copy
    // of the node, move it to be in that direction relative to the original node,
    // and add a link to the new node.
    const makeArrowButton = (spot, fig, direction) => {
      var maker = function(e, shape) {
          e.handled = true;
          e.diagram.model.commit(function(m) {
            var selnode = shape.part.adornedPart;

            // create a new node in the direction of the spot
            var p = new go.Point().setRectSpot(selnode.actualBounds, spot);
            
            p.subtract(selnode.location);
            p.scale(2, 2);
            p.x += Math.sign(p.x) * 90;
            p.y += Math.sign(p.y) * 90;
            p.add(selnode.location);
            var nearbyElements = myDiagram.findObjectAt(p)
            var scaling = 1;

            while(nearbyElements != null){
              var initialX = p.x
              var initialY = p.y
              if(direction === 'up' || direction === 'down'){
                if(p.x === 0){
                  p.x = 90
                } else {
                  var first = p.x + Math.sign(p.x) * (90*scaling);
                  var second = p.x - Math.sign(p.x) * (90*scaling);
                  p.x = first
                  if(myDiagram.findObjectAt(p) === null){
                    break
                  }

                  p.x = second
                  if(myDiagram.findObjectAt(p) === null){
                    break
                  }

                  p.x = initialX
                  scaling += 1
                }
              } else {
                if(p.y === 0){
                  p.y = 90
                } else {
                  var first = p.y + Math.sign(p.y) * (90*scaling);
                  var second = p.y - Math.sign(p.y) * (90*scaling);
                  p.y = first
                  if(myDiagram.findObjectAt(p) === null){
                    break
                  }

                  p.y = second
                  if(myDiagram.findObjectAt(p) === null){
                    break
                  }

                  p.y = initialY
                  scaling += 1
                }
              }
              nearbyElements = myDiagram.findObjectAt(p)
            }

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
            myDiagram.zoomToFit()
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
          width: (spot.equals(go.Spot.Top) || spot.equals(go.Spot.Bottom)) ? 54 : 27,
          height: (spot.equals(go.Spot.Top) || spot.equals(go.Spot.Bottom)) ? 27 : 54,
          fill: "orange", 
          strokeWidth: 0,
          isActionable: true,  // needed because it's in an Adornment
          click: maker
        },
        );
    }

    organicTemplate.selectionAdornmentTemplate =
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
                selectable: false
            },
        $(go.Shape, { isPanelMain: true, strokeWidth: 3, stroke: "black" }),
    );

    var doubleBond = 
        $(go.Link,
            {
                click: changeBond,
                selectable: false
            },
        $(go.Shape, { isPanelMain: true, strokeWidth: 12, stroke: "black" }),
        $(go.Shape, { isPanelMain: true, strokeWidth: 6, stroke: "white" }),
    );

    var tripleBond = 
        $(go.Link,
            {
                click: changeBond,
                selectable: false
            },
        $(go.Shape, { isPanelMain: true, strokeWidth: 15, stroke: "black" }),
        $(go.Shape, { isPanelMain: true, strokeWidth: 9, stroke: "white" }),
        $(go.Shape, { isPanelMain: true, strokeWidth: 3, stroke: "black" })
    );
    
    var ionicBond = $(go.Link, { visible: false });

    var linkMap = new go.Map()
    linkMap.add('single', singleBond)
    linkMap.add('double', doubleBond)
    linkMap.add('triple', tripleBond)
    linkMap.add('ionic', ionicBond)
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
        category: 'organic',
        elementType: 'element',
        text: "C",
        charge: 0,
        ports: [
          { id: "left", type: 'organic', spot: "0 0.5", nodeLinked: false },
          { id: "right", type: 'organic', spot: "1 0.5", nodeLinked: false },
        ],
        ionicBonded: false,
      },
    ]

    setCompound('2-methylbutane')
}

// Ends TextEditingTool when clicking out of myDiagram
document.addEventListener("mousedown", function() {
  if(myDiagram.currentTool instanceof go.TextEditingTool){
    myDiagram.currentTool.acceptText(go.TextEditingTool.LostFocus);

    // Checking whether text is accepted
    // console.log(myDiagram.currentTool.state.va)
  }
});





// Helper functions
const logData = () => {
  console.log('Data')
  console.log(myDiagram.model.nodeDataArray)
  console.log('Links')
  console.log(myDiagram.model.linkDataArray)
}

const addIon = () => {
  myDiagram.startTransaction()
  const cation = { 
    category: 'cation',
    elementType: 'ion',
    text: "ion",
    charge: 1, 
    ports: [
      { id: "left", type: 'inorganic', spot: "0 0.5", nodeLinked: false },
      { id: "right", type:'inorganic', spot: "1 0.5", nodeLinked: false },
    ],
    ionicBonded: false
  }
  myDiagram.model.addNodeData(cation)
  myDiagram.commitTransaction('added cation')
}

var selected = null;
const deleteElement = () => {
    selected = myDiagram.selection.first() !== null ? myDiagram.selection.first().tb : null
    if(selected === null || selected.key === -1 ){ return }
    var node = myDiagram.findNodeForKey(selected.key);
    if (node !== null) {
      myDiagram.startTransaction();
      myDiagram.remove(node);
      myDiagram.commitTransaction("deleted node");
    }
}

const setCompound = (x) => {
  compound = x
  // Update diagram data
  myDiagram.startTransaction()
  myDiagram.model.nodeDataArray = []
  myDiagram.model.linkDataArray = []
  // set initial C
  myDiagram.model.nodeDataArray = [
    {
      category: 'organic',
      elementType: 'element',
      text: "C",
      charge: 0,
      ports: [
        { id: "left", type: 'organic', spot: "0 0.5", nodeLinked: false },
        { id: "right", type: 'organic', spot: "1 0.5", nodeLinked: false },
      ],
      ionicBonded: false,
    },
  ]
  myDiagram.commitTransaction()

  // Update covers
  covers = document.getElementsByClassName('compoundName')
  for(let i of covers){
    i.innerText = x
  }

  // Update result string
  updateResult('Check answer to see your results.')
}

const updateResult = (result) => {
  document.getElementById('results').innerText = result
  if(result === 'Your answer is correct.'){
    document.getElementById('results').style.color = 'green'
  } else if(result === 'Check answer to see your results.') {
    document.getElementById('results').style.color = 'black'
  } else {
    document.getElementById('results').style.color = 'red'
  }
}

const changeCharge = () => {
    selected = myDiagram.selection.first() !== null ? myDiagram.selection.first().tb : null
    if(selected === null){ return }
    var node = myDiagram.findNodeForKey(selected.key);
    if (node !== null) {
      var nodeData = node.data
      myDiagram.startTransaction();
      var charge = nodeData['charge']
      var elementType;

      if(charge === 0){
        charge = 1
        elementType = 'ion'
      } else if (charge === 1) {
        charge = -1
        elementType = 'ion'
      } else {
        charge = 0
        elementType = 'element'
      }

      myDiagram.model.setDataProperty(nodeData, 'charge', charge)
      myDiagram.model.setDataProperty(nodeData, 'elementType', elementType)
      myDiagram.commitTransaction();
    }
}





// Checking functions

var compound = '2-methylbutane'

const answers = {
  // Alkanes
  '2-methylbutane': {
    numElements: 17,
    data: [
      {
        carbonIndex: 0, 
        charge: 0,
        bondedTo: [
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
        ],
      },
      {
        carbonIndex: 1, 
        charge: 0,
        bondedTo: [
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'C', bondType: 'single', charge: 0, isMainChain: false, recurseInto: true,
            bondedTo: [
              {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
              {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
              {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
              {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
            ]
          },
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
        ],
      },
      {
        carbonIndex: 2, 
        charge: 0,
        bondedTo: [
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
        ],
      },
      {
        carbonIndex: 3, 
        charge: 0,
        bondedTo: [
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
        ],
      },
    ]
  },

  '1-chloro-2-methylpropane': {
    numElements: 14,
    data: [
      {
        carbonIndex: 0,
        charge: 0,
        bondedTo: [
          {element: 'Cl', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
        ]
      },
      {
        carbonIndex: 1,
        charge: 0,
        bondedTo: [
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'C', bondType: 'single', charge: 0, isMainChain: false, recurseInto: true,
            bondedTo: [
              {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
              {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
              {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
              {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
            ]
          },
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
        ]
      },
      {
        carbonIndex: 2,
        charge: 0,
        bondedTo: [
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
        ]
      },
    ]
  },

  // Alkenes
  '1,2-dichloroethene': {
    "numElements":6,
    "data":[
      {
        "carbonIndex":0,
        "charge":0,
        "bondedTo":[
          {"element":"C","bondType":"double","charge":0,"isMainChain":true,"recurseInto":false},
          {"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},
          {"element":"Cl","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}
        ]
      },
      {
        "carbonIndex":1,
        "charge":0,
        "bondedTo":[
          {"element":"C","bondType":"double","charge":0,"isMainChain":true,"recurseInto":false},
          {"element":"Cl","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},
          {"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}
        ]
      }
    ]
  },

  'Butadiene': {
      "numElements":10,
      "data":[
        {
          "carbonIndex":0,
          "charge":0,
          "bondedTo":[
            {"element":"C","bondType":"double","charge":0,"isMainChain":true,"recurseInto":false},
            {"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},
            {"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}
          ]
        },
        {
          "carbonIndex":1,
          "charge":0,
          "bondedTo":[
            {"element":"C","bondType":"double","charge":0,"isMainChain":true,"recurseInto":false},
            {"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},
            {"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}
          ]
        },
      {
        "carbonIndex":2,
        "charge":0,
        "bondedTo":[
          {"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},
          {"element":"C","bondType":"double","charge":0,"isMainChain":true,"recurseInto":false},
          {"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}
        ]
      },
      {
        "carbonIndex":3,
        "charge":0,
        "bondedTo":[
          {"element":"C","bondType":"double","charge":0,"isMainChain":true,"recurseInto":false},
          {"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},
          {"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}
        ]
      }
    ]
  },

  // Alcohols
  'Ethenol': {"numElements":7,"data":[{"carbonIndex":0,"charge":0,"bondedTo":[{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"C","bondType":"double","charge":0,"isMainChain":true,"recurseInto":false}]},{"carbonIndex":1,"charge":0,"bondedTo":[{"element":"O","bondType":"single","charge":0,"isLeaf":false,"recurseInto":true,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}]},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"C","bondType":"double","charge":0,"isMainChain":true,"recurseInto":false}]}]},

  '1,3-propanediol': {"numElements":13,"data":[{"carbonIndex":0,"charge":0,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"O","bondType":"single","charge":0,"isLeaf":false,"recurseInto":true,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}]}]},{"carbonIndex":1,"charge":0,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false}]},{"carbonIndex":2,"charge":0,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"O","bondType":"single","charge":0,"isLeaf":false,"recurseInto":true,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}]},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}]}]},

  // Carboxylic acids
  'Ethanoic acid': {
    numElements: 8,
    data: [
      {
        carbonIndex: 0, 
        charge: 0,
        bondedTo: [
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
        ],
      },
      {
        carbonIndex: 1,
        charge: 0,
        bondedTo: [
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
          {element: 'O', bondType: 'double', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'O', bondType: 'single', charge: 0, isLeaf: false, recurseInto: true,
            bondedTo: [
              {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
              {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false}
            ]
          },
        ]
      }
    ],
  },

  '2-chloroprop-2-enoic acid': {"numElements":9,"data":[{"carbonIndex":0,"charge":0,"bondedTo":[{"element":"C","bondType":"double","charge":0,"isMainChain":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}]},{"carbonIndex":1,"charge":0,"bondedTo":[{"element":"C","bondType":"double","charge":0,"isMainChain":true,"recurseInto":false},{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"Cl","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}]},{"carbonIndex":2,"charge":0,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"O","bondType":"single","charge":0,"isLeaf":false,"recurseInto":true,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}]},{"element":"O","bondType":"double","charge":0,"isLeaf":true,"recurseInto":false}]}]},

  // Esters
  'Ethyl ethanoate': {
    numElements: 14,
    data: [
      {
        carbonIndex: 0,
        charge: 0,
        bondedTo: [
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
        ]
      },
      {
        carbonIndex: 1,
        charge: 0,
        bondedTo: [
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
          {element: 'O', bondType: 'double', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'O', bondType: 'single', charge: 0, isLeaf: false, recurseInto: true,
            bondedTo: [
              {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
              {element: 'C', bondType: 'single', charge: 0, isMainChain: false, recurseInto: true,
                bondedTo: [
                  {element: 'O', bondType: 'single', charge: 0, isLeaf: false, recurseInto: false},
                  {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
                  {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
                  {element: 'C', bondType: 'single', charge: 0, isMainChain: false, recurseInto: true,
                    bondedTo: [
                      {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
                      {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
                      {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
                      {element: 'C', bondType: 'single', charge: 0, isMainChain: false, recurseInto: false},
                    ]
                  },
                ]
              },
            ]
          },
        ]
      },
    ]
  },

  'Prop-1-en-2-yl acetate': {"numElements":15,"data":[{"carbonIndex":0,"charge":0,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}]},{"carbonIndex":1,"charge":0,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"C","bondType":"double","charge":0,"isMainChain":true,"recurseInto":false},{"element":"O","bondType":"single","charge":0,"isLeaf":false,"recurseInto":true,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"C","bondType":"single","charge":0,"isMainChain":false,"recurseInto":true,"bondedTo":[{"element":"O","bondType":"single","charge":0,"isLeaf":false,"recurseInto":false},{"element":"O","bondType":"double","charge":0,"isLeaf":true,"recurseInto":false},{"element":"C","bondType":"single","charge":0,"isMainChain":false,"recurseInto":true,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":false,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}]}]}]}]},{"carbonIndex":2,"charge":0,"bondedTo":[{"element":"C","bondType":"double","charge":0,"isMainChain":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}]}]},

  // Salts
  'Sodium ethanoate': {
    numElements: 8,
    data: [
      {
        carbonIndex: 0,
        charge: 0,
        bondedTo: [
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'H', bondType: 'single', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
        ]
      },
      {
        carbonIndex: 1,
        charge: 0,
        bondedTo: [
          {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
          {element: 'O', bondType: 'double', charge: 0, isLeaf: true, recurseInto: false},
          {element: 'O', bondType: 'single', charge: -1, isLeaf: false, recurseInto: true,
            bondedTo: [
              {element: 'C', bondType: 'single', charge: 0, isMainChain: true, recurseInto: false},
              {element: 'Na', bondType: 'ionic', charge: 1, isLeaf: true, recurseInto: false},
            ]
          },
        ]
      },
    ]
  },

  'Sodium 2-hydroxyacetate': {"numElements":9,"data":[{"carbonIndex":0,"charge":0,"bondedTo":[{"element":"O","bondType":"double","charge":0,"isLeaf":true,"recurseInto":false},{"element":"O","bondType":"single","charge":-1,"isLeaf":false,"recurseInto":true,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"Na","bondType":"ionic","charge":1,"isLeaf":true,"recurseInto":false}]},{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false}]},{"carbonIndex":1,"charge":0,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false},{"element":"O","bondType":"single","charge":0,"isLeaf":false,"recurseInto":true,"bondedTo":[{"element":"C","bondType":"single","charge":0,"isMainChain":true,"recurseInto":false},{"element":"H","bondType":"single","charge":0,"isLeaf":true,"recurseInto":false}]}]}]},

}

const parseNodeData = () => {
  var carbonKeys = []       // list of keys of all carbons
  var carbonProfile = {}    // Maps carbon to linked carbons
  var nodeProfile = {}      // Maps each node to linked nodes
  var elementNameMap = {}   // Maps keys to element names
  var chargeMap = {}        // Maps keys to element charges

  for(let element of myDiagram.model.nodeDataArray){
    nodeProfile[element.key] = []
    elementNameMap[element.key] = element.text
    chargeMap[element.key] = element.charge
    if(element.text === 'C'){
      carbonKeys.push(element.key)
      carbonProfile[element.key] = []
    }
  }
  return [carbonKeys, carbonProfile, nodeProfile, elementNameMap, chargeMap]
}

const parseLinkData = () => {
  var [carbonKeys, carbonProfile, nodeProfile, elementNameMap, chargeMap] = parseNodeData()
  var links = myDiagram.model.linkDataArray

  for(let link of links){
    nodeProfile[link.to].push([link.from, link.category])
    nodeProfile[link.from].push([link.to, link.category])

    if(carbonKeys.indexOf(link.to) !== -1 && carbonKeys.indexOf(link.from) !== -1){
      carbonProfile[link.to].push(link.from)
      carbonProfile[link.from].push(link.to)
    }
  }
  return [carbonKeys, carbonProfile, nodeProfile, elementNameMap, chargeMap]
}

const getCarbonLeafs = (carbonProfile) => {
  var carbonLeafs = [];
  
  if(Object.keys(carbonProfile).length === 1){
    return -1
  }
  for (let c in carbonProfile){
    if (carbonProfile[c].length === 1){
      carbonLeafs.push(Number(c))
    }
  }
  return carbonLeafs
}

// TECHNICALLY, second and third cases are only present to improve efficiency but are not needed
// ... actually they don't really improve much either 
const getLongestCarbonChains = (parent, curr, path, carbonProfile) => {

  var branches = [ ...carbonProfile[curr]]
  
  // End leaf case
  if (branches[0] == parent && branches.length == 1) {
      return [path]
  } 

  // First leaf movement case
  else if (branches.indexOf(parent) == -1 && branches.length == 1) {
      // console.log('IM HERE')
      return getLongestCarbonChains(curr, branches[0], path.concat([branches[0]]), carbonProfile)
  }

  // C between 2 Cs case
  else if (branches.indexOf(parent) != -1 && branches.length == 2) {
      branches.splice(branches.indexOf(parent), 1)
      return getLongestCarbonChains(curr, branches[0], path.concat([branches[0]]), carbonProfile)
  } 
  
  // Branch case (>2 Cs bonded)
  else {
      var currLongestLength = 0
      for (let b of branches) {
          if (b != parent) {
              var tempPath = [b]
              var possiblePaths = getLongestCarbonChains(curr, b, tempPath, carbonProfile)
              // possiblePaths will be a list of longest paths -- an array of arrays
    
              if (possiblePaths[0].length > currLongestLength) {
                currLongestLength = possiblePaths[0].length
                if(possiblePaths.length === 1){
                    var longestPaths = []
                    longestPaths.push(possiblePaths[0])
                } else {
                    var longestPaths = []
                    for(let path of possiblePaths){
                        longestPaths.push(path)
                    }
                }
              } else if (possiblePaths[0].length == currLongestLength) {
                  if(possiblePaths.length === 1){
                      longestPaths.push(possiblePaths[0])
                  } else {
                      for(let path of possiblePaths){
                          longestPaths.push(path)
                      }
                  }
              }
          }
      }
      var finalPaths = []
      for(let longPath of longestPaths){
        finalPaths.push(path.concat(longPath))
      }
      return finalPaths
  }
}

// recursive function that checks a node's bonds by comparing it to the answer's list of correct ones
const check = (currNodeKey, ansCharge, ansBondedTo, longestCarbonChain, nodeProfile, elementNameMap, chargeMap) => {
  var ansBonds = [...ansBondedTo]
  var currNodeBonds = nodeProfile[currNodeKey]

  // checking for overall number of bonds 
  if(ansBonds.length !== currNodeBonds.length) { 
    // console.log('NUMBER OF BONDS TO THIS NODE IS WRONG')
    return false 
  }

  // check own charge
  if(chargeMap[currNodeKey] !== ansCharge){
    // console.log('THIS NODE HAS WRONG CHARGE')
    return false
  }

  // for each bond on this input node
  for(let bond of currNodeBonds){
    var elementName = elementNameMap[bond[0]]
    var bondType = bond[1]
    var elementCharge = chargeMap[bond[0]]
    var isLeaf = nodeProfile[bond[0]].length === 1 ? true : false
    var isLeaf = nodeProfile[bond[0]].length === 1 ? true : false

    // console.log('-------------------------------------------------')
    // console.log('elementName')
    // console.log(elementName)
    // console.log('elementCharge')
    // console.log(elementCharge)
    // console.log('bondType')
    // console.log(bondType)
    // console.log('isLeaf')
    // console.log(isLeaf)

    // look for matching answer bond
    var currBondCorrect = false;
    for (ansBond of ansBonds) {
      // get the index of this ans bond for later use 
      // (otherwise may be reassigned later in recursion which leads to incorrect deletion)
      var index = ansBonds.indexOf(ansBond)

      // If first few params are matching
      if (ansBond.element === elementName && ansBond.bondType === bondType && ansBond.charge == elementCharge){
        
        // if element is C
        if (elementName === 'C'){
          var isMainChain = longestCarbonChain.indexOf(bond[0]) != -1 ? true : false
          
          // If isMainChain value matches
          if (isMainChain === ansBond.isMainChain){

            // if C is not part of main chain and demands recursion, recurse into the chain
            if (!isMainChain && ansBond.recurseInto){
              var subChainCorrect = check(bond[0], ansBond.charge, [...ansBond.bondedTo], longestCarbonChain, nodeProfile, elementNameMap, chargeMap)

              // if the subchain is correct, congrats
              if (subChainCorrect){
                currBondCorrect = true
                ansBonds.splice(index, 1)
              }
            } 
            // if C is part of main chain, or isnt but does not require recursion
            else {
              currBondCorrect = true
              ansBonds.splice(index, 1)
            }
          }
        }
        // else if not C
        else {
          // if isLeaf value matches
          if (isLeaf === ansBond.isLeaf){
            
            // if this element is leaf
            if (!isLeaf && ansBond.recurseInto){
              var subChainCorrect = check(bond[0], ansBond.charge, [...ansBond.bondedTo], longestCarbonChain, nodeProfile, elementNameMap, chargeMap)
              
              // if the subchain is correct, congrats
              if (subChainCorrect){
                currBondCorrect = true
                ansBonds.splice(index, 1)
              }
            }
            // else if this element is not leaf, recurse into chain
            else {
              currBondCorrect = true
              ansBonds.splice(index, 1)
            }
          }
        }
      }

      // if this bond is already correct, no need to compare with other ansBonds
      if(currBondCorrect) { 
        // console.log('THIS BOND IS CORRECT')
        break 
      }
    }

    // if this bond matches none of the ansBonds, it is wrong
    if(!currBondCorrect) { 
      // console.log('THIS BOND HAS NO MATCHES')
      break 
    }
  }

  // if currBondCorrect and no more correct bonds to clear, return true
  if(currBondCorrect && ansBonds.length === 0){
    return true
  } 
  // there are missing correct bonds
  else { 
    // console.log('THERE ARE MISSING CORRECT BONDS')
    return false 
  }

}

const markingProcess = () => {
  const nodeDataArray = myDiagram.model.nodeDataArray
  const linkDataArray = myDiagram.model.linkDataArray

  if (nodeDataArray.length !== answers[compound].numElements){
    updateResult('Wrong total number of elements.')
    return false
  }
  
  var [carbonKeys, carbonProfile, nodeProfile, elementNameMap, chargeMap] = parseLinkData()
  var carbonLeafs = getCarbonLeafs(carbonProfile)

  if (carbonKeys.length === 1){
    var longestCarbonChains = [carbonKeys]
  } else if (carbonKeys.length === 0) {
    updateResult('Lacking a carbon chain')
    return false
  } else { 
    var longest = 0;
    var longestCarbonChains;
    for(let c of carbonLeafs){
      var tempChains = getLongestCarbonChains('', c, [c], carbonProfile)
      if(tempChains[0].length > longest){
        longest = tempChains[0].length
        longestCarbonChains = tempChains
      }
    }
  }

  const ans = answers[compound].data
  const reverseAns = [...ans].reverse()
  if(longestCarbonChains[0].length != ans.length){
    updateResult('Length of your longest carbon chain is wrong.')
    return false 
  }
  var overallCheck = 0;
  for(let longestCarbonChain of longestCarbonChains){
    // check first way
    // console.log('first check')
    for(let i = 0; i < longestCarbonChain.length; i++){
      var checkThisNode = check(longestCarbonChain[i], ans[i].charge, ans[i].bondedTo, longestCarbonChain, nodeProfile, elementNameMap, chargeMap)
      if(!checkThisNode) {
        overallCheck++
        break 
      }
    }
    // check reverse order
    // console.log('second check')
    for(let i = 0; i < longestCarbonChain.length; i++){
      var checkThisNode = check(longestCarbonChain[i], reverseAns[i].charge, reverseAns[i].bondedTo, longestCarbonChain, nodeProfile, elementNameMap, chargeMap)
      if(!checkThisNode) {
        overallCheck++
        break 
      }
    }
  }

  if (overallCheck === longestCarbonChains.length*2){
    updateResult('Your answer is wrong.')
    return false
  } else {
    updateResult('Your answer is correct.')
    return true
  } 

}





// Answer generation

const scan = (currNodeKey, parentKey, longestCarbonChain, nodeProfile, elementNameMap, chargeMap) => {
  var nodeData = {}

  // Main carbon chain
  if(elementNameMap[currNodeKey] === 'C' && longestCarbonChain.indexOf(currNodeKey) !== -1){
    nodeData['carbonIndex'] = longestCarbonChain.indexOf(currNodeKey)
    nodeData['charge'] = chargeMap[currNodeKey]
    
    // Obtain data for each bonded node
    var bondedTo = []
    for(let bond of nodeProfile[currNodeKey]){
      var element = elementNameMap[bond[0]]
      var bondType = bond[1]
      var charge = chargeMap[bond[0]]
      var isMainChain = null;
      var isLeaf = null;

      // If C, get isMainChain, else isLeaf
      if(element === 'C'){
        var isMainChain = longestCarbonChain.indexOf(bond[0]) != -1 ? true : false
      } else {
        var isLeaf = nodeProfile[bond[0]].length === 1 ? true : false
      }

      // Decide whether to recurse into
      if(isMainChain === false || isLeaf === false){
        var recurseInto = true
        var childBondedTo = scan(bond[0], currNodeKey, longestCarbonChain, nodeProfile, elementNameMap, chargeMap)

        if(isMainChain !== null){
          bondedTo.push({element: element, bondType: bondType, charge: charge, isMainChain: isMainChain, recurseInto: recurseInto, bondedTo: childBondedTo})
        } else {
          bondedTo.push({element: element, bondType: bondType, charge: charge, isLeaf: isLeaf, recurseInto: recurseInto, bondedTo: childBondedTo})
        }
      } else if(isMainChain === true) {
        var recurseInto = false
        bondedTo.push({element: element, bondType: bondType, charge: charge, isMainChain: isMainChain, recurseInto: recurseInto})
      } else {
        var recurseInto = false
        bondedTo.push({element: element, bondType: bondType, charge: charge, isLeaf: isLeaf, recurseInto: recurseInto})
      }
    }
    nodeData['bondedTo'] = bondedTo
    return nodeData
  }

  // Side chain recursive solution
  else {
    var bondedTo = []
    for(let bond of nodeProfile[currNodeKey]){
      var element = elementNameMap[bond[0]]
      var bondType = bond[1]
      var charge = chargeMap[bond[0]]
      var isMainChain = null;
      var isLeaf = null;

      // If C, get isMainChain, else isLeaf
      if(element === 'C'){
        var isMainChain = longestCarbonChain.indexOf(bond[0]) != -1 ? true : false
      } else {
        var isLeaf = nodeProfile[bond[0]].length === 1 ? true : false
      }

      // Decide whether to recurse into
      if((isMainChain === false || isLeaf === false) && bond[0] != parentKey){
        var recurseInto = true
        var childBondedTo = scan(bond[0], currNodeKey, longestCarbonChain, nodeProfile, elementNameMap, chargeMap)

        if(isMainChain !== null){
          bondedTo.push({element: element, bondType: bondType, charge: charge, isMainChain: isMainChain, recurseInto: recurseInto, bondedTo: childBondedTo})
        } else {
          bondedTo.push({element: element, bondType: bondType, charge: charge, isLeaf: isLeaf, recurseInto: recurseInto, bondedTo: childBondedTo})
        }
      } else if(isMainChain !== null) {
        var recurseInto = false
        bondedTo.push({element: element, bondType: bondType, charge: charge, isMainChain: isMainChain, recurseInto: recurseInto})
      } else {
        var recurseInto = false
        bondedTo.push({element: element, bondType: bondType, charge: charge, isLeaf: isLeaf, recurseInto: recurseInto})
      }
    }

    return bondedTo
  }
}

const generateAnswer = () => {
  const nodeDataArray = myDiagram.model.nodeDataArray
  const numElements = nodeDataArray.length

  var [carbonKeys, carbonProfile, nodeProfile, elementNameMap, chargeMap] = parseLinkData()
  var carbonLeafs = getCarbonLeafs(carbonProfile)

  if (carbonKeys.length === 1){
    var longestCarbonChains = [carbonKeys]
  } else if (carbonKeys.length === 0) {
    console.log('Lacking a carbon chain')
    return false
  } else { 
    var longest = 0;
    var longestCarbonChains;
    for(let c of carbonLeafs){
      var tempChains = getLongestCarbonChains('', c, [c], carbonProfile)
      if(tempChains[0].length > longest){
        longest = tempChains[0].length
        longestCarbonChains = tempChains
      }
    }
  }
  
  var data = []
  var longestCarbonChain = longestCarbonChains[0]
  for(let carbon of longestCarbonChain){
    data.push(scan(carbon, null, longestCarbonChain, nodeProfile, elementNameMap, chargeMap))
  }

  var finalAns = {numElements: numElements, data: data}
  document.getElementById('generatedAnswer').innerText = JSON.stringify(finalAns)
}








// Custom DraggingTool
function SnappingTool() {
  go.DraggingTool.call(this);
}
go.Diagram.inherit(SnappingTool, go.DraggingTool);

// This predicate checks to see if the ports can snap together.
SnappingTool.prototype.compatiblePorts = function(p1, p2) {
  // already connected?
  var part1 = p1.part;
  var id1 = p1.portId;
  var nodeLinked1 = p1.data.nodeLinked;
  if (id1 === null || id1 === "" || nodeLinked1 === true ) return false;
  if (part1.findLinksConnected(id1).filter(function(l) { return l.category === ""; }).count > 0) return false;
  
  var part2 = p2.part;
  var id2 = p2.portId;
  var nodeLinked2 = p2.data.nodeLinked;
  if (id2 === null || id2 === "" || nodeLinked2 === true ) return false;
  if (part2.findLinksConnected(id2).filter(function(l) { return l.category === ""; }).count > 0) return false;
  
  var type1 = p1.data.type;
  var type2 = p2.data.type;
  if ((type1 === 'organic' && type2 === 'organic') || (type1 === 'inorganic' && type2 === 'inorganic')) { return false }
  if ((id1 === 'left' && id2 === 'left') || (id1 === 'right' && id2 === 'right')) { return false }
  
  return true
};

// Override this method to find the offset such that a moving port can
// be snapped to be coincident with a compatible stationary port,
// then move all of the parts by that offset.
SnappingTool.prototype.moveParts = function(parts, offset, check) {
  // when moving an actually copied collection of Parts, use the offset that was calculated during the drag
  if (this._snapOffset && this.isActive && this.diagram.lastInput.up && parts === this.copiedParts) {
    go.DraggingTool.prototype.moveParts.call(this, parts, this._snapOffset, check);
    this._snapOffset = undefined;
    return;
  }

  var commonOffset = offset;

  // find out if any snapping is desired for any Node being dragged
  var sit = parts.iterator;
  while (sit.next()) {
    var node = sit.key;
    if (!(node instanceof go.Node)) continue;
    var info = sit.value;
    var newloc = info.point.copy().add(offset);

    // now calculate snap point for this Node
    var snapoffset = newloc.copy().subtract(node.location);
    var nearbyports = null;
    var closestDistance = 20 * 20;  // don't bother taking sqrt
    var closestPort = null;
    var closestPortPt = null;
    var nodePort = null;
    var mit = node.ports;
    while (mit.next()) {
      var port = mit.value;
      if (node.findLinksConnected(port.portId).filter(function(l) { return l.category === ""; }).count > 0) continue;
      var portPt = port.getDocumentPoint(go.Spot.Center);
      portPt.add(snapoffset);  // where it would be without snapping

      if (nearbyports === null) {
        // this collects the Nodes that intersect with the NODE's bounds,
        // excluding nodes that are being dragged (i.e. in the PARTS collection)
        var nearbyparts = this.diagram.findObjectsIn(node.actualBounds,
          function(x) { return x.part; },
          function(p) { return !parts.has(p); },
          true);

        // gather a collection of GraphObjects that are stationary "ports" for this NODE
        nearbyports = new go.Set(/*go.GraphObject*/);
        nearbyparts.each(function(n) {
          if (n instanceof go.Node) {
            nearbyports.addAll(n.ports);
          }
        });
      }

      var pit = nearbyports.iterator;
      while (pit.next()) {
        var p = pit.value;
        if (!this.compatiblePorts(port, p)) continue;
        var ppt = p.getDocumentPoint(go.Spot.Center);
        var d = ppt.distanceSquaredPoint(portPt);
        if (d < closestDistance) {
          closestDistance = d;
          closestPort = p;
          closestPortPt = ppt;
          nodePort = port;
        }
      }
    }

    // found something to snap to!
    if (closestPort !== null) {
      // move the node so that the compatible ports coincide
      var noderelpt = nodePort.getDocumentPoint(go.Spot.Center).subtract(node.location);
      var snappt = closestPortPt.copy().subtract(noderelpt);
      // save the offset, to ensure everything moves together
      commonOffset = snappt.subtract(newloc).add(offset);
      // ignore any node.dragComputation function
      // ignore any node.minLocation and node.maxLocation
      break;
    }
  }

  // now do the standard movement with the single (perhaps snapped) offset
  this._snapOffset = commonOffset.copy();  // remember for mouse-up when copying
  go.DraggingTool.prototype.moveParts.call(this, parts, commonOffset, check);
};

// Establish links between snapped ports,
// and remove obsolete links because their ports are no longer coincident.
SnappingTool.prototype.doDropOnto = function(pt, obj) {
  go.DraggingTool.prototype.doDropOnto.call(this, pt, obj);
  var tool = this;
  // Need to iterate over all of the dropped nodes to see which ports happen to be snapped to stationary ports
  var coll = this.copiedParts || this.draggedParts;
  var it = coll.iterator;
  while (it.next()) {
    var node = it.key;
    if (!(node instanceof go.Node)) continue;
    // connect all snapped ports of this NODE (yes, there might be more than one) with links
    var pit = node.ports;
    while (pit.next()) {
      var port = pit.value;
      // maybe add a link -- see if the port is at another port that is compatible
      var portPt = port.getDocumentPoint(go.Spot.Center);
      if (!portPt.isReal()) continue;
      var nearbyports =
        this.diagram.findObjectsAt(portPt,
          function(x) {  // some GraphObject at portPt
            var o = x;
            // walk up the chain of panels
            while (o !== null && o.portId === null) o = o.panel;
            return o;
          },
          function(p) {  // a "port" Panel
            // the parent Node must not be in the dragged collection, and
            // this port P must be compatible with the NODE's PORT
            if (coll.has(p.part)) return false;
            var ppt = p.getDocumentPoint(go.Spot.Center);
            if (portPt.distanceSquaredPoint(ppt) >= 0.25) return false;
            return tool.compatiblePorts(port, p);
          });
      // did we find a compatible port?
      var np = nearbyports.first();
      if (np !== null) {
        // connect the NODE's PORT with the other port found at the same point
        var link = { category: 'ionic', bondCount: 1, from: node.key, to: np.part.key}
        myDiagram.model.addLinkData(link)
      }
    }
  }
};

// Just move selected nodes when SHIFT moving, causing nodes to be unsnapped.
// When SHIFTing, must disconnect all links that connect with nodes not being dragged.
// Without SHIFT, move all nodes that are snapped to selected nodes, even indirectly.
SnappingTool.prototype.computeEffectiveCollection = function(parts) {
  myDiagram.startTransaction()
  if (this.diagram.lastInput.shift) {
    var links = new go.Set(/*go.Link*/);
    var coll = go.DraggingTool.prototype.computeEffectiveCollection.call(this, parts);
    coll.iteratorKeys.each(function(node) {
      // disconnect all links of this node that connect with stationary node
      if (!(node instanceof go.Node)) return;
      node.findLinksConnected().each(function(link) {
        if (link.category !== "ionic") return;
        // see if this link connects with a node that is being dragged
        var othernode = link.getOtherNode(node);
        if (othernode !== null && !coll.has(othernode)) {
          links.add(link);  // remember for later deletion
        }
      });
    });
    // outside of nested loops we can actually delete the links
    links.each(function(l) { l.diagram.remove(l); });
    myDiagram.commitTransaction()
    return coll;
  } else {
    var map = new go.Map(/*go.Part, Object*/);
    if (parts === null) return map;
    var tool = this;
    parts.iterator.each(function(n) {
      tool.gatherConnecteds(map, n);
    });
    myDiagram.commitTransaction()
    return map;
  }
};

// Find other attached nodes.
SnappingTool.prototype.gatherConnecteds = function(map, node) {
  if (!(node instanceof go.Node)) return;
  if (map.has(node)) return;
  // record the original Node location, for relative positioning and for cancellation
  map.add(node, new go.DraggingInfo(node.location));
  // now recursively collect all connected Nodes and the Links to them
  var tool = this;
  node.findLinksConnected().each(function(link) {
    if (link.category !== "ionic") return;  // ignore comment links
    map.add(link, new go.DraggingInfo());
    tool.gatherConnecteds(map, link.getOtherNode(node));
  });
};