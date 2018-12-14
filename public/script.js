var app;

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/widgets/Search",
  "esri/widgets/Popup",
  "esri/core/watchUtils",
  "dojo/query",
  "dojo/on",
  "dojo/dom",
  "esri/layers/FeatureLayer",
  "esri/renderers/UniqueValueRenderer",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/widgets/Legend",
  "esri/widgets/Print",

  // Bootstrap
  "bootstrap/Collapse",
  "bootstrap/Dropdown",
  "bootstrap/Tab",
  "bootstrap/Modal",
  "bootstrap/Carousel",
  "bootstrap/Tooltip",

  // Calcite Maps
  "calcite-maps/calcitemaps-v0.3",
  "dojo/domReady!"
], function(
  Map,
  MapView,
  Search,
  Popup,
  watchUtils,
  query,
  on,
  dom,
  FeatureLayer,
  UniqueValueRenderer,
  SimpleMarkerSymbol,
  SimpleLineSymbol,
  SimpleFillSymbol,
  Legend,
  Print
) {
  /******************************************************************
   *
   * App settings
   *
   ******************************************************************/

  app = {
    center: [-104.99, 39.73],
    scale: 1000000,
    basemap: "streets-navigation-vector",
    viewPadding: {
      top: 50,
      bottom: 0
    },
    uiComponents: ["zoom", "attribution"],
    dockOptions: {
      position: "auto",
      // Custom docking breakpoints
      breakpoint: {
        width: 768,
        height: 768
      }
    },
    mapView: null,
    activeView: null,
    searchWidget: null,
    screenWidth: 0
  };

  /******************************************************************
   *
   * Create the map and scene view and ui components
   *
   ******************************************************************/

  // Map
  var map = new Map({
    basemap: app.basemap
  });

  app.mapView = new MapView({
    container: "mapViewDiv",
    map: map,
    center: app.center,
    scale: app.scale,
    padding: app.viewPadding,
    popup: {
      dockEnabled: false,
      dockOptions: {
        buttonEnabled: false,
        breakpoint: false
      }
    },
    ui: {
      components: app.uiComponents
    }
  });

  // Set the active view to scene
  app.activeView = app.mapView;

  //disable map rotation
  app.mapView.constraints = {
    rotationEnabled: false
  };

  // Create the search widget and add it to the navbar instead of view
  app.searchWidget = new Search(
    {
      view: app.activeView
    },
    "searchWidgetDiv"
  );

  // Legend
  var legendWidget = new Legend({
    container: "legendDiv",
    view: app.mapView
  });

  app.mapView.then(function() {
    var print = new Print({
      container: "printDiv",
      view: app.mapView,
      // specify your own print service
      printServiceUrl:
        "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
    });
  });

  /******************************************************************
   *
   * Synchronize the view, search and popup
   *
   ******************************************************************/

  // Views - sync viewpoint and popup
  function syncViews(fromView, toView) {
    watchUtils.whenTrueOnce(toView, "ready").then(function(result) {
      watchUtils.whenTrueOnce(toView, "stationary").then(function(result) {
        toView.goTo(fromView.viewpoint);
        toView.popup.reposition();
      });
    });
  }

  // Search - sync search location and popup
  function syncSearch() {
    app.searchWidget.view = app.activeView;
    if (app.searchWidget.selectedResult) {
      app.searchWidget.search(app.searchWidget.selectedResult.name);
      app.activeView.popup.reposition();
    }
  }

  /******************************************************************
   *
   * Show and hide the panels and popup
   *
   ******************************************************************/

  // Views - Listen to view size changes to show/hide panels
  app.mapView.watch("size", viewSizeChange);

  function viewSizeChange(screenSize) {
    if (app.screenWidth !== screenSize[0]) {
      app.screenWidth = screenSize[0];
      setPanelVisibility();
    }
  }

  // Popups - Listen to popup changes to show/hide panels
  app.mapView.popup.watch(["visible", "currentDockPosition"], setPanelVisibility);

  // Panels - Show/hide the panel when popup is docked
  function setPanelVisibility() {
    var isMobileScreen = app.activeView.widthBreakpoint === "xsmall" || app.activeView.widthBreakpoint === "small",
      isDockedVisible = app.activeView.popup.visible && app.activeView.popup.currentDockPosition,
      isDockedBottom =
        app.activeView.popup.currentDockPosition && app.activeView.popup.currentDockPosition.indexOf("bottom") > -1,
      isDockedTop =
        app.activeView.popup.currentDockPosition && app.activeView.popup.currentDockPosition.indexOf("top") > -1;
    // Mobile (xsmall/small)
    if (isMobileScreen) {
      if (isDockedVisible && isDockedBottom) {
        query(".calcite-panels").addClass("invisible");
      } else {
        query(".calcite-panels").removeClass("invisible");
      }
    } else {
      // Desktop (medium+)
      if (isDockedVisible && isDockedTop) {
        query(".calcite-panels").addClass("invisible");
      } else {
        query(".calcite-panels").removeClass("invisible");
      }
    }
  }

  // Panels - Dock popup when panels show (desktop or mobile)
  query(".calcite-panels .panel").on("show.bs.collapse", function(e) {
    if (app.activeView.popup.currentDockPosition || app.activeView.widthBreakpoint === "xsmall") {
      app.activeView.popup.dockEnabled = false;
    }
  });

  // Panels - Undock popup when panels hide (mobile only)
  query(".calcite-panels .panel").on("hide.bs.collapse", function(e) {
    if (app.activeView.widthBreakpoint === "xsmall") {
      app.activeView.popup.dockEnabled = true;
    }
  });

  // Popup
  query(".esri-popup__header-title").on(
    "click",
    function(e) {
      query(".esri-popup__main-container").toggleClass("esri-popup-collapsed");
      app.activeView.popup.reposition();
    }.bind(this)
  );

  // Basemap events
  query("#selectBasemapPanel").on("change", function(e) {
    app.mapView.map.basemap = e.target.options[e.target.selectedIndex].dataset.vector;
  });

  // Set view padding for widgets based on navbar position
  function setViewPadding(layout) {
    var padding, uiPadding;
    // Top
    if (layout === "calcite-nav-top") {
      padding = {
        padding: {
          top: 50,
          bottom: 0
        }
      };
      uiPadding = {
        padding: {
          top: 15,
          right: 15,
          bottom: 30,
          left: 15
        }
      };
    } else {
      // Bottom
      padding = {
        padding: {
          top: 0,
          bottom: 50
        }
      };
      uiPadding = {
        padding: {
          top: 30,
          right: 15,
          bottom: 15,
          left: 15
        }
      };
    }
    app.mapView.set(padding);
    app.mapView.ui.set(uiPadding);

    // Reset popup
    if (app.activeView.popup.visible && app.activeView.popup.dockEnabled) {
      app.activeView.popup.visible = false;
      app.activeView.popup.visible = true;
    }
  }

  //setup fill for districts//

  var districtfill = new SimpleFillSymbol({
    style: "none",
    outline: {
      width: 3,
      color: "black"
    }
  });

  //setup fill for census tracts//

  var censusfill = new SimpleFillSymbol({
    style: "none",
    outline: {
      width: 1,
      color: "black"
    }
  });

  //renderer for districts//

  var districtrenderer = new UniqueValueRenderer({
    defaultSymbol: districtfill,
    legendOptions: {
      title: "Boundary Marker"
    }
  });

  //renderer for districts//

  var censusrenderer = new UniqueValueRenderer({
    defaultSymbol: censusfill
  });

  /******************************************************************
   *
   * Renderer for school performance plan
   *
   ******************************************************************/

  //setup symbol - standard symbol//
  var normal_symbol = new SimpleMarkerSymbol({
    style: "circle",
    color: "white",
    size: "12px" // pixels
  });

  //setup symbol - performance schools//
  var performsymbol = new SimpleMarkerSymbol({
    style: "circle",
    color: "green",
    size: "12px" // pixels
  });

  //setup symbol - performance schools//
  var improvsymbol = new SimpleMarkerSymbol({
    style: "circle",
    color: "yellow",
    size: "12px" // pixels
  });

  //setup symbol - priorityimprovement schools//
  var priorityimprovsymbol = new SimpleMarkerSymbol({
    style: "circle",
    color: "orange",
    size: "12px" // pixels
  });

  //setup symbol - turnaround schools//
  var turnaroundsymbol = new SimpleMarkerSymbol({
    style: "circle",
    color: "red",
    size: "12px" // pixels
  });

  var schoolsplanrenderer = new UniqueValueRenderer({
    defaultSymbol: normal_symbol,
    field: "F17_SPF_FINAL",
    legendOptions: {
      title: "SPF Plan - 2017-18 (Preliminary)"
    }
  });

  schoolsplanrenderer.addUniqueValueInfo("Performance", performsymbol);
  schoolsplanrenderer.addUniqueValueInfo("Improvement", improvsymbol);
  schoolsplanrenderer.addUniqueValueInfo("Priority Improvement", priorityimprovsymbol);
  schoolsplanrenderer.addUniqueValueInfo("Turnaround", turnaroundsymbol);

  /******************************************************************
   *
   * Renderer for district performance plan
   *
   ******************************************************************/

  //accreddited//
  var accredited = new SimpleFillSymbol({
    color: "green"
  });

  //turnaround//
  var turnaround = new SimpleFillSymbol({
    color: "red"
  });

  //improvement//
  var improvement = new SimpleFillSymbol({
    color: "yellow"
  });

  //improvement//
  var priorityimprovement = new SimpleFillSymbol({
    color: "orange"
  });

  //improvement//
  var distinction = new SimpleFillSymbol({
    color: "blue"
  });

  //improvement//
  var nodata = new SimpleFillSymbol({
    color: "white"
  });

  var districtplanrenderer = new UniqueValueRenderer({
    field: "DIST_PLAN",
    legendOptions: {
      title: "DPF Plan - 2017-18 (Preliminary)"
    }
  });

  districtplanrenderer.addUniqueValueInfo("Distinction", distinction);
  districtplanrenderer.addUniqueValueInfo("Accredited", accredited);
  districtplanrenderer.addUniqueValueInfo("Improvement", improvement);
  districtplanrenderer.addUniqueValueInfo("Priority Improvement", priorityimprovement);
  districtplanrenderer.addUniqueValueInfo("Turnaround", turnaround);
  districtplanrenderer.addUniqueValueInfo("Insufficient Data", nodata);

  /******************************************************************
   *
   * Renderer for school levels
   *
   ******************************************************************/

  //setup symbol - standard symbol//
  var elementarysymbol = new SimpleMarkerSymbol({
    style: "circle",
    color: "#6B949E",
    size: "12px" // pixels
  });

  //setup symbol - performance schools//
  var middlesymbol = new SimpleMarkerSymbol({
    style: "square",
    color: "#D46D6A",
    size: "12px" // pixels
  });

  //setup symbol - performance schools//
  var highsymbol = new SimpleMarkerSymbol({
    style: "diamond",
    color: "#D4B56A",
    size: "12px" // pixels
  });

  var schoolslevelrenderer = new UniqueValueRenderer({
    defaultSymbol: normal_symbol,
    field: "SCHOOL_LEVEL",
    legendOptions: {
      title: "Educational Level"
    }
  });

  schoolslevelrenderer.addUniqueValueInfo({ value: "E", symbol: elementarysymbol, label: "Elementary" });
  schoolslevelrenderer.addUniqueValueInfo({ value: "M", symbol: middlesymbol, label: "Middle" });
  schoolslevelrenderer.addUniqueValueInfo({ value: "H", symbol: highsymbol, label: "High" });

  /******************************************************************
   *
   * Renderer for school type
   *
   ******************************************************************/

  //setup symbol - charter schools//
  var chartersymbol = new SimpleMarkerSymbol({
    style: "square",
    color: "#43857C",
    size: "10px" // pixels
  });

  //setup symbol - TPS Schools//
  var traditionalsymbol = new SimpleMarkerSymbol({
    style: "circle",
    color: "#D4966A",
    size: "10px" // pixels
  });

  var schoolstyperenderer = new UniqueValueRenderer({
    defaultSymbol: normal_symbol,
    field: "CHARTER"
  });

  schoolstyperenderer.addUniqueValueInfo({ value: "Y", symbol: chartersymbol, label: "Charter" });
  schoolstyperenderer.addUniqueValueInfo({ value: "N", symbol: traditionalsymbol, label: "TPS" });

  /******************************************************************
   *
   * visual color/size variables for schools
   *
   ******************************************************************/

  var enrollSymbol = {
    type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
    color: "#0079C1",
    outline: {
      // autocasts as new SimpleLineSymbol()
      color: "#0D2644",
      width: 0.5
    }
  };

  var defaultDistrict = {
    type: "simple-fill", // autocasts as new SimpleFillSymbol()
    outline: {
      // autocasts as new SimpleLineSymbol()
      color: "black",
      width: 1
    }
  };

  //define defaultcolor visual variable
  var defaultColorVis = {
    type: "color",
    color: "#0D2644"
  };

  //define visual variable for SPF Score (color)
  var SPFColorVis = {
    type: "color",
    field: "F17_SPF_SCORE",
    legendOptions: {
      title: "SPF Score - 2017"
    },
    stops: [
      {
        value: 0.2,
        color: "#FFFCD4",
        label: "20%"
      },
      {
        value: 0.9,
        color: "#0079C1",
        label: "90%+"
      }
    ]
  };

  //define size visual variable for FRL
  var FRLSizeVis = {
    // The type must be set to size for the renderer to know size will be altered
    type: "size",
    // Assign the field name to visualize with size (total population)
    field: "FRL_PERCENT",
    legendOptions: {
      title: "Percentage of FRL Students"
    },
    // Create a size ramp based on the min/max values
    stops: [
      { value: 0.01, size: 3, label: "1% FRL" },
      { value: 0.25, size: 10, label: "25% FRL" },
      { value: 1, size: 25, label: "100% FRL" }
    ]
  };

  //define size visual variable for enrollment
  var enrollSizeVis = {
    // The type must be set to size for the renderer to know size will be altered
    type: "size",
    // Assign the field name to visualize with size (total population)
    field: "ENROLL_16_17",
    legendOptions: {
      title: "Total Student Enrollment"
    },
    // Create a size ramp based on the min/max values
    stops: [
      { value: 1, size: 2, label: "1 student" },
      { value: 500, size: 10, label: "500 students" },
      { value: 1500, size: 25, label: "1500+ students" }
    ]
  };

  //setup standards schoolsrenderer
  var schoolsrenderer = {
    type: "simple", // autocasts as new SimpleRenderer()
    // Define a default marker symbol.
    symbol: enrollSymbol, // autocasts as new SimpleMarkerSymbol()
    // Set the color and size visual variables on the renderer
    visualVariables: []
  };

  /******************************************************************
   *
   * visual color/size for geographies (distrits, counties, cities, etc.)
   *
   ******************************************************************/

  //visual variable for district funding
  var districtFundingVis = {
    type: "color",
    field: "PPR",
    legendOptions: {
      title: "Per Pupil Funding (Includes ML)"
    },
    stops: [
      {
        value: 7250,
        color: "#DADADA",
        label: "$7,250"
      },
      {
        value: 12000,
        color: "#832C65",
        label: "$12,000+"
      }
    ]
  };

  //visual variable for Income in cities
  var medianIncomeVisCities = {
    type: "color",
    field: "HH_INC",
    legendOptions: {
      title: "Median Household Income"
    },
    stops: [
      {
        value: 20000,
        color: "#DADADA",
        label: "$20,000"
      },
      {
        value: 100000,
        color: "#832C65",
        label: "$100K+"
      }
    ]
  };

  //visual variable for Income
  var medianIncomeVisTracts = {
    type: "color",
    field: "HH_INCOME",
    legendOptions: {
      title: "Median Household Income"
    },
    stops: [
      {
        value: 20000,
        color: "#DADADA",
        label: "$20,000"
      },
      {
        value: 100000,
        color: "#832C65",
        label: "$100K+"
      }
    ]
  };

  //visual variable for Income
  var populationPovertyVis = {
    type: "color",
    field: "POV_P",
    legendOptions: {
      title: "% of K-12 Age Students (ages 5-17) in poverty"
    },
    stops: [
      {
        value: 0,
        color: "#FFEEEE",
        label: "0% K-12 Population in Poverty"
      },
      {
        value: 0.4,
        color: "#832C65",
        label: "40% K-12 Population in Poverty"
      }
    ]
  };

  //visual variable for Income
  var seatsCities = {
    type: "color",
    field: "ELEM_NEED",
    legendOptions: {
      title: "Number of Quality Seats Needed"
    },
    stops: [
      {
        value: 0,
        color: "#FFEEEE",
        label: "0 Seats Needed"
      },
      {
        value: 10000,
        color: "#832C65",
        label: "10,000 elementary seats needed"
      }
    ]
  };

  //visual variable for Income
  var seatsTracts = {
    type: "color",
    field: "ELEM_NEED",
    legendOptions: {
      title: "Number of Quality Seats Needed"
    },
    stops: [
      {
        value: 0,
        color: "#FFEEEE",
        label: "0 Seats Needed"
      },
      {
        value: 500,
        color: "#832C65",
        label: "500+ quality seats needed"
      }
    ]
  };

  //visual variable for Income
  var popGrowthVis = {
    type: "color",
    field: "GRO_00_10",
    legendOptions: {
      title: "Annual Population Growth % (2000-2010)"
    },
    stops: [
      {
        value: -5,
        color: "#C61F1F",
        label: "5%+ annual decline"
      },
      {
        value: 0,
        color: "#FFEEEE",
        label: "0% growth"
      },
      {
        value: 5,
        color: "#003E15",
        label: "5%+ annual growth"
      }
    ]
  };

  var distEnrollGrowthVis = {
    type: "color",
    field: "F5_YEAR_GR",
    legendOptions: {
      title: "Total Enrollment Growth % - Past Five School Years"
    },
    stops: [
      {
        value: -10,
        color: "#C61F1F",
        label: "10%+ decline"
      },
      {
        value: 0,
        color: "#FFEEEE",
        label: "0% growth"
      },
      {
        value: 10,
        color: "#003E15",
        label: "5%+ growth"
      }
    ]
  };

  //setup standards schoolsrenderer
  var georenderer = {
    type: "simple", // autocasts as new SimpleRenderer()
    // Define a default marker symbol.
    symbol: defaultDistrict, // autocasts as new SimpleMarkerSymbol()
    // Set the color and size visual variables on the renderer
    visualVariables: []
  };

  /******************************************************************
   *
   * add featurelayers to map
   *
   ******************************************************************/

  //create popupp templtes for feature layers

  var schoolspopup = {
    // autocasts as new PopupTemplate()
    title: "{SCHOOL_NAME}",
    content:
      "{ADDRESS}, {CITY}, CO" +
      "<ul><li><p1>Enrollment</p1>: {ENROLL_16_17}</li>" +
      "<li><p1>Grade Level:</p1> {SCHOOL_LEVEL:schooltype}</li>" +
      "<li><p1>Charter:</p1> {CHARTER: charterformat}</li>" +
      "<li><p1>2017-18 SPF Rating:</p1> {F17_SPF_FINAL}</li>" +
      "<li><p1>2017-18 SPF Score:</p1> {F17_SPF_SCORE: percentformat}</li>" +
      "<li><p1>% Minority:</p1> {MINORITY_PERCENT: percentformat}</li>" +
      "<li><p1>% FRL:</p1> {FRL_PERCENT: percentformat}</li>" +
      "<li><p1>% ELL:</p1> {ELL_PERCENT: percentformat}</li>" +
      "<li><p1>% IEP:</p1> {SPED_PERCENT:percentformat}</li></ul>",
    fieldInfos: [
      {
        fieldName: "ENROLL_16_17",
        format: {
          digitSeparator: true, // Use a comma separator for large numbers
          places: 0 // Sets the number of decimal places to 0 and rounds up
        }
      },
      {
        fieldName: "SCHOOL_LEVEL",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "16_SPF_SCORE",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "16_SPF_PLAN",
        format: {
          digitSeparator: true,
          places: 0
        }
      }
    ]
  };

  percentformat = function(value) {
    var data = (value * 100).toFixed(0);
    return data + "%";
  };

  percentformat2 = function(value) {
    var data = value.toFixed(1);
    data += "%";
    return data;
  };

  currencyformat = function(value) {
    var currency = "$" + value;
    return currency;
  };

  charterformat = function(string) {
    if (string == "Y") {
      return "Yes";
    } else {
      return "No";
    }
  };

  schooltype = function(letter) {
    if (letter == "E") {
      return "Elementary";
    } else if (letter == "M") {
      return "Middle";
    } else if ((letter = "H")) {
      return "High";
    }
  };

  var censustractspopup = {
    // autocasts as new PopupTemplate()
    title: "{NAMELSAD}",
    content:
      "<ul><li><p1>Population:</p1> {TOT_POP}</li>" +
      "<li><p1>K12 Population:</p1> {K12_POP}</li>" +
      "<li><p1>ES Pop:</p1> {ELEM_POP}</li>" +
      "<li><p1>MS Pop:</p1> {MIDDLE_POP}</li>" +
      "<li><p1>HS Pop:</p1> {HIGH_POP}</li>" +
      "<li><p1>Median HH Income:</p1> {HH_INCOME: currencyformat}</li>" +
      "<li><p1>K12 Pop Poverty Rate:</p1> {POV_P: percentformat}</li>" +
      "<li><p1>Annual Pop Growth (2000-2010):</p1> {GRO_00_10: percentformat2}</li>" +
      "<li><p1>Quality ES Seat Need:</p1> {ELEM_NEED}</li>" +
      "<li><p1>Quality MS Seat Need:</p1> {MIDDLE_NEE}</li>" +
      "<li><p1>Quality HS Seat Need:</p1> {HIGH_NEED}</li></ul>",
    fieldInfos: [
      {
        fieldName: "TOT_POP",
        format: {
          digitSeparator: true, // Use a comma separator for large numbers
          places: 0 // Sets the number of decimal places to 0 and rounds up
        }
      },
      {
        fieldName: "K12_POP",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "ELEM_POP",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "MIDDLE_POP",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "HIGH_POP",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "HH_INCOME",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "ELEM_NEED",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "MIDDLE_NEE",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "HIGH_NEED",
        format: {
          digitSeparator: true,
          places: 0
        }
      }
    ]
  };

  var districtspopup = {
    // autocasts as new PopupTemplate()
    title: "{DIST_NAME}",
    content:
      "<ul><li><p1>DPF Plan:</p1> {DIST_PLAN}</li>" +
      "<li><p1>PPR:</p1> {PPR: currencyformat}</li>" +
      "<li><p1>MLO Per Pupil:</p1> {PPR_MLO: currencyformat}</li>" +
      "<li><p1>Charter MLO Sharing:</p1> {MLO_SHARIN: percentformat}</li>" +
      "<li><p1>Population:</p1> {POP_TOT}</li>" +
      "<li><p1>K12 Enrollment (2017):</p1> {K12_POP}</li>" +
      "<li><p1>Students of Color % (2017):</p1> {PERCENT_MI: percentformat}</li>" +
      "<li><p1>FRL % (2017):</p1> {FRL_PERCEN: percentformat}</li>" +
      "<li><p1>ELL % (2017):</p1> {ELL_PERCEN: percentformat}</li>" +
      "<li><p1>IEP % (2017):</p1> {IEP_PERCEN: percentformat}</li>" +
      "<li><p1>K12 Population:</p1> {EN_16}</li>" +
      "<li><p1>ES Pop:</p1> {ELEM_POP}</li>" +
      "<li><p1>MS Pop:</p1> {MIDDLE_POP}</li>" +
      "<li><p1>HS Pop:</p1> {HIGH_POP}</li>" +
      "<li><p1>Median HH Income:</p1> {HH_INCOME: currencyformat}</li>" +
      "<li><p1>K12 Pop Poverty Rate:</p1> {POV_P: percentformat}</li>" +
      "<li><p1>Enrollment Change (Past Five Years):</p1> {F5_YEAR_GR: percentformat2}</li>" +
      "<li><p1>Quality ES Seat Need:</p1> {ELEM_NEED}</li>" +
      "<li><p1>Quality MS Seat Need:</p1> {MIDDLE_NEE}</li>" +
      "<li><p1>Quality HS Seat Need:</p1> {HIGH_NEED}</li></ul>",
    fieldInfos: [
      {
        fieldName: "POP_TOT",
        format: {
          digitSeparator: true, // Use a comma separator for large numbers
          places: 0 // Sets the number of decimal places to 0 and rounds up
        }
      },
      {
        fieldName: "K12_POP",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "ELEM_POP",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "MIDDLE_POP",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "HIGH_POP",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "HH_INCOME",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "ELEM_NEED",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "MIDDLE_NEE",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "HIGH_NEED",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "EN_16",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "PPR",
        format: {
          digitSeparator: true,
          places: 0
        }
      }
    ]
  };

  var citiespopup = {
    // autocasts as new PopupTemplate()
    title: "{NAME}, CO",
    content:
      "<ul><li><p1>Population:</p1> {TOT_POP}</li>" +
      "<li><p1>K12 Population:</p1> {POP_K12}</li>" +
      "<li><p1>ES Pop:</p1> {ELEM_POP}</li>" +
      "<li><p1>MS Pop:</p1> {MIDDLE_POP}</li>" +
      "<li><p1>HS Pop:</p1> {HIGH_POP}</li>" +
      "<li><p1>Median HH Income:</p1> {HH_INC: currencyformat}</li>" +
      "<li><p1>K12 Pop Poverty Rate:</p1> {POV_P: percentformat}</li>" +
      "<li><p1>Annual Pop Growth (2000-2010):</p1> {GRO_00_10: percentformat2}</li>" +
      "<li><p1>Quality ES Seat Need:</p1> {ELEM_NEED}</li>" +
      "<li><p1>Quality MS Seat Need:</p1> {MIDDLE_NEE}</li>" +
      "<li><p1>Quality HS Seat Need:</p1> {HIGH_NEED}</li></ul>",
    fieldInfos: [
      {
        fieldName: "TOT_POP",
        format: {
          digitSeparator: true, // Use a comma separator for large numbers
          places: 0 // Sets the number of decimal places to 0 and rounds up
        }
      },
      {
        fieldName: "POP_K12",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "ELEM_POP",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "MIDDLE_POP",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "HIGH_POP",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "HH_INC",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "ELEM_NEED",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "MIDDLE_NEE",
        format: {
          digitSeparator: true,
          places: 0
        }
      },
      {
        fieldName: "HIGH_NEED",
        format: {
          digitSeparator: true,
          places: 0
        }
      }
    ]
  };

  var housepopup = {
    // autocasts as new PopupTemplate()
    title: "{NAMELSAD}"
  };

  var congressionalpopup = {
    // autocasts as new PopupTemplate()
    title: "Congressional District {CD115FP}"
  };

  /******************************************************************
   *
   * add featurelayers to map
   *
   ******************************************************************/
  var districts = new FeatureLayer({
    url: "https://services8.arcgis.com/i7OPmUoTPHFfRStk/arcgis/rest/services/coloradoschooldistricts/FeatureServer",
    renderer: districtrenderer,
    outFields: ["*"],
    opacity: 0.55,
    title: "Districts",
    popupTemplate: districtspopup,
    visible: true
  });

  var places = new FeatureLayer({
    url: "https://services8.arcgis.com/i7OPmUoTPHFfRStk/arcgis/rest/services/cities/FeatureServer",
    outFields: ["*"],
    opacity: 0.55,
    popupTemplate: citiespopup,
    visible: false
  });

  var censusTracts = new FeatureLayer({
    url: "https://services8.arcgis.com/i7OPmUoTPHFfRStk/arcgis/rest/services/census_tracts/FeatureServer",
    outFields: ["*"],
    opacity: 0.55,
    popupTemplate: censustractspopup,
    visible: false
  });

  var houseDistricts = new FeatureLayer({
    url: "https://services8.arcgis.com/i7OPmUoTPHFfRStk/arcgis/rest/services/house_districts/FeatureServer",
    outFields: ["*"],
    renderer: districtrenderer,
    popupTemplate: housepopup,
    visible: false
  });

  var senateDistricts = new FeatureLayer({
    url: "https://services8.arcgis.com/i7OPmUoTPHFfRStk/arcgis/rest/services/senate_districts/FeatureServer",
    outFields: ["*"],
    renderer: districtrenderer,
    popupTemplate: housepopup,
    visible: false
  });

  var congressionalDistricts = new FeatureLayer({
    url: "https://services8.arcgis.com/i7OPmUoTPHFfRStk/arcgis/rest/services/congressional_districts/FeatureServer",
    outFields: ["*"],
    renderer: districtrenderer,
    popupTemplate: congressionalpopup,
    visible: false
  });

  var schools = new FeatureLayer({
    url: "https://services8.arcgis.com/i7OPmUoTPHFfRStk/arcgis/rest/services/2017_colorado_school_data/FeatureServer",
    renderer: schoolslevelrenderer,
    outFields: ["*"],
    title: "Schools",
    popupTemplate: schoolspopup
  });

  map.add(districts);
  map.add(places);
  map.add(censusTracts);
  map.add(houseDistricts);
  map.add(senateDistricts);
  map.add(houseDistricts);
  map.add(congressionalDistricts);
  map.add(schools);

  // Add the schools as a search source
  app.searchWidget.sources.push({
    featureLayer: schools,
    searchFields: ["SCHOOL_NAM"],
    displayField: "SCHOOL_NAM",
    exactMatch: false,
    outFields: ["SCHOOL_NAM"],
    resultGraphicEnabled: true,
    name: "Schools",
    placeholder: "Search schools"
  });

  // Add the districts as a search source
  app.searchWidget.sources.push({
    featureLayer: districts,
    searchFields: ["LGNAME"],
    displayField: "LGNAME",
    exactMatch: false,
    outFields: ["LGNAME", "GEOID"],
    resultGraphicEnabled: true,
    name: "Search districts",
    placeholder: "..."
  });

  /******************************************************************
   *
   * school filter slider JS
   *
   ******************************************************************/
  var sliderFRL = document.getElementById("sliderFRL");
  var outputFRL = document.getElementById("valueFRL");
  outputFRL.innerHTML = sliderFRL.value;

  sliderFRL.oninput = function() {
    outputFRL.innerHTML = this.value;
  };

  var sliderMinority = document.getElementById("sliderMinority");
  var outputMinority = document.getElementById("valueMinority");
  outputMinority.innerHTML = sliderMinority.value;

  sliderMinority.oninput = function() {
    outputMinority.innerHTML = this.value;
  };

  var sliderIEP = document.getElementById("sliderIEP");
  var outputIEP = document.getElementById("valueIEP");
  outputIEP.innerHTML = sliderIEP.value;

  sliderIEP.oninput = function() {
    outputIEP.innerHTML = this.value;
  };

  var sliderELL = document.getElementById("sliderELL");
  var outputELL = document.getElementById("valueELL");
  outputELL.innerHTML = sliderELL.value;

  sliderELL.oninput = function() {
    outputELL.innerHTML = this.value;
  };

  var sliderSPF = document.getElementById("sliderSPF");
  var outputSPF = document.getElementById("valueSPF");
  outputELL.innerHTML = sliderSPF.value;

  sliderSPF.oninput = function() {
    outputSPF.innerHTML = this.value;
  };

  $(document).ready(function() {
    /******************************************************************
     *
     * Jquery for Filter Schools Panel
     *
     ******************************************************************/
    var string = "";
    var count = 0;

    //check if filters are changed//
    $(
      "#selectElementary, #selectMiddle, #selectHigh, #selectTurnaround, #selectPriorImprov, #selectImprov, #selectPerformance, #selectTPS, #selectCharters, #sliderFRL, #sliderMinority, #sliderELL, #sliderIEP, #includeAEC, #excludeAEC, #AECOnly, #sliderSPF, #selectDistrict"
    ).on("change", function() {
      //build out expression for school grade level//

      if (
        $("#selectElementary").is(":checked") ||
        $("#selectMiddle").is(":checked") ||
        $("#selectHigh").is(":checked")
      ) {
        string += "(";

        if ($("#selectElementary").is(":checked")) {
          if (count != 0) {
            string += " OR SCHOOL_LEVEL = 'E'";
          } else {
            string += " SCHOOL_LEVEL = 'E'";
            count += 1;
          }
        }

        if ($("#selectMiddle").is(":checked")) {
          if (count != 0) {
            string += " OR SCHOOL_LEVEL = 'M'";
          } else {
            string += " SCHOOL_LEVEL = 'M'";
            count += 1;
          }
        }

        if ($("#selectHigh").is(":checked")) {
          if (count != 0) {
            string += " OR SCHOOL_LEVEL = 'H'";
          } else {
            string += " SCHOOL_LEVEL = 'H'";
            count += 1;
          }
        }
        string += ")";
      }

      //build out SQL expression for school performance//
      if (
        $("#selectTurnaround").is(":checked") ||
        $("#selectPriorImprov").is(":checked") ||
        $("#selectImprov").is(":checked") ||
        $("#selectPerformance").is(":checked")
      ) {
        if (count != 0) {
          string += " AND (";
        } else {
          string += "(";
        }

        count = 0;

        if ($("#selectTurnaround").is(":checked")) {
          if (count != 0) {
            string += " OR F17_SPF_FINAL = 'Turnaround'";
          } else {
            string += " F17_SPF_FINAL = 'Turnaround'";
            count += 1;
          }
        }

        if ($("#selectPriorImprov").is(":checked")) {
          if (count != 0) {
            string += " OR F17_SPF_FINAL = 'Priority Improvement'";
          } else {
            string += " F17_SPF_FINAL = 'Priority Improvement'";
            count += 1;
          }
        }

        if ($("#selectImprov").is(":checked")) {
          if (count != 0) {
            string += " OR F17_SPF_FINAL= 'Improvement'";
          } else {
            string += " F17_SPF_FINAL = 'Improvement'";
            count += 1;
          }
        }

        if ($("#selectPerformance").is(":checked")) {
          if (count != 0) {
            string += " OR F17_SPF_FINAL = 'Performance'";
          } else {
            string += " F17_SPF_FINAL = 'Performance'";
            count += 1;
          }
        }

        string += ")";
      }

      //build out expression for type//
      if ($("#selectTPS").is(":checked") || $("#selectCharters").is(":checked") || $("#selectCSI").is(":checked")) {
        if (count != 0) {
          string += " AND (";
        } else {
          string += "(";
        }

        count = 0;

        if ($("#selectTPS").is(":checked")) {
          if (count != 0) {
            string += " OR CHARTER = 'N'";
          } else {
            string += " CHARTER = 'N'";
            count += 1;
          }
        }

        if ($("#selectCharters").is(":checked")) {
          if (count != 0) {
            string += " OR CHARTER = 'Y'";
          } else {
            string += " CHARTER = 'Y'";
            count += 1;
          }
        }
        string += ")";
      }

      //build out expression for include AEC option//
      if ($("#includeAEC").is(":checked")) {
        if (count != 0) {
          string += " AND (AEC = 'Y' OR AEC = 'N')";
        } else {
          string += "(AEC = 'Y' OR AEC = 'N')";
          count += 1;
        }
      }

      //build out expression for exclude AEC Option//
      if ($("#excludeAEC").is(":checked")) {
        if (count != 0) {
          string += " AND (AEC = 'N')";
        } else {
          string += "(AEC = 'N')";
          count += 1;
        }
      }

      //build out expression for only AEC Option//
      if ($("#AECOnly").is(":checked")) {
        if (count != 0) {
          string += " AND (AEC = 'Y')";
        } else {
          string += "(AEC = 'Y')";
          count += 1;
        }
      }

      //build out expression for FRL slider//
      if (sliderFRL.value > 0) {
        var maxFRL = sliderFRL.value / 100;
        if (count != 0) {
          string += " AND (FRL_PERCENT >" + maxFRL + ")";
        } else {
          string += "(FRL_PERCENT >" + maxFRL + ")";
          count += 1;
        }
      }

      //build out expression for minority slider//
      if (sliderMinority.value > 0) {
        var maxMinority = sliderMinority.value / 100;
        if (count != 0) {
          string += " AND (MINORITY_PERCENT >" + maxMinority + ")";
        } else {
          string += "(MINORITY_PERCENT >" + maxMinority + ")";
          count += 1;
        }
      }

      //build out expression for ELL students//
      if (sliderELL.value > 0) {
        var maxELL = sliderELL.value / 100;
        if (count != 0) {
          string += " AND (ELL_PERCENT >" + maxELL + ")";
        } else {
          string += "(ELL_PERCENT >" + maxELL + ")";
          count += 1;
        }
      }

      //build out expression for IEP students//
      if (sliderIEP.value > 0) {
        var maxIEP = sliderIEP.value / 100;
        if (count != 0) {
          string += " AND (SPED_PERCENT>" + maxIEP + ")";
        } else {
          string += "(SPED_PERCENT >" + maxIEP + ")";
          count += 1;
        }
      }

      //build out expression for SPF slider//
      if (sliderSPF.value > 0) {
        var maxSPF = sliderSPF.value / 100;
        if (count != 0) {
          string += " AND (F17_SPF_SCORE>" + maxSPF + ")";
        } else {
          string += "(F17_SPF_SCORE >" + maxSPF + ")";
          count += 1;
        }
      }

      var selectedDistrict = $("#selectDistrict").val();
      var index = $("#selectDistrict").prop("selectedIndex");
      selectedDistrict = "'" + selectedDistrict + "'";
      if (index > 0) {
        string += " AND (DISTRICT_NAME = " + selectedDistrict + ")";
      }

      schools.definitionExpression = string;
      count = 0;
      string = "";
    });

    $("#resetfilter").click(function() {
      $("#selectElementary").prop("checked", true);
      $("#selectMiddle").prop("checked", true);
      $("#selectHigh").prop("checked", true);
      $("#selectTurnaround").prop("checked", true);
      $("#selectPriorImprov").prop("checked", true);
      $("#selectImprov").prop("checked", true);
      $("#selectPerformance").prop("checked", true);
      $("#selectTPS").prop("checked", true);
      $("#selectCharters").prop("checked", true);
      $("#includeAEC").prop("checked", true);
      $("#sliderFRL").val(0);
      $("#sliderMinority").val(0);
      $("#sliderELL").val(0);
      $("#sliderIEP").val(0);
      $("#sliderSPF").val(0);
      $("#valueFRL").html(0);
      $("#valueMinority").html(0);
      $("#valueELL").html(0);
      $("#valueIEP").html(0);
      $("#valueSPF").html(0);
      $("#selectDistrict").val("0");
      schools.definitionExpression = "";
    });

    $("#schoolList").click(function() {
      $("#schoolData").empty();
      querySchools();
    });

    //helper function to sort array of objects
    function sortOn(arr, prop) {
      arr.sort(function(a, b) {
        if (a[prop] < b[prop]) {
          return -1;
        } else if (a[prop] > b[prop]) {
          return 1;
        } else {
          return 0;
        }
      });
    }

    function querySchools() {
      var schoolsQuery = schools.createQuery();
      schools.queryFeatures(schoolsQuery).then(function(response) {
        school_list = response.features.map(function(feature) {
          return feature.attributes;
        });

        sortOn(school_list, "SCHOOL_NAME");
        for (var i = 0; i < school_list.length; i++) {
          $("#schoolData").append(
            "<tr><td scope='row'>" +
              school_list[i].SCHOOL_CODE +
              "</td><td>" +
              school_list[i].SCHOOL_NAME +
              "</td><td>" +
              school_list[i].DISTRICT_NAME +
              "</td></tr>"
          );
        }
      });
    }

    /******************************************************************
     *
     * Jquery for style schools panel
     *
     ******************************************************************/
    //Change Available School Options Based on User Selection//
    var originalsizeoptions = $("#styleSchoolsSize")
      .children()
      .clone();
    var originalcoloroptions = $("#styleSchoolsColor")
      .children()
      .clone();
    $("#styleSchoolsColor").on("change", function() {
      var selection = $("select[name=styleSchoolsColor]").val();
      if (selection != 3 && selection != 1) {
        var options =
          "<option data-textcolor='calcite-text-light' value='1' data-bgcolor='calcite-bg-dark' selected>None</option>";
        $("#styleSchoolsSize").html(options);
      } else {
        $("#styleSchoolsSize").html(originalsizeoptions);
      }
    });

    //Change Available Color options based on selected size//
    $("#styleSchoolsSize").on("change", function() {
      var secondselection = $("select[name=styleSchoolsSize]").val();
      var prevselect = $("select[name=styleSchoolsColor]").val();
      if (secondselection != 1) {
        var option1 =
          "<option data-textcolor='calcite-text-light' value='1' data-bgcolor='calcite-bg-dark' selected>None</option>";
        var option2 =
          "<option data-textcolor='calcite-text-light' value='3' data-bgcolor='calcite-bg-dark'>SPF Score</option>";
        $("#styleSchoolsColor").html(option2 + option1);

        if (prevselect == 1) {
          $("#styleSchoolsColor").val("1");
        } else if (prevselect == 3) {
          $("#styleSchoolsColor").val("3");
        }
      } else {
        $("#styleSchoolsColor").html(originalcoloroptions);
        $("#styleSchoolsColor").val(prevselect.toString());
      }
    });

    //apply appropriate render based on selected values
    $("#applySchoolStyle").on("click", function() {
      var selectsize = $("select[name=styleSchoolsSize]").val();
      var selectcolor = $("select[name=styleSchoolsColor]").val();
      //clear out visual variables from renderer
      schoolsrenderer.visualVariables = [];
      //no renderer selected//
      if (selectsize == 1 && selectcolor == 1) {
        schools.renderer = schoolsrenderer;
      } else if (selectcolor == 2) {
        schools.renderer = schoolsplanrenderer;
      } else if (selectcolor == 4) {
        schools.renderer = schoolstyperenderer;
      } else if (selectcolor == 5) {
        schools.renderer = schoolslevelrenderer;
      } else if (selectcolor == 3 && selectsize == 1) {
        schoolsrenderer.visualVariables.push(SPFColorVis);
        schools.renderer = schoolsrenderer;
      } else if (selectcolor == 3 && selectsize == 2) {
        schoolsrenderer.visualVariables = [SPFColorVis, enrollSizeVis];
        schools.renderer = schoolsrenderer;
      } else if (selectcolor == 3 && selectsize == 3) {
        schoolsrenderer.visualVariables = [SPFColorVis, FRLSizeVis];
        schools.renderer = schoolsrenderer;
      } else if (selectcolor == 1 && selectsize == 2) {
        schoolsrenderer.visualVariables.push(enrollSizeVis);
        schools.renderer = schoolsrenderer;
      } else {
        schoolsrenderer.visualVariables.push(FRLSizeVis);
        schools.renderer = schoolsrenderer;
      }
    });

    $("#resetStyle").click(function() {
      schools.renderer = schoolslevelrenderer;
      $("#styleSchoolsColor").val(5);
      $("#styleSchoolsSize").val(1);
    });

    /******************************************************************
     *
     * Jquery for geo analysis panel
     *
     ******************************************************************/
    //Change Available School Options Based on User Selection//
    var originalstyleoptions = $("#geoStyle")
      .children()
      .clone();
    var originalgeooptions = $("#geo")
      .children()
      .clone();
    var option1 =
      "<option value='1' data-textcolor='calcite-text-light' data-bgcolor='calcite-bg-dark'selected>Geography Only</option>";
    var option2 =
      "<option value='2' data-textcolor='calcite-text-light' data-bgcolor='calcite-bg-dark'>Median HH Income</option>";
    var option3 =
      "<option value='3' data-textcolor='calcite-text-light' data-bgcolor='calcite-bg-dark'>K-12 Poverty</option>";
    var option4 =
      "<option value='4' data-textcolor='calcite-text-light' data-bgcolor='calcite-bg-dark'>Quality Seats Needed - Elem</option>";
    var option5 =
      "<option value='5' data-textcolor='calcite-text-light' data-bgcolor='calcite-bg-dark'>Quality Seats Needed - Middle</option>";
    var option6 =
      "<option value='6' data-textcolor='calcite-text-light' data-bgcolor='calcite-bg-dark'>Quality Seats Needed - High</option>";
    var option7 =
      "<option value='7' data-textcolor='calcite-text-light' data-bgcolor='calcite-bg-dark'>Population Growth</option>";
    var option8 = "<option value='8' data-textcolor='calcite-text-light' data-bgcolor='calcite-bg-dark'>PPR</option>";
    var option9 =
      "<option value='9' data-textcolor='calcite-text-light' data-bgcolor='calcite-bg-dark'>District Performance Plan</option>";
    $("#geo").on("change", function() {
      var selection = $("select[name=geoSelection]").val();
      if (selection == 1 || selection == 5 || selection == 6 || selection == 7) {
        $("#geoStyle").html(option1);
      } else if (selection == 3 || selection == 4) {
        $("#geoStyle").html(option1 + option2 + option3 + option4 + option5 + option6 + option7);
      } else {
        $("#geoStyle").html(originalstyleoptions);
      }
    });

    //apply geo layers/renderers based on user selection//
    $("#applyGeoStyle").on("click", function() {
      districts.renderer = districtrenderer;
      censusTracts.visible = false;
      places.visible = false;
      houseDistricts.visible = false;
      senateDistricts.visible = false;
      congressionalDistricts.visible = false;
      georenderer.visualVariables = [];
      var geo = $("select[name=geoSelection]").val();
      var variable = $("select[name=geoStyleSelection]").val();
      if (geo == "1") {
        districts.visible = false;
      } else if (geo == "2" && variable == "1") {
        districts.renderer = districtrenderer;
        districts.visible = true;
      } else if (geo == "2" && variable == "2") {
        georenderer.visualVariables.push(medianIncomeVisTracts);
        districts.renderer = georenderer;
        districts.visible = true;
      } else if (geo == "2" && variable == "3") {
        georenderer.visualVariables.push(populationPovertyVis);
        districts.renderer = georenderer;
        districts.visible = true;
      } else if (geo == "2" && variable == "4") {
        seatsCities.field = "ELEM_NEED";
        georenderer.visualVariables.push(seatsCities);
        districts.renderer = georenderer;
        districts.visible = true;
      } else if (geo == "2" && variable == "5") {
        seatsCities.field = "MIDDLE_NEE";
        georenderer.visualVariables.push(seatsCities);
        districts.renderer = georenderer;
        districts.visible = true;
      } else if (geo == "2" && variable == "6") {
        seatsCities.field = "HIGH_NEED";
        georenderer.visualVariables.push(seatsCities);
        districts.renderer = georenderer;
        districts.visible = true;
      } else if (geo == "2" && variable == "7") {
        seatsCities.field = "F5_YEAR_GR";
        georenderer.visualVariables.push(distEnrollGrowthVis);
        districts.renderer = georenderer;
        districts.visible = true;
      } else if (geo == "2" && variable == "8") {
        georenderer.visualVariables.push(districtFundingVis);
        districts.renderer = georenderer;
        districts.visible = true;
      } else if (geo == "4" && variable == "1") {
        censusTracts.renderer = censusrenderer;
        censusTracts.visible = true;
      } else if (geo == "2" && variable == "8") {
        georenderer.visualVariables = districtFundingVis;
        districts.renderer = georenderer;
        districts.visible = true;
      } else if (geo == "2" && variable == "9") {
        districts.renderer = districtplanrenderer;
        districts.visible = true;
      } else if (geo == "3" && variable == "1") {
        places.renderer = georenderer;
        places.visible = true;
      } else if (geo == "3" && variable == "2") {
        georenderer.visualVariables.push(medianIncomeVisCities);
        places.renderer = georenderer;
        places.visible = true;
      } else if (geo == "3" && variable == "3") {
        georenderer.visualVariables.push(populationPovertyVis);
        places.renderer = georenderer;
        places.visible = true;
      } else if (geo == "3" && variable == "4") {
        seatsCities.field = "ELEM_NEED";
        georenderer.visualVariables.push(seatsCities);
        places.renderer = georenderer;
        places.visible = true;
      } else if (geo == "3" && variable == "5") {
        seatsCities.field = "MIDDLE_NEE";
        georenderer.visualVariables.push(seatsCities);
        places.renderer = georenderer;
        places.visible = true;
      } else if (geo == "3" && variable == "6") {
        seatsCities.field = "HIGH_NEED";
        georenderer.visualVariables.push(seatsCities);
        places.renderer = georenderer;
        places.visible = true;
      } else if (geo == "3" && variable == "7") {
        georenderer.visualVariables.push(popGrowthVis);
        places.renderer = georenderer;
        places.visible = true;
      } else if (geo == "4" && variable == "1") {
        censusTracts.renderer = georenderer;
        censusTracts.visible = true;
      } else if (geo == "4" && variable == "2") {
        georenderer.visualVariables.push(medianIncomeVisTracts);
        censusTracts.renderer = georenderer;
        censusTracts.visible = true;
      } else if (geo == "4" && variable == "3") {
        georenderer.visualVariables.push(populationPovertyVis);
        censusTracts.renderer = georenderer;
        censusTracts.visible = true;
      } else if (geo == "4" && variable == "4") {
        georenderer.visualVariables.push(seatsTracts);
        censusTracts.renderer = georenderer;
        censusTracts.visible = true;
      } else if (geo == "4" && variable == "5") {
        seatsTracts.field = "MIDDLE_NEE";
        georenderer.visualVariables.push(seatsTracts);
        censusTracts.renderer = georenderer;
        censusTracts.visible = true;
      } else if (geo == "4" && variable == "6") {
        seatsTracts.field = "HIGH_NEED";
        georenderer.visualVariables.push(seatsTracts);
        censusTracts.renderer = georenderer;
        censusTracts.visible = true;
      } else if (geo == "4" && variable == "7") {
        georenderer.visualVariables.push(popGrowthVis);
        censusTracts.renderer = georenderer;
        censusTracts.visible = true;
      } else if (geo == "5") {
        districts.visible = false;
        houseDistricts.visible = true;
      } else if (geo == "6") {
        districts.visible = false;
        senateDistricts.visible = true;
      } else if (geo == "7") {
        districts.visible = false;
        congressionalDistricts.visible = true;
      }
    });

    $("#resetGeoStyle").click(function() {
      districts.renderer = districtrenderer;
      censusTracts.visible = false;
      places.visible = false;
      houseDistricts.visible = false;
      senateDistricts.visible = false;
      congressionalDistricts.visible = false;
      georenderer.visualVariables = [];
      $("#geo").val(2);
      $("#geoStyle").val(1);
    });

    /******************************************************************
     *
     * Jquery for filter schools panel
     *
     ******************************************************************/
    var school_districts = [
      "ACADEMY 20",
      "ADAMS 12 FIVE STAR SCHOOLS",
      "ADAMS COUNTY 14",
      "ADAMS-ARAPAHOE 28J",
      "AGATE 300",
      "AGUILAR REORGANIZED 6",
      "AKRON R-1",
      "ALAMOSA RE-11J",
      "ARCHULETA COUNTY 50 JT",
      "ARICKAREE R-2",
      "ARRIBA-FLAGLER C-20",
      "ASPEN 1",
      "AULT-HIGHLAND RE-9",
      "BAYFIELD 10 JT-R",
      "BENNETT 29J",
      "BETHUNE R-5",
      "BIG SANDY 100J",
      "BOULDER VALLEY RE 2",
      "BRANSON REORGANIZED 82",
      "BRIGGSDALE RE-10",
      "BRUSH RE-2(J)",
      "BUENA VISTA R-31",
      "BUFFALO RE-4J",
      "BURLINGTON RE-6J",
      "BYERS 32J",
      "CALHAN RJ-1",
      "CAMPO RE-6",
      "CANON CITY RE-1",
      "CENTENNIAL R-1",
      "CENTER 26 JT",
      "CHERAW 31",
      "CHERRY CREEK 5",
      "CHEYENNE COUNTY RE-5",
      "CHEYENNE MOUNTAIN 12",
      "CLEAR CREEK RE-1",
      "COLORADO SPRINGS 11",
      "COTOPAXI RE-3",
      "CREEDE SCHOOL DISTRICT",
      "CRIPPLE CREEK-VICTOR RE-1",
      "CROWLEY COUNTY RE-1-J",
      "CUSTER COUNTY SCHOOL DISTRICT C-1",
      "DE BEQUE 49JT",
      "DEER TRAIL 26J",
      "DEL NORTE C-7",
      "DELTA COUNTY 50(J)",
      "DENVER COUNTY 1",
      "DOLORES COUNTY RE NO.2",
      "DOLORES RE-4A",
      "DOUGLAS COUNTY RE 1",
      "DURANGO 9-R",
      "EADS RE-1",
      "EAGLE COUNTY RE 50",
      "EAST GRAND 2",
      "EAST OTERO R-1",
      "EATON RE-2",
      "EDISON 54 JT",
      "ELBERT 200",
      "ELIZABETH C-1",
      "ELLICOTT 22",
      "ENGLEWOOD 1",
      "ESTES PARK R-3",
      "FALCON 49",
      "FORT MORGAN RE-3",
      "FOUNTAIN 8",
      "FOWLER R-4J",
      "FREMONT RE-2",
      "FRENCHMAN RE-3",
      "GARFIELD 16",
      "GARFIELD RE-2",
      "GENOA-HUGO C113",
      "GILPIN COUNTY RE-1",
      "GRANADA RE-1",
      "GREELEY 6",
      "GUNNISON WATERSHED RE1J",
      "HANOVER 28",
      "HARRISON 2",
      "HAXTUN RE-2J",
      "HAYDEN RE-1",
      "HI-PLAINS R-23",
      "HINSDALE COUNTY RE 1",
      "HOEHNE REORGANIZED 3",
      "HOLLY RE-3",
      "HOLYOKE RE-1J",
      "HUERFANO RE-1",
      "IDALIA RJ-3",
      "IGNACIO 11 JT",
      "JEFFERSON COUNTY R-1",
      "JOHNSTOWN-MILLIKEN RE-5J",
      "JULESBURG RE-1",
      "KARVAL RE-23",
      "KIM REORGANIZED 88",
      "KIOWA C-2",
      "KIT CARSON R-1",
      "LA VETA RE-2",
      "LAKE COUNTY R-1",
      "LAMAR RE-2",
      "LAS ANIMAS RE-1",
      "LEWIS-PALMER 38",
      "LIBERTY J-4",
      "LIMON RE-4J",
      "LITTLETON 6",
      "LONE STAR 101",
      "MANCOS RE-6",
      "MANITOU SPRINGS 14",
      "MANZANOLA 3J",
      "MAPLETON 1",
      "MC CLAVE RE-2",
      "MEEKER RE1",
      "MESA COUNTY VALLEY 51",
      "MIAMI/YODER 60 JT",
      "MOFFAT 2",
      "MOFFAT COUNTY RE:NO 1",
      "MONTE VISTA C-8",
      "MONTEZUMA-CORTEZ RE-1",
      "MONTROSE COUNTY RE-1J",
      "MOUNTAIN VALLEY RE 1",
      "NORTH CONEJOS RE-1J",
      "NORTH PARK R-1",
      "NORWOOD R-2J",
      "OTIS R-3",
      "OURAY R-1",
      "PARK COUNTY RE-2",
      "PAWNEE RE-12",
      "PEYTON 23 JT",
      "PLAINVIEW RE-2",
      "PLATEAU RE-5",
      "PLATEAU VALLEY 50",
      "PLATTE CANYON 1",
      "PLATTE VALLEY RE-7",
      "POUDRE R-1",
      "PRAIRIE RE-11",
      "PRIMERO REORGANIZED 2",
      "PRITCHETT RE-3",
      "PUEBLO CITY 60",
      "PUEBLO COUNTY 70",
      "RANGELY RE-4",
      "REVERE SCHOOL DISTRICT",
      "RIDGWAY R-2",
      "ROARING FORK RE-1",
      "ROCKY FORD R-2",
      "SALIDA R-32",
      "SANFORD 6J",
      "SANGRE DE CRISTO RE-22J",
      "SARGENT RE-33J",
      "SCHOOL DISTRICT 27J",
      "SHERIDAN 2",
      "SIERRA GRANDE R-30",
      "SILVERTON 1",
      "SOUTH CONEJOS RE-10",
      "SOUTH ROUTT RE 3",
      "SPRINGFIELD RE-4",
      "ST VRAIN VALLEY RE 1J",
      "STEAMBOAT SPRINGS RE-2",
      "STRASBURG 31J",
      "STRATTON R-4",
      "SUMMIT RE-1",
      "SWINK 33",
      "TELLURIDE R-1",
      "THOMPSON R2-J",
      "TRINIDAD 1",
      "VALLEY RE-1",
      "VILAS RE-5",
      "WALSH RE-1",
      "WELD COUNTY RE-1",
      "WELD COUNTY S/D RE-8",
      "WELD COUNTY SCHOOL DISTRICT RE-3J",
      "WELDON VALLEY RE-20(J)",
      "WEST END RE-2",
      "WEST GRAND 1-JT",
      "WESTMINSTER PUBLIC SCHOOLS",
      "WIDEFIELD 3",
      "WIGGINS RE-50(J)",
      "WILEY RE-13 JT",
      "WINDSOR RE-4",
      "WOODLAND PARK RE-2",
      "WOODLIN R-104",
      "WRAY RD-2",
      "YUMA 1"
    ];
    $("#filterSchoolsLink").click(function() {
      for (var i = 0; i < school_districts.length; i++) {
        $("#selectDistrict").append("<option>" + school_districts[i] + "</option>");
      }
    });
  });
});
