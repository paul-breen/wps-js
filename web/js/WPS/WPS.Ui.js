/******************************************************************************
* Project: WPS
* Module:  WPS.Ui.js
* Purpose: User Interface library of the WPS project
* Author:  Paul M. Breen
* Date:    2013-11-01
* Id:      $Id$
******************************************************************************/

/**
 * WPS.Ui
 *
 * @fileOverview WPS.Ui Classes, built on the WPS Class (which in turn is
 * built on the OpenLayers WPS support)
 * @name WPS.Ui
 */

/* The WPS.Ui objects are built on top of WPS, OL & jQuery */
if(typeof OpenLayers !== "undefined" && OpenLayers !== null &&
   typeof WPS !== "undefined" && WPS !== null &&
   typeof jQuery !== "undefined" && jQuery !== null) {

  /* Create the WPS.Ui namespace */
  if(typeof WPS.Ui === "undefined") {
    /**
     * WPS.Ui Class
     * Base class for WPS User Interface objects.  This class marshalls access
     * to underlying WPS core objects, such as WPS, WPS.Offering etc.
     */
    WPS.Ui = OpenLayers.Class({
      url: null,
      wps: null,
      offering: null,
      CLASS_NAME: "WPS.Ui",

      /**
       * Constructor for a WPS.Ui object
       *
       * @constructor
       */
      initialize: function(options) {
        this.url = null;
        this.wps = null;
        this.offering = null;
        jQuery.extend(true, this, options);
      },

      /**
       * Destructor for a WPS.Ui object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Set the internal WPS object
       */
      setWps: function(obj) {
        if(obj instanceof WPS) {
          this.wps = obj;
        }
      },

      /**
       * Get the internal WPS object
       */
      getWps: function() {
        if(!this.haveValidWpsObject()) {
          if(WPS.Utils.isValidObject(this.url)) {
            this.wps = new WPS({url: this.url});
          }
        }

        return this.wps;
      },

      /**
       * Validate the internal WPS object
       */
      haveValidWpsObject: function() {
        return WPS.Utils.isValidObject(this.wps);
      },

      /**
       * Get the internal wps.WPSCapabilities object
       */
      getCapabilities: function(callback) {
        if(!this.haveValidWpsObject()) {
          this.getWps();
        }

        if(this.haveValidWpsObject()) {
          if(!this.wps.haveValidCapabilitiesObject()) {
            // Optionally the caller can register a callback for caps request
            if(arguments.length > 0) {
              this.wps.registerUserCallback({event: "wpsCapsAvailable", scope: this, callback: callback});
            }
            this.wps.getCapabilities();
          }
        }
      },

      /**
       * Validate the internal wps.WPSCapabilities object
       */
      haveValidCapabilitiesObject: function() {
        return (this.haveValidWpsObject() && this.wps.haveValidCapabilitiesObject());
      },

      /**
       * Set the internal WPS.Offering object
       */
      setOffering: function(obj) {
        if(obj instanceof WPS.Offering) {
          this.offering = obj;
        }
      },

      /**
       * Get the internal WPS.Offering object
       */
      getOffering: function() {
        if(!this.haveValidCapabilitiesObject()) {
          this.getCapabilities(this._getOffering);
        } else {
          this._getOffering();
        }

        return this.offering;
      },

      /**
       * Store the internal WPS.Offering object from a call to
       * wps.getOffering()
       */
      _getOffering: function() {
        if(WPS.Utils.isValidObject(this.offeringId)) {
          this.offering = this.wps.getOffering(this.offeringId);
        }
      },

      /**
       * Validate the internal WPS.Offering object
       */
      haveValidOfferingObject: function() {
        return WPS.Utils.isValidObject(this.offering);
      }
    });
  }

  /* Create the WPS.Menu namespace */
  if(typeof WPS.Menu === "undefined") {
    /**
     * WPS.Menu Class
     * Class for displaying a menu of data served from a WPS
     *
     * Inherits from:
     *  - <WPS.Ui>
     */
    WPS.Menu = OpenLayers.Class(WPS.Ui, {
      url: null,
      wps: null,
      config: null,
      CLASS_NAME: "WPS.Menu",

      /**
       * Constructor for a WPS.Menu object
       *
       * @constructor
       */
      initialize: function(options) {
        this.url = null;
        this.wps = null;
        this.config = {
          menu: {
            object: null,
            id: "wpsMenu",
            entries: [],
            step: 0,
            options: {
              tabs: {
                offerings: {
                  active: true,
                  label: "Algorithms",
                  prompt: ""
                }
              },
              listBoxes: {
                multiple: false,
                size: 5,
                useSelectBox: false
              },
              createNewItem: false,
              promptForSelection: true,
              searchOfferings: {
                active: true,
                label: "Search",
                prompt: ""
              },
              listAllOfferings: {
                active: true,
                label: "List all Algorithms",
                prompt: "or alternatively"
              }
            }
          }
        };
        jQuery.extend(true, this, options);
      },

      /**
       * Destructor for a WPS.Menu object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Set options for the menu
       */
      setMenuOptions: function(options) {
        jQuery.extend(true, this.config.menu.options, options);
      },

      /**
       * Set the menu initially empty (waiting for an FOI to be provided)
       */
      setInitialViewBlank: function() {
        this.config.menu.step = -1;
      },

      /**
       * Generate the menu using this object's properties to query the WPS
       */
      display: function(options) {
        // Parameters can optionally be tweaked for each call
        if(arguments.length > 0) {
          jQuery.extend(true, this, options);
        }

        if(!this.haveValidCapabilitiesObject()) {
          this.getCapabilities(this._display);
        } else {
          this._display();
        }
      },

      /**
       * Get data from the WPS according to this object's properties, & then
       * draw the menu
       */
      _display: function() {
        this.constructMenu();

        // We can use the step property to determine initial menu view
        if(this.config.menu.step == -1) {
          this.config.menu.step = 0;
          this.displayBlankMenu();
        } else if(this.config.menu.step == 1) {
          // For compatibility with SOS.Menu
          this.config.menu.step = 2;
          this.displayBlankMenu();
        } else if(this.config.menu.step == 2) {
          this.config.menu.step = 3;
          if(WPS.Utils.isValidObject(this.config.menu.options.tabs.controls) && this.config.menu.options.tabs.controls.active) {
            this.displayControls();
          }
        } else {
          this.config.menu.step = 1;
          this.displayOfferings();
        }
        if(WPS.Utils.isValidObject(this.config.menu.options.tabs.controls) && this.config.menu.options.tabs.controls.active) {
          this.initControls();
        }
      },

      /**
       * Display an initial empty menu (waiting for an FOI to be provided)
       */
      displayBlankMenu: function() {
        this.initBlankMenu();
      },

      /**
       * Display the offerings
       */
      displayOfferings: function() {
        var tab = jQuery('#' + this.config.menu.id + 'OfferingsTab');
        this.constructOfferingsEntries();
        this.initMenu(tab);
        this.setupOfferingsBehaviour();
        this.constructOfferingsTabControls();
        this.promptForSelection(tab);
      },

      /**
       * Construct the offerings menu entries
       */
      constructOfferingsEntries: function(options) {
        var ids = [], names = [];
        this.config.menu.entries = [];

        ids = this.wps.getOfferingIds();
        names = this.wps.getOfferingTitles();
        for(var i = 0, len = ids.length; i < len; i++) {
          var entry = {value: ids[i], label: names[i]};
          this.config.menu.entries.push(entry);
        }
      },

      /**
       * Setup event handlers to manage the offerings menu behaviour
       */
      setupOfferingsBehaviour: function() {
        var m = jQuery('#' + this.config.menu.id);
        var s = jQuery('#' + this.config.menu.id + 'OfferingsTab > .wps-menu-select-list');

        // List algorithms for each selected offering
        s.bind("change", {self: this}, function(evt) {
          var self = evt.data.self;
          var vals = [];

          /* Ensure vals is array, even if listbox is singular
             (otherwise vals.length is the string length of the entry!) */
          vals = vals.concat(jQuery(this).val());

          for(var i = 0, len = vals.length; i < len; i++) {
            var item = {offering: {id: vals[i]}};

            // We can either create a new item per offering, or update existing
            if(self.config.menu.options.createNewItem) {
              self.setNewItem(item);
            } else {
              self.updateCurrentItem(item);
            }
          }
          // Show metadata for this algorithm
          self.wps.describeProcessForOffering({identifier: item.offering.id});

          // For external listeners (application-level plumbing)
          self.wps.events.triggerEvent("wpsMenuOfferingChange");
        });
      },

      /**
       * Construct the offerings menu tab controls
       */
      constructOfferingsTabControls: function(options) {
        var tab = jQuery('#' + this.config.menu.id + 'OfferingsTab');
        var options = options || {};
        var mOpts = this.config.menu.options;

        // Optionally show the "search offerings" input
        if(mOpts.searchOfferings.active) {
          if(options.showPrompt) {
            tab.append('<p/>', mOpts.searchOfferings.prompt);
          }
          tab.append('<p/>', this.constructSearchOfferingsInput());
        }

        // Optionally show the "list all offerings" link
        if(mOpts.listAllOfferings.active) {
          if(options.showPrompt) {
            tab.append('<p/>', mOpts.listAllOfferings.prompt);
          }
          tab.append('<p/>', this.constructListAllOfferingsLink());
        }
      },

      /**
       * Construct an input (& handler) to search offerings
       */
      constructSearchOfferingsInput: function() {
        var item = this.getCurrentItem();

        // Clone the algorithms entries as source for the search autocomplete
        this.constructOfferingsEntries();
        var src = this.config.menu.entries.slice(0);

        /* Create an autocomplete search box with placeholder text.  Filter
           offerings based on user selection */
        var c = jQuery('<input/>', {
          "class": "wps-watermark wps-menu-search-box",
          value: this.config.menu.options.searchOfferings.label
        }).autocomplete({source: src});

        c.bind("focus", function(evt) {
          var elem = jQuery(this);
          elem.val("");
          elem.removeClass("wps-watermark");
        });

        c.bind("blur", {self: this}, function(evt) {
          var self = evt.data.self;
          var elem = jQuery(this);
          elem.val(self.config.menu.options.searchOfferings.label);
          elem.addClass("wps-watermark");
        });

        c.bind("autocompleteselect", {self: this}, function(evt, ui) {
          var self = evt.data.self;

          if(WPS.Utils.isValidObject(ui) && WPS.Utils.isValidObject(ui.item)) {
            var tab = jQuery('#' + self.config.menu.id + 'OfferingsTab');
            self.config.menu.entries = [];
            self.config.menu.entries.push(ui.item);
            self.initMenu(tab);
            self.setupOfferingsBehaviour();
            self.constructOfferingsTabControls();
            self.promptForSelection(tab);
          }

          return false;
        });

        return c;
      },
 
      /**
       * Construct a link (& handler) to list all offerings
       */
      constructListAllOfferingsLink: function() {
        var l = jQuery('<a/>', {
          text: this.config.menu.options.listAllOfferings.label
        }).button();
        l.bind("click", {self: this}, function(evt) {
          var self = evt.data.self;
          self.displayOfferings();
        });

        return l;
      },

      /**
       * Display the controls
       */
      displayControls: function() {
        var tab = jQuery('#' + this.config.menu.id + 'ControlsTab');
        this.initControls();
        this.promptForSelection(tab);
      },

      /**
       * Initialise the controls
       */
      initControls: function() {
        this.constructControls();
        this.setupControlsBehaviour();
      },

      /**
       * Construct the controls
       */
      constructControls: function() {
        var tab = jQuery('#' + this.config.menu.id + 'ControlsTab');
        var options = this.config.menu.options;

        tab.html("");
      },

      /**
       * Setup event handlers to manage the controls behaviour
       */
      setupControlsBehaviour: function() {
      },

      /**
       * Construct the menu according to this object's properties
       */
      constructMenu: function() {
        var mc1 = jQuery('#' + this.config.menu.id + 'Container');
        var mc2 = jQuery('#' + this.config.menu.id + 'ControlsContainer');
        var m1 = jQuery('#' + this.config.menu.id);
        var m2 = jQuery('#' + this.config.menu.id + 'Controls');

        // If menu container div doesn't exist, create one on the fly
        if(mc1.length < 1) {
          mc1 = jQuery('<div id="' + this.config.menu.id + 'Container" class="wps-menu-container"/>');
          jQuery('body').append(mc1);
        }

        // If menu controls container div doesn't exist, create one on the fly
        if(mc2.length < 1) {
          mc2 = jQuery('<div id="' + this.config.menu.id + 'Container" class="wps-menu-controls-container"/>');
          jQuery('body').append(mc2);
        }

        // If menu div doesn't exist, create one on the fly
        if(m1.length < 1) {
          m1 = jQuery('<div id="' + this.config.menu.id + '" class="wps-menu"/>');
          mc1.append(m1);
        }

        // If menu controls div doesn't exist, create one on the fly
        if(m2.length < 1) {
          m2 = jQuery('<div id="' + this.config.menu.id + 'ControlsPanel" class="wps-menu-controls"/>');
          mc2.append(m2);
        }

        // Construct the menu according to what tabs have been configured
        var tabs = this.constructMenuTabs();

        if(tabs) {
          m1.append(tabs);
        }

        tabs = this.constructMenuControlsTabs();

        if(tabs) {
          m2.append(tabs);
        }

        // Setup menu event handlers
        m1.bind('accordionchange', {self: this}, this.changeMenuTabHandler);
        m2.bind('accordionchange', {self: this}, this.changeMenuTabHandler);

        /* Configure & instantiate the menu.  N.B.: These options do the same
           thing; fillSpace is the older jQuery UI method */
        var opts = {fillSpace: true, heightStyle: "fill"};

        if(this.config.menu.step > -1) {
          opts.active = this.config.menu.step;
        }
        m1.accordion(opts);
        m2.accordion(opts);

        this.config.menu.object = {menu: m1, controls: m2};
      },

      /**
       * Construct menu tabs according to this object's properties
       */
      constructMenuTabs: function() {
        var tabs, text = "";
        var options = this.config.menu.options;

        if(WPS.Utils.isValidObject(options.tabs.offerings) && options.tabs.offerings.active) {
          text += '<h3><a href="#">' + options.tabs.offerings.label + '</a></h3><div id="' + this.config.menu.id + 'OfferingsTab"></div>';
        }

        tabs = jQuery(text);

        return tabs;
      },

      /**
       * Construct menu controls tabs according to this object's properties
       */
      constructMenuControlsTabs: function() {
        var tabs, text = "";
        var options = this.config.menu.options;

        if(WPS.Utils.isValidObject(options.tabs.controls) && options.tabs.controls.active) {
          text += '<h3><a href="#">' + options.tabs.controls.label + '</a></h3><div id="' + this.config.menu.id + 'ControlsTab"></div>';
        }

        tabs = jQuery(text);

        return tabs;
      },

      /**
       * Initialise menu entries according to this object's properties
       */
      initMenu: function(tab) {
        var lb = this.config.menu.options.listBoxes;
        var s = jQuery('<select id="' + this.config.menu.id + 'SelectList"' + (lb.multiple ? ' multiple="multiple"' : '') + (lb.size ? ' size="' + lb.size + '"' : '') + ' class="wps-menu-select-list"></select>');
        var options = [];

        tab.html("");
        tab.append(s);

        // Initialise the menu entries
        for(var i = 0, len = this.config.menu.entries.length; i < len; i++) {
          options.push('<option value="' + this.config.menu.entries[i].value + '">' + this.config.menu.entries[i].label + '</option>');
        }
        s.html(options.join(''));

        if(lb.useSelectBox && typeof jQuery('body').selectBox == "function") {
          // This call uses a jquery plugin to replace vanilla select boxes
          jQuery('.wps-menu-select-list').selectBox();
        }
      },

      /**
       * Initialise an initial blank menu according to this object's properties
       */
      initBlankMenu: function() {
        var options = this.config.menu.options;

        if(WPS.Utils.isValidObject(options.tabs.offerings) && options.tabs.offerings.active) {
          var t = jQuery('#' + this.config.menu.id + 'OfferingsTab');

          if(typeof t.html() == "undefined" || jQuery.trim(t.html()) == "") {
            t.html(options.tabs.offerings.prompt);
            this.constructOfferingsTabControls({showPrompt: true});
          }
        }
        if(WPS.Utils.isValidObject(options.tabs.controls) && options.tabs.controls.active) {
          var t = jQuery('#' + this.config.menu.id + 'ControlsTab');

          if(typeof t.html() == "undefined" || jQuery.trim(t.html()) == "") {
            t.html(options.tabs.controls.prompt);
          }
        }
      },

      /**
       * Setup behaviour for when user moves between menu tabs
       */
      changeMenuTabHandler: function(evt, ui) {
        var self = evt.data.self;
        var options = self.config.menu.options;

        if(WPS.Utils.isValidObject(options.tabs.offerings) && options.tabs.offerings.active) {
          if(ui.newHeader.text() == options.tabs.offerings.label) {
            var t = jQuery('#' + self.config.menu.id + 'OfferingsTab');

            if(typeof t.html() == "undefined" || jQuery.trim(t.html()) == "") {
              t.html(options.tabs.offerings.prompt);
              self.constructOfferingsTabControls({showPrompt: true});
            }
          }
        }
        if(WPS.Utils.isValidObject(options.tabs.controls) && options.tabs.controls.active) {
          if(ui.newHeader.text() == options.tabs.controls.label) {
            var t = jQuery('#' + self.config.menu.id + 'ControlsTab');

            if(typeof t.html() == "undefined" || jQuery.trim(t.html()) == "") {
              t.html(options.tabs.controls.prompt);
            }
          }
        }
      },

      /**
       * Optionally auto-select the given tab as a prompt for selection
       */
      promptForSelection: function(tab) {
        if(this.config.menu.options.promptForSelection) {
          tab.prev('h3[role="tab"]').trigger('click');
        }
      },

      /**
       * Create a new selected item.  The index is returned
       */
      setNewItem: function(item) {
        this.config.menu.selected = this.config.menu.selected || [];
        this.config.menu.selected.push({item: item});

        return (this.config.menu.selected.length - 1);
      },

      /**
       * Get the selected item corresponding to the given index.  If the
       * index is < 0, then it is an offset from the end of the array.  The
       * item is returned or undefined if no such item exists
       */
      getItem: function(index) {
        var item;

        if(WPS.Utils.isValidObject(this.config.menu.selected)) {
          var len = this.config.menu.selected.length || 0;

          if(len > 0) {
            if(index < 0) {
              index = len + index;
            }
            if(index >= 0 && index < len) {
              item = this.config.menu.selected[index].item;
            }
          }
        }

        return item;
      },

      /**
       * Set the selected item corresponding to the given index.  If the
       * index is < 0, then it is an offset from the end of the array.  The
       * (actual, non-negative) index is returned or -1 if no such item exists
       */
      setItem: function(item, index) {
        var len = 0, retval = -1;

        if(WPS.Utils.isValidObject(this.config.menu.selected)) {
          len = this.config.menu.selected.length;
        }
        if(len > 0) {
          if(index < 0) {
            index = len + index;
          }
          if(index >= 0 && index < len) {
            this.config.menu.selected[index].item = item;
            retval = index;
          }
        }

        return retval;
      },

      /**
       * Get the current selected item
       */
      getCurrentItem: function() {
        return this.getItem(-1);
      },

      /**
       * Set the current selected item or create new if no current item exists
       */
      setCurrentItem: function(item) {
        var index = this.setItem(item, -1);

        if(index < 0) {
          index = this.setNewItem(item);
        }

        return index;
      },

      /**
       * Update given properties of the current selected item.  If there is
       * no current item, then one is created
       */
      updateCurrentItem: function(properties) {
        var item = this.getCurrentItem();

        if(WPS.Utils.isValidObject(item)) {
          jQuery.extend(true, item, properties);
          this.setCurrentItem(item);
        } else {
          this.setNewItem(properties);
        }

        return item;
      },

      /**
       * Get the first selected item
       */
      getFirstItem: function() {
        return this.getItem(0);
      },

      /**
       * Update any existing selected items with the given item's time interval
       */
      updateItemsTimeInterval: function(item) {
        if(WPS.Utils.isValidObject(item.time)) {
          if(WPS.Utils.isValidObject(this.config.menu.selected)) {
            var len = this.config.menu.selected.length;

            // Update time interval for any existing selected items
            for(var i = 0; i < len; i++) {
              if(WPS.Utils.isValidObject(this.config.menu.selected[i].item)) {
                this.config.menu.selected[i].item.time = this.config.menu.selected[i].item.time || {};

                if(WPS.Utils.isValidObject(item.time.startDatetime)) {
                  this.config.menu.selected[i].item.time.startDatetime = item.time.startDatetime;
                }
                if(WPS.Utils.isValidObject(item.time.endDatetime)) {
                  this.config.menu.selected[i].item.time.endDatetime = item.time.endDatetime;
                }
              }
            }
          }
        }
      }
    });
  }

  /* Create the WPS.Info namespace */
  if(typeof WPS.Info === "undefined") {
    /**
     * WPS.Info Class
     * Class for displaying supplementary information in a WPS application
     *
     * Inherits from:
     *  - <WPS.Ui>
     */
    WPS.Info = OpenLayers.Class(WPS.Ui, {
      url: null,
      wps: null,
      offering: null,
      config: null,
      CLASS_NAME: "WPS.Info",

      /**
       * Constructor for a WPS.Info object
       *
       * @constructor
       */
      initialize: function(options) {
        this.url = null;
        this.wps = null;
        this.offering = null;
        this.config = {
          info: {
            object: null,
            id: "wpsInfo",
            "class": "wps-info-box",
            eventHandlers: [],
            content: null,
            contentTemplate: null,
            options: {
              show: true,
              makeDraggable: true,
              initialContent: {
                active: true
              },
              contentSection: {
                active: true,
                "class": "wps-info-box-content"
              },
              controlsSection: {
                active: true,
                "class": "wps-info-box-control-section"
              },
              controlsSectionTitle: {
                active: true,
                "class": "wps-info-box-control-section-title",
                label: ""
              },
              showHideControl: {
                active: true,
                "class": "wps-info-box-control ui-icon",
                icons: {
                  show: "ui-icon-triangle-1-s",
                  hide: "ui-icon-triangle-1-e"
                }
              },
              closeControl: {
                active: true,
                "class": "wps-info-box-control-right ui-icon",
                icons: {
                  close: "ui-icon-close"
                }
              }
            }
          }
        };
        jQuery.extend(true, this, options);
      },

      /**
       * Destructor for a WPS.Info object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Set options for the info object
       */
      setInfoOptions: function(options) {
        jQuery.extend(true, this.config.info.options, options);
      },

      /**
       * Set the content for the info panel
       */
      setContent: function(content) {
        this.config.info.content = content;
      },

      /**
       * Get the content for the info panel
       */
      getContent: function() {
        return this.config.info.content;
      },

      /**
       * Append the given content to any existing content for the info panel
       */
      appendToContent: function(content) {
        if(this.config.info.content) {
          this.config.info.content += content;
        } else {
          this.config.info.content = content;
        }
      },

      /**
       * Set the content template for the info panel
       */
      setContentTemplate: function(contentTemplate) {
        this.config.info.contentTemplate = contentTemplate;
      },

      /**
       * Get the content template for the info panel
       */
      getContentTemplate: function() {
        return this.config.info.contentTemplate;
      },

      /**
       * Append the given content template to any existing content template
       * for the info panel
       */
      appendToContentTemplate: function(contentTemplate) {
        if(this.config.info.contentTemplate) {
          this.config.info.contentTemplate += contentTemplate;
        } else {
          this.config.info.contentTemplate = contentTemplate;
        }
      },
 
      /**
       * Initialise the content for the info panel as the content template
       */
      initContentFromTemplate: function() {
        if(this.config.info.contentTemplate) {
          this.setContent(this.config.info.contentTemplate);
        }
      },
 
      /**
       * Substitute matches of the given regexp with the given content against
       * the content template, and store in the content for this info panel
       */
      setContentFromTemplate: function(regexp, content) {
        if(this.config.info.content) {
          this.setContent(this.config.info.content.replace(regexp, content));
        }
      },

      /**
       * Set the title for the info panel
       */
      setTitle: function(title) {
        this.setInfoOptions({controlsSectionTitle: {label: title}});
      },

      /**
       * Set CSS class for the info panel
       */
      setClass: function(c) {
        this.config.info["class"] = c;
      },

      /**
       * Add a CSS class to the info panel
       */
      addClass: function(c) {
        this.config.info["class"] += " " + c;
      },

      /**
       * Add an event handler object to the info panel's event handler array.
       * The event handler object has the form:
       * {event: e, scope: object, callback: function}
       * The callback function will be called in the given scope
       */
      addEventHandler: function(h) {
        this.config.info.eventHandlers.push(h);
      },
   
      /**
       * Generate the info panel
       */
      display: function(options) {
        // Parameters can optionally be tweaked for each call
        if(arguments.length > 0) {
          jQuery.extend(true, this.config.info.options, options);
        }
        if(this.config.info.options.show) {
          this.initInfoPanel();
          this.displayInitialContent();
        }
      },
 
      /**
       * Initialise the info panel
       */
      initInfoPanel: function() {
        var p = jQuery('#' + this.config.info.id);

        // If info panel div doesn't exist, create one on the fly
        if(p.length < 1) {
          p = jQuery("<div></div>", {
            id: this.config.info.id,
            "class": this.config.info["class"]
          });
          jQuery('body').append(p);
        }
        this.config.info.object = p;

        // Setup the info panel & its controls
        if(this.config.info.options.makeDraggable) {
          this.config.info.object.draggable();
        }
        this.addContentSection();
        this.addControlsSection();
        this.addControlsSectionTitle();
        this.addShowHideControl();
        this.addCloseControl();
        this.setupBehaviour();
      },
 
      /**
       * Display the initial content for this info panel
       */
      displayInitialContent: function() {
        if(WPS.Utils.isValidObject(this.config.info.object)) {
          if(this.config.info.options.show && this.config.info.options.initialContent.active) {
            this.displayContent();
          }
        }
      },
 
      /**
       * Display the previously set content for this info panel
       */
      displayContent: function() {
        if(WPS.Utils.isValidObject(this.config.info.object)) {
          var s = this.config.info.object.children("." + this.config.info.options.contentSection["class"]);
          s.html(this.config.info.content);
        }
      },
 
      /**
       * Set the content for this info panel and then display it
       */
      updateContent: function(content) {
        this.setContent(content);
        this.displayContent();
      },
 
      /**
       * Substitute matches of the given regexp with the given content against
       * the content template, and store in the content for this info panel,
       * then display it
       */
      updateContentFromTemplate: function(regexp, content) {
        if(this.config.info.content) {
          this.setContent(this.config.info.content.replace(regexp, content));
          this.displayContent();
        }
      },

      /**
       * Adds a content section to this info panel.  This holds the content
       * of the info panel
       */
      addContentSection: function() {
        if(WPS.Utils.isValidObject(this.config.info.object)) {
          if(this.config.info.options.show && this.config.info.options.contentSection.active) {
            var c = jQuery("<div></div>", {
              "class": this.config.info.options.contentSection["class"]
            });

            // Add the content section to this info panel
            this.config.info.object.append(c);
          }
        }
      },

      /**
       * Adds a controls section to this info panel.  This groups all controls
       * of the info panel
       */
      addControlsSection: function() {
        if(WPS.Utils.isValidObject(this.config.info.object)) {
          if(this.config.info.options.show && this.config.info.options.controlsSection.active) {
            var c = jQuery("<div></div>", {
              "class": this.config.info.options.controlsSection["class"]
            });

            // Add the controls section to this info panel
            this.config.info.object.append(c);
          }
        }
      },

      /**
       * Adds a controls section title to this info panel
       */
      addControlsSectionTitle: function() {
        if(WPS.Utils.isValidObject(this.config.info.object)) {
          if(this.config.info.options.show && this.config.info.options.controlsSectionTitle.active) {
            var c = jQuery("<div></div>", {
              "class": this.config.info.options.controlsSectionTitle["class"],
              html: this.config.info.options.controlsSectionTitle.label
            });

            // Add the control to this info panel's control section
            var s = this.config.info.object.children("." + this.config.info.options.controlsSection["class"]);
            s.append(c);
          }
        }
      },

      /**
       * Adds a show/hide control to this info panel.  This control toggles the
       * visibility of the content of the info panel
       */
      addShowHideControl: function() {
        if(WPS.Utils.isValidObject(this.config.info.object)) {
          if(this.config.info.options.show && this.config.info.options.showHideControl.active) {
            var c = jQuery("<div></div>", {
              "class": this.config.info.options.showHideControl["class"]
            });
            c.addClass(this.config.info.options.showHideControl.icons.show);
            c.bind("click", {self: this}, this.showHideControlClickHandler);

            // Add the control to this info panel's control section
            var s = this.config.info.object.children("." + this.config.info.options.controlsSection["class"]);
            s.append(c);
          }
        }
      },

      /**
       * Event handler for show/hide control click.  This toggles the
       * visibility of the content of the info panel, changing the icon
       * accordingly
       */
      showHideControlClickHandler: function(evt) {
        var c = jQuery(this);
        var icons = evt.data.self.config.info.options.showHideControl.icons;

        if(c.hasClass(icons.show)) {
          c.parent().siblings().hide();
          c.removeClass(icons.show);
          c.addClass(icons.hide);
        } else {
          c.parent().siblings().show();
          c.removeClass(icons.hide);
          c.addClass(icons.show);
        }
      },

      /**
       * Adds a close control to this info panel.  This control closes the
       * info panel (i.e. removes it from the DOM)
       */
      addCloseControl: function() {
        if(WPS.Utils.isValidObject(this.config.info.object)) {
          if(this.config.info.options.show && this.config.info.options.closeControl.active) {
            var c = jQuery("<div></div>", {
              "class": this.config.info.options.closeControl["class"]
            });
            c.addClass(this.config.info.options.closeControl.icons.close);
            c.bind("click", {self: this}, this.closeControlClickHandler);

            // Add the control to this info panel's control section
            var s = this.config.info.object.children("." + this.config.info.options.controlsSection["class"]);
            s.append(c);
          }
        }
      },

      /**
       * Event handler for close control click.  This closes the
       * info panel (i.e. removes it from the DOM)
       */
      closeControlClickHandler: function(evt) {
        var p = evt.data.self.config.info.object;

        if(p) {
          p.remove();
        }
      },

      /**
       * Register all configured event handlers, to manage the info panel's
       * runtime behaviour
       */
      setupBehaviour: function() {
        if(WPS.Utils.isValidObject(this.wps)) {
          for(var i = 0, len = this.config.info.eventHandlers.length; i < len; i++) {
            var h = this.config.info.eventHandlers[i];

            if(WPS.Utils.isValidObject(h) && WPS.Utils.isValidObject(h.event) && WPS.Utils.isValidObject(h.callback)) {
              h.scope = h.scope || this;
              this.wps.registerUserCallback(h);
            }
          }
        }
      }
    });
  }

  /* Create the WPS.Dialog namespace */
  if(typeof WPS.Dialog === "undefined") {
    /**
     * WPS.Dialog Class
     * Class for user-editing of algorithm parameters in a WPS application
     *
     * Inherits from:
     *  - <WPS.Ui>
     */
    WPS.Dialog = OpenLayers.Class(WPS.Ui, {
      url: null,
      wps: null,
      offering: null,
      offeringId: null,
      config: null,
      CLASS_NAME: "WPS.Dialog",

      /**
       * Constructor for a WPS.Dialog object
       *
       * @constructor
       */
      initialize: function(options) {
        this.url = null;
        this.wps = null;
        this.offering = null;
        this.offeringId = null;
        this.config = {
          dialog: {
            object: null,
            id: "wpsDialog",
            parameterList: [],
            eventHandlers: [],
            options: {
              show: true,
              prompt: {
                active: true,
                label: null
              },
              buttons: {
                active: true,
                ok: {
                  label: "OK"
                },
                cancel: {
                  label: "Cancel"
                }
              },
              datePickers: {
                // N.B.: This is a 4-digit year
                dateFormat: "yy-mm-dd",
                autoSize: true,
                changeYear: true,
                changeMonth: true,
                onSelect: function(s, ui) {jQuery(this).trigger('change');}
              },
              title: null,
              position: ['center', 'center'],
              width: 400,
              zIndex: 1010,
              stack: false
            }
          }
        };
        jQuery.extend(true, this, options);
      },

      /**
       * Destructor for a WPS.Dialog object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Set options for the dialog object
       */
      setDialogOptions: function(options) {
        jQuery.extend(true, this.config.dialog.options, options);
      },

      /**
       * Set initial/default values for the algorithm's parameter list
       */
      setParameterList: function(params) {
        this.config.dialog.parameterList = params;
      },

      /**
       * Get the values of the algorithm's parameter list
       */
      getParameterList: function() {
        return this.config.dialog.parameterList;
      },

      /**
       * Set the value of the given parameter property
       */
      setParameterProperty: function(name, property, value) {
        var p = this.getParameterList();

        for(var i = 0, len = p.length; i < len; i++) {
          if(p[i].name == name) {
            p[i][property] = value;
            break;
          }
        }
      },

      /**
       * Get the value of the given parameter property
       */
      getParameterProperty: function(name, property) {
        var value;
        var p = this.getParameterList();

        for(var i = 0, len = p.length; i < len; i++) {
          if(p[i].name == name) {
            value = p[i][property];
            break;
          }
        }

        return value;
      },

      /**
       * Set the values of the given parameter array property
       */
      setParameterArrayProperty: function(name, property, values) {
        var p = this.getParameterList();

        for(var i = 0, len = p.length; i < len; i++) {
          if(p[i].name == name && values.length > 0) {
            p[i][property] = values.shift();
          }
        }
      },

      /**
       * Get the values of the given parameter array property
       */
      getParameterArrayProperty: function(name, property) {
        var values = [];
        var p = this.getParameterList();

        for(var i = 0, len = p.length; i < len; i++) {
          if(p[i].name == name) {
            values.push(p[i][property]);
          }
        }

        return values;
      },

      /**
       * Flatten the values of the given parameter array property.  Remove
       * multiple instances of the parameter in the parameter list, and
       * replace with a single instance containing the flattened property
       */
      flattenParameterArrayProperty: function(name, property, options) {
        var options = options || {separator: ","};
        var a = this.getParameterArrayProperty(name, property);
        var first;

        if(WPS.Utils.isArray(a)) {
          var oldParameters = this.getParameterList();
          var newParameters = [];

          for(var i = 0, len = oldParameters.length; i < len; i++) {
            if(oldParameters[i].name != name) {
              newParameters.push(oldParameters[i]);
            } else {
              if(!first) {
                first = oldParameters[i];
              }
            }
          }
          if(first) {
            first[property] = a.join(options.separator);
            newParameters.push(first);
          }
          this.setParameterList(newParameters);
        }

        return first;
      },

      /**
       * Format the form input parameter list suitable for passing directly
       * to a WPS executeProcess() call
       */
      formatParameterListForExecuteProcess: function() {
        var res = {dataInputs: []};
        var p = this.getParameterList();

        for(var i = 0, len = p.length; i < len; i++) {
          var record = {
            identifier: p[i].name,
            data: {
              literalData: {
                value: p[i].value
              }
            }
          };
          res.dataInputs.push(record);
        }

        return res;
      },

      /**
       * Add an event handler object to the dialog's event handler array.
       * The event handler object has the form:
       * {event: e, scope: object, callback: function}
       * The callback function will be called in the given scope
       */
      addEventHandler: function(h) {
        this.config.dialog.eventHandlers.push(h);
      },

      /**
       * Generate the dialog
       */
      display: function(options) {
        // Parameters can optionally be tweaked for each call
        if(arguments.length > 0) {
          jQuery.extend(true, this.config.dialog.options, options);
        }
        if(!this.haveValidCapabilitiesObject()) {
          this.getCapabilities(this._display);
        } else {
          this._display();
        }
      },

      /**
       * Get data from the WPS according to this object's properties, & then
       * draw the dialog
       */
      _display: function() {
        this._getOffering();

        if(this.haveValidOfferingObject()) {
          if(!this.offering.haveValidProcessDescriptionRecord()) {
            this.getProcessDescriptionRecord();
          } else {
            this.describeProcessHandler();
          }
        }
      },

      /**
       * Get the process description record for the given algorithm
       */
      getProcessDescriptionRecord: function() {
        this.offering.registerUserCallback({
          event: "wpsProcessDescriptionAvailable",
          scope: this,
          callback: this.describeProcessHandler
        });
        this.offering.describeProcess();
      },

      /**
       * Event handler for process description record
       */
      describeProcessHandler: function() {
        if(this.config.dialog.options.show) {
          this.setupBehaviour();
          this.openDialog();
        }
      },

      /**
       * Open a dialog box to configure parameters for this algorithm.  Upon
       * clicking the OK button, the user-edited parameters are available
       * via a call to getParameterList()
       */
      openDialog: function() {
        var panel = jQuery('<form/>');
        var rec = this.offering.getProcessDescriptionRecord();
        var buttons = [];

        panel = this.constructDialogInputForm(panel, rec);
        buttons = this.constructDialogButtons(panel, rec, buttons);
        this.constructDialog(panel, rec, buttons);
      },
 
      /**
       * Construct the dialog's input form
       */
      constructDialogInputForm: function(panel, rec) {
        panel = this.constructDialogInputFormPrompt(panel, rec);

        // Construct the controls for configuring the algorithm
        for(var i = 0, len = rec.dataInputs.length; i < len; i++) {
          var input = rec.dataInputs[i];
          panel = this.constructDialogInputControl(panel, rec, input);
        }
        jQuery("body").after(panel);

        return panel;
      },
  
      /**
       * Construct the prompt for the dialog
       */
      constructDialogInputFormPrompt: function(panel, rec) {
        // Normally, the algorithm's abstract is used as the prompt
        if(this.config.dialog.options.prompt.active) {
          var promptRow = jQuery('<div></div>', {
            "class": "wps-dialog-prompt-row"
          });
          var promptLabel = jQuery('<div></div>', {
            text: this.config.dialog.options.prompt.label || rec.abstract
          });
          promptRow.append(promptLabel);
          panel.append(promptRow);
        }

        return panel;
      },
 
      /**
       * Construct a given input control for the dialog
       */
      constructDialogInputControl: function(panel, rec, input) {
        var type = this.getParameterProperty(input.identifier, "type");
        var inputRow = jQuery('<div></div>', {
          "class": "wps-dialog-control-row"
        });

        // Only show parameters that are not set as hidden
        if(type != "hidden") {
          var inputLabel = jQuery('<div></div>', {
            "class": "wps-dialog-control-label",
            text: this.getParameterProperty(input.identifier, "label") || input.title || input.identifier
          });
          inputRow.append(inputLabel);
        }
        var inputControl;

        // Input control is built according to the parameter's type property
        switch(type) {
          case "select":
          case "multiselect":
            inputControl = this.constructDialogListInputControl(input);
          break;
          case "radio":
            inputControl = this.constructDialogRadioButtonInputControl(input);
          break;
          case "checkbox":
            inputControl = this.constructDialogCheckBoxInputControl(input);
          break;
          case "datepicker":
            inputControl = this.constructDialogDatePickerInputControl(input);
          break;
          default:
            inputControl = this.constructDialogTextInputControl(input);
          break;
        }
        inputRow.append(inputControl);
        panel.append(inputRow);

        return panel;
      },
 
      /**
       * Construct a given text input control for the dialog
       */
      constructDialogTextInputControl: function(input) {
        var inputControl = jQuery('<input></input>', {
          "class": "wps-dialog-control",
          type: this.getParameterProperty(input.identifier, "type") || "text",
          id: input.identifier,
          name: input.identifier,
          value: this.getParameterProperty(input.identifier, "value")
        });

        return inputControl;
      },
 
      /**
       * Construct a given checkbox input control for the dialog
       */
      constructDialogCheckBoxInputControl: function(input) {
        var defaultValue = this.getParameterProperty(input.identifier, "value");
        var inputControl = jQuery('<input></input>', {
          "class": "wps-dialog-control",
          type: "checkbox",
          id: input.identifier,
          name: input.identifier,
          value: defaultValue
        });
        if(defaultValue) {
          inputControl.attr("checked", "checked");
        }

        return inputControl;
      },
 
      /**
       * Construct a given list (select) input control for the dialog
       */
      constructDialogListInputControl: function(input) {
        var entries = this.getParameterProperty(input.identifier, "entries") || [{value: '', label: ''}];
        var defaultValue = this.getParameterProperty(input.identifier, "value") || entries[0].value;
        var inputControl = jQuery('<select></select>', {
          "class": "wps-dialog-select-list",
          id: input.identifier,
          name: input.identifier
        });
        if(this.getParameterProperty(input.identifier, "type") == "multiselect") {
          inputControl.attr("multiple", "multiple");
        }

        for(var i = 0, len = entries.length; i < len; i++) {
          var e = jQuery('<option></option>', {
            value: entries[i].value,
            text: entries[i].label
          });
          if(entries[i].value == defaultValue || entries[i].label == defaultValue) {
            e.attr("selected", "selected");
          }
          inputControl.append(e);
        }

        return inputControl;
      },

      /**
       * Construct a given radio button input control for the dialog
       */
      constructDialogRadioButtonInputControl: function(input) {
        var entries = this.getParameterProperty(input.identifier, "entries") || [{value: '', label: ''}];
        var defaultValue = this.getParameterProperty(input.identifier, "value") || entries[0].value;
        var inputControl = jQuery('<div></div>', {
          "class": "wps-dialog-control",
          id: input.identifier + "Container"
        });

        for(var i = 0, len = entries.length; i < len; i++) {
          var e = jQuery('<input></input>', {
            type: "radio",
            id: input.identifier + i,
            name: input.identifier,
            value: entries[i].value
          });
          if(entries[i].value == defaultValue || entries[i].label == defaultValue) {
            e.attr("checked", "checked");
          }
          var l = jQuery('<span></span>', {
            text: entries[i].label
          });
          inputControl.append(e, l);
        }

        return inputControl;
      },

      /**
       * Construct a given datepicker input control for the dialog
       */
      constructDialogDatePickerInputControl: function(input) {
        var inputControl = jQuery('<input></input>', {
          "class": "wps-dialog-control",
          type: "text",
          id: input.identifier,
          name: input.identifier,
          value: this.getParameterProperty(input.identifier, "value")
        });
        inputControl.datepicker(this.config.dialog.options.datePickers);

        return inputControl;
      },

      /**
       * Construct the dialog's buttons
       */
      constructDialogButtons: function(panel, rec, buttons) {
        var self = this;

        if(this.config.dialog.options.buttons.active) {
          buttons = [
            {
              text: this.config.dialog.options.buttons.ok.label,
              click: function() {
                // Store the user-entered parameters & close the dialog
                self.setParameterList(panel.serializeArray());
                jQuery(this).dialog().dialog("close");

                // For external listeners (application-level plumbing)
                self.wps.events.triggerEvent("wpsDialogOkClick");
              }
            },
            {
              text: this.config.dialog.options.buttons.cancel.label,
              click: function() {
                jQuery(this).dialog().dialog("close");

                // For external listeners (application-level plumbing)
                self.wps.events.triggerEvent("wpsDialogCancelClick");
              }
            }
          ];
        }

        return buttons;
      },
 
      /**
       * Construct the dialog object
       */
      constructDialog: function(panel, rec, buttons) {
        var opts = this.config.dialog.options;
        var dialog = panel.dialog({
          position: opts.position || ['center', 'center'],
          buttons: buttons,
          title: opts.title || rec.title,
          width: opts.width || 400,
          zIndex: opts.zIndex || 1010,
          stack: opts.stack || false
        });
        dialog.bind('dialogclose', function() {
          jQuery(this).dialog().dialog("destroy");
          jQuery(this).remove();
        });

        return dialog;
      },

      /**
       * Register all configured event handlers, to manage the dialog's
       * runtime behaviour
       */
      setupBehaviour: function() {
        if(WPS.Utils.isValidObject(this.wps)) {
          for(var i = 0, len = this.config.dialog.eventHandlers.length; i < len; i++) {
            var h = this.config.dialog.eventHandlers[i];

            if(WPS.Utils.isValidObject(h) && WPS.Utils.isValidObject(h.event) && WPS.Utils.isValidObject(h.callback)) {
              h.scope = h.scope || this;
              this.wps.registerUserCallback(h);
            }
          }
        }
      }
    });
  }
}

