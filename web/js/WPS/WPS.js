/******************************************************************************
* Project: WPS
* Module:  WPS.js
* Purpose: Core library of the WPS project
* Author:  Paul M. Breen
* Date:    2013-10-28
* Id:      $Id$
******************************************************************************/

/**
 * WPS
 *
 * @fileOverview WPS Class, built on the OpenLayers WPS support
 * @name WPS
 */

/* The WPS object is built on top of OpenLayers */
if(typeof OpenLayers !== "undefined" && OpenLayers !== null) {

  /* Create the WPS namespace */
  if(typeof WPS === "undefined") {
    /* Enable internationalisation of all error messages */
    OpenLayers.Lang.setCode("en");
    OpenLayers.Util.extend(OpenLayers.Lang.en, {
      "WPSGetCapabilitiesErrorMessage": "WPS Get Capabilities failed: ",
      "WPSExecuteErrorMessage": "WPS Execute failed: ",
      "WPSDescribeProcessErrorMessage": "WPS Describe Process failed: "
    });

    /* This library uses a proxy host.  Change the path accordingly */
    OpenLayers.ProxyHost = "/cgi-bin/proxy.cgi?url=";

    /**
     * WPS Class
     */
    var WPS = OpenLayers.Class({
      url: null,
      events: null,
      capsFormatter: null,
      execFormatter: null,
      processDescFormatter: null,
      config: null,
      CLASS_NAME: "WPS",

      /**
       * Constructor for a WPS object
       *
       * @constructor
       */
      initialize: function(options) {
        this.url = null;
        this.events = new OpenLayers.Events(this);
        this.capsFormatter = new OpenLayers.Format.WPSCapabilities();
        this.execFormatter = new OpenLayers.Format.WPSExecute();
        this.processDescFormatter = new OpenLayers.Format.WPSDescribeProcess();
        this.config = {
          version: "1.0.0",
          async: true,
          execution: {
            responseFormatType: "text/plain",
            outputId: "output"
          }
        };
        OpenLayers.Util.extend(this, options);
      },

      /**
       * Destructor for a WPS object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Copy mandatory properties from 'this' to the given object
       */
      copyMandatoryObjectProperties: function(obj) {
        if(typeof obj === "object") {
          obj.config = this.config;
          obj.url = this.url;
        }

        return obj;
      },

      /**
       * Register a user-supplied function as an event handler
       */
      registerUserCallback: function(params) {
        if(WPS.Utils.isValidObject(params)) {
          if(typeof params.event === "string" && typeof params.callback === "function") {
            if(!WPS.Utils.isValidObject(params.scope)) {
              params.scope = this;
            }
            this.events.register(params.event, params.scope, params.callback);
          }
        }
      },

      /**
       * Unregister a previously assigned event handler
       */
      unregisterUserCallback: function(params) {
        if(WPS.Utils.isValidObject(params)) {
          if(typeof params.event === "string" && typeof params.callback === "function") {
            if(!WPS.Utils.isValidObject(params.scope)) {
              params.scope = this;
            }
            this.events.unregister(params.event, params.scope, params.callback);
          }
        }
      },

      /**
       * Request the capabilities document from the WPS
       */
      getCapabilities: function(callback) {
        var params = {"service": "WPS", "request": "GetCapabilities", "AcceptVersions": this.config.version};
        var paramString = OpenLayers.Util.getParameterString(params);
        var url = OpenLayers.Util.urlAppend(this.url, paramString);

        // Optionally the caller can register a callback for the caps request
        if(arguments.length > 0) {
          this.registerUserCallback({event: "wpsCapsAvailable", scope: this, callback: callback});
        }

        OpenLayers.Request.GET({
          url: url,
          scope: this,
          async: this.config.async,
          failure: function() {
            alert(OpenLayers.i18n("WPSGetCapabilitiesErrorMessage") + url);
          },
          success: this._parseCapabilities
        });
      },

      /**
       * Parse the capabilities document of the WPS & notify any listeners
       */
      _parseCapabilities: function(response) {
        this.WPSCapabilities = this.capsFormatter.read(response.responseXML || response.responseText);
        this.events.triggerEvent("wpsCapsAvailable", {response: response});
      },

      /**
       * Validate the internal capabilities object
       */
      haveValidCapabilitiesObject: function() {
        return WPS.Utils.isValidObject(this.WPSCapabilities);
      },

      /**
       * Get the (raw) offering list
       */
      getOfferingList: function() {
        return (this.haveValidCapabilitiesObject() ? this.WPSCapabilities.processOfferings : null);
      },

      /**
       * Get the offering IDs
       */
      getOfferingIds: function() {
        var result = [];

        if(this.haveValidCapabilitiesObject()) {
          for(var id in this.WPSCapabilities.processOfferings) {
            result.push(id);
          }
        }

        return result;
      },

      /**
       * Get the offering names (last component of the ID)
       */
      getOfferingNames: function() {
        var result = [];

        if(this.haveValidCapabilitiesObject()) {
          for(var id in this.WPSCapabilities.processOfferings) {
            var fqid = this.WPSCapabilities.processOfferings[id].identifier;
            var lastComponent = WPS.Utils.idToName(fqid);
            result.push(lastComponent);
          }
        }

        return result;
      },

      /**
       * Get the offering titles
       */
      getOfferingTitles: function() {
        var result = [];

        if(this.haveValidCapabilitiesObject()) {
          for(var id in this.WPSCapabilities.processOfferings) {
            result.push(this.WPSCapabilities.processOfferings[id].title);
          }
        }

        return result;
      },

      /**
       * Get an WPS.Offering object given an offering ID
       */
      getOffering: function(id) {
        var offering;

        if(this.haveValidCapabilitiesObject()) {
          var o = this.WPSCapabilities.processOfferings[id];

          if(WPS.Utils.isValidObject(o)) {
            o.id = id;
            this.copyMandatoryObjectProperties(o);
            offering = new WPS.Offering(o);
          }
        }

        return offering;
      },

      /**
       * Execute process for a given process ID with given parameters
       */
      executeProcessForProcessId: function(processId, options) {
        var params = options;

        // Setup some default parameters
        if(processId) {
          params.identifier = processId;
        }
        if(!params.responseForm) {
          params.responseForm = {
            rawDataOutput: {
              mimeType: this.config.execution.responseFormatType,
              identifier: this.config.execution.outputId
            }
          };
        }
        var xml = this.execFormatter.write(params);
        OpenLayers.Request.POST({
          url: this.url,
          scope: this,
          async: this.config.async,
          failure: function() {
            alert(OpenLayers.i18n("WPSExecuteErrorMessage") + this.url);
          },
          success: this._parseExecutionResult,
          data: xml
        });
      },

      /**
       * Execute process for a given WPS.Offering object with given parameters
       */
      executeProcessForOffering: function(offering, options) {
        this.executeProcessForProcessId(offering.identifier, options);
      },

      /**
       * Parse the execution result & notify any listeners
       */
      _parseExecutionResult: function(response) {
        this.WPSExecutionResult = {
          text: response.responseText,
          xml: response.responseXML
        };
        this.events.triggerEvent("wpsExecResultAvailable", {response: response});
      },

      /**
       * Validate the internal execution result object
       */
      haveValidExecutionResultObject: function() {
        return WPS.Utils.isValidObject(this.WPSExecutionResult);
      },

      /**
       * Get the description for each process in a given list of process IDs
       */
      describeProcessForProcessIdList: function(processIds) {
        /* Build the request document */
        var params = {
          identifiers: processIds
        };
        var xml = this.processDescFormatter.write(params);
        OpenLayers.Request.POST({
          url: this.url,
          scope: this,
          async: this.config.async,
          failure: function() {
            alert(OpenLayers.i18n("WPSDescribeProcessErrorMessage") + this.url);
          },
          success: this._parseProcessDescription,
          data: xml
        });
      },

      /**
       * Get the description for a given WPS.Offering process
       */
      describeProcessForOffering: function(offering) {
        this.describeProcessForProcessIdList([offering.identifier]);
      },

      /**
       * Parse the describe process result & notify any listeners
       */
      _parseProcessDescription: function(response) {
        this.WPSProcessDescription = this.processDescFormatter.read(response.responseXML || response.responseText);
        this.events.triggerEvent("wpsProcessDescriptionAvailable", {response: response});
      },

      /**
       * Validate the internal process description object
       */
      haveValidProcessDescriptionObject: function() {
        return WPS.Utils.isValidObject(this.WPSProcessDescription);
      },

      /**
       * Get a count of the number of records contained in the internal
       * process descriptions object
       */
      getCountOfProcessDescriptions: function() {
        var n = 0;

        if(this.haveValidProcessDescriptionObject()) {
          var d = this.WPSProcessDescription.processDescriptions;

          for(var p in d) {
            n++;
          }
        }

        return n;
      },

      /**
       * Get the process description for the given index from the internal
       * process descriptions object
       */
      getProcessDescriptionRecord: function(i) {
        var n = 0;
        var record = {};

        if(this.haveValidProcessDescriptionObject()) {
          var d = this.WPSProcessDescription.processDescriptions;

          for(var p in d) {
            if(n == i) {
              record = d[p];
              break;
            }
            n++;
          }
        }

        return record;
      },

      /**
       * Get the process description for the given ID from the internal
       * process descriptions object
       */
      getProcessDescriptionRecordForId: function(id) {
        var record = {};

        if(this.haveValidProcessDescriptionObject()) {
          record = this.WPSProcessDescription.processDescriptions[id];
        }

        return record;
      }
    });

    /**
     * WPS.Offering Class
     *
     * Inherits from:
     *  - <WPS>
     */
    WPS.Offering = OpenLayers.Class(WPS, {
      url: null,
      events: null,
      capsFormatter: null,
      execFormatter: null,
      processDescFormatter: null,
      config: null,
      CLASS_NAME: "WPS.Offering",

      /**
       * Constructor for a WPS.Offering object
       *
       * @constructor
       */
      initialize: function(options) {
        this.url = null;
        this.events = new OpenLayers.Events(this);
        this.capsFormatter = new OpenLayers.Format.WPSCapabilities();
        this.execFormatter = new OpenLayers.Format.WPSExecute();
        this.processDescFormatter = new OpenLayers.Format.WPSDescribeProcess();
        this.config = {
          version: "1.0.0",
          async: true,
          execution: {
            responseFormatType: "text/plain",
            outputId: "output"
          }
        };
        OpenLayers.Util.extend(this, options);
      },

      /**
       * Destructor for a WPS.Offering object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Get the process ID
       */
      getId: function() {
        return this.identifier || this.id;
      },

      /**
       * Get the process name (last component of the ID)
       */
      getName: function() {
        return WPS.Utils.idToName(this.getId());
      },

      /**
       * Get the process title
       */
      getTitle: function() {
        return this.title;
      },

      /**
       * Get the process version
       */
      getVersion: function() {
        return this.processVersion;
      },

      /**
       * Execute process of this offering with given parameters
       */
      executeProcess: function(options, callback) {
        // Optionally the caller can register a callback for the exec request
        if(arguments.length > 1) {
          this.registerUserCallback({event: "wpsExecResultAvailable", scope: this, callback: callback});
        }

        // Inherited from WPS parent class
        this.executeProcessForOffering(this, options);
      },

      /**
       * Get the description of the process of this offering
       */
      describeProcess: function(callback) {
        // Optionally the caller can register a callback for the desc request
        if(arguments.length > 0) {
          this.registerUserCallback({event: "wpsProcessDescriptionAvailable", scope: this, callback: callback});
        }

        // Inherited from WPS parent class
        this.describeProcessForOffering(this);
      },

      /**
       * Get the process description for this offering from the internal
       * process descriptions object
       */
      getProcessDescriptionRecord: function() {
        // Inherited from WPS parent class
        return this.getProcessDescriptionRecordForId(this.getId());
      }
    });

    /**
     * WPS.Utils namespace.  Utility functions for WPS classes
     */
    WPS.Utils = {
      isValidObject: function(x) {
        return (typeof x !== "undefined" && x !== null);
      },

      isArray: function(x) {
        return (Object.prototype.toString.call(x) === "[object Array]");
      },

      idToName: function(x) {
        var y = x;
 
        if(typeof x == "string") {
          y = x.replace(/^.*\./, "");
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.idToName(x[i]));
          }
        }

        return y;
      },

      lookupIdFromName: function(x, a) {
        var y = x;

        if(typeof x == "string") {
          for(var i = 0, len = a.length; i < len; i++) {
            if(this.idToName(a[i]) === x) {
              y = a[i];
              break;
            }
          }
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.lookupIdFromName(x[i], a));
          }
        }

        return y;
      },

      newlineToBr: function(x) {
        var y = x;

        if(typeof x == "string") {
          y = x.replace(/(\r\n|\n|\r)/g, "<br/>");
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.newlineToBr(x[i]));
          }
        }

        return y;
      }
    };

    /* OpenLayers formatters for parsing various WPS response documents.
       These are missing from a stock OpenLayers install */

    /**
     * Method: write
     *
     * Parameters:
     * options - {Object} Optional object.
     *
     * Returns:
     * {String} An WPS DescribeProcess request XML string.
     */
    OpenLayers.Format.WPSDescribeProcess.prototype.write = function(options) {
        var node = this.writeNode("wps:DescribeProcess", options);

        return OpenLayers.Format.XML.prototype.write.apply(this, [node]);
    } 

    /**
     * Property: writers
     * As a compliment to the readers property, this structure contains public
     *     writing functions grouped by namespace alias and named like the
     *     node names they produce.
     */
    OpenLayers.Format.WPSDescribeProcess.prototype.writers = {
        "wps": {
            "DescribeProcess": function(options) {
                var node = this.createElementNSPlus("DescribeProcess", {
                    attributes: {
                        version: this.VERSION,
                        service: 'WPS',
                        "xsi:schemaLocation": this.schemaLocation
                    } 
                }); 
                // For convenience, we allow a single ID, or a list of IDs
                if (options.identifier) {
                    this.writeNode("ows:Identifier", options.identifier, node);
                }
                if (options.identifiers) {
                    for (var i = 0, len = options.identifiers.length; i < len; i++) {
                        this.writeNode("ows:Identifier", options.identifiers[i], node);
                    }
                }
                return node; 
            }
        },
        "ows": OpenLayers.Format.OWSCommon.v1.prototype.writers.ows
    }
  }
}

