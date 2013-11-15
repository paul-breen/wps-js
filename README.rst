Introduction
============

WPS.js is a Javascript library to browse, describe, and execute, algorithms from an Open Geospatial Consortium (`OGC`_) Web Processing Service (`WPS`_).

Overview of the WPS Library
---------------------------

The library consists of a number of modules, which along with their dependencies build a layered abstraction for communicating with a WPS.

The core module - WPS.js, contains a number of objects that encapsulate core concepts of WPS, such as managing the service connection parameters, the service's capabilities document, methods to access the service's algorithm [#aka_process]_ offerings, algorithm descriptions etc.  It also contains various utility functions, available as methods of the WPS.Utils object.  The objects of this module are:

- WPS
- WPS.Offering
- WPS.Utils

This module is built on top of `OpenLayers`_, for low-level WPS request/response handling.

The user interface module - WPS.Ui.js, contains the UI components of the library.  These components can be used to build a WPS web application, or to integrate WPS functionality into an existing web application, such as a specialised instance of the default SOS.App web application from the SOS.js library.  The objects of this module are:

- WPS.Menu
- WPS.Info

This module is built on top of `OpenLayers`_ which provides low-level request/response handling, and `jQuery`_ for the UI and plumbing.

All the styling for the UI components is contained in the library style sheet - WPS.Styles.css.

Example Usage
-------------

Here we discuss examples of using the various objects of the library.  For fully working examples, see the examples directory in the library distribution.

WPS
^^^

The core WPS object can be used for low-level communication with a WPS.  After instantiating a WPS object, the user then interacts with the object via a series of event handling callbacks.

To instantiate a WPS object, we pass it a number of options.  Only the URL to the WPS is required, so at its simplest, this will suffice::

  var options = {
    url: "http://sosmet.nerc-bas.ac.uk:8080/wpsmet/WebProcessingService"
  };

  var wps = new WPS(options);

Typically the first thing that is required after instantiation, is to fetch the capabilities document of the WPS.  As this call is asynchronous, we need to setup a callback to handle the ``wpsCapsAvailable`` event, which signifies that the WPS object has received and parsed the capabilities document from the given WPS.  We can accomplish this via the following::

  wps.registerUserCallback({
    event: "wpsCapsAvailable",
    scope: this,
    callback: capsHandler
  });

  wps.getCapabilities();

  function capsHandler(evt) {
  ...

whereupon our ``capsHandler`` function can then inspect the capabilities of the WPS via the available method calls of the WPS object [#WPSCapabilities]_.  As a convenience, we can pass the name of our callback function as an argument to the ``getCapabilities`` call, which will then register this callback function to handle the ``wpsCapsAvailable`` event with a scope of ``this``; so identical to the above explicit ``registerUserCallback`` call::

  wps.getCapabilities(capsHandler);

To unregister a callback, we can issue the following::

  wps.unregisterUserCallback({
    event: "wpsCapsAvailable",
    scope: this,
    callback: capsHandler
  });

Once we have our capabilities document, we can inspect the available algorithm offerings of the given WPS::

  var offIds = wps.getOfferingIds();
  var offNames = wps.getOfferingNames();
  var offTitles = wps.getOfferingTitles();
 
WPS.Offering
^^^^^^^^^^^^

Once we've identified an algorithm offering we're interested in, we can fetch a WPS.Offering object that encapsulates that offering::

  var offering = wps.getOffering(offId);

We can inspect the details of a particular offering, via its method calls:: 

  var offId = offering.getId();
  var offName = offering.getName();
  var offTitle = offering.getTitle();
  var offVersion = offering.getVersion();

and furthermore we can fetch metadata describing the algorithm that the offering encapsulates.  This is an asynchronous call, so just like the capabilities call above, we can explicitly setup a callback event handler::

  offering.registerUserCallback({
    event: "wpsProcessDescriptionAvailable",
    scope: this,
    callback: descHandler
  });

  offering.describeProcess();

  function descHandler(evt) {
  ...

or alternatively, we can use the convenience of passing our callback function as an argument to the ``describeProcess`` call::

  offering.describeProcess(descHandler);

In our description handler, we can then retrieve the description record for the offering::

  var rec = offering.getProcessDescriptionRecord();

Note that we can also access algorithm descriptions directly from a WPS object (rather than a WPS.Offering object).  There are a number of methods to achieve this::

  wps.describeProcessForProcessIdList(offIds);        // For multiple offerings

or::

  wps.describeProcessForOffering(offering);           // For single offering

and then respectively::

  for(var i = 0, len = this.getCountOfProcessDescriptions(); i < len; i++) {
    var rec = wps.getProcessDescriptionRecord(i);
  }

or::

  var rec = wps.getProcessDescriptionRecordForId(offId);

The description record that is returned by a call to ``getProcessDescriptionRecord`` (or similar methods of a WPS object) has the following structure::

  {
    processVersion: "1.0.0",
    statusSupported: true,
    storeSupported: true,
    identifier: "org.n52.wps.server.r.metMonthlyMeans",
    title: "Met Monthly Means",
    abstract: "Calculate monthly means from the BAS Meteorological SOS instance for a given dataset, variable and year",
    dataInputs: [
      {
        maxOccurs: 1,
        minOccurs: 0,
        identifier: "url",
        title: "SOS instance URL",
        literalData: {
          dataType: "",
          anyValue: true
        }
      },
      ...
    ],
    processOutputs: [
      {
        identifier: "output",
        title: "calculated monthly means",
        complexOutput: {
          default: {
            formats: {
              'text/plain': true
            }
          },
          supported: {
            formats: {
              'text/plain': true
            }
          }
        }
      },
      {
        identifier: "sessionInfo",
        title: "Information about the R session which has been used",
        abstract: "Output of the sessionInfo()-method after R-script execution",
        complexOutput: {
          default: {
            formats: {
              'text/plain': true
            }
          },
          supported: {
            formats: {
              'text/plain': true
            }
          }
        }
      },
      {
        identifier: "warnings",
        title: "Warnings from R",
        abstract: "Output of the warnings()-method after R-script execution",
        complexOutput: {
          default: {
            formats: {
              'text/plain': true
            }
          },
          supported: {
            formats: {
              'text/plain': true
            }
          }
        }
      }
    ]
  }

Lastly, we can request that the WPS actually execute the algorithm of a given offering, with a given set of parameters.  This is an asynchronous call, so just as the previous calls above, we can explicitly setup a callback event handler::

  // Set the specific parameters required by this particular algorithm
  var params = {
    dataInputs: [
      {identifier: "offeringId", data: {literalData: {value: "HalleyMet"}}},
      {identifier: "observedPropertyId", data: {literalData: {value: "urn:ogc:def:phenomenon:OGC:1.0.30:air_temperature"}}},
      {identifier: "year", data: {literalData: {value: "2013"}}}
    ]
  };
  offering.registerUserCallback({
    event: "wpsExecResultAvailable",
    callback: execHandler
  });
  offering.executeProcess(params);

  function execHandler(evt) {
  ...

or alternatively, we can use the convenience of passing our callback function as an argument to the ``executeProcess`` call::

  offering.executeProcess(params, execHandler);

As with the ``describeProcess`` call above, we can also execute an algorithm directly from a WPS object, via either of the following calls::

  wps.executeProcessForProcessId(offId, params);
  wps.executeProcessForOffering(offering, params);

In our execution result handler, we can then retrieve the output results of running the algorithm.  Note that, as WPS can run arbitrary processing on given inputs, then there is little sense in providing further common abstractions to the returned output results.  Instead, the results are directly available as the ``WPSExecutionResult`` property of the calling object (WPS or WPS.Offering).  If the results were returned as plain text, then they are stored in the ``text`` property of ``WPSExecutionResult``, whereas if they were returned as XML, then they are stored in the ``xml`` property of ``WPSExecutionResult``.

For example, after executing an algorithm that returns plain text, we would access the results in our handler function via::

  var rawResults = offering.WPSExecutionResult.text;

Note that future versions of this library should support all returned mimetypes of WPS algorithms, such as ``image/tiff`` (stored in ``WPSExecutionResult.image.tiff``) etc.

.. rubric:: Footnotes
.. [#aka_process] The terms algorithm and process (and offering) are used interchangeably in WPS.
.. [#WPSCapabilities] The parsed capabilities document is stored as a JSON object in the WPS object as ``this.WPSCapabilities``.  The structure of this document may change in future versions of the library, so direct access is discouraged.

.. _OGC: http://www.opengeospatial.org/
.. _WPS: http://www.opengeospatial.org/standards/wps
.. _OpenLayers: http://openlayers.org/
.. _jQuery: http://jquery.com/
